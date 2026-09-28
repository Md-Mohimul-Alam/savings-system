const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    memberCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    monthlyContribution: {
      type: Number,
      default: 1000,
      min: 0,
    },

    joinDate: {
      type: Date,
      default: Date.now,
    },

    membershipStatus: {
      type: String,
      enum: [
        "active",
        "inactive",
        "exited",
      ],
      default: "active",
    },

    totalContribution: {
      type: Number,
      default: 0,
      min: 0,
    },

    ownershipPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
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

memberSchema.index({
  dataScope: 1,
  membershipStatus: 1,
});

module.exports =
  mongoose.model(
    "Member",
    memberSchema
  );
