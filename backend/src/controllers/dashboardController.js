const Member = require("../models/Member");
const Contribution = require("../models/Contribution");
const Transaction = require("../models/Transaction");
const Investment = require("../models/Investment");
const Expense = require("../models/Expense");

const FINE_SHARE_MEMBERS = 7;

const number = (value) => Number(value || 0);

const roundMoney = (value) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const sum = (items, field) =>
  roundMoney(
    items.reduce((total, item) => total + number(item[field]), 0)
  );

// Always use Bangladesh time for monthly deadlines.
const getCurrentPeriod = () => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "numeric",
  }).formatToParts(new Date());

  return {
    month: Number(parts.find((part) => part.type === "month").value),
    year: Number(parts.find((part) => part.type === "year").value),
  };
};

const fineDeadline = (month, year) =>
  new Date(Date.UTC(year, month - 1, 15, 18));

// This calculates overdue fines without changing the database.
const contributionSummary = (item, now) => {
  const expectedAmount = number(item.expectedAmount);
  const paidAmount = number(item.paidAmount);

  const remainingAmount = Math.max(
    0,
    roundMoney(expectedAmount - paidAmount)
  );

  let fineAmount = number(item.fineAmount);

  if (
    remainingAmount > 0 &&
    now >= fineDeadline(item.month, item.year)
  ) {
    fineAmount = 50;
  }

  const finePaidAmount = number(item.finePaidAmount);

  const remainingFine = Math.max(
    0,
    roundMoney(fineAmount - finePaidAmount)
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

const getMonthRecord = (member, contributions, period, now) => {
  const existing = contributions.find(
    (item) =>
      String(item.member) === String(member._id) &&
      number(item.month) === period.month &&
      number(item.year) === period.year
  );

  return contributionSummary(
    existing || {
      member: member._id,
      month: period.month,
      year: period.year,
      expectedAmount: number(member.monthlyContribution),
      paidAmount: 0,
      fineAmount: 0,
      finePaidAmount: 0,
    },
    now
  );
};

const ledgerSummary = (transactions) => {
  let totalIn = 0;
  let totalOut = 0;

  const netByType = {};

  for (const transaction of transactions) {
    const amount = number(transaction.amount);
    const signed =
      transaction.direction === "IN" ? amount : -amount;

    if (transaction.direction === "IN") totalIn += amount;
    if (transaction.direction === "OUT") totalOut += amount;

    netByType[transaction.type] =
      (netByType[transaction.type] || 0) + signed;
  }

  const totalCollectedFines = roundMoney(
    (netByType.OPENING_FINE || 0) +
      (netByType.FINE || 0)
  );

  const totalLoanDisbursed = roundMoney(
    -(netByType.LOAN_DISBURSEMENT || 0)
  );

  const totalLoanRepaid = roundMoney(
    netByType.LOAN_REPAYMENT || 0
  );

  return {
    totalIn: roundMoney(totalIn),
    totalOut: roundMoney(totalOut),
    availableCash: roundMoney(totalIn - totalOut),
    totalCollectedFines,
    fineSharePerMember: totalCollectedFines / FINE_SHARE_MEMBERS,
    fineShareMemberCount: FINE_SHARE_MEMBERS,
    totalLoanDisbursed,
    totalLoanRepaid,
    outstandingLoans: roundMoney(
      totalLoanDisbursed - totalLoanRepaid
    ),
  };
};

const monthlySavingsChart = (contributions) => {
  const totals = {};

  for (const item of contributions) {
    const key = `${item.year}-${String(item.month).padStart(2, "0")}`;

    totals[key] = (totals[key] || 0) + number(item.paidAmount);
  }

  return Object.entries(totals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({
      month,
      amount: roundMoney(amount),
    }));
};

const loadData = async (dataScope) => {
  const [
    members,
    contributions,
    transactions,
    investments,
    expenses,
  ] = await Promise.all([
    Member.find({ dataScope })
      .populate("user", "name email")
      .lean(),

    Contribution.find({ dataScope }).lean(),

    Transaction.find({ dataScope })
      .select("type direction amount member")
      .lean(),

    Investment.find({ dataScope }).lean(),

    Expense.find({ dataScope }).lean(),
  ]);

  return {
    members,
    contributions,
    transactions,
    investments,
    expenses,
  };
};

// --------------------------------------------------
// ADMIN DASHBOARD
// --------------------------------------------------

const getAdminDashboard = async (req, res) => {
  const data = await loadData(req.dataScope);
  const now = new Date();
  const period = getCurrentPeriod();

  const activeMembers = data.members.filter(
    (member) => member.membershipStatus === "active"
  );

  const currentRecords = activeMembers.map((member) =>
    getMonthRecord(member, data.contributions, period, now)
  );

  const ledger = ledgerSummary(data.transactions);

  // Member totals include imported opening savings.
  // Do not add openingContribution again.
  const totalSavings = sum(data.members, "totalContribution");

  const totalInvested = sum(data.investments, "investedAmount");
  const totalInvestmentValue = sum(
    data.investments,
    "currentValue"
  );

  const assessedRecords = data.contributions.map((item) =>
    contributionSummary(item, now)
  );

  const investmentPerformance = data.investments.map(
    (investment) => {
      const investedAmount = number(investment.investedAmount);
      const currentValue = number(investment.currentValue);
      const profitLoss = roundMoney(currentValue - investedAmount);

      return {
        id: investment._id,
        name: investment.name,
        investedAmount,
        currentValue,
        profitLoss,
        roi:
          investedAmount > 0
            ? (profitLoss / investedAmount) * 100
            : 0,
        status: investment.status,
      };
    }
  );

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

      totalInvested,
      totalInvestmentValue,
      totalProfitLoss: roundMoney(
        totalInvestmentValue - totalInvested
      ),
      totalExpenses: sum(data.expenses, "amount"),

      // Existing monthly records only.
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
      investmentPerformance,
    },
  });
};

// --------------------------------------------------
// MEMBER DASHBOARD
// --------------------------------------------------

const getMemberDashboard = async (req, res) => {
  const data = await loadData(req.dataScope);

  const member = data.members.find(
    (item) =>
      item.user &&
      String(item.user._id) === String(req.user._id)
  );

  if (!member) {
    return res.status(404).json({
      success: false,
      message: "Member profile not found. Please contact admin.",
    });
  }

  const now = new Date();
  const period = getCurrentPeriod();

  const contributions = data.contributions.filter(
    (item) => String(item.member) === String(member._id)
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

  const currentMonthExists = contributions.some(
    (item) =>
      number(item.month) === period.month &&
      number(item.year) === period.year
  );

  // Include current-month dues even before its record is generated.
  // Past missing months must be created by migration/monthly generation.
  const dueRecords =
    !currentMonthExists &&
    member.membershipStatus === "active"
      ? [...assessedRecords, currentContribution]
      : assessedRecords;

  const ledger = ledgerSummary(data.transactions);

  const personalLedger = ledgerSummary(
    data.transactions.filter(
      (item) => String(item.member) === String(member._id)
    )
  );

  const totalContribution = number(member.totalContribution);
  const totalGroupSavings = sum(
    data.members,
    "totalContribution"
  );

  const ownershipRatio =
    totalGroupSavings > 0
      ? totalContribution / totalGroupSavings
      : 0;

  const activeInvestments = data.investments.filter(
    (investment) => investment.status === "active"
  );

  const totalInvestmentShare = roundMoney(
    activeInvestments.reduce(
      (total, investment) =>
        total + number(investment.currentValue) * ownershipRatio,
      0
    )
  );

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

      ownershipPercentage: Number(
        (ownershipRatio * 100).toFixed(4)
      ),
      totalInvestmentShare,
      totalGroupSavings,
      totalExpenses: sum(data.expenses, "amount"),

      availableCash: ledger.availableCash,
      totalCollectedFines: ledger.totalCollectedFines,
      fineShare: ledger.fineSharePerMember,

      // Informational total, not an exit payout quotation.
      savingsIncludingFineShare:
        totalContribution + ledger.fineSharePerMember,

      outstandingLoan: personalLedger.outstandingLoans,
      totalLoanDisbursed: personalLedger.totalLoanDisbursed,
      totalLoanRepaid: personalLedger.totalLoanRepaid,
      groupOutstandingLoans: ledger.outstandingLoans,
    },

    currentMonth: {
      ...period,
      expectedAmount: currentContribution.expectedAmount,
      paidAmount: currentContribution.paidAmount,
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
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!["live", "demo"].includes(req.dataScope)) {
      return res.status(400).json({
        success: false,
        message: "Invalid data scope",
      });
    }

    if (req.user.role === "admin") {
      return await getAdminDashboard(req, res);
    }

    if (req.user.role === "member") {
      return await getMemberDashboard(req, res);
    }

    return res.status(403).json({
      success: false,
      message: "Invalid user role",
    });
  } catch (error) {
    console.error("Dashboard error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard",
    });
  }
};

module.exports = {
  getDashboardSummary,
};