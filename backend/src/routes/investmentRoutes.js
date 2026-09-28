const express = require("express");

const {
  addInvestment,
  getAllInvestments,
  getInvestmentById,
  updateInvestment,
} = require("../controllers/investmentController");

const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { auditMiddleware } = require("../middleware/auditMiddleware");

const router = express.Router();

router.use(protect);
router.use(auditMiddleware);

router.get("/", getAllInvestments);

router.get("/:id", getInvestmentById);

router.post(
  "/",
  authorizeRoles("admin"),
  addInvestment
);

router.patch(
  "/:id",
  authorizeRoles("admin"),
  updateInvestment
);

module.exports = router;