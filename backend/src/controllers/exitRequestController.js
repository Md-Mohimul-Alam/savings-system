const ExitRequest = require("../models/ExitRequest");
const Member = require("../models/Member");
const Transaction = require("../models/Transaction");

const {
  calculateMemberPayout,
} = require("../services/payoutService");

const {
  createNotification,
} = require("../services/notificationService");

const createExitRequest = async (
  req,
  res
) => {
  try {
    const { reason } = req.body;

    const member = await Member.findOne({
      user: req.user._id,
      dataScope: req.dataScope,
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member profile not found",
      });
    }

    if (
      member.membershipStatus !== "active"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only active members can request an exit",
      });
    }

    const existingRequest =
      await ExitRequest.findOne({
        member: member._id,
        status: {
          $in: ["pending", "approved"],
        },
        dataScope: req.dataScope,
      });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message:
          "You already have an active exit request",
      });
    }

    const payout =
      await calculateMemberPayout(
        member._id
      );

    const exitRequest =
      await ExitRequest.create({
        member: member._id,
        reason: reason?.trim() || "",
        status: "pending",
        estimatedPayout:
          payout.estimatedPayout,
        dataScope: req.dataScope,
      });

    return res.status(201).json({
      success: true,
      message:
        "Exit request submitted successfully",
      payout,
      exitRequest,
    });
  } catch (error) {
    console.error(
      "Create exit request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to create exit request",
    });
  }
};

const getAllExitRequests = async (
  req,
  res
) => {
  try {
    const { status } = req.query;

    const filter = { dataScope: req.dataScope };

    if (status) {
      filter.status = status;
    }

    const exitRequests =
      await ExitRequest.find(filter)
        .populate({
          path: "member",
          populate: {
            path: "user",
            select:
              "name email role status",
          },
        })
        .populate(
          "reviewedBy",
          "name email"
        )
        .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: exitRequests.length,
      exitRequests,
    });
  } catch (error) {
    console.error(
      "Get exit requests error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get exit requests",
    });
  }
};

const getMyExitRequest = async (
  req,
  res
) => {
  try {
    const member = await Member.findOne({
      user: req.user._id,
      dataScope: req.dataScope,
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member profile not found",
      });
    }

    const exitRequest =
      await ExitRequest.findOne({
        member: member._id,
        dataScope: req.dataScope,
      })
        .populate(
          "reviewedBy",
          "name email"
        )
        .sort({ createdAt: -1 });

    if (!exitRequest) {
      return res.status(404).json({
        success: false,
        message: "No exit request found",
      });
    }

    return res.status(200).json({
      success: true,
      exitRequest,
    });
  } catch (error) {
    console.error(
      "Get my exit request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get exit request",
    });
  }
};

const approveExitRequest = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const exitRequest =
      await ExitRequest.findOne({
        _id: id,
        dataScope: req.dataScope,
      });

    if (!exitRequest) {
      return res.status(404).json({
        success: false,
        message: "Exit request not found",
      });
    }

    if (exitRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Only pending requests can be approved",
      });
    }

    const payout =
      await calculateMemberPayout(
        exitRequest.member
      );

    exitRequest.status = "approved";
    exitRequest.finalPayout =
      payout.estimatedPayout;
    exitRequest.reviewedBy =
      req.user._id;
    exitRequest.reviewedAt =
      new Date();
    exitRequest.adminNote =
      adminNote?.trim() || "";

    await exitRequest.save();

    const member = await Member.findOne({
      _id: exitRequest.member,
      dataScope: req.dataScope,
    }).populate(
      "user",
      "name email"
    );

    if (member?.user?._id) {
      await createNotification({
        user: member.user._id,
        title:
          "Exit Request Approved",
        message: `Your exit request has been approved. Final payout: ৳${Number(
          exitRequest.finalPayout || 0
        ).toLocaleString()}.`,
        type: "EXIT_REQUEST",
        link: "/dashboard/my-exit-request",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Exit request approved successfully",
      payout,
      exitRequest,
    });
  } catch (error) {
    console.error(
      "Approve exit request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to approve exit request",
    });
  }
};

const rejectExitRequest = async (
  req,
  res
) => {
  try {
    const { id } = req.params;
    const { adminNote } = req.body;

    const exitRequest =
      await ExitRequest.findOne({
        _id: id,
        dataScope: req.dataScope,
      });

    if (!exitRequest) {
      return res.status(404).json({
        success: false,
        message: "Exit request not found",
      });
    }

    if (exitRequest.status !== "pending") {
      return res.status(400).json({
        success: false,
        message:
          "Only pending requests can be rejected",
      });
    }

    exitRequest.status = "rejected";
    exitRequest.reviewedBy =
      req.user._id;
    exitRequest.reviewedAt =
      new Date();
    exitRequest.adminNote =
      adminNote?.trim() || "";

    await exitRequest.save();

    const member = await Member.findOne({
      _id: exitRequest.member,
      dataScope: req.dataScope,
    }).populate(
      "user",
      "name email"
    );

    if (member?.user?._id) {
      await createNotification({
        user: member.user._id,
        title:
          "Exit Request Rejected",
        message:
          exitRequest.adminNote ||
          "Your exit request was rejected.",
        type: "EXIT_REQUEST",
        link: "/dashboard/my-exit-request",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Exit request rejected successfully",
      exitRequest,
    });
  } catch (error) {
    console.error(
      "Reject exit request error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to reject exit request",
    });
  }
};

const markExitAsPaid = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    const exitRequest =
      await ExitRequest.findOne({
        _id: id,
        dataScope: req.dataScope,
      });

    if (!exitRequest) {
      return res.status(404).json({
        success: false,
        message: "Exit request not found",
      });
    }

    if (
      exitRequest.status !== "approved"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Only approved exit requests can be marked as paid",
      });
    }

    const payout = Number(
      exitRequest.finalPayout || 0
    );

    if (payout <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Final payout must be greater than zero",
      });
    }

    const member = await Member.findOne({
      _id: exitRequest.member,
      dataScope: req.dataScope,
    }).populate(
      "user",
      "name email"
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    await Transaction.create({
      type: "MEMBER_PAYOUT",
      direction: "OUT",
      amount: payout,
      member: member._id,
      referenceType: "ExitRequest",
      referenceId: exitRequest._id,
      description: `Final payout for member ${member.memberCode}`,
      createdBy: req.user._id,
      dataScope: req.dataScope,
    });

    exitRequest.status = "paid";
    exitRequest.paidAt = new Date();

    await exitRequest.save();

    member.membershipStatus =
      "exited";

    await member.save();

    if (member.user?._id) {
      await createNotification({
        user: member.user._id,
        title:
          "Exit Payout Completed",
        message: `Your final payout of ৳${payout.toLocaleString()} has been marked as paid.`,
        type: "EXIT_REQUEST",
        link: "/dashboard/my-exit-request",
      });
    }

    return res.status(200).json({
      success: true,
      message:
        "Exit payout marked as paid successfully",
      exitRequest,
    });
  } catch (error) {
    console.error(
      "Mark exit as paid error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to complete exit payout",
    });
  }
};

module.exports = {
  createExitRequest,
  getAllExitRequests,
  getMyExitRequest,
  approveExitRequest,
  rejectExitRequest,
  markExitAsPaid,
};