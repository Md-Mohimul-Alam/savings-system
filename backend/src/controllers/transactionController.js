const Transaction = require("../models/Transaction");

const getAllTransactions = async (req, res) => {
  try {
    const {
      type,
      direction,
      memberId,
    } = req.query;

    const filter = {
      dataScope: req.dataScope,
    };

    if (type) {
      filter.type = type;
    }

    if (direction) {
      filter.direction = direction;
    }

    if (memberId) {
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
      message: "Server error",
    });
  }
};

const getCashSummary = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      dataScope: req.dataScope,
    });

    let totalIn = 0;
    let totalOut = 0;

    transactions.forEach((transaction) => {
      if (transaction.direction === "IN") {
        totalIn += Number(transaction.amount || 0);
      }

      if (transaction.direction === "OUT") {
        totalOut += Number(transaction.amount || 0);
      }
    });

    const availableCash = totalIn - totalOut;

    return res.status(200).json({
      success: true,
      demoMode: req.user?.isDemo === true,
      summary: {
        totalIn,
        totalOut,
        availableCash,
      },
    });
  } catch (error) {
    console.error("Cash summary error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getAllTransactions,
  getCashSummary,
};
