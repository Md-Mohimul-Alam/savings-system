const mongoose = require("mongoose");

const ExitRequest = require("../models/ExitRequest");
const Member = require("../models/Member");
const Loan = require("../models/Loan");
const Transaction = require("../models/Transaction");

const {
  calculateMemberPayout,
} = require("../services/payoutService");

const {
  createNotification,
} = require("../services/notificationService");

// Same model and collection used by loanController.
const CashLock =
  mongoose.models.CashLock ||
  mongoose.model(
    "CashLock",
    new mongoose.Schema({
      _id: { type: String },
      version: { type: Number, default: 0 },
    })
  );

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

const readText = (value, label) => {
  if (value === undefined) return "";

  if (typeof value !== "string") {
    fail(`${label} must be text`);
  }

  return value.trim();
};

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

    await action(req, res);
  } catch (error) {
    console.error("Exit request error:", error);

    const status =
      error.statusCode ||
      (error.code === 11000 ? 409 : 0) ||
      (["ValidationError", "CastError"].includes(error.name)
        ? 400
        : 500);

    return res.status(status).json({
      success: false,
      message:
        error.code === 11000
          ? "A conflicting record already exists"
          : status < 500
            ? error.message
            : "Failed to process exit request",
    });
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
    if (error.code !== 11000) throw error;
  }
};

const withTransaction = async (dataScope, action) => {
  await ensureCashLock(dataScope);

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Serialize exit operations and loan disbursements.
      await CashLock.updateOne(
        { _id: dataScope },
        { $inc: { version: 1 } },
        { session }
      );

      await action(session);
    });
  } finally {
    await session.endSession();
  }
};

const getRequest = async (req, session) => {
  validateId(req.params.id, "exit request ID");

  const exitRequest = await ExitRequest.findOne({
    _id: req.params.id,
    dataScope: req.dataScope,
  }).session(session);

  if (!exitRequest) {
    fail("Exit request not found", 404);
  }

  return exitRequest;
};

const populateRequest = (id, dataScope) =>
  ExitRequest.findOne({
    _id: id,
    dataScope,
  })
    .populate({
      path: "member",
      populate: {
        path: "user",
        select: "name email role status",
      },
    })
    .populate("reviewedBy", "name email");

const notifyMember = async (memberId, dataScope, title, message) => {
  try {
    const member = await Member.findOne({
      _id: memberId,
      dataScope,
    }).select("user");

    if (!member?.user) return;

    await createNotification({
      user: member.user,
      title,
      message,
      type: "EXIT_REQUEST",
      link: "/dashboard/my-exit-request",
    });
  } catch (error) {
    // The financial operation is already committed.
    console.error("Exit notification failed:", error);
  }
};

// --------------------------------------------------
// CREATE EXIT REQUEST
// Member: own profile.
// Admin: can submit for a member without a login.
// --------------------------------------------------

const createExitRequest = handler(false, async (req, res) => {
  const body = req.body || {};
  const reason = readText(body.reason, "Reason");

  let selectedMemberId;

  if (req.user.role === "admin") {
    validateId(body.memberId, "member ID");
    selectedMemberId = body.memberId;
  } else if (req.user.role !== "member") {
    fail("Member access required", 403);
  } else if (body.memberId !== undefined) {
    fail("Members must request their own exit", 403);
  }

  let savedId;
  let payout;

  await withTransaction(req.dataScope, async (session) => {
    const filter = {
      dataScope: req.dataScope,
      ...(selectedMemberId
        ? { _id: selectedMemberId }
        : { user: req.user._id }),
    };

    const member = await Member.findOne(filter).session(session);

    if (!member) {
      fail("Member profile not found", 404);
    }

    if (member.membershipStatus !== "active") {
      fail("Only active members can request an exit", 409);
    }

    const existing = await ExitRequest.findOne({
      member: member._id,
      status: { $in: ["pending", "approved", "paid"] },
      dataScope: req.dataScope,
    }).session(session);

    if (existing) {
      fail("An active or completed exit request already exists", 409);
    }

    payout = await calculateMemberPayout(
      member._id,
      req.dataScope,
      session
    );

    const [exitRequest] = await ExitRequest.create(
      [
        {
          member: member._id,
          reason,
          status: "pending",
          estimatedPayout: payout.estimatedPayout,
          dataScope: req.dataScope,
        },
      ],
      { session }
    );

    savedId = exitRequest._id;
  });

  return res.status(201).json({
    success: true,
    message: "Exit request submitted successfully",
    payout,
    exitRequest: await populateRequest(savedId, req.dataScope),
  });
});

// --------------------------------------------------
// GET ALL EXIT REQUESTS
// ADMIN
// --------------------------------------------------

const getAllExitRequests = handler(true, async (req, res) => {
  const filter = { dataScope: req.dataScope };

  if (req.query.status !== undefined) {
    if (
      !["pending", "approved", "rejected", "paid"].includes(
        req.query.status
      )
    ) {
      fail("Invalid exit request status");
    }

    filter.status = req.query.status;
  }

  const exitRequests = await ExitRequest.find(filter)
    .populate({
      path: "member",
      populate: {
        path: "user",
        select: "name email role status",
      },
    })
    .populate("reviewedBy", "name email")
    .sort({ createdAt: -1, _id: -1 });

  return res.status(200).json({
    success: true,
    count: exitRequests.length,
    exitRequests,
  });
});

// --------------------------------------------------
// GET MY EXIT REQUEST
// --------------------------------------------------

const getMyExitRequest = handler(false, async (req, res) => {
  const member = await Member.findOne({
    user: req.user._id,
    dataScope: req.dataScope,
  });

  if (!member) {
    fail("Member profile not found", 404);
  }

  const exitRequest = await ExitRequest.findOne({
    member: member._id,
    dataScope: req.dataScope,
  })
    .populate("reviewedBy", "name email")
    .sort({ createdAt: -1, _id: -1 });

  if (!exitRequest) {
    fail("No exit request found", 404);
  }

  return res.status(200).json({
    success: true,
    exitRequest,
  });
});

// --------------------------------------------------
// APPROVE OR REFRESH EXIT PAYOUT
// ADMIN
// --------------------------------------------------

const approveExitRequest = handler(true, async (req, res) => {
  const adminNote = readText(req.body?.adminNote, "Admin note");

  let payout;
  let memberId;

  await withTransaction(req.dataScope, async (session) => {
    const exitRequest = await getRequest(req, session);

    if (!["pending", "approved"].includes(exitRequest.status)) {
      fail("Only pending or approved requests can be reviewed", 409);
    }

    payout = await calculateMemberPayout(
      exitRequest.member,
      req.dataScope,
      session
    );

    if (payout.remainingDebtAfterOffset > 0) {
      fail("Member debt exceeds their entitlement", 409);
    }

    exitRequest.status = "approved";
    exitRequest.finalPayout = payout.estimatedPayout;
    exitRequest.reviewedBy = req.user._id;
    exitRequest.reviewedAt = new Date();
    exitRequest.adminNote = adminNote;

    await exitRequest.save({ session });

    memberId = exitRequest.member;
  });

  await notifyMember(
    memberId,
    req.dataScope,
    "Exit Request Approved",
    `Your current payout estimate is ৳${payout.estimatedPayout}. ` +
      "Outstanding loans must be settled before payment."
  );

  return res.status(200).json({
    success: true,
    message: "Exit request approved successfully",
    payout,
    exitRequest: await populateRequest(req.params.id, req.dataScope),
  });
});

// --------------------------------------------------
// REJECT EXIT REQUEST
// ADMIN
// --------------------------------------------------

const rejectExitRequest = handler(true, async (req, res) => {
  const adminNote = readText(req.body?.adminNote, "Admin note");
  let memberId;

  await withTransaction(req.dataScope, async (session) => {
    const exitRequest = await getRequest(req, session);

    if (!["pending", "approved"].includes(exitRequest.status)) {
      fail("Only unpaid requests can be rejected", 409);
    }

    exitRequest.status = "rejected";
    exitRequest.reviewedBy = req.user._id;
    exitRequest.reviewedAt = new Date();
    exitRequest.adminNote = adminNote;

    await exitRequest.save({ session });

    memberId = exitRequest.member;
  });

  await notifyMember(
    memberId,
    req.dataScope,
    "Exit Request Rejected",
    adminNote || "Your exit request was rejected."
  );

  return res.status(200).json({
    success: true,
    message: "Exit request rejected successfully",
    exitRequest: await populateRequest(req.params.id, req.dataScope),
  });
});

// --------------------------------------------------
// RECORD FINAL PAYOUT
// ADMIN
// --------------------------------------------------

const markExitAsPaid = handler(true, async (req, res) => {
  let memberId;
  let paidAmount;

  await withTransaction(req.dataScope, async (session) => {
    const exitRequest = await getRequest(req, session);

    if (exitRequest.status !== "approved") {
      fail("Only approved requests can be marked as paid", 409);
    }

    const member = await Member.findOne({
      _id: exitRequest.member,
      dataScope: req.dataScope,
      membershipStatus: "active",
    }).session(session);

    if (!member) {
      fail("Active member not found", 409);
    }

    const duplicate = await Transaction.exists({
      type: "MEMBER_PAYOUT",
      referenceType: "ExitRequest",
      referenceId: exitRequest._id,
      dataScope: req.dataScope,
    }).session(session);

    if (duplicate) {
      fail("This exit payout has already been recorded", 409);
    }

    const payout = await calculateMemberPayout(
      member._id,
      req.dataScope,
      session
    );

    const activeLoan = await Loan.exists({
      member: member._id,
      status: "active",
      dataScope: req.dataScope,
    }).session(session);

    if (payout.outstandingMemberLoan > 0 || activeLoan) {
      fail(
        "Settle the member's outstanding loans before final payout",
        409
      );
    }

    const approvedPaisa = Math.round(
      Number(exitRequest.finalPayout) * 100
    );

    const currentPaisa = Math.round(
      payout.estimatedPayout * 100
    );

    if (approvedPaisa !== currentPaisa) {
      fail(
        "Payout changed. Review and approve the request again.",
        409
      );
    }

    if (!payout.canPayNow) {
      fail("Insufficient available cash for the final payout", 409);
    }

    const amount = Number(exitRequest.finalPayout);

    if (amount <= 0) {
      fail("Zero-value exits require a separate settlement workflow", 409);
    }

    await Transaction.create(
      [
        {
          type: "MEMBER_PAYOUT",
          direction: "OUT",
          amount,
          member: member._id,
          referenceType: "ExitRequest",
          referenceId: exitRequest._id,
          description: `Final payout for ${member.memberCode}`,
          transactionDate: new Date(),
          createdBy: req.user._id,
          dataScope: req.dataScope,
        },
      ],
      { session }
    );

    exitRequest.status = "paid";
    exitRequest.paidAt = new Date();

    await exitRequest.save({ session });

    member.membershipStatus = "exited";

    await member.save({ session });

    memberId = member._id;
    paidAmount = amount;
  });

  await notifyMember(
    memberId,
    req.dataScope,
    "Exit Payout Completed",
    `Your final payout of ৳${paidAmount} has been recorded.`
  );

  return res.status(200).json({
    success: true,
    message: "Exit payout recorded successfully",
    exitRequest: await populateRequest(req.params.id, req.dataScope),
  });
});

module.exports = {
  createExitRequest,
  getAllExitRequests,
  getMyExitRequest,
  approveExitRequest,
  rejectExitRequest,
  markExitAsPaid,
};