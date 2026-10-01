const mongoose = require("mongoose");

const Member = require("../models/Member");
const Contribution = require("../models/Contribution");
const Transaction = require("../models/Transaction");
const Investment = require("../models/Investment");
const Expense = require("../models/Expense");

const FINE_SHARE_MEMBERS = 7;

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const fail = (message, statusCode = 409) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const number = (value) => {
  const result = Number(value ?? 0);

  if (!Number.isFinite(result)) {
    fail("Invalid financial value found; reconcile the records");
  }

  return result;
};

const roundMoney = (value) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const sum = (items, field) =>
  roundMoney(
    items.reduce(
      (total, item) => total + number(item[field]),
      0
    )
  );

const getCurrentPeriod = (date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "numeric",
  }).formatToParts(date);

  return {
    month: Number(
      parts.find((part) => part.type === "month").value
    ),
    year: Number(
      parts.find((part) => part.type === "year").value
    ),
  };
};

const fineDeadline = (month, year) =>
  new Date(Date.UTC(year, month - 1, 15, 18));

const sameMember = (first, second) =>
  String(first) === String(second);

// --------------------------------------------------
// CONTRIBUTION CALCULATIONS
// These calculations do not write to the database.
// --------------------------------------------------

const contributionSummary = (item, now) => {
  const expectedAmount = number(item.expectedAmount);
  const paidAmount = number(item.paidAmount);
  const finePaidAmount = number(item.finePaidAmount);

  const remainingAmount = roundMoney(
    Math.max(0, expectedAmount - paidAmount)
  );

  let fineAmount = number(item.fineAmount);

  if (
    remainingAmount > 0 &&
    now >= fineDeadline(item.month, item.year)
  ) {
    fineAmount = Math.max(fineAmount, 50);
  }

  const remainingFine = roundMoney(
    Math.max(0, fineAmount - finePaidAmount)
  );

  return {
    ...item,
    expectedAmount,
    paidAmount,
    fineAmount,
    finePaidAmount,
    remainingAmount,
    remainingFine,
    totalDue: roundMoney(remainingAmount + remainingFine),
    status:
      paidAmount >= expectedAmount
        ? "paid"
        : paidAmount > 0
          ? "partial"
          : "due",
  };
};

const getMonthRecord = (
  member,
  contributions,
  period,
  now
) => {
  const existing = contributions.find(
    (item) =>
      sameMember(item.member, member._id) &&
      number(item.month) === period.month &&
      number(item.year) === period.year
  );

  if (existing) {
    return {
      ...contributionSummary(existing, now),
      applicable: true,
      recorded: true,
    };
  }

  const applicable = member.membershipStatus === "active";

  const result = contributionSummary(
    {
      member: member._id,
      month: period.month,
      year: period.year,
      expectedAmount: applicable
        ? number(member.monthlyContribution ?? 1000)
        : 0,
      paidAmount: 0,
      fineAmount: 0,
      finePaidAmount: 0,
    },
    now
  );

  return {
    ...result,
    applicable,
    recorded: false,
  };
};

// --------------------------------------------------
// LEDGER CALCULATIONS
// All cash comes from ledger entries.
// --------------------------------------------------

const ledgerSummary = (transactions) => {
  let totalIn = 0;
  let totalOut = 0;

  const netByType = new Map();
  const loanBalances = new Map();

  for (const transaction of transactions) {
    const amount = number(transaction.amount);
    const paisa = Math.round(amount * 100);

    if (
      amount < 0 ||
      !Number.isSafeInteger(paisa) ||
      Math.abs(amount * 100 - paisa) > 0.000001 ||
      !["IN", "OUT"].includes(transaction.direction)
    ) {
      fail("Invalid transaction found; reconcile the ledger");
    }

    const incoming = transaction.direction === "IN";
    const signed = incoming ? amount : -amount;

    if (incoming) totalIn += amount;
    else totalOut += amount;

    netByType.set(
      transaction.type,
      (netByType.get(transaction.type) || 0) + signed
    );

    if (
      ["LOAN_DISBURSEMENT", "LOAN_REPAYMENT"].includes(
        transaction.type
      )
    ) {
      if (!transaction.member) {
        fail("A loan transaction has no borrower");
      }

      const memberId = String(transaction.member);

      loanBalances.set(
        memberId,
        (loanBalances.get(memberId) || 0) - signed
      );
    }
  }

  for (const balance of loanBalances.values()) {
    if (roundMoney(balance) < 0) {
      fail(
        "A member's loan repayments exceed disbursements; reconcile the ledger"
      );
    }
  }

  const totalCollectedFines = roundMoney(
    (netByType.get("OPENING_FINE") || 0) +
    (netByType.get("FINE") || 0)
  );

  if (totalCollectedFines < 0) {
    fail("Collected fines are negative; reconcile the ledger");
  }

  const totalLoanDisbursed = roundMoney(
    -(netByType.get("LOAN_DISBURSEMENT") || 0)
  );

  const totalLoanRepaid = roundMoney(
    netByType.get("LOAN_REPAYMENT") || 0
  );

  return {
    totalIn: roundMoney(totalIn),
    totalOut: roundMoney(totalOut),
    availableCash: roundMoney(totalIn - totalOut),
    totalCollectedFines,
    totalLoanDisbursed,
    totalLoanRepaid,
    outstandingLoans: roundMoney(
      [...loanBalances.values()].reduce(
        (total, balance) => total + balance,
        0
      )
    ),
  };
};

// Same restriction as the current payout service.
const fineAllocation = (data, ledger) => {
  const eligible =
    data.members.length === FINE_SHARE_MEMBERS &&
    data.members.every(
      (member) => member.membershipStatus === "active"
    ) &&
    !data.transactions.some(
      (transaction) => transaction.type === "MEMBER_PAYOUT"
    );

  return {
    fineAllocationAvailable: eligible,
    fineShareMemberCount: FINE_SHARE_MEMBERS,
    fineSharePerMember: eligible
      ? ledger.totalCollectedFines / FINE_SHARE_MEMBERS
      : null,
    fineAllocationMessage: eligible
      ? null
      : "Fine shares require reconciliation after membership changes or exit payouts.",
  };
};

// --------------------------------------------------
// INVESTMENTS
// Closed proceeds are already cash in the ledger.
// --------------------------------------------------

const investmentSummary = (investments) => {
  const active = investments.filter(
    (investment) => investment.status === "active"
  );

  const closed = investments.filter(
    (investment) => investment.status === "closed"
  );

  const performance = investments.map((investment) => {
    const investedAmount = number(investment.investedAmount);
    const currentValue = number(investment.currentValue);
    const profitLoss = roundMoney(
      currentValue - investedAmount
    );

    return {
      id: investment._id,
      name: investment.name,
      investedAmount,
      currentValue,
      profitLoss,
      roi:
        investedAmount > 0
          ? Number(
              ((profitLoss / investedAmount) * 100).toFixed(4)
            )
          : 0,
      status: investment.status,
    };
  });

  const totalInvested = sum(investments, "investedAmount");
  const activeInvestedAmount = sum(active, "investedAmount");
  const totalInvestmentValue = sum(active, "currentValue");

  const realizedProfitLoss = roundMoney(
    sum(closed, "currentValue") -
    sum(closed, "investedAmount")
  );

  const unrealizedProfitLoss = roundMoney(
    totalInvestmentValue - activeInvestedAmount
  );

  return {
    totalInvested,
    activeInvestedAmount,
    totalInvestmentValue,
    realizedProfitLoss,
    unrealizedProfitLoss,
    totalProfitLoss: roundMoney(
      realizedProfitLoss + unrealizedProfitLoss
    ),
    performance,
  };
};

const monthlySavingsChart = (contributions) => {
  const totals = new Map();

  for (const item of contributions) {
    const key =
      `${item.year}-${String(item.month).padStart(2, "0")}`;

    totals.set(
      key,
      (totals.get(key) || 0) + number(item.paidAmount)
    );
  }

  return [...totals.entries()]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([month, amount]) => ({
      month,
      amount: roundMoney(amount),
    }));
};

// --------------------------------------------------
// CONSISTENT READ SNAPSHOT
// No parallel operations inside the transaction.
// --------------------------------------------------

const loadData = async (dataScope) => {
  const session = await mongoose.startSession();

  try {
    let data;

    await session.withTransaction(
      async () => {
        const members = await Member.find({ dataScope })
          .populate("user", "name email")
          .session(session)
          .lean();

        const contributions = await Contribution.find({
          dataScope,
        })
          .session(session)
          .lean();

        const transactions = await Transaction.find({
          dataScope,
        })
          .select("type direction amount member")
          .session(session)
          .lean();

        const investments = await Investment.find({
          dataScope,
        })
          .session(session)
          .lean();

        const expenses = await Expense.find({ dataScope })
          .session(session)
          .lean();

        data = {
          members,
          contributions,
          transactions,
          investments,
          expenses,
        };
      },
      {
        readConcern: { level: "snapshot" },
      }
    );

    return data;
  } finally {
    await session.endSession();
  }
};

// --------------------------------------------------
// ADMIN DASHBOARD
// --------------------------------------------------

const getAdminDashboard = async (req, res, data) => {
  const now = new Date();
  const period = getCurrentPeriod(now);

  const activeMembers = data.members.filter(
    (member) => member.membershipStatus === "active"
  );

  const currentRecords = activeMembers.map((member) =>
    getMonthRecord(
      member,
      data.contributions,
      period,
      now
    )
  );

  const assessedRecords = data.contributions.map((item) =>
    contributionSummary(item, now)
  );

  const ledger = ledgerSummary(data.transactions);
  const allocation = fineAllocation(data, ledger);
  const investments = investmentSummary(data.investments);

  // totalContribution already includes openingContribution.
  const totalSavings = sum(data.members, "totalContribution");

  return res.status(200).json({
    success: true,
    role: "admin",
    demoMode: req.user?.isDemo === true,

    summary: {
      totalMembers: activeMembers.length,
      totalFinancialProfiles: data.members.length,

      registeredMembers: activeMembers.filter(
        (member) => member.user
      ).length,

      unregisteredMembers: activeMembers.filter(
        (member) => !member.user
      ).length,

      totalSavings,
      openingSavings: sum(data.members, "openingContribution"),

      ...ledger,
      ...allocation,

      // Lifetime principal, including closed investments.
      totalInvested: investments.totalInvested,

      // Current assets: active investments only.
      totalInvestmentValue: investments.totalInvestmentValue,
      activeInvestedAmount: investments.activeInvestedAmount,

      totalProfitLoss: investments.totalProfitLoss,
      realizedProfitLoss: investments.realizedProfitLoss,
      unrealizedProfitLoss: investments.unrealizedProfitLoss,

      totalExpenses: sum(data.expenses, "amount"),

      // Cash + active investments + loans owed to the group.
      // Fines are already included in cash; do not add them again.
      totalGroupAssets: roundMoney(
        ledger.availableCash +
        investments.totalInvestmentValue +
        ledger.outstandingLoans
      ),

      // Existing contribution records only.
      outstandingRecordedContributions: sum(
        assessedRecords,
        "remainingAmount"
      ),

      outstandingRecordedFines: sum(
        assessedRecords,
        "remainingFine"
      ),
    },

    currentMonth: {
      ...period,
      expectedAmount: sum(currentRecords, "expectedAmount"),
      collectedAmount: sum(currentRecords, "paidAmount"),
      outstandingAmount: sum(currentRecords, "remainingAmount"),
      collectedFines: sum(currentRecords, "finePaidAmount"),
      outstandingFines: sum(currentRecords, "remainingFine"),
      totalDue: sum(currentRecords, "totalDue"),

      paidMembers: currentRecords.filter(
        (item) => item.status === "paid"
      ).length,

      partialMembers: currentRecords.filter(
        (item) => item.status === "partial"
      ).length,

      dueMembers: currentRecords.filter(
        (item) => item.status === "due"
      ).length,
    },

    charts: {
      monthlySavings: monthlySavingsChart(data.contributions),
      investmentPerformance: investments.performance,
    },
  });
};

// --------------------------------------------------
// MEMBER DASHBOARD
// --------------------------------------------------

const getMemberDashboard = async (req, res, data) => {
  const member = data.members.find(
    (item) =>
      item.user &&
      sameMember(item.user._id, req.user._id)
  );

  if (!member) {
    fail("Member profile not found. Please contact admin.", 404);
  }

  const now = new Date();
  const period = getCurrentPeriod(now);

  const contributions = data.contributions.filter(
    (item) => sameMember(item.member, member._id)
  );

  const assessedRecords = contributions.map((item) =>
    contributionSummary(item, now)
  );

  const currentContribution = getMonthRecord(
    member,
    contributions,
    period,
    now
  );

  // Add a virtual current-month record only for active members.
  const dueRecords =
    !currentContribution.recorded &&
    currentContribution.applicable
      ? [...assessedRecords, currentContribution]
      : assessedRecords;

  const ledger = ledgerSummary(data.transactions);
  const allocation = fineAllocation(data, ledger);
  const investments = investmentSummary(data.investments);

  const personalLedger = ledgerSummary(
    data.transactions.filter(
      (item) => sameMember(item.member, member._id)
    )
  );

  const totalContribution = number(member.totalContribution);
  const totalGroupSavings = sum(
    data.members,
    "totalContribution"
  );

  // Savings-based ownership is not reliable after an exit
  // until settlement-aware allocations are implemented.
  const ownershipAvailable =
    member.membershipStatus === "active" &&
    !data.members.some(
      (item) => item.membershipStatus === "exited"
    ) &&
    !data.transactions.some(
      (item) => item.type === "MEMBER_PAYOUT"
    );

  const ownershipRatio =
    ownershipAvailable && totalGroupSavings > 0
      ? totalContribution / totalGroupSavings
      : 0;

  const fineShare = allocation.fineSharePerMember;

  return res.status(200).json({
    success: true,
    role: "member",
    demoMode: req.user?.isDemo === true,

    member: {
      memberCode: member.memberCode || "",
      name: member.name || member.user?.name || "Member",
      monthlyContribution: number(member.monthlyContribution),
      membershipStatus: member.membershipStatus,
    },

    summary: {
      totalContribution,
      openingContribution: number(member.openingContribution),

      expectedContribution: roundMoney(
        number(member.openingContribution) +
        sum(dueRecords, "expectedAmount")
      ),

      outstandingContribution: sum(
        dueRecords,
        "remainingAmount"
      ),

      outstandingFines: sum(dueRecords, "remainingFine"),

      ownershipAvailable,

      ownershipPercentage: ownershipAvailable
        ? Number((ownershipRatio * 100).toFixed(4))
        : null,

      totalInvestmentShare: ownershipAvailable
        ? roundMoney(
            investments.totalInvestmentValue * ownershipRatio
          )
        : null,

      totalGroupSavings,
      totalExpenses: sum(data.expenses, "amount"),
      availableCash: ledger.availableCash,
      totalCollectedFines: ledger.totalCollectedFines,

      fineShare,
      fineAllocationAvailable: allocation.fineAllocationAvailable,
      fineAllocationMessage: allocation.fineAllocationMessage,

      // Informational only; this is not an exit payout.
      savingsIncludingFineShare:
        fineShare === null
          ? null
          : roundMoney(totalContribution + fineShare),

      outstandingLoan: personalLedger.outstandingLoans,
      totalLoanDisbursed: personalLedger.totalLoanDisbursed,
      totalLoanRepaid: personalLedger.totalLoanRepaid,
      groupOutstandingLoans: ledger.outstandingLoans,
    },

    currentMonth: {
      ...period,
      applicable: currentContribution.applicable,
      recorded: currentContribution.recorded,
      expectedAmount: currentContribution.expectedAmount,
      paidAmount: currentContribution.paidAmount,

      // Existing status values are preserved.
      // Use applicable=false to display "Not applicable".
      status: currentContribution.status,

      remainingAmount: currentContribution.remainingAmount,
      fineAmount: currentContribution.fineAmount,
      finePaidAmount: currentContribution.finePaidAmount,
      remainingFine: currentContribution.remainingFine,
      totalDue: currentContribution.totalDue,
    },

    charts: {
      monthlySavings: monthlySavingsChart(contributions),
    },
  });
};

// --------------------------------------------------
// ROLE-BASED DASHBOARD
// --------------------------------------------------

const getDashboardSummary = async (req, res) => {
  try {
    if (!req.user?._id) {
      fail("Authentication required", 401);
    }

    if (!["live", "demo"].includes(req.dataScope)) {
      fail("Invalid data scope", 400);
    }

    if (!["admin", "member"].includes(req.user.role)) {
      fail("Invalid user role", 403);
    }

    const data = await loadData(req.dataScope);

    if (req.user.role === "admin") {
      return await getAdminDashboard(req, res, data);
    }

    return await getMemberDashboard(req, res, data);
  } catch (error) {
    console.error("Dashboard error:", error);

    const status = error.statusCode || 500;

    return res.status(status).json({
      success: false,
      message:
        status < 500
          ? error.message
          : "Failed to load dashboard",
    });
  }
};

module.exports = {
  getDashboardSummary,
};