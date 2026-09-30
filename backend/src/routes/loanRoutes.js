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

// Pass your existing authentication and data-scope middleware.
// Admin checks are also enforced inside the loan controller.
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

  router
    .route("/")
    .get(getAllLoans)
    .post(createLoanRequest);

  router.get("/:id", getLoanById);

  router.patch("/:id/approve", approveLoan);
  router.patch("/:id/reject", rejectLoan);

  router.post("/:id/disburse", disburseLoan);
  router.post("/:id/repayments", recordLoanRepayment);

  return router;
};

module.exports = createLoanRouter;