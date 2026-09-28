const Notification = require("../models/Notification");

const createNotification = async ({
  user,
  title,
  message,
  type = "INFO",
  link = "",
  dataScope = "live",
}) => {
  try {
    if (!user) {
      return null;
    }

    const notification =
      await Notification.create({
        user,
        title,
        message,
        type,
        link,
        dataScope,
      });

    return notification;
  } catch (error) {
    console.error(
      "Create notification error:",
      error.message
    );

    return null;
  }
};

module.exports = {
  createNotification,
};