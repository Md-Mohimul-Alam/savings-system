const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const JoinRequest = require("../models/JoinRequest");
const Member = require("../models/Member");
const User = require("../models/User");

const {
  createNotification,
} = require("../services/notificationService");

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

const text = (value, label) => {
  if (value === undefined) return "";

  if (typeof value !== "string") {
    fail(`${label} must be text`);
  }

  return value.trim();
};

const generateMemberCode = () =>
  `MEM-${randomUUID().replace(/-/g, "").toUpperCase()}`;

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
    console.error("Join request error:", error);

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
          ? "A conflicting member or request already exists"
          : status < 500
            ? error.message
            : "Failed to process join request",
    });
  }
};

const populatedRequest = (id, dataScope) =>
  JoinRequest.findOne({
    _id: id,
    dataScope,
  })
    .populate("user", "name email role status")
    .populate("reviewedBy", "name email");

const notify = async (payload) => {
  try {
    await createNotification(payload);
  } catch (error) {
    // Notification failure must not invalidate committed approval.
    console.error("Join request notification failed:", error);
  }
};

// --------------------------------------------------
// CREATE JOIN REQUEST
// --------------------------------------------------

const createJoinRequest = handler(false, async (req, res) => {
  if (req.user.role !== "member") {
    fail("Only member accounts can submit join requests", 403);
  }

  const body = req.body || {};

  const personal = {
    phone: text(body.phone, "Phone"),
    address: text(body.address, "Address"),
    nidNumber: text(body.nidNumber, "NID number"),
    passportNumber: text(
      body.passportNumber,
      "Passport number"
    ).toUpperCase(),
    reason: text(body.reason, "Reason"),
  };

  const existingMember = await Member.findOne({
    user: req.user._id,
    dataScope: req.dataScope,
  });

  if (existingMember) {
    fail("You already have a member profile", 409);
  }

  const existingPending = await JoinRequest.findOne({
    user: req.user._id,
    status: "pending",
    dataScope: req.dataScope,
  });

  if (existingPending) {
    fail("You already have a pending join request", 409);
  }

  const joinRequest = await JoinRequest.create({
    user: req.user._id,
    ...personal,
    status: "pending",
    dataScope: req.dataScope,
  });

  return res.status(201).json({
    success: true,
    message: "Join request submitted successfully",
    joinRequest,
  });
});

// --------------------------------------------------
// GET MY LATEST JOIN REQUEST
// --------------------------------------------------

const getMyJoinRequest = handler(false, async (req, res) => {
  const joinRequest = await JoinRequest.findOne({
    user: req.user._id,
    dataScope: req.dataScope,
  })
    .populate("reviewedBy", "name email")
    .sort({ createdAt: -1, _id: -1 });

  if (!joinRequest) {
    fail("No join request found", 404);
  }

  return res.status(200).json({
    success: true,
    joinRequest,
  });
});

// --------------------------------------------------
// GET ALL JOIN REQUESTS
// ADMIN
// --------------------------------------------------

const getAllJoinRequests = handler(true, async (req, res) => {
  const filter = {
    dataScope: req.dataScope,
  };

  if (req.query.status !== undefined) {
    if (
      !["pending", "approved", "rejected"].includes(
        req.query.status
      )
    ) {
      fail("Invalid request status");
    }

    filter.status = req.query.status;
  }

  const joinRequests = await JoinRequest.find(filter)
    .populate("user", "name email role status")
    .populate("reviewedBy", "name email")
    .sort({ createdAt: -1, _id: -1 });

  return res.status(200).json({
    success: true,
    count: joinRequests.length,
    joinRequests,
  });
});

// --------------------------------------------------
// APPROVE JOIN REQUEST
// ADMIN
//
// Supply body.memberId to link an existing profile.
// Otherwise create a new financial member.
// --------------------------------------------------

const approveJoinRequest = handler(true, async (req, res) => {
  validateId(req.params.id, "join request ID");

  const body = req.body || {};
  const adminNote = text(body.adminNote, "Admin note");

  if (body.memberId !== undefined) {
    validateId(body.memberId, "member ID");
  }

  const session = await mongoose.startSession();

  let savedMemberId;
  let approvedUserId;

  try {
    await session.withTransaction(async () => {
      const joinRequest = await JoinRequest.findOne({
        _id: req.params.id,
        dataScope: req.dataScope,
      }).session(session);

      if (!joinRequest) {
        fail("Join request not found", 404);
      }

      if (joinRequest.status !== "pending") {
        fail("Only pending requests can be approved", 409);
      }

      const user = await User.findOne({
        _id: joinRequest.user,
        dataScope: req.dataScope,
      }).session(session);

      if (!user) {
        fail("User linked to this request was not found", 404);
      }

      if (
        user.role !== "member" ||
        !["pending", "active"].includes(user.status)
      ) {
        fail("This account cannot be approved", 409);
      }

      const existingMember = await Member.findOne({
        user: user._id,
        dataScope: req.dataScope,
      }).session(session);

      let member;

      if (existingMember) {
        // Handles a request left pending after approveUser
        // already activated and linked the account.
        if (
          body.memberId !== undefined &&
          String(existingMember._id) !== body.memberId
        ) {
          fail("Account is already linked to another profile", 409);
        }

        if (existingMember.membershipStatus !== "active") {
          fail("Existing member profile is not active", 409);
        }

        member = existingMember;
      } else if (body.memberId !== undefined) {
        member = await Member.findOne({
          _id: body.memberId,
          dataScope: req.dataScope,
        }).session(session);

        if (!member) {
          fail("Existing member profile not found", 404);
        }

        if (member.user) {
          fail("This profile already has a linked account", 409);
        }

        if (member.membershipStatus !== "active") {
          fail("Only active profiles can be linked", 409);
        }

        // Keep balances, member code and original join date.
        member.user = user._id;

        if (!member.name) {
          member.name = user.name;
        }

        // Fill empty fields without replacing existing identity data.
        for (const field of [
          "phone",
          "address",
          "nidNumber",
          "passportNumber",
        ]) {
          if (!member[field]) {
            member[field] = joinRequest[field] || "";
          }
        }

        await member.save({ session });
      } else {
        member = new Member({
          user: user._id,
          name: user.name,
          memberCode: generateMemberCode(),
          phone: joinRequest.phone || "",
          address: joinRequest.address || "",
          nidNumber: joinRequest.nidNumber || "",
          passportNumber: joinRequest.passportNumber || "",
          monthlyContribution: 1000,
          membershipStatus: "active",
          dataScope: req.dataScope,
        });

        await member.save({ session });
      }

      user.status = "active";
      await user.save({ session });

      joinRequest.status = "approved";
      joinRequest.reviewedBy = req.user._id;
      joinRequest.reviewedAt = new Date();
      joinRequest.adminNote = adminNote;

      await joinRequest.save({ session });

      savedMemberId = member._id;
      approvedUserId = user._id;
    });
  } finally {
    await session.endSession();
  }

  await notify({
    user: approvedUserId,
    title: "Membership Approved",
    message:
      "Your membership application has been approved. " +
      "You can now log in to your account.",
    type: "JOIN_REQUEST",
    link: "/dashboard",
  });

  const member = await Member.findOne({
    _id: savedMemberId,
    dataScope: req.dataScope,
  }).populate("user", "name email role status");

  const joinRequest = await populatedRequest(
    req.params.id,
    req.dataScope
  );

  return res.status(200).json({
    success: true,
    message: "Join request approved successfully",
    member,
    joinRequest,
  });
});

// --------------------------------------------------
// REJECT JOIN REQUEST
// ADMIN
// --------------------------------------------------

const rejectJoinRequest = handler(true, async (req, res) => {
  validateId(req.params.id, "join request ID");

  const adminNote = text(
    req.body?.adminNote,
    "Admin note"
  );

  // Conditional update prevents overwriting an approval.
  const joinRequest = await JoinRequest.findOneAndUpdate(
    {
      _id: req.params.id,
      status: "pending",
      dataScope: req.dataScope,
    },
    {
      $set: {
        status: "rejected",
        reviewedBy: req.user._id,
        reviewedAt: new Date(),
        adminNote,
      },
    },
    {
      new: true,
      runValidators: true,
    }
  );

  if (!joinRequest) {
    const existing = await JoinRequest.exists({
      _id: req.params.id,
      dataScope: req.dataScope,
    });

    fail(
      existing
        ? "Only pending requests can be rejected"
        : "Join request not found",
      existing ? 409 : 404
    );
  }

  await notify({
    user: joinRequest.user,
    title: "Membership Application Rejected",
    message:
      adminNote ||
      "Your membership application was not approved.",
    type: "JOIN_REQUEST",
    link: "/login",
  });

  return res.status(200).json({
    success: true,
    message: "Join request rejected successfully",
    joinRequest: await populatedRequest(
      joinRequest._id,
      req.dataScope
    ),
  });
});

module.exports = {
  createJoinRequest,
  getMyJoinRequest,
  getAllJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
};