const AuditLog = require("../models/AuditLog");

const getAuditLogs = async (req, res) => {
  try {
    const logs = await AuditLog.find({
      dataScope: req.dataScope,
    })
      .populate("user", "name email role adminCode isDemo")
      .sort({ createdAt: -1 })
      .limit(500);

    return res.status(200).json({
      success: true,
      demoMode: req.user?.isDemo === true,
      count: logs.length,
      logs,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  getAuditLogs,
};
