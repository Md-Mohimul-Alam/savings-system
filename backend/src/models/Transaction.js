const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "CONTRIBUTION",
        "EXPENSE",
        "INVESTMENT",
        "INVESTMENT_RETURN",
        "PROFIT_DISTRIBUTION",
        "MEMBER_PAYOUT",
        "ADJUSTMENT",
      ],
      required: true,
    },

    direction: {
      type: String,
      enum: ["IN", "OUT"],
      required: true,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },

    referenceType: {
      type: String,
      default: "",
      trim: true,
    },

    referenceId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    transactionDate: {
      type: Date,
      default: Date.now,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Transaction", transactionSchema);