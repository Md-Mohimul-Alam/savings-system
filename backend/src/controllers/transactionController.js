const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");

const TRANSACTION_TYPES = [
  "CONTRIBUTION",
  "FINE",
  "OPENING_SAVINGS",
  "OPENING_FINE",
  "LOAN_DISBURSEMENT",
  "LOAN_REPAYMENT",
  "EXPENSE",
  "INVESTMENT",
  "INVESTMENT_RETURN",
  "PROFIT_DISTRIBUTION",
  "MEMBER_PAYOUT",
  "ADJUSTMENT",
];

const roundMoney = (value) =>
  Math.round((Number(value) + Number.EPSILON) * 100) / 100;

const getAllTransactions = async (req, res) => {
  try {
    if (!["live", "demo"].includes(req.dataScope)) {
      return res.status(400).json({
        success: false,
        message: "Invalid data scope",
      });
    }

    const { type, direction, memberId } = req.query;

    const filter = {
      dataScope: req.dataScope,
    };

    if (type !== undefined) {
      if (!TRANSACTION_TYPES.includes(type)) {
        return res.status(400).json({
          success: false,
          message: "Invalid transaction type",
        });
      }

      filter.type = type;
    }

    if (direction !== undefined) {
      if (!["IN", "OUT"].includes(direction)) {
        return res.status(400).json({
          success: false,
          message: "Direction must be IN or OUT",
        });
      }

      filter.direction = direction;
    }

    if (memberId !== undefined) {
      if (
        typeof memberId !== "string" ||
        !mongoose.Types.ObjectId.isValid(memberId)
      ) {
        return res.status(400).json({
          success: false,
          message: "Invalid member ID",
        });
      }

      filter.member = memberId;
    }

    const transactions = await Transaction.find(filter)
      .populate({
        path: "member",
        populate: {
          path: "user",
          select: "name email",
        },
      })
      .populate("createdBy", "name email")
      .sort({
        transactionDate: -1,
        createdAt: -1,
        _id: -1,
      });

    return res.status(200).json({
      success: true,
      demoMode: req.user?.isDemo === true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error("Get transactions error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get transactions",
    });
  }
};

const getCashSummary = async (req, res) => {
  try {
    if (!["live", "demo"].includes(req.dataScope)) {
      return res.status(400).json({
        success: false,
        message: "Invalid data scope",
      });
    }

    // Group in MongoDB instead of loading the whole ledger.
    const totals = await Transaction.aggregate([
      {
        $match: {
          dataScope: req.dataScope,
        },
      },
      {
        $group: {
          _id: {
            type: "$type",
            direction: "$direction",
          },
          amount: {
            $sum: "$amount",
          },
        },
      },
    ]);

    const byType = {};
    let totalIn = 0;
    let totalOut = 0;

    for (const row of totals) {
      const { type, direction } = row._id;
      const amount = Number(row.amount || 0);

      if (!byType[type]) {
        byType[type] = {
          totalIn: 0,
          totalOut: 0,
          net: 0,
        };
      }

      if (direction === "IN") {
        totalIn += amount;
        byType[type].totalIn += amount;
      } else if (direction === "OUT") {
        totalOut += amount;
        byType[type].totalOut += amount;
      }
    }

    for (const item of Object.values(byType)) {
      item.net = roundMoney(item.totalIn - item.totalOut);
      item.totalIn = roundMoney(item.totalIn);
      item.totalOut = roundMoney(item.totalOut);
    }

    const net = (type) => byType[type]?.net || 0;

    const totalCollectedFines = roundMoney(
      net("OPENING_FINE") + net("FINE")
    );

    // Disbursement is normally OUT; repayment is normally IN.
    // Reverse-direction entries reduce the respective totals.
    const netLoanDisbursed = roundMoney(
      -net("LOAN_DISBURSEMENT")
    );

    const netLoanRepaid = roundMoney(
      net("LOAN_REPAYMENT")
    );

    return res.status(200).json({
      success: true,
      demoMode: req.user?.isDemo === true,
      summary: {
        // Preserve existing fields.
        totalIn: roundMoney(totalIn),
        totalOut: roundMoney(totalOut),
        availableCash: roundMoney(totalIn - totalOut),

        openingSavings: net("OPENING_SAVINGS"),
        openingFines: net("OPENING_FINE"),
        contributionCollections: net("CONTRIBUTION"),

        totalCollectedFines,

        // All seven financial members receive an equal share.
        // Keep full precision; round only for display/payout.
        fineSharePerMember: totalCollectedFines / 7,
        fineShareMemberCount: 7,

        netLoanDisbursed,
        netLoanRepaid,
        outstandingLoans: roundMoney(
          netLoanDisbursed - netLoanRepaid
        ),

        byType,
      },
    });
  } catch (error) {
    console.error("Cash summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get cash summary",
    });
  }
};

module.exports = {
  getAllTransactions,
  getCashSummary,
};