const express = require("express");

const {
  getDashboardSummary,
} = require("../controllers/dashboardController");

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  auditMiddleware,
} = require("../middleware/auditMiddleware");

const router = express.Router();

router.use(protect);
router.use(auditMiddleware);

router.get(
  "/",
  getDashboardSummary
);

module.exports = router;