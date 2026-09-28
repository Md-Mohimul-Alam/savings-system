const Member = require("../models/Member");
const Investment = require("../models/Investment");

const {
  calculateOwnership,
} = require("../utils/calculateOwnership");

// --------------------------------------------------
// SAFE OWNERSHIP CALCULATION
// --------------------------------------------------

const safeCalculateOwnership = async () => {
  try {
    const result =
      await calculateOwnership();

    if (!result) {
      console.warn(
        "calculateOwnership returned no result"
      );

      return {
        totalGroupContribution: 0,
        ownershipData: [],
      };
    }

    return {
      totalGroupContribution:
        Number(
          result.totalGroupContribution ||
            0
        ),

      ownershipData:
        Array.isArray(
          result.ownershipData
        )
          ? result.ownershipData
          : [],
    };
  } catch (error) {
    console.error(
      "calculateOwnership failed:",
      {
        name:
          error?.name,

        message:
          error?.message,

        stack:
          error?.stack,
      }
    );

    return {
      totalGroupContribution: 0,
      ownershipData: [],
    };
  }
};

// --------------------------------------------------
// FIND OWNERSHIP FOR ONE MEMBER
// --------------------------------------------------

const findMemberOwnership = (
  ownershipData,
  member
) => {
  if (
    !Array.isArray(
      ownershipData
    )
  ) {
    return Number(
      member?.ownershipPercentage ||
        0
    );
  }

  const item =
    ownershipData.find(
      (ownership) =>
        String(
          ownership?.memberId ||
            ""
        ) ===
        String(
          member?._id ||
            ""
        )
    );

  if (item) {
    return Number(
      item.ownershipPercentage ||
        0
    );
  }

  // Fallback to saved value
  return Number(
    member?.ownershipPercentage ||
      0
  );
};

// --------------------------------------------------
// CREATE INVESTMENT SHARES
// --------------------------------------------------

const buildInvestmentShares =
  async (
    ownershipPercentage
  ) => {
    const investments =
      await Investment.find({
        status: "active",
      })
        .select(
          "name investedAmount currentValue status"
        )
        .lean();

    return investments.map(
      (investment) => {
        const investedAmount =
          Number(
            investment.investedAmount ||
              0
          );

        const currentValue =
          Number(
            investment.currentValue ||
              0
          );

        const memberShare =
          (currentValue *
            Number(
              ownershipPercentage ||
                0
            )) /
          100;

        return {
          investmentId:
            investment._id,

          name:
            investment.name,

          investedAmount,

          currentValue,

          memberShare,

          status:
            investment.status,
        };
      }
    );
  };

// --------------------------------------------------
// ADMIN OWNERSHIP SUMMARY
// --------------------------------------------------

const getOwnershipSummary =
  async (
    req,
    res
  ) => {
    try {
      const result =
        await safeCalculateOwnership();

      return res
        .status(200)
        .json({
          success: true,

          totalGroupContribution:
            result.totalGroupContribution,

          ownershipData:
            result.ownershipData,
        });
    } catch (error) {
      console.error(
        "Get ownership summary error:",
        {
          name:
            error?.name,

          message:
            error?.message,

          stack:
            error?.stack,
        }
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            error?.message ||
            "Failed to get ownership summary",

          errorName:
            error?.name ||
            "UnknownError",
        });
    }
  };

// --------------------------------------------------
// ADMIN - ONE MEMBER OWNERSHIP
// --------------------------------------------------

const getMemberOwnership =
  async (
    req,
    res
  ) => {
    try {
      const {
        memberId,
      } = req.params;

      if (!memberId) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Member ID is required",
          });
      }

      const member =
        await Member.findById(
          memberId
        )
          .populate(
            "user",
            "name email"
          )
          .lean();

      if (!member) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Member not found",
          });
      }

      const ownershipResult =
        await safeCalculateOwnership();

      const ownershipPercentage =
        findMemberOwnership(
          ownershipResult.ownershipData,
          member
        );

      const investmentShares =
        await buildInvestmentShares(
          ownershipPercentage
        );

      return res
        .status(200)
        .json({
          success: true,

          member: {
            _id:
              member._id,

            memberCode:
              member.memberCode ||
              "",

            totalContribution:
              Number(
                member.totalContribution ||
                  0
              ),

            ownershipPercentage,

            user:
              member.user ||
              null,
          },

          totalGroupContribution:
            ownershipResult.totalGroupContribution,

          ownershipPercentage,

          investmentShares,
        });
    } catch (error) {
      console.error(
        "Get member ownership error:",
        {
          name:
            error?.name,

          message:
            error?.message,

          stack:
            error?.stack,
        }
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            error?.message ||
            "Failed to get member ownership",

          errorName:
            error?.name ||
            "UnknownError",
        });
    }
  };

// --------------------------------------------------
// MEMBER - MY OWNERSHIP
// --------------------------------------------------

const getMyOwnership =
  async (
    req,
    res
  ) => {
    try {
      if (
        !req.user?._id
      ) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Authentication required",
          });
      }

      console.log(
        "Loading ownership for user:",
        String(
          req.user._id
        )
      );

      const member =
        await Member.findOne({
          user:
            req.user._id,
        })
          .populate(
            "user",
            "name email"
          )
          .lean();

      if (!member) {
        return res
          .status(404)
          .json({
            success: false,

            message:
              "Member profile not found",
          });
      }

      console.log(
        "Member ownership profile:",
        String(
          member._id
        )
      );

      const ownershipResult =
        await safeCalculateOwnership();

      const ownershipPercentage =
        findMemberOwnership(
          ownershipResult.ownershipData,
          member
        );

      console.log(
        "Member ownership percentage:",
        ownershipPercentage
      );

      const investmentShares =
        await buildInvestmentShares(
          ownershipPercentage
        );

      return res
        .status(200)
        .json({
          success: true,

          member: {
            _id:
              member._id,

            memberCode:
              member.memberCode ||
              "",

            totalContribution:
              Number(
                member.totalContribution ||
                  0
              ),

            ownershipPercentage,

            user:
              member.user ||
              null,
          },

          totalGroupContribution:
            ownershipResult.totalGroupContribution,

          ownershipPercentage,

          investmentShares,
        });
    } catch (error) {
      console.error(
        "GET MY OWNERSHIP FATAL ERROR:",
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

      // Temporary detailed production error
      return res
        .status(500)
        .json({
          success: false,

          message:
            error?.message ||
            "Failed to get ownership",

          errorName:
            error?.name ||
            "UnknownError",
        });
    }
  };

// --------------------------------------------------
// ADMIN - SYNC OWNERSHIP
// --------------------------------------------------

const syncOwnershipPercentages =
  async (
    req,
    res
  ) => {
    try {
      const result =
        await safeCalculateOwnership();

      if (
        !Array.isArray(
          result.ownershipData
        ) ||
        result.ownershipData
          .length === 0
      ) {
        return res
          .status(200)
          .json({
            success: true,

            message:
              "No ownership data available to sync",

            totalGroupContribution:
              result.totalGroupContribution,

            ownershipData: [],
          });
      }

      const updates =
        result.ownershipData
          .filter(
            (item) =>
              item?.memberId
          )
          .map(
            (item) =>
              Member.findByIdAndUpdate(
                item.memberId,
                {
                  ownershipPercentage:
                    Number(
                      item.ownershipPercentage ||
                        0
                    ),
                }
              )
          );

      await Promise.all(
        updates
      );

      return res
        .status(200)
        .json({
          success: true,

          message:
            "Ownership percentages synced successfully",

          totalGroupContribution:
            result.totalGroupContribution,

          ownershipData:
            result.ownershipData,
        });
    } catch (error) {
      console.error(
        "Sync ownership error:",
        {
          name:
            error?.name,

          message:
            error?.message,

          stack:
            error?.stack,
        }
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            error?.message ||
            "Failed to sync ownership percentages",

          errorName:
            error?.name ||
            "UnknownError",
        });
    }
  };

module.exports = {
  getOwnershipSummary,
  getMemberOwnership,
  getMyOwnership,
  syncOwnershipPercentages,
};