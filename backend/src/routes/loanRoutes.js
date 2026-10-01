const express = require("express");

const {
  createLoanRequest,
  getAllLoans,
  getLoanById,
  approveLoan,
  rejectLoan,
  disburseLoan,
  recordLoanRepayment,
} = require("../controllers/loanController");

const {
  authorizeRoles,
} = require("../middleware/roleMiddleware");

const {
  auditMiddleware,
} = require("../middleware/auditMiddleware");

const createLoanRouter = ({
  authenticate,
  resolveDataScope,
}) => {
  if (
    typeof authenticate !== "function" ||
    typeof resolveDataScope !== "function"
  ) {
    throw new Error(
      "Loan routes require authentication and data-scope middleware"
    );
  }

  const router = express.Router();

  router.use(authenticate);
  router.use(resolveDataScope);
  router.use(auditMiddleware);

  // Active members can see the group loan register.
  // Members request for themselves; admins can select a member.
  router
    .route("/")
    .get(getAllLoans)
    .post(createLoanRequest);

  router.get("/:id", getLoanById);

  // Approval does not move cash.
  router.patch(
    "/:id/approve",
    authorizeRoles("admin"),
    approveLoan
  );

  router.patch(
    "/:id/reject",
    authorizeRoles("admin"),
    rejectLoan
  );

  // Record actual disbursements and repayments.
  router.post(
    "/:id/disburse",
    authorizeRoles("admin"),
    disburseLoan
  );

  router.post(
    "/:id/repayments",
    authorizeRoles("admin"),
    recordLoanRepayment
  );

  return router;
};

module.exports = createLoanRouter;