const mongoose = require("mongoose");

const ProfitDistribution = require("../models/ProfitDistribution");
const Investment = require("../models/Investment");
const Transaction = require("../models/Transaction");
const Member = require("../models/Member");

const CashLock =
  mongoose.models.CashLock ||
  mongoose.model(
    "CashLock",
    new mongoose.Schema({
      _id: { type: String },
      version: { type: Number, default: 0 },
    })
  );

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const validateId = (value, label) => {
  if (
    typeof value !== "string" ||
    !/^[a-f\d]{24}$/i.test(value)
  ) {
    fail(`Invalid ${label}`);
  }
};

const moneyToPaisa = (value, label, allowZero = true) => {
  if (
    !["number", "string"].includes(typeof value) ||
    (typeof value === "string" && !value.trim())
  ) {
    fail(`Invalid ${label}`);
  }

  const amount = Number(value);
  const paisa = Math.round(amount * 100);

  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    (!allowZero && amount === 0) ||
    !Number.isSafeInteger(paisa) ||
    Math.abs(amount * 100 - paisa) > 0.000001
  ) {
    fail(
      `${label} must be ${
        allowZero ? "non-negative" : "positive"
      } with at most 2 decimals`
    );
  }

  return paisa;
};

const handler = (adminOnly, action) => async (req, res) => {
  try {
    if (!req.user?._id) {
      fail("Authentication required", 401);
    }

    if (!["live", "demo"].includes(req.dataScope)) {
      fail("Invalid data scope");
    }

    if (adminOnly && req.user.role !== "admin") {
      fail("Admin access required", 403);
    }

    await action(req, res);
  } catch (error) {
    console.error("Profit distribution error:", error);

    const status =
      error.statusCode ||
      (error.code === 11000 ? 409 : 0) ||
      (["ValidationError", "CastError"].includes(error.name)
        ? 400
        : 500);

    return res.status(status).json({
      success: false,
      message:
        error.code === 11000
          ? "A conflicting distribution already exists"
          : status < 500
            ? error.message
            : "Failed to process profit distribution",
    });
  }
};

const populateDistribution = (query) =>
  query
    .populate("investment", "name investedAmount currentValue status")
    .populate({
      path: "members.member",
      populate: {
        path: "user",
        select: "name email",
      },
    })
    .populate("createdBy", "name email");

// --------------------------------------------------
// SHARED CASH LOCK
// --------------------------------------------------

const withCashTransaction = async (dataScope, action) => {
  try {
    await CashLock.updateOne(
      { _id: dataScope },
      { $setOnInsert: { version: 0 } },
      { upsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await CashLock.updateOne(
        { _id: dataScope },
        { $inc: { version: 1 } },
        { session }
      );

      await action(session);
    });
  } finally {
    await session.endSession();
  }
};

// --------------------------------------------------
// EXACT ALLOCATION
// Remaining paisa go to the largest fractional shares.
// Equal fractions are resolved by member ID.
// --------------------------------------------------

const allocateProfit = (members, profitPaisa) => {
  const weights = members.map((member) => ({
    member,
    weight: BigInt(
      moneyToPaisa(
        member.totalContribution ?? 0,
        "Member savings"
      )
    ),
  }));

  const totalWeight = weights.reduce(
    (total, item) => total + item.weight,
    0n
  );

  if (totalWeight <= 0n) {
    fail("Record member savings before distributing profit", 409);
  }

  const totalProfit = BigInt(profitPaisa);

  const shares = weights.map(({ member, weight }) => {
    const numerator = totalProfit * weight;

    return {
      member: member._id,
      weight,
      paisa: numerator / totalWeight,
      remainder: numerator % totalWeight,
    };
  });

  shares.sort((first, second) => {
    if (first.remainder !== second.remainder) {
      return first.remainder > second.remainder ? -1 : 1;
    }

    return String(first.member).localeCompare(String(second.member));
  });

  let remaining =
    totalProfit -
    shares.reduce((total, item) => total + item.paisa, 0n);

  for (let index = 0; remaining > 0n; index += 1) {
    shares[index].paisa += 1n;
    remaining -= 1n;
  }

  return shares.map((item) => ({
    member: item.member,

    ownershipPercentage: Number(
      (
        (Number(item.weight) / Number(totalWeight)) *
        100
      ).toFixed(4)
    ),

    profitShare: Number(item.paisa) / 100,
  }));
};

// --------------------------------------------------
// DISTRIBUTE PROFIT
// Records an actual payout; does not transfer money.
// --------------------------------------------------

const distributeProfit = handler(true, async (req, res) => {
  const body = req.body || {};

  validateId(body.investmentId, "investment ID");

  const profitPaisa = moneyToPaisa(
    body.totalProfit,
    "Total profit",
    false
  );

  if (body.note !== undefined && typeof body.note !== "string") {
    fail("Note must be text");
  }

  const note = body.note?.trim() || "";
  let responseDistribution;

  await withCashTransaction(req.dataScope, async (session) => {
    const investment = await Investment.findOne({
      _id: body.investmentId,
      dataScope: req.dataScope,
    }).session(session);

    if (!investment) {
      fail("Investment not found", 404);
    }

    if (investment.status !== "closed") {
      fail(
        "Close the investment and record actual cash proceeds first",
        409
      );
    }

    const existing = await ProfitDistribution.exists({
      investment: investment._id,
      dataScope: req.dataScope,
    }).session(session);

    if (existing) {
      fail(
        "This investment already has a distribution. " +
        "Review that record before making another payout.",
        409
      );
    }

    const members = await Member.find({
      dataScope: req.dataScope,
    })
      .select("_id membershipStatus totalContribution")
      .session(session)
      .lean();

    if (!members.length) {
      fail("No members found", 409);
    }

    if (
      members.some(
        (member) => member.membershipStatus !== "active"
      )
    ) {
      fail(
        "Reconcile membership and ownership before distributing profit",
        409
      );
    }

    const transactions = await Transaction.find({
      dataScope: req.dataScope,
    })
      .select("type direction amount referenceType referenceId")
      .session(session)
      .lean();

    if (
      transactions.some(
        (item) => item.type === "MEMBER_PAYOUT"
      )
    ) {
      fail(
        "Profit allocation after an exit requires settlement-aware ownership",
        409
      );
    }

    let cashPaisa = 0;
    let returnedPaisa = 0;
    let investedPaisa = 0;

    for (const transaction of transactions) {
      const amount = moneyToPaisa(
        transaction.amount,
        "Ledger amount"
      );

      if (!["IN", "OUT"].includes(transaction.direction)) {
        fail("Invalid ledger direction; reconcile the ledger", 409);
      }

      const signed =
        transaction.direction === "IN" ? amount : -amount;

      cashPaisa += signed;

      const belongsToInvestment =
        transaction.referenceType === "Investment" &&
        String(transaction.referenceId) === String(investment._id);

      if (belongsToInvestment) {
        if (transaction.type === "INVESTMENT_RETURN") {
          returnedPaisa += signed;
        }

        if (transaction.type === "INVESTMENT") {
          investedPaisa -= signed;
        }
      }

      if (
        !Number.isSafeInteger(cashPaisa) ||
        !Number.isSafeInteger(returnedPaisa) ||
        !Number.isSafeInteger(investedPaisa)
      ) {
        fail("Ledger totals exceed the supported range", 409);
      }
    }

    const recordedPrincipal = moneyToPaisa(
      investment.investedAmount,
      "Invested amount"
    );

    const recordedProceeds = moneyToPaisa(
      investment.currentValue,
      "Closing proceeds"
    );

    if (
      investedPaisa !== recordedPrincipal ||
      returnedPaisa !== recordedProceeds
    ) {
      fail(
        "Investment principal or closing proceeds do not match the ledger. " +
        "Reconcile this investment before distributing profit.",
        409
      );
    }

    const realizedProfitPaisa = returnedPaisa - investedPaisa;

    if (realizedProfitPaisa <= 0) {
      fail("This investment has no realized profit to distribute", 409);
    }

    if (profitPaisa > realizedProfitPaisa) {
      fail(
        `Distribution exceeds realized profit of ৳${
          realizedProfitPaisa / 100
        }`,
        409
      );
    }

    if (profitPaisa > cashPaisa) {
      fail("Insufficient available cash for this distribution", 409);
    }

    const memberShares = allocateProfit(members, profitPaisa);
    const distributionDate = new Date();

    const [distribution] = await ProfitDistribution.create(
      [
        {
          investment: investment._id,
          totalProfit: profitPaisa / 100,
          distributionDate,
          members: memberShares,
          note,
          createdBy: req.user._id,
          dataScope: req.dataScope,
        },
      ],
      { session }
    );

    // Each recipient gets an individual outgoing ledger entry.
    // Do not also create a second aggregate OUT entry.
    for (const share of memberShares) {
      if (share.profitShare === 0) continue;

      await Transaction.create(
        [
          {
            type: "PROFIT_DISTRIBUTION",
            direction: "OUT",
            amount: share.profitShare,
            member: share.member,
            referenceType: "ProfitDistribution",
            referenceId: distribution._id,
            description: `Profit payout from ${investment.name}`,
            transactionDate: distributionDate,
            createdBy: req.user._id,
            dataScope: req.dataScope,
          },
        ],
        { session }
      );
    }

    // Paid-out profit does not increase personal savings.
    // Investment proceeds were already recorded at closure.
    const populated = await populateDistribution(
      ProfitDistribution.findOne({
        _id: distribution._id,
        dataScope: req.dataScope,
      }).session(session)
    );

    responseDistribution = populated.toObject();
  });

  return res.status(201).json({
    success: true,
    message: "Profit payout recorded successfully",
    distribution: responseDistribution,
  });
});

// --------------------------------------------------
// GET ALL DISTRIBUTIONS
// Existing route permissions still apply.
// --------------------------------------------------

const getAllProfitDistributions = handler(
  false,
  async (req, res) => {
    const distributions = await populateDistribution(
      ProfitDistribution.find({
        dataScope: req.dataScope,
      }).sort({
        distributionDate: -1,
        _id: -1,
      })
    );

    return res.status(200).json({
      success: true,
      count: distributions.length,
      distributions,
    });
  }
);

// --------------------------------------------------
// GET ONE DISTRIBUTION
// --------------------------------------------------

const getProfitDistributionById = handler(
  false,
  async (req, res) => {
    validateId(req.params.id, "distribution ID");

    const distribution = await populateDistribution(
      ProfitDistribution.findOne({
        _id: req.params.id,
        dataScope: req.dataScope,
      })
    );

    if (!distribution) {
      fail("Profit distribution not found", 404);
    }

    return res.status(200).json({
      success: true,
      distribution,
    });
  }
);

module.exports = {
  distributeProfit,
  getAllProfitDistributions,
  getProfitDistributionById,
};