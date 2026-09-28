const mongoose = require("mongoose");

const User = require("../models/User");
const Member = require("../models/Member");

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

  return `MEM-${String(currentNumber + 1).padStart(3, "0")}`;
};

const getAllMembers = async (req, res) => {
  try {
    const members = await Member.find()
      .populate("user", "name email role status")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: members.length,
      members,
    });
  } catch (error) {
    console.error("Get members error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get members",
    });
  }
};

const getMemberById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid member ID",
      });
    }

    const member = await Member.findById(
      req.params.id
    ).populate(
      "user",
      "name email role status"
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    return res.status(200).json({
      success: true,
      member,
    });
  } catch (error) {
    console.error("Get member error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get member",
    });
  }
};

const approveUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { phone, address } = req.body;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.role === "admin") {
      return res.status(400).json({
        success: false,
        message: "Admin account does not need member approval",
      });
    }

    const existingMember = await Member.findOne({
      user: user._id,
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: "Member profile already exists",
      });
    }

    const memberCode = await generateMemberCode();

    const member = await Member.create({
      user: user._id,
      memberCode,
      phone: phone?.trim() || "",
      address: address?.trim() || "",
      monthlyContribution: 1000,
      membershipStatus: "active",
    });

    user.status = "active";
    await user.save();

    const populatedMember = await Member.findById(
      member._id
    ).populate(
      "user",
      "name email role status"
    );

    return res.status(201).json({
      success: true,
      message: "User approved and member profile created",
      member: populatedMember,
    });
  } catch (error) {
    console.error("Approve user error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to approve user",
    });
  }
};

const getPendingUsers = async (req, res) => {
  try {
    const users = await User.find({
      role: "member",
      status: "pending",
    })
      .select("-password")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Get pending users error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to get pending users",
    });
  }
};

const updateMember = async (req, res) => {
  try {
    const {
      phone,
      address,
      monthlyContribution,
      membershipStatus,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid member ID",
      });
    }

    const member = await Member.findById(req.params.id);

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    if (
      monthlyContribution !== undefined &&
      Number(monthlyContribution) < 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Monthly contribution cannot be negative",
      });
    }

    const allowedStatuses = [
      "active",
      "inactive",
      "exited",
    ];

    if (
      membershipStatus !== undefined &&
      !allowedStatuses.includes(
        membershipStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid membership status",
      });
    }

    if (phone !== undefined) {
      member.phone = String(phone).trim();
    }

    if (address !== undefined) {
      member.address = String(address).trim();
    }

    if (monthlyContribution !== undefined) {
      member.monthlyContribution =
        Number(monthlyContribution);
    }

    if (membershipStatus !== undefined) {
      member.membershipStatus =
        membershipStatus;
    }

    await member.save();

    const updatedMember = await Member.findById(
      member._id
    ).populate(
      "user",
      "name email role status"
    );

    return res.status(200).json({
      success: true,
      message: "Member updated successfully",
      member: updatedMember,
    });
  } catch (error) {
    console.error("Update member error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update member",
    });
  }
};

const getMyMemberProfile = async (req, res) => {
  try {
    const member = await Member.findOne({
      user: req.user._id,
    }).populate(
      "user",
      "name email role status createdAt"
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      member,
    });
  } catch (error) {
    console.error(
      "Get my member profile error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to get member profile",
    });
  }
};

module.exports = {
  getAllMembers,
  getMemberById,
  getMyMemberProfile,
  approveUser,
  getPendingUsers,
  updateMember,
};
