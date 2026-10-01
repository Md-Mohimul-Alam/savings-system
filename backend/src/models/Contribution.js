const mongoose = require("mongoose");

const validMoney = (value) =>
  Number.isFinite(value) &&
  value >= 0 &&
  Number.isSafeInteger(Math.round(value * 100)) &&
  Math.abs(value * 100 - Math.round(value * 100)) <= 0.000001;

const moneyField = (defaultValue) => ({
  type: Number,
  required: true,
  default: defaultValue,
  min: 0,
  validate: {
    validator: validMoney,
    message: "Amount must be non-negative with at most 2 decimals",
  },
});

const roundMoney = (value) => Math.round(value * 100) / 100;

const contributionSchema = new mongoose.Schema(
  {
    member: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Member",
      required: true,
    },

    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
      validate: {
        validator: Number.isInteger,
        message: "Month must be an integer",
      },
    },

    year: {
      type: Number,
      required: true,
      min: 2021,
      max: 9999,
      validate: {
        validator: Number.isInteger,
        message: "Year must be an integer",
      },
    },

    expectedAmount: moneyField(1000),

    // Personal savings only; excludes fines.
    paidAmount: moneyField(0),

    // One fine per overdue month.
    fineAmount: {
      type: Number,
      required: true,
      default: 0,
      enum: [0, 50],
    },

    // Shared group funds; never added to personal savings.
    finePaidAmount: moneyField(0),

    fineAppliedAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["due", "partial", "paid"],
      default: "due",
    },

    paymentDate: {
      type: Date,
      default: null,
    },

    finePaymentDate: {
      type: Date,
      default: null,
    },

    note: {
      type: String,
      trim: true,
      default: "",
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
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Preserve the existing unique index.
contributionSchema.index(
  { member: 1, month: 1, year: 1 },
  { unique: true }
);

contributionSchema.index({
  dataScope: 1,
  year: 1,
  month: 1,
});

contributionSchema.virtual("fineEligibleAt").get(function () {
  // 16th, 00:00 Bangladesh time.
  return new Date(Date.UTC(this.year, this.month - 1, 15, 18));
});

contributionSchema.virtual("remainingAmount").get(function () {
  return roundMoney(
    Math.max(0, this.expectedAmount - this.paidAmount)
  );
});

contributionSchema.virtual("remainingFine").get(function () {
  return roundMoney(
    Math.max(0, this.fineAmount - this.finePaidAmount)
  );
});

contributionSchema.virtual("totalDue").get(function () {
  return roundMoney(this.remainingAmount + this.remainingFine);
});

contributionSchema.virtual("totalPaid").get(function () {
  return roundMoney(this.paidAmount + this.finePaidAmount);
});

contributionSchema.virtual("fineStatus").get(function () {
  if (this.fineAmount === 0) return "not_applicable";
  if (this.remainingFine === 0) return "paid";
  return this.finePaidAmount > 0 ? "partial" : "due";
});

contributionSchema.pre("validate", function () {
  if (this.paidAmount > this.expectedAmount) {
    this.invalidate(
      "paidAmount",
      "Savings cannot exceed the expected monthly contribution"
    );
  }

  if (this.finePaidAmount > this.fineAmount) {
    this.invalidate(
      "finePaidAmount",
      "Fine paid cannot exceed the assessed fine"
    );
  }

  this.status =
    this.paidAmount >= this.expectedAmount
      ? "paid"
      : this.paidAmount > 0
        ? "partial"
        : "due";
});

module.exports = mongoose.model("Contribution", contributionSchema);