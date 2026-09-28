const mongoose = require("mongoose");

const User = require("../models/User");
const Member = require("../models/Member");

// --------------------------------------------------
// GENERATE MEMBER CODE
// --------------------------------------------------

const generateMemberCode = async () => {
  const latestMember =
    await Member.findOne()
      .sort({ createdAt: -1 })
      .select("memberCode");

  if (!latestMember?.memberCode) {
    return "MEM-001";
  }

  const currentNumber = Number(
    latestMember.memberCode.replace(
      "MEM-",
      ""
    )
  );

  return `MEM-${String(
    currentNumber + 1
  ).padStart(3, "0")}`;
};

// --------------------------------------------------
// GET ALL MEMBERS
// ADMIN
// --------------------------------------------------

const getAllMembers = async (
  req,
  res
) => {
  try {
    const members =
      await Member.find()
        .populate(
          "user",
          "name email role status"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: members.length,
      members,
    });
  } catch (error) {
    console.error(
      "Get members error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get members",
    });
  }
};

// --------------------------------------------------
// GET MEMBER BY ID
// ADMIN
// --------------------------------------------------

const getMemberById = async (
  req,
  res
) => {
  try {
    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid member ID",
      });
    }

    const member =
      await Member.findById(
        req.params.id
      ).populate(
        "user",
        "name email role status"
      );

    if (!member) {
      return res.status(404).json({
        success: false,
        message:
          "Member not found",
      });
    }

    return res.status(200).json({
      success: true,
      member,
    });
  } catch (error) {
    console.error(
      "Get member error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get member",
    });
  }
};

// --------------------------------------------------
// APPROVE USER AND CREATE MEMBER
// ADMIN
// --------------------------------------------------

const approveUser = async (
  req,
  res
) => {
  try {
    const { userId } =
      req.params;

    const {
      phone,
      address,
      nidNumber,
      passportNumber,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(
        userId
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user ID",
      });
    }

    const user =
      await User.findById(
        userId
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User not found",
      });
    }

    if (
      user.role ===
      "admin"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Admin account does not need member approval",
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
          "Member profile already exists",
      });
    }

    const memberCode =
      await generateMemberCode();

    /*
      Prefer values supplied during approval.

      If your User model already stores these
      registration fields, the fallback below
      automatically copies them into Member.
    */

    const member =
      await Member.create({
        user:
          user._id,

        memberCode,

        phone:
          phone !== undefined
            ? String(
                phone
              ).trim()
            : String(
                user.phone ||
                  ""
              ).trim(),

        address:
          address !== undefined
            ? String(
                address
              ).trim()
            : String(
                user.address ||
                  ""
              ).trim(),

        nidNumber:
          nidNumber !== undefined
            ? String(
                nidNumber
              ).trim()
            : String(
                user.nidNumber ||
                  ""
              ).trim(),

        passportNumber:
          passportNumber !==
          undefined
            ? String(
                passportNumber
              )
                .trim()
                .toUpperCase()
            : String(
                user.passportNumber ||
                  ""
              )
                .trim()
                .toUpperCase(),

        monthlyContribution:
          1000,

        membershipStatus:
          "active",
      });

    user.status =
      "active";

    await user.save();

    const populatedMember =
      await Member.findById(
        member._id
      ).populate(
        "user",
        "name email role status"
      );

    return res.status(201).json({
      success: true,

      message:
        "User approved and member profile created",

      member:
        populatedMember,
    });
  } catch (error) {
    console.error(
      "Approve user error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        error?.message ||
        "Failed to approve user",
    });
  }
};

// --------------------------------------------------
// GET PENDING USERS
// ADMIN
// --------------------------------------------------

const getPendingUsers = async (
  req,
  res
) => {
  try {
    const users =
      await User.find({
        role:
          "member",

        status:
          "pending",
      })
        .select(
          "-password"
        )
        .sort({
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (error) {
    console.error(
      "Get pending users error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get pending users",
    });
  }
};

// --------------------------------------------------
// UPDATE MEMBER
// ADMIN
// --------------------------------------------------

const updateMember = async (
  req,
  res
) => {
  try {
    const {
      phone,
      address,
      nidNumber,
      passportNumber,
      monthlyContribution,
      membershipStatus,
    } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(
        req.params.id
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid member ID",
      });
    }

    const member =
      await Member.findById(
        req.params.id
      );

    if (!member) {
      return res.status(404).json({
        success: false,
        message:
          "Member not found",
      });
    }

    // -----------------------------------
    // Validate monthly contribution
    // -----------------------------------

    if (
      monthlyContribution !==
        undefined &&
      Number(
        monthlyContribution
      ) < 0
    ) {
      return res.status(400).json({
        success: false,

        message:
          "Monthly contribution cannot be negative",
      });
    }

    // -----------------------------------
    // Validate membership status
    // -----------------------------------

    const allowedStatuses = [
      "active",
      "inactive",
      "exited",
    ];

    if (
      membershipStatus !==
        undefined &&
      !allowedStatuses.includes(
        membershipStatus
      )
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid membership status",
      });
    }

    // -----------------------------------
    // Editable personal data
    // -----------------------------------

    if (
      phone !== undefined
    ) {
      member.phone =
        String(
          phone
        ).trim();
    }

    if (
      address !== undefined
    ) {
      member.address =
        String(
          address
        ).trim();
    }

    if (
      nidNumber !==
      undefined
    ) {
      member.nidNumber =
        String(
          nidNumber
        ).trim();
    }

    if (
      passportNumber !==
      undefined
    ) {
      member.passportNumber =
        String(
          passportNumber
        )
          .trim()
          .toUpperCase();
    }

    // -----------------------------------
    // Admin-controlled fields
    // -----------------------------------

    if (
      monthlyContribution !==
      undefined
    ) {
      member.monthlyContribution =
        Number(
          monthlyContribution
        );
    }

    if (
      membershipStatus !==
      undefined
    ) {
      member.membershipStatus =
        membershipStatus;
    }

    await member.save();

    const updatedMember =
      await Member.findById(
        member._id
      ).populate(
        "user",
        "name email role status"
      );

    return res.status(200).json({
      success: true,

      message:
        "Member updated successfully",

      member:
        updatedMember,
    });
  } catch (error) {
    console.error(
      "Update member error:",
      {
        name:
          error?.name,

        message:
          error?.message,

        stack:
          error?.stack,
      }
    );

    return res.status(500).json({
      success: false,

      message:
        error?.message ||
        "Failed to update member",
    });
  }
};

// --------------------------------------------------
// GET MY MEMBER PROFILE
// MEMBER
// --------------------------------------------------

const getMyMemberProfile = async (
  req,
  res
) => {
  try {
    if (
      !req.user?._id
    ) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const member =
      await Member.findOne({
        user:
          req.user._id,
      }).populate(
        "user",
        "name email role status createdAt"
      );

    if (!member) {
      return res.status(404).json({
        success: false,
        message:
          "Member profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      member,
    });
  } catch (error) {
    console.error(
      "Get my member profile error:",
      {
        name:
          error?.name,

        message:
          error?.message,

        stack:
          error?.stack,

        userId:
          req.user?._id,
      }
    );

    return res.status(500).json({
      success: false,

      message:
        error?.message ||
        "Failed to get member profile",
    });
  }
};

// --------------------------------------------------
// UPDATE MY MEMBER PROFILE
// MEMBER
// --------------------------------------------------

const updateMyMemberProfile =
  async (
    req,
    res
  ) => {
    try {
      if (
        !req.user?._id
      ) {
        return res.status(401).json({
          success: false,

          message:
            "Authentication required",
        });
      }

      const member =
        await Member.findOne({
          user:
            req.user._id,
        });

      if (!member) {
        return res.status(404).json({
          success: false,

          message:
            "Member profile not found",
        });
      }

      const {
        phone,
        address,
        nidNumber,
        passportNumber,
      } = req.body;

      // -----------------------------------
      // Phone
      // -----------------------------------

      if (
        phone !== undefined
      ) {
        member.phone =
          String(
            phone
          ).trim();
      }

      // -----------------------------------
      // Address
      // -----------------------------------

      if (
        address !== undefined
      ) {
        member.address =
          String(
            address
          ).trim();
      }

      // -----------------------------------
      // NID
      // -----------------------------------

      if (
        nidNumber !==
        undefined
      ) {
        member.nidNumber =
          String(
            nidNumber
          ).trim();
      }

      // -----------------------------------
      // Passport
      // -----------------------------------

      if (
        passportNumber !==
        undefined
      ) {
        member.passportNumber =
          String(
            passportNumber
          )
            .trim()
            .toUpperCase();
      }

      await member.save();

      const updatedMember =
        await Member.findById(
          member._id
        ).populate(
          "user",
          "name email role status createdAt"
        );

      return res.status(200).json({
        success: true,

        message:
          "Profile updated successfully",

        member:
          updatedMember,
      });
    } catch (error) {
      console.error(
        "Update my member profile error:",
        {
          name:
            error?.name,

          message:
            error?.message,

          stack:
            error?.stack,

          userId:
            req.user?._id,
        }
      );

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Failed to update profile",
      });
    }
  };

// --------------------------------------------------
// EXPORTS
// --------------------------------------------------

module.exports = {
  getAllMembers,
  getMemberById,

  getMyMemberProfile,
  updateMyMemberProfile,

  approveUser,
  getPendingUsers,
  updateMember,
};