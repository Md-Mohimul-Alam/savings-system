const Member = require("../models/Member");
const Investment = require("../models/Investment");
const Transaction = require("../models/Transaction");
const calculateOwnership = require("../utils/calculateOwnership");

const calculateMemberPayout = async (memberId) => {
  const member = await Member.findById(memberId);

  if (!member) {
    throw new Error("Member not found");
  }

  const ownershipResult = await calculateOwnership();

  const ownership = ownershipResult.ownershipData.find(
    (item) =>
      item.memberId.toString() === memberId.toString()
  );

  const ownershipPercentage =
    ownership?.ownershipPercentage || 0;

  const transactions = await Transaction.find();

  let totalIn = 0;
  let totalOut = 0;

  for (const transaction of transactions) {
    if (transaction.direction === "IN") {
      totalIn += transaction.amount;
    } else {
      totalOut += transaction.amount;
    }
  }

  const availableCash = totalIn - totalOut;

  const memberCashShare =
    availableCash * (ownershipPercentage / 100);

  const investments = await Investment.find({
    status: "active",
  });

  const totalInvestmentCurrentValue = investments.reduce(
    (sum, investment) =>
      sum + investment.currentValue,
    0
  );

  const investmentShare =
    totalInvestmentCurrentValue *
    (ownershipPercentage / 100);

  const estimatedPayout =
    memberCashShare + investmentShare;

  return {
    memberId: member._id,
    ownershipPercentage,
    availableCash: Number(availableCash.toFixed(2)),
    memberCashShare: Number(memberCashShare.toFixed(2)),
    totalInvestmentCurrentValue: Number(
      totalInvestmentCurrentValue.toFixed(2)
    ),
    investmentShare: Number(
      investmentShare.toFixed(2)
    ),
    estimatedPayout: Number(
      estimatedPayout.toFixed(2)
    ),
  };
};

module.exports = {
  calculateMemberPayout,
};