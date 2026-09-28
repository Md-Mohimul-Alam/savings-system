const dataScopeMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Authentication required.",
    });
  }

  req.dataScope =
    req.user.isDemo === true
      ? "demo"
      : "live";

  next();
};

module.exports = {
  dataScopeMiddleware,
};
