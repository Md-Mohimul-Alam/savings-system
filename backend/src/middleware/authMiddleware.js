const jwt = require("jsonwebtoken");
const User = require("../models/User");

const READ_ONLY_METHODS = new Set([
  "GET",
  "HEAD",
  "OPTIONS",
]);

const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Not authorized. Token missing.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found.",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is not active.",
      });
    }

    req.user = user;

    // Every protected controller can use this.
    req.dataScope = user.isDemo ? "demo" : "live";

    // Demo Admin can browse the complete admin UI,
    // but cannot change anything, even through curl/Postman.
    if (
      user.isDemo &&
      !READ_ONLY_METHODS.has(req.method)
    ) {
      return res.status(403).json({
        success: false,
        demoMode: true,
        message:
          "Demo Mode is read-only. Changes are disabled for the Demo Admin.",
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token.",
    });
  }
};

module.exports = {
  protect,
};
