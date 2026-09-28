const mongoose = require("mongoose");

const investmentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    investedAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    currentValue: {
      type: Number,
      required: true,
      min: 0,
    },

    status: {
      type: String,
      enum: ["active", "closed"],
      default: "active",
    },

    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: {
      type: Date,
      default: null,
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

investmentSchema.virtual("profitLoss").get(function () {
  return this.currentValue - this.investedAmount;
});

investmentSchema.virtual("roi").get(function () {
  if (this.investedAmount === 0) return 0;

  return (
    ((this.currentValue - this.investedAmount) /
      this.investedAmount) *
    100
  );
});

investmentSchema.set("toJSON", {
  virtuals: true,
});

investmentSchema.set("toObject", {
  virtuals: true,
});

module.exports = mongoose.model(
  "Investment",
  investmentSchema
);