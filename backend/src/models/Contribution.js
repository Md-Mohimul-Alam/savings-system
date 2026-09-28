const mongoose = require("mongoose");

const contributionSchema =
  new mongoose.Schema(
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
      },

      year: {
        type: Number,
        required: true,
      },

      expectedAmount: {
        type: Number,
        required: true,
        default: 1000,
        min: 0,
      },

      paidAmount: {
        type: Number,
        default: 0,
        min: 0,
      },

      status: {
        type: String,
        enum: [
          "due",
          "partial",
          "paid",
        ],
        default: "due",
      },

      paymentDate: {
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
        enum: [
          "live",
          "demo",
        ],
        default: "live",
        index: true,
      },
    },
    {
      timestamps: true,
    }
  );

contributionSchema.index(
  {
    member: 1,
    month: 1,
    year: 1,
  },
  {
    unique: true,
  }
);

contributionSchema.index({
  dataScope: 1,
  year: 1,
  month: 1,
});

module.exports =
  mongoose.model(
    "Contribution",
    contributionSchema
  );