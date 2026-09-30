const mongoose = require("mongoose");

const memberSchema = new mongoose.Schema(
  {
    // Unregistered members have no user field.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
    },

    // Name can exist independently of a login account.
    name: {
      type: String,
      trim: true,
      default: "",
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
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
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
      enum: ["active", "inactive", "exited"],
      default: "active",
    },

    // Personal savings only.
    // Includes historical savings after migration.
    // Excludes fines, loans, and loan repayments.
    totalContribution: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Informational subset of totalContribution.
    // Never add this again when calculating total savings.
    openingContribution: {
      type: Number,
      default: 0,
      min: 0,
    },

    openingBalanceDate: {
      type: Date,
      default: null,
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
      enum: ["live", "demo"],
      default: "live",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Only linked accounts participate in this unique index.
// Multiple unregistered member profiles are allowed.
memberSchema.index(
  { user: 1 },
  {
    unique: true,
    partialFilterExpression: {
      user: { $type: "objectId" },
    },
  }
);

memberSchema.index({
  dataScope: 1,
  membershipStatus: 1,
});

memberSchema.pre("validate", function () {
  if (!this.user && !this.name?.trim()) {
    this.invalidate(
      "name",
      "Name is required for a member without a login account"
    );
  }
});

module.exports = mongoose.model("Member", memberSchema);