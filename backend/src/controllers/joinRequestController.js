const mongoose = require("mongoose");

const JoinRequest = require("../models/JoinRequest");
const Member = require("../models/Member");
const User = require("../models/User");

const {
  createNotification,
} = require("../services/notificationService");

const generateMemberCode = async () => {
  const latestMember = await Member.findOne()
    .sort({ createdAt: -1 })
    .select("memberCode");

  if (!latestMember?.memberCode) {
    return "MEM-001";
  }

  const currentNumber = Number(
    latestMember.memberCode.replace("MEM-", "")
  );

  return `MEM-${String(currentNumber + 1).padStart(
    3,
    "0"
  )}`;
};

const createJoinRequest = async (req, res) => {
  try {
    const { phone, address, reason } = req.body;

    const existingMember = await Member.findOne({
      user: req.user._id,
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "You are already a member",
      });
    }

    const existingPendingRequest =
      await JoinRequest.findOne({
        user: req.user._id,
        status: "pending",
      });

    if (existingPendingRequest) {
      return res.status(400).json({
        success: false,
        message:
          "You already have a pending join request",
      });
    }

    const joinRequest = await JoinRequest.create({
      user: req.user._id,
      phone: phone?.trim() || "",
      address: address?.trim() || "",
      reason: reason?.trim() || "",
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message:
        "Join request submitted successfully",
      joinRequest,
    });
  } catch (error) {
    console.error(
      "Create join request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to create join request",
    });
  }
};

const getMyJoinRequest = async (req, res) => {
  try {
    const joinRequest =
      await JoinRequest.findOne({
        user: req.user._id,
      })
        .populate(
          "reviewedBy",
          "name email"
        )
        .sort({ createdAt: -1 });

    if (!joinRequest) {
      return res.status(404).json({
        success: false,
        message: "No join request found",
      });
    }

    return res.status(200).json({
      success: true,
      joinRequest,
    });
  } catch (error) {
    console.error(
      "Get my join request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get join request",
    });
  }
};

const getAllJoinRequests = async (
  req,
  res
) => {
  try {
    const { status } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    const joinRequests =
      await JoinRequest.find(filter)
        .populate(
          "user",
          "name email role status"
        )
        .populate(
          "reviewedBy",
          "name email"
        )
        .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: joinRequests.length,
      joinRequests,
    });
  } catch (error) {
    console.error(
      "Get join requests error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get join requests",
    });
  }
};

const approveJoinRequest = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid join request ID",
      });
    }

    const joinRequest =
      await JoinRequest.findById(id);

    if (!joinRequest) {
      return res.status(404).json({
        success: false,
        message: "Join request not found",
      });
    }

    if (joinRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Only pending requests can be approved",
      });
    }

    const user = await User.findById(
      joinRequest.user
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User linked to this request was not found",
      });
    }

    const existingMember =
      await Member.findOne({
        user: user._id,
      });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message:
          "Member profile already exists for this user",
      });
    }

    const memberCode =
      await generateMemberCode();

    const member = await Member.create({
      user: user._id,
      memberCode,
      phone: joinRequest.phone || "",
      address: joinRequest.address || "",
      monthlyContribution: 1000,
      membershipStatus: "active",
    });

    user.status = "active";
    await user.save();

    joinRequest.status = "approved";
    joinRequest.reviewedBy =
      req.user._id;
    joinRequest.reviewedAt =
      new Date();
    joinRequest.adminNote =
      adminNote?.trim() || "";

    await joinRequest.save();

    await createNotification({
      user: user._id,
      title: "Membership Approved",
      message:
        "Your membership application has been approved. You can now log in to your account.",
      type: "JOIN_REQUEST",
      link: "/dashboard",
    });

    const populatedMember =
      await Member.findById(
        member._id
      ).populate(
        "user",
        "name email role status"
      );

    const populatedRequest =
      await JoinRequest.findById(
        joinRequest._id
      )
        .populate(
          "user",
          "name email role status"
        )
        .populate(
          "reviewedBy",
          "name email"
        );

    return res.status(200).json({
      success: true,
      message:
        "Join request approved successfully",
      member: populatedMember,
      joinRequest: populatedRequest,
    });
  } catch (error) {
    console.error(
      "Approve join request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to approve join request",
    });
  }
};

const rejectJoinRequest = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid join request ID",
      });
    }

    const joinRequest =
      await JoinRequest.findById(id);

    if (!joinRequest) {
      return res.status(404).json({
        success: false,
        message: "Join request not found",
      });
    }

    if (joinRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Only pending requests can be rejected",
      });
    }

    joinRequest.status = "rejected";
    joinRequest.reviewedBy =
      req.user._id;
    joinRequest.reviewedAt =
      new Date();
    joinRequest.adminNote =
      adminNote?.trim() || "";

    await joinRequest.save();

    await createNotification({
      user: joinRequest.user,
      title:
        "Membership Application Rejected",
      message:
        adminNote?.trim() ||
        "Your membership application was not approved.",
      type: "JOIN_REQUEST",
      link: "/login",
    });

    const populatedRequest =
      await JoinRequest.findById(
        joinRequest._id
      )
        .populate(
          "user",
          "name email role status"
        )
        .populate(
          "reviewedBy",
          "name email"
        );

    return res.status(200).json({
      success: true,
      message:
        "Join request rejected successfully",
      joinRequest: populatedRequest,
    });
  } catch (error) {
    console.error(
      "Reject join request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to reject join request",
    });
  }
};

module.exports = {
  createJoinRequest,
  getMyJoinRequest,
  getAllJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
};