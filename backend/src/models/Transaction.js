const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        // Monthly savings
        "CONTRIBUTION",

        // Historical opening savings
        "OPENING_BALANCE",
        "OPENING_CONTRIBUTION",

        // Collected fines
        "FINE",
        "OPENING_FINE",

        // Loans
        "LOAN_DISBURSEMENT",
        "LOAN_REPAYMENT",

        // Expenses and investments
        "EXPENSE",
        "INVESTMENT",
        "INVESTMENT_RETURN",

        // Member distributions and exits
        "PROFIT_DISTRIBUTION",
        "MEMBER_PAYOUT",

        // Corrections
        "ADJUSTMENT",
      ],
    },

    direction: {
      type: String,
      required: true,
      enum: ["IN", "OUT"],
    },

    // Always non-negative. Direction determines the cash effect.
    amount: {
      type: Number,
      required: true,
      min: 0,
      validate: {
        validator: function (value) {
          const paisa = Math.round(value * 100);

          return (
            Number.isFinite(value) &&
            value >= 0 &&
            Number.isSafeInteger(paisa) &&
            Math.abs(value * 100 - paisa) <= 0.000001
          );
        },
        message:
          "Amount must be non-negative with at most 2 decimals",
      },
    },

    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      default: null,
    },

    // Examples: Contribution, Loan, Expense, Investment, ExitRequest.
    referenceType: {
      type: String,
      trim: true,
      default: "",
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

    // Actual payment/event date.
    // createdAt separately records when it was entered.
    transactionDate: {
      type: Date,
      required: true,
      default: Date.now,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    dataScope: {
      type: String,
      required: true,
      enum: ["live", "demo"],
      default: "live",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Transaction history.
transactionSchema.index({
  dataScope: 1,
  transactionDate: -1,
});

// Individual member history.
transactionSchema.index({
  dataScope: 1,
  member: 1,
  transactionDate: -1,
});

// Find ledger entries belonging to a source record.
// Not unique: one contribution or loan can have multiple payments.
transactionSchema.index({
  dataScope: 1,
  referenceType: 1,
  referenceId: 1,
});

// Summaries by transaction type.
transactionSchema.index({
  dataScope: 1,
  type: 1,
});

module.exports = mongoose.model(
  "Transaction",
  transactionSchema
);