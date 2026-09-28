const mongoose = require("mongoose");

const joinRequestSchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      phone: {
        type: String,
        trim: true,
        default: "",
      },

      address: {
        type: String,
        trim: true,
        default: "",
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
        ],
        default: "pending",
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

      nidNumber: {
        type: String,
        trim: true,
        default: "",
      },

      passportNumber: {
        type: String,
        trim: true,
        uppercase: true,
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

joinRequestSchema.index({
  dataScope: 1,
  status: 1,
});

module.exports =
  mongoose.model(
    "JoinRequest",
    joinRequestSchema
  );