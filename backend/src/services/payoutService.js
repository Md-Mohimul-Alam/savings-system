const mongoose = require("mongoose");

const Member = require("../models/Member");
const Investment = require("../models/Investment");
const Transaction = require("../models/Transaction");

const FINE_SHARE_MEMBERS = 7;

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const roundMoney = (value) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const fail = (message, statusCode = 409) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

// --------------------------------------------------
// CALCULATE MEMBER PAYOUT
//
// session is supplied by the exit controller so the
// estimate uses the same transaction snapshot.
//
// Fine entitlement: equal among seven members.
// Remaining assets: proportional to personal savings.
// Member's outstanding loan: deducted from entitlement.
// --------------------------------------------------

const calculateMemberPayout = async (
  memberId,
  dataScope,
  session = null
) => {
  if (!mongoose.Types.ObjectId.isValid(memberId)) {
    fail("Invalid member ID", 400);
  }

  if (!["live", "demo"].includes(dataScope)) {
    fail("A valid data scope is required", 400);
  }

  // Sequential queries: do not run parallel operations
  // within the same MongoDB transaction.
  const members = await Member.find({
    dataScope,
  })
    .select("_id membershipStatus totalContribution")
    .session(session)
    .lean();

  const transactions = await Transaction.find({
    dataScope,
  })
    .select("type direction amount member")
    .session(session)
    .lean();

  const investments = await Investment.find({
    status: "active",
    dataScope,
  })
    .select("currentValue")
    .session(session)
    .lean();

  const member = members.find(
    (item) => String(item._id) === String(memberId)
  );

  if (!member) {
    fail("Member not found", 404);
  }

  if (member.membershipStatus !== "active") {
    fail("Only active members can receive an exit estimate");
  }

  // This implements the original seven-member agreement.
  // Further exits need settlement-aware fine and ownership
  // allocation rather than reusing the original totals.
  const previousPayoutExists = transactions.some(
    (item) => item.type === "MEMBER_PAYOUT"
  );

  if (
    members.length !== FINE_SHARE_MEMBERS ||
    members.some(
      (item) => item.membershipStatus !== "active"
    ) ||
    previousPayoutExists
  ) {
    fail(
      "This estimate requires the original seven active members " +
        "with no previous exit payouts. Reconcile membership and " +
        "fine allocations before calculating further exits."
    );
  }

  // --------------------------------------------------
  // PERSONAL SAVINGS AND OWNERSHIP
  // --------------------------------------------------

  const totalGroupContribution = roundMoney(
    members.reduce(
      (sum, item) =>
        sum + Number(item.totalContribution || 0),
      0
    )
  );

  if (totalGroupContribution <= 0) {
    fail(
      "Opening savings and contributions must be imported first"
    );
  }

  const totalContribution = Number(
    member.totalContribution || 0
  );

  const ownershipRatio =
    totalContribution / totalGroupContribution;

  // --------------------------------------------------
  // CASH, COLLECTED FINES AND LOAN RECEIVABLES
  // --------------------------------------------------

  let availableCash = 0;
  let totalCollectedFines = 0;

  const loanBalances = new Map();

  for (const transaction of transactions) {
    const amount = Number(transaction.amount || 0);

    if (
      !Number.isFinite(amount) ||
      amount < 0 ||
      !["IN", "OUT"].includes(transaction.direction)
    ) {
      fail("Invalid transaction found; reconcile the ledger");
    }

    const signedAmount =
      transaction.direction === "IN"
        ? amount
        : -amount;

    availableCash += signedAmount;

    if (
      ["FINE", "OPENING_FINE"].includes(
        transaction.type
      )
    ) {
      totalCollectedFines += signedAmount;
    }

    if (
      ["LOAN_DISBURSEMENT", "LOAN_REPAYMENT"].includes(
        transaction.type
      )
    ) {
      if (!transaction.member) {
        fail(
          "A loan transaction has no borrower; reconcile the ledger"
        );
      }

      const borrowerId = String(transaction.member);

      // Loan OUT increases the group's receivable.
      // Repayment IN decreases the receivable.
      const currentBalance =
        loanBalances.get(borrowerId) || 0;

      loanBalances.set(
        borrowerId,
        currentBalance - signedAmount
      );
    }
  }

  availableCash = roundMoney(availableCash);
  totalCollectedFines = roundMoney(totalCollectedFines);

  if (totalCollectedFines < 0) {
    fail(
      "Collected fine balance is negative; reconcile the ledger"
    );
  }

  const memberIds = new Set(
    members.map((item) => String(item._id))
  );

  let outstandingGroupLoans = 0;

  for (const [borrowerId, balance] of loanBalances) {
    if (!memberIds.has(borrowerId)) {
      fail(
        "A loan borrower is outside the seven-member group"
      );
    }

    const roundedBalance = roundMoney(balance);

    if (roundedBalance < 0) {
      fail(
        "Loan repayments exceed disbursements; reconcile the ledger"
      );
    }

    outstandingGroupLoans += roundedBalance;
  }

  outstandingGroupLoans = roundMoney(
    outstandingGroupLoans
  );

  const outstandingMemberLoan = roundMoney(
    loanBalances.get(String(member._id)) || 0
  );

  // --------------------------------------------------
  // ACTIVE INVESTMENT VALUE
  // --------------------------------------------------

  const totalInvestmentCurrentValue = roundMoney(
    investments.reduce(
      (sum, investment) =>
        sum + Number(investment.currentValue || 0),
      0
    )
  );

  // --------------------------------------------------
  // MEMBER ENTITLEMENT
  // --------------------------------------------------

  const fineShare =
    totalCollectedFines / FINE_SHARE_MEMBERS;

  // Remove collected fines from the proportional pool,
  // then add this member's equal fine entitlement.
  // This avoids counting the fine fund twice.
  const memberCashShare =
    (availableCash - totalCollectedFines) *
      ownershipRatio +
    fineShare;

  const investmentShare =
    totalInvestmentCurrentValue * ownershipRatio;

  // Outstanding loans remain assets of the group.
  const loanReceivableShare =
    outstandingGroupLoans * ownershipRatio;

  const grossEntitlement =
    memberCashShare +
    investmentShare +
    loanReceivableShare;

  // The borrower owes this amount back to the group.
  const netEntitlement =
    grossEntitlement - outstandingMemberLoan;

  const estimatedPayout = roundMoney(
    Math.max(0, netEntitlement)
  );

  const remainingDebtAfterOffset = roundMoney(
    Math.max(0, -netEntitlement)
  );

  const cashShortfall = roundMoney(
    Math.max(0, estimatedPayout - availableCash)
  );

  // Liquidity indicator only.
  // The exit controller separately requires loan repayment.
  const canPayNow =
    availableCash >= 0 &&
    estimatedPayout <= availableCash &&
    netEntitlement >= 0;

  return {
    memberId: member._id,
    dataScope,

    totalContribution,
    totalGroupContribution,

    ownershipPercentage: Number(
      (ownershipRatio * 100).toFixed(4)
    ),

    availableCash,
    totalCollectedFines,

    // Keep full precision until an actual settlement.
    fineShare,

    memberCashShare: roundMoney(memberCashShare),

    totalInvestmentCurrentValue,
    investmentShare: roundMoney(investmentShare),

    outstandingGroupLoans,
    loanReceivableShare: roundMoney(
      loanReceivableShare
    ),
    outstandingMemberLoan,

    grossEntitlement: roundMoney(grossEntitlement),
    netEntitlement: roundMoney(netEntitlement),
    estimatedPayout,

    remainingDebtAfterOffset,
    cashShortfall,
    canPayNow,
  };
};

// --------------------------------------------------
// EXPORTS
// --------------------------------------------------

module.exports = {
  calculateMemberPayout,
};