const AuditLog = require("../models/AuditLog");

const auditMiddleware = (req, res, next) => {
  res.on("finish", async () => {
    try {
      // Don't log normal GET requests
      if (req.method === "GET") {
        return;
      }

      if (!req.user) {
        return;
      }

      await AuditLog.create({
        user: req.user._id,

        action: `${req.method} ${req.originalUrl}`,

        method: req.method,

        endpoint: req.originalUrl,

        ipAddress:
          req.headers["x-forwarded-for"] ||
          req.socket?.remoteAddress ||
          "",

        statusCode: res.statusCode,
      });
    } catch (error) {
      console.error(
        "Audit log error:",
        error.message
      );
    }
  });

  next();
};

module.exports = {
  auditMiddleware,
};