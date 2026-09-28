const express = require("express");

const {
  getAllTransactions,
  getCashSummary,
} = require("../controllers/transactionController");

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  authorizeRoles,
} = require("../middleware/roleMiddleware");

const {
  auditMiddleware,
} = require("../middleware/auditMiddleware");

const router = express.Router();

router.use(protect);
router.use(auditMiddleware);

router.get(
  "/summary",
  authorizeRoles("admin"),
  getCashSummary
);

router.get(
  "/",
  authorizeRoles("admin"),
  getAllTransactions
);

module.exports = router;