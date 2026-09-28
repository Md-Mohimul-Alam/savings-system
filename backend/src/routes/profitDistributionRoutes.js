const express = require("express");

const {
  distributeProfit,
  getAllProfitDistributions,
  getProfitDistributionById,
} = require("../controllers/profitDistributionController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { auditMiddleware } = require("../middleware/auditMiddleware");

const router = express.Router();

router.use(protect);
router.use(auditMiddleware);

router.get("/", getAllProfitDistributions);

router.get(
  "/:id",
  getProfitDistributionById
);

router.post(
  "/",
  authorizeRoles("admin"),
  distributeProfit
);

module.exports = router;