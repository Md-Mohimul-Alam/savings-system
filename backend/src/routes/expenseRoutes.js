const express = require("express");

const {
  addExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
} = require("../controllers/expenseController");

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
  "/",
  authorizeRoles("admin"),
  getAllExpenses
);

router.get(
  "/:id",
  authorizeRoles("admin"),
  getExpenseById
);

router.post(
  "/",
  authorizeRoles("admin"),
  addExpense
);

router.patch(
  "/:id",
  authorizeRoles("admin"),
  updateExpense
);

module.exports = router;