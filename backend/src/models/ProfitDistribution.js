const mongoose = require("mongoose");

const profitDistributionSchema =
  new mongoose.Schema(
    {
      investment: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Investment",
        required: true,
      },

      totalProfit: {
        type: Number,
        required: true,
        min: 0,
      },

      distributionDate: {
        type: Date,
        default: Date.now,
      },

      members: [
        {
          member: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Member",
            required: true,
          },

          ownershipPercentage: {
            type: Number,
            required: true,
          },

          profitShare: {
            type: Number,
            required: true,
            min: 0,
          },
        },
      ],

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

profitDistributionSchema.index({
  dataScope: 1,
  distributionDate: -1,
});

module.exports =
  mongoose.model(
    "ProfitDistribution",
    profitDistributionSchema
  );