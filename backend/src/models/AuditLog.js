const mongoose = require("mongoose");

const auditLogSchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null,
      },

      action: {
        type: String,
        required: true,
        trim: true,
      },

      method: {
        type: String,
        required: true,
      },

      endpoint: {
        type: String,
        required: true,
      },

      ipAddress: {
        type: String,
        default: "",
      },

      statusCode: {
        type: Number,
        default: null,
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

auditLogSchema.index({
  dataScope: 1,
  createdAt: -1,
});

module.exports =
  mongoose.model(
    "AuditLog",
    auditLogSchema
  );