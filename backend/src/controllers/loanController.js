const mongoose = require("mongoose");

const Loan = require("../models/Loan");
const Member = require("../models/Member");
const Transaction = require("../models/Transaction");

// Shared with the other financial controllers.
const cashLockSchema = new mongoose.Schema({
  _id: { type: String },
  version: { type: Number, default: 0 },
});

const CashLock =
  mongoose.models.CashLock ||
  mongoose.model("CashLock", cashLockSchema);

// --------------------------------------------------
// VALIDATION HELPERS
// --------------------------------------------------

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const validateId = (value, label) => {
  if (
    typeof value !== "string" ||
    !mongoose.Types.ObjectId.isValid(value)
  ) {
    fail(`Invalid ${label}`);
  }
};

const readMoney = (value, label) => {
  if (
    !["number", "string"].includes(typeof value) ||
    (typeof value === "string" && !value.trim())
  ) {
    fail(`${label} must be a valid amount`);
  }

  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isSafeInteger(Math.round(amount * 100)) ||
    Math.abs(amount * 100 - Math.round(amount * 100)) >
      0.000001
  ) {
    fail(`${label} must be positive with at most 2 decimals`);
  }

  return amount;
};

const readText = (value, label, required = false) => {
  if (value === undefined && !required) return "";

  if (
    typeof value !== "string" ||
    (required && !value.trim())
  ) {
    fail(`${label} must be ${required ? "non-empty " : ""}text`);
  }

  return value.trim();
};

const readDate = (value, label) => {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${label} must be a valid date string`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    fail(`Invalid ${label}`);
  }

  return date;
};

// --------------------------------------------------
// AUTHORIZATION AND ERROR HANDLING
// --------------------------------------------------

const handler = (adminOnly, action) => async (req, res) => {
  try {
    if (!req.user?._id) {
      fail("Authentication required", 401);
    }

    if (!["live", "demo"].includes(req.dataScope)) {
      fail("Invalid data scope");
    }

    if (adminOnly && req.user.role !== "admin") {
      fail("Admin access required", 403);
    }

    if (!adminOnly && req.user.role !== "admin") {
      const member = await Member.findOne({
        user: req.user._id,
        dataScope: req.dataScope,
        membershipStatus: "active",
      });

      if (!member) {
        fail("Active membership required", 403);
      }

      req.loanMember = member;
    }

    await action(req, res);
  } catch (error) {
    console.error("Loan controller error:", error);

    const status =
      error.statusCode ||
      (error.name === "VersionError" || error.code === 11000
        ? 409
        : 0) ||
      (["ValidationError", "CastError"].includes(error.name)
        ? 400
        : 500);

    return res.status(status).json({
      success: false,
      message:
        error.name === "VersionError"
          ? "Loan changed during this request. Refresh and try again."
          : error.code === 11000
            ? "A conflicting record already exists"
            : status < 500
              ? error.message
              : "Failed to process loan request",
    });
  }
};

// --------------------------------------------------
// DATABASE HELPERS
// --------------------------------------------------

const findLoan = async (req, session) => {
  validateId(req.params.id, "loan ID");

  const query = Loan.findOne({
    _id: req.params.id,
    dataScope: req.dataScope,
  });

  const loan = await (session ? query.session(session) : query);

  if (!loan) {
    fail("Loan not found", 404);
  }

  return loan;
};

const populatedLoan = (id, dataScope) =>
  Loan.findOne({
    _id: id,
    dataScope,
  })
    .populate({
      path: "member",
      select: "name memberCode user",
      populate: {
        path: "user",
        select: "name",
      },
    })
    .populate("requestedBy", "name")
    .populate("reviewedBy", "name")
    .populate("disbursedBy", "name")
    .populate("repayments.recordedBy", "name");

const withTransaction = async (action) => {
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(() => action(session));
  } finally {
    await session.endSession();
  }
};

const ensureCashLock = async (dataScope) => {
  try {
    await CashLock.updateOne(
      { _id: dataScope },
      { $setOnInsert: { version: 0 } },
      { upsert: true }
    );
  } catch (error) {
    // Another request may have created the same lock.
    if (error.code !== 11000) {
      throw error;
    }
  }
};

// --------------------------------------------------
// REQUEST LOAN
// Members request for themselves.
// Admins can select an active member without a login.
// --------------------------------------------------

const createLoanRequest = handler(false, async (req, res) => {
  const body = req.body || {};
  const requestedAmount = readMoney(body.amount, "Loan amount");
  const reason = readText(body.reason, "Reason", true);

  let member;

  if (req.user.role === "admin") {
    validateId(body.memberId, "member ID");

    member = await Member.findOne({
      _id: body.memberId,
      dataScope: req.dataScope,
      membershipStatus: "active",
    });

    if (!member) {
      fail("Active member not found", 404);
    }
  } else {
    member = req.loanMember;

    if (
      body.memberId !== undefined &&
      String(member._id) !== body.memberId
    ) {
      fail("You can request a loan only for yourself", 403);
    }
  }

  const loan = await Loan.create({
    member: member._id,
    requestedAmount,
    reason,
    requestedBy: req.user._id,
    status: "pending",
    dataScope: req.dataScope,
  });

  return res.status(201).json({
    success: true,
    message: "Loan request submitted",
    loan: await populatedLoan(loan._id, req.dataScope),
  });
});

// --------------------------------------------------
// GROUP LOAN REGISTER
// Visible to active members and admins.
// --------------------------------------------------

const getAllLoans = handler(false, async (req, res) => {
  const filter = {
    dataScope: req.dataScope,
  };

  const { status, memberId } = req.query;

  if (status !== undefined) {
    if (
      ![
        "pending",
        "approved",
        "rejected",
        "active",
        "repaid",
        "cancelled",
      ].includes(status)
    ) {
      fail("Invalid loan status");
    }

    filter.status = status;
  }

  if (memberId !== undefined) {
    validateId(memberId, "member ID");
    filter.member = memberId;
  }

  const loans = await Loan.find(filter)
    .populate({
      path: "member",
      select: "name memberCode user",
      populate: {
        path: "user",
        select: "name",
      },
    })
    .sort({
      createdAt: -1,
      _id: -1,
    });

  return res.status(200).json({
    success: true,
    count: loans.length,
    loans,
  });
});

// --------------------------------------------------
// GET SINGLE LOAN
// --------------------------------------------------

const getLoanById = handler(false, async (req, res) => {
  validateId(req.params.id, "loan ID");

  const loan = await populatedLoan(
    req.params.id,
    req.dataScope
  );

  if (!loan) {
    fail("Loan not found", 404);
  }

  return res.status(200).json({
    success: true,
    loan,
  });
});

// --------------------------------------------------
// APPROVE LOAN
// Approval does not move cash.
// --------------------------------------------------

const approveLoan = handler(true, async (req, res) => {
  const body = req.body || {};
  const adminNote = readText(body.adminNote, "Admin note");

  const amount =
    body.approvedAmount === undefined
      ? undefined
      : readMoney(body.approvedAmount, "Approved amount");

  const dueDate =
    body.repaymentDueDate === undefined
      ? null
      : readDate(body.repaymentDueDate, "Repayment deadline");

  if (dueDate && dueDate <= new Date()) {
    fail("Repayment deadline must be in the future");
  }

  await withTransaction(async (session) => {
    const loan = await findLoan(req, session);

    if (loan.status !== "pending") {
      fail("Only pending loans can be approved", 409);
    }

    const member = await Member.findOne({
      _id: loan.member,
      dataScope: req.dataScope,
      membershipStatus: "active",
    }).session(session);

    if (!member) {
      fail("Borrower is no longer active", 409);
    }

    loan.approvedAmount = amount ?? loan.requestedAmount;
    loan.status = "approved";
    loan.reviewedBy = req.user._id;
    loan.reviewedAt = new Date();
    loan.adminNote = adminNote;
    loan.repaymentDueDate = dueDate;

    await loan.save({ session });
  });

  return res.status(200).json({
    success: true,
    message: "Loan approved; cash has not been disbursed",
    loan: await populatedLoan(req.params.id, req.dataScope),
  });
});

// --------------------------------------------------
// REJECT LOAN
// --------------------------------------------------

const rejectLoan = handler(true, async (req, res) => {
  const adminNote = readText(
    req.body?.adminNote,
    "Admin note"
  );

  await withTransaction(async (session) => {
    const loan = await findLoan(req, session);

    if (loan.status !== "pending") {
      fail("Only pending loans can be rejected", 409);
    }

    loan.status = "rejected";
    loan.reviewedBy = req.user._id;
    loan.reviewedAt = new Date();
    loan.adminNote = adminNote;

    await loan.save({ session });
  });

  return res.status(200).json({
    success: true,
    message: "Loan rejected",
    loan: await populatedLoan(req.params.id, req.dataScope),
  });
});

// --------------------------------------------------
// DISBURSE FULL APPROVED AMOUNT
// Records a cash transfer; does not send money itself.
// --------------------------------------------------

const disburseLoan = handler(true, async (req, res) => {
  validateId(req.params.id, "loan ID");

  await ensureCashLock(req.dataScope);

  await withTransaction(async (session) => {
    // Acquire the shared cash lock before reading cash.
    await CashLock.updateOne(
      { _id: req.dataScope },
      { $inc: { version: 1 } },
      { session }
    );

    const loan = await findLoan(req, session);

    if (loan.status !== "approved") {
      fail("Only approved loans can be disbursed", 409);
    }

    const member = await Member.findOne({
      _id: loan.member,
      dataScope: req.dataScope,
      membershipStatus: "active",
    }).session(session);

    if (!member) {
      fail("Borrower is no longer active", 409);
    }

    const now = new Date();

    if (
      loan.repaymentDueDate &&
      loan.repaymentDueDate <= now
    ) {
      fail(
        "The repayment deadline has passed; this loan cannot be disbursed",
        409
      );
    }

    const [cash] = await Transaction.aggregate([
      {
        $match: {
          dataScope: req.dataScope,
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: {
              $cond: [
                { $eq: ["$direction", "IN"] },
                "$amount",
                { $multiply: ["$amount", -1] },
              ],
            },
          },
        },
      },
    ]).session(session);

    const availablePaisa = Math.round(
      Number(cash?.total || 0) * 100
    );

    if (
      Math.round(loan.approvedAmount * 100) > availablePaisa
    ) {
      fail("Insufficient available cash", 409);
    }

    const [transaction] = await Transaction.create(
      [
        {
          type: "LOAN_DISBURSEMENT",
          direction: "OUT",
          amount: loan.approvedAmount,
          member: loan.member,
          referenceType: "Loan",
          referenceId: loan._id,
          description: "Member loan disbursement",
          transactionDate: now,
          createdBy: req.user._id,
          dataScope: req.dataScope,
        },
      ],
      { session }
    );

    loan.disbursedAmount = loan.approvedAmount;
    loan.disbursedAt = now;
    loan.disbursedBy = req.user._id;
    loan.disbursementTransaction = transaction._id;
    loan.status = "active";

    await loan.save({ session });
  });

  return res.status(200).json({
    success: true,
    message: "Loan disbursement recorded",
    loan: await populatedLoan(req.params.id, req.dataScope),
  });
});

// --------------------------------------------------
// RECORD REPAYMENT
// amount is this payment, not the cumulative total.
// Repayments do not increase personal savings.
// --------------------------------------------------

const recordLoanRepayment = handler(true, async (req, res) => {
  const body = req.body || {};
  const amount = readMoney(body.amount, "Repayment amount");
  const note = readText(body.note, "Note");

  await ensureCashLock(req.dataScope);

  await withTransaction(async (session) => {
    // Use the same lock as other cash-changing operations.
    await CashLock.updateOne(
      { _id: req.dataScope },
      { $inc: { version: 1 } },
      { session }
    );

    const loan = await findLoan(req, session);

    if (loan.status !== "active") {
      fail("Only active loans can receive repayments", 409);
    }

    if (
      Math.round(amount * 100) >
      Math.round(loan.outstandingAmount * 100)
    ) {
      fail("Repayment exceeds the outstanding loan");
    }

    const now = new Date();

    const [transaction] = await Transaction.create(
      [
        {
          type: "LOAN_REPAYMENT",
          direction: "IN",
          amount,
          member: loan.member,
          referenceType: "Loan",
          referenceId: loan._id,
          description: "Member loan repayment",
          transactionDate: now,
          createdBy: req.user._id,
          dataScope: req.dataScope,
        },
      ],
      { session }
    );

    loan.repayments.push({
      amount,
      paymentDate: now,
      recordedBy: req.user._id,
      transaction: transaction._id,
      note,
    });

    if (loan.outstandingAmount === 0) {
      loan.status = "repaid";
    }

    await loan.save({ session });
  });

  return res.status(200).json({
    success: true,
    message: "Loan repayment recorded",
    loan: await populatedLoan(req.params.id, req.dataScope),
  });
});

module.exports = {
  createLoanRequest,
  getAllLoans,
  getLoanById,
  approveLoan,
  rejectLoan,
  disburseLoan,
  recordLoanRepayment,
};