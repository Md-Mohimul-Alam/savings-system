const mongoose = require("mongoose");

const expenseSchema =
  new mongoose.Schema(
    {
      title: {
        type: String,
        required: true,
        trim: true,
      },

      category: {
        type: String,
        enum: [
          "GENERAL",
          "ADMIN",
          "INVESTMENT",
          "BANK_FEE",
          "TRANSPORT",
          "OTHER",
        ],
        default: "GENERAL",
      },

      amount: {
        type: Number,
        required: true,
        min: 0,
      },

      expenseDate: {
        type: Date,
        default: Date.now,
      },

      note: {
        type: String,
        trim: true,
        default: "",
      },

      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
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

expenseSchema.index({
  dataScope: 1,
  expenseDate: -1,
});

module.exports =
  mongoose.model(
    "Expense",
    expenseSchema
  );