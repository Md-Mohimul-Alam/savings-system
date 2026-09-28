const Notification = require("../models/Notification");

const getMyNotifications = async (req, res) => {
  try {
    const filter = {
      user: req.user._id,
      dataScope: req.dataScope,
    };

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 });

    const unreadCount = await Notification.countDocuments({
      ...filter,
      isRead: false,
    });

    return res.status(200).json({
      success: true,
      demoMode: req.user?.isDemo === true,
      unreadCount,
      notifications,
    });
  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      user: req.user._id,
      dataScope: req.dataScope,
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: "Notification marked as read",
      notification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      {
        user: req.user._id,
        isRead: false,
        dataScope: req.dataScope,
      },
      {
        $set: {
          isRead: true,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
};
