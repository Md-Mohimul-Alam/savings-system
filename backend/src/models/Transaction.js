const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
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
      validate: {
        validator: (value) =>
          Number.isFinite(value) &&
          Number.isSafeInteger(Math.round(value * 100)) &&
          Math.abs(value * 100 - Math.round(value * 100)) <
            0.000001,
        message: "Amount must have at most 2 decimal places",
      },
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
      required: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dataScope: {
      type: String,
      enum: ["live", "demo"],
      default: "live",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({
  dataScope: 1,
  transactionDate: -1,
});

transactionSchema.index({
  dataScope: 1,
  member: 1,
  transactionDate: -1,
});

transactionSchema.index({
  dataScope: 1,
  referenceType: 1,
  referenceId: 1,
});

module.exports = mongoose.model(
  "Transaction",
  transactionSchema
);