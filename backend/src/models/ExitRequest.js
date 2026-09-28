const mongoose = require("mongoose");

const exitRequestSchema =
  new mongoose.Schema(
    {
      member: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Member",
        required: true,
      },

      reason: {
        type: String,
        trim: true,
        default: "",
      },

      status: {
        type: String,
        enum: [
          "pending",
          "approved",
          "rejected",
          "paid",
        ],
        default: "pending",
      },

      estimatedPayout: {
        type: Number,
        default: 0,
        min: 0,
      },

      finalPayout: {
        type: Number,
        default: 0,
        min: 0,
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

      paidAt: {
        type: Date,
        default: null,
      },

      adminNote: {
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

exitRequestSchema.index({
  dataScope: 1,
  status: 1,
});

module.exports =
  mongoose.model(
    "ExitRequest",
    exitRequestSchema
  );