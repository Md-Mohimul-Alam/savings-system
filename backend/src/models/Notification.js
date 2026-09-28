const mongoose = require("mongoose");

const notificationSchema =
  new mongoose.Schema(
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },

      title: {
        type: String,
        required: true,
        trim: true,
      },

      message: {
        type: String,
        required: true,
        trim: true,
      },

      type: {
        type: String,
        enum: [
          "INFO",
          "CONTRIBUTION",
          "INVESTMENT",
          "JOIN_REQUEST",
          "EXIT_REQUEST",
          "PROFIT",
          "SYSTEM",
        ],
        default: "INFO",
      },

      isRead: {
        type: Boolean,
        default: false,
      },

      link: {
        type: String,
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

notificationSchema.index({
  user: 1,
  dataScope: 1,
  createdAt: -1,
});

module.exports =
  mongoose.model(
    "Notification",
    notificationSchema
  );