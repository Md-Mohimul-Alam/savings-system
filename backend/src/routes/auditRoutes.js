const express = require("express");

const {
  getAuditLogs,
} = require("../controllers/auditController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/",
  protect,
  authorizeRoles("admin"),
  getAuditLogs
);

module.exports = router;