const mongoose = require("mongoose");

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
      validate: {
        validator: Number.isInteger,
        message: "Year must be an integer",
      },
    },

    expectedAmount: {
      type: Number,
      required: true,
      default: 1000,
      min: 0,
    },

    // Personal savings only. Excludes fines.
    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // One fine per overdue contribution month.
    fineAmount: {
      type: Number,
      default: 0,
      enum: [0, 50],
    },

    // Collected fine goes into the shared group fund.
    finePaidAmount: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: function (value) {
          return value <= this.fineAmount;
        },
        message: "Fine paid cannot exceed the assessed fine",
      },
    },

    fineAppliedAt: {
      type: Date,
      default: null,
    },

    // Savings status; fine status is calculated separately.
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

// Preserve your existing unique index.
contributionSchema.index(
  { member: 1, month: 1, year: 1 },
  { unique: true }
);

contributionSchema.index({
  dataScope: 1,
  year: 1,
  month: 1,
});

// Midnight on the 16th in Bangladesh:
// the payment deadline has just passed.
contributionSchema.virtual("fineEligibleAt").get(function () {
  return new Date(
    Date.UTC(this.year, this.month - 1, 15, 18, 0, 0)
  );
});

contributionSchema.virtual("remainingAmount").get(function () {
  return Math.max(
    0,
    Number(this.expectedAmount || 0) - Number(this.paidAmount || 0)
  );
});

contributionSchema.virtual("remainingFine").get(function () {
  return Math.max(
    0,
    Number(this.fineAmount || 0) - Number(this.finePaidAmount || 0)
  );
});

contributionSchema.virtual("totalDue").get(function () {
  return this.remainingAmount + this.remainingFine;
});

contributionSchema.virtual("totalPaid").get(function () {
  return Number(this.paidAmount || 0) + Number(this.finePaidAmount || 0);
});

contributionSchema.virtual("fineStatus").get(function () {
  if (this.fineAmount === 0) return "not_applicable";
  if (this.remainingFine === 0) return "paid";
  return this.finePaidAmount > 0 ? "partial" : "due";
});

contributionSchema.pre("validate", function () {
  const paid = Number(this.paidAmount || 0);
  const expected = Number(this.expectedAmount || 0);

  this.status =
    paid >= expected ? "paid" : paid > 0 ? "partial" : "due";
});

module.exports = mongoose.model("Contribution", contributionSchema);