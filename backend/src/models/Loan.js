const mongoose = require("mongoose");

const isMoney = (value) =>
  Number.isFinite(value) &&
  Number.isSafeInteger(Math.round(value * 100)) &&
  Math.abs(value * 100 - Math.round(value * 100)) <
    0.000001;

const moneyField = (required = false) => ({
  type: Number,
  required,
  min: 0,
  validate: {
    validator: isMoney,
    message: "Amount must have at most 2 decimal places",
  },
});

const repaymentSchema = new mongoose.Schema({
  amount: {
    ...moneyField(true),
    validate: {
      validator: (value) => isMoney(value) && value > 0,
      message: "Repayment must be greater than zero",
    },
  },

  paymentDate: {
    type: Date,
    required: true,
    default: Date.now,
  },

  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  transaction: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Transaction",
    required: true,
  },

  note: {
    type: String,
    trim: true,
    default: "",
  },
});

const loanSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },

    requestedAmount: {
      ...moneyField(true),
      validate: {
        validator: (value) => isMoney(value) && value > 0,
        message: "Requested amount must be greater than zero",
      },
    },

    approvedAmount: {
      ...moneyField(),
      default: 0,
    },

    disbursedAmount: {
      ...moneyField(),
      default: 0,
    },

    reason: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "pending",
        "approved",
        "rejected",
        "active",
        "repaid",
        "cancelled",
      ],
      default: "pending",
    },

    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },

    adminNote: {
      type: String,
      trim: true,
      default: "",
    },

    disbursedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    disbursedAt: {
      type: Date,
      default: null,
    },

    disbursementTransaction: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Transaction",
      default: null,
    },

    repaymentDueDate: {
      type: Date,
      default: null,
    },

    repayments: {
      type: [repaymentSchema],
      default: [],
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
    optimisticConcurrency: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Calculate from repayment history to avoid a second,
// independently maintained repayment total.
loanSchema.virtual("repaidAmount").get(function () {
  const totalPaisa = this.repayments.reduce(
    (sum, repayment) =>
      sum + Math.round(Number(repayment.amount) * 100),
    0
  );

  return totalPaisa / 100;
});

loanSchema.virtual("outstandingAmount").get(function () {
  return (
    Math.round(Number(this.disbursedAmount) * 100) -
    Math.round(this.repaidAmount * 100)
  ) / 100;
});

loanSchema.pre("validate", function () {
  if (this.approvedAmount > this.requestedAmount) {
    this.invalidate(
      "approvedAmount",
      "Approved amount cannot exceed requested amount"
    );
  }

  if (this.disbursedAmount > this.approvedAmount) {
    this.invalidate(
      "disbursedAmount",
      "Disbursed amount cannot exceed approved amount"
    );
  }

  if (this.repaidAmount > this.disbursedAmount) {
    this.invalidate(
      "repayments",
      "Repayments cannot exceed the disbursed amount"
    );
  }

  if (
    ["approved", "active", "repaid"].includes(this.status) &&
    (!this.reviewedBy ||
      !this.reviewedAt ||
      this.approvedAmount <= 0)
  ) {
    this.invalidate(
      "status",
      "Approved loans require approval details"
    );
  }

  if (["active", "repaid"].includes(this.status)) {
    if (
      this.disbursedAmount <= 0 ||
      !this.disbursedBy ||
      !this.disbursedAt ||
      !this.disbursementTransaction
    ) {
      this.invalidate(
        "status",
        "Active or repaid loans require disbursement details"
      );
    }
  } else if (
    this.disbursedAmount !== 0 ||
    this.repayments.length > 0
  ) {
    this.invalidate(
      "status",
      "A disbursed loan must remain active or repaid"
    );
  }

  if (
    this.status === "active" &&
    this.outstandingAmount <= 0
  ) {
    this.invalidate(
      "status",
      "A fully repaid loan must have repaid status"
    );
  }

  if (
    this.status === "repaid" &&
    this.outstandingAmount !== 0
  ) {
    this.invalidate(
      "status",
      "A repaid loan cannot have an outstanding balance"
    );
  }

  for (const repayment of this.repayments) {
    if (
      this.disbursedAt &&
      repayment.paymentDate < this.disbursedAt
    ) {
      this.invalidate(
        "repayments",
        "Repayment cannot precede disbursement"
      );
    }
  }

  if (
    this.repaymentDueDate &&
    this.disbursedAt &&
    this.repaymentDueDate < this.disbursedAt
  ) {
    this.invalidate(
      "repaymentDueDate",
      "Repayment deadline cannot precede disbursement"
    );
  }
});

loanSchema.index({
  dataScope: 1,
  member: 1,
  createdAt: -1,
});

loanSchema.index({
  dataScope: 1,
  status: 1,
});

module.exports = mongoose.model("Loan", loanSchema);