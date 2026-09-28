const Member = require("../models/Member");
const Investment = require("../models/Investment");

const {
  calculateOwnership,
} = require("../utils/calculateOwnership");

const getOwnershipSummary = async (req, res) => {
  try {
    const result =
      await calculateOwnership();

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error(
      "Get ownership summary error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get ownership summary",
    });
  }
};

const getMemberOwnership = async (
  req,
  res
) => {
  try {
    const { memberId } = req.params;

    const member =
      await Member.findById(
        memberId
      ).populate(
        "user",
        "name email"
      );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    const ownershipResult =
      await calculateOwnership();

    const ownershipData =
      ownershipResult.ownershipData.find(
        (item) =>
          item.memberId.toString() ===
          member._id.toString()
      );

    const ownershipPercentage =
      ownershipData?.ownershipPercentage ||
      0;

    const investments =
      await Investment.find({
        status: "active",
      });

    const investmentShares =
      investments.map(
        (investment) => {
          const memberShare =
            (Number(
              investment.currentValue ||
                0
            ) *
              ownershipPercentage) /
            100;

          return {
            investmentId:
              investment._id,
            name: investment.name,
            investedAmount:
              investment.investedAmount,
            currentValue:
              investment.currentValue,
            memberShare,
            status:
              investment.status,
          };
        }
      );

    return res.status(200).json({
      success: true,

      member: {
        _id: member._id,
        memberCode:
          member.memberCode,
        totalContribution:
          member.totalContribution,
        ownershipPercentage,
        user: member.user,
      },

      totalGroupContribution:
        ownershipResult.totalGroupContribution,

      ownershipPercentage,

      investmentShares,
    });
  } catch (error) {
    console.error(
      "Get member ownership error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get member ownership",
    });
  }
};

const getMyOwnership = async (
  req,
  res
) => {
  try {
    const member =
      await Member.findOne({
        user: req.user._id,
      }).populate(
        "user",
        "name email"
      );

    if (!member) {
      return res.status(404).json({
        success: false,
        message:
          "Member profile not found",
      });
    }

    const ownershipResult =
      await calculateOwnership();

    const ownershipData =
      ownershipResult.ownershipData.find(
        (item) =>
          item.memberId.toString() ===
          member._id.toString()
      );

    const ownershipPercentage =
      ownershipData?.ownershipPercentage ||
      0;

    const investments =
      await Investment.find({
        status: "active",
      });

    const investmentShares =
      investments.map(
        (investment) => {
          const memberShare =
            (Number(
              investment.currentValue ||
                0
            ) *
              ownershipPercentage) /
            100;

          return {
            investmentId:
              investment._id,
            name: investment.name,
            investedAmount:
              investment.investedAmount,
            currentValue:
              investment.currentValue,
            memberShare,
            status:
              investment.status,
          };
        }
      );

    return res.status(200).json({
      success: true,

      member: {
        _id: member._id,
        memberCode:
          member.memberCode,
        totalContribution:
          member.totalContribution,
        ownershipPercentage,
        user: member.user,
      },

      totalGroupContribution:
        ownershipResult.totalGroupContribution,

      ownershipPercentage,

      investmentShares,
    });
  } catch (error) {
    console.error(
      "Get my ownership error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get ownership",
    });
  }
};

const syncOwnershipPercentages =
  async (req, res) => {
    try {
      const result =
        await calculateOwnership();

      for (const item of result.ownershipData) {
        await Member.findByIdAndUpdate(
          item.memberId,
          {
            ownershipPercentage:
              item.ownershipPercentage,
          }
        );
      }

      return res.status(200).json({
        success: true,
        message:
          "Ownership percentages synced successfully",
        ...result,
      });
    } catch (error) {
      console.error(
        "Sync ownership error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to sync ownership percentages",
      });
    }
  };

module.exports = {
  getOwnershipSummary,
  getMemberOwnership,
  getMyOwnership,
  syncOwnershipPercentages,
};