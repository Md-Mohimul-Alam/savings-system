const Member = require("../models/Member");
const Investment = require("../models/Investment");

// --------------------------------------------------
// SCOPED OWNERSHIP CALCULATION
// --------------------------------------------------

const calculateScopedOwnership = async (dataScope) => {
  const members = await Member.find({
    membershipStatus: "active",
    dataScope,
  })
    .select(
      "_id memberCode totalContribution ownershipPercentage"
    )
    .lean();

  const totalGroupContribution =
    members.reduce(
      (sum, member) =>
        sum +
        Number(member.totalContribution || 0),
      0
    );

  const ownershipData =
    members.map((member) => {
      const contribution =
        Number(member.totalContribution || 0);

      const ownershipPercentage =
        totalGroupContribution > 0
          ? Number(
              (
                (contribution /
                  totalGroupContribution) *
                100
              ).toFixed(4)
            )
          : 0;

      return {
        memberId: member._id,
        memberCode:
          member.memberCode || "",
        totalContribution:
          contribution,
        ownershipPercentage,
      };
    });

  return {
    totalGroupContribution,
    ownershipData,
  };
};

// --------------------------------------------------
// FIND OWNERSHIP FOR ONE MEMBER
// --------------------------------------------------

const findMemberOwnership = (
  ownershipData,
  member
) => {
  const item =
    ownershipData.find(
      (ownership) =>
        String(
          ownership?.memberId || ""
        ) ===
        String(member?._id || "")
    );

  return Number(
    item?.ownershipPercentage ||
      member?.ownershipPercentage ||
      0
  );
};

// --------------------------------------------------
// BUILD INVESTMENT SHARES
// --------------------------------------------------

const buildInvestmentShares =
  async (
    ownershipPercentage,
    dataScope
  ) => {
    const investments =
      await Investment.find({
        status: "active",
        dataScope,
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
        await calculateScopedOwnership(
          req.dataScope
        );

      return res
        .status(200)
        .json({
          success: true,
          demoMode:
            req.user?.isDemo === true,
          totalGroupContribution:
            result.totalGroupContribution,
          ownershipData:
            result.ownershipData,
        });
    } catch (error) {
      console.error(
        "Get ownership summary error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            error?.message ||
            "Failed to get ownership summary",
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
      const { memberId } =
        req.params;

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
        await Member.findOne({
          _id: memberId,
          dataScope:
            req.dataScope,
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
              "Member not found",
          });
      }

      const ownershipResult =
        await calculateScopedOwnership(
          req.dataScope
        );

      const ownershipPercentage =
        findMemberOwnership(
          ownershipResult
            .ownershipData,
          member
        );

      const investmentShares =
        await buildInvestmentShares(
          ownershipPercentage,
          req.dataScope
        );

      return res
        .status(200)
        .json({
          success: true,
          demoMode:
            req.user?.isDemo === true,

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
            ownershipResult
              .totalGroupContribution,

          ownershipPercentage,
          investmentShares,
        });
    } catch (error) {
      console.error(
        "Get member ownership error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            error?.message ||
            "Failed to get member ownership",
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
      if (!req.user?._id) {
        return res
          .status(401)
          .json({
            success: false,
            message:
              "Authentication required",
          });
      }

      const member =
        await Member.findOne({
          user:
            req.user._id,
          dataScope:
            req.dataScope,
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

      const ownershipResult =
        await calculateScopedOwnership(
          req.dataScope
        );

      const ownershipPercentage =
        findMemberOwnership(
          ownershipResult
            .ownershipData,
          member
        );

      const investmentShares =
        await buildInvestmentShares(
          ownershipPercentage,
          req.dataScope
        );

      return res
        .status(200)
        .json({
          success: true,
          demoMode:
            req.user?.isDemo === true,

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
            ownershipResult
              .totalGroupContribution,

          ownershipPercentage,
          investmentShares,
        });
    } catch (error) {
      console.error(
        "Get my ownership error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            error?.message ||
            "Failed to get ownership",
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
        await calculateScopedOwnership(
          req.dataScope
        );

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
              Member.updateOne(
                {
                  _id:
                    item.memberId,
                  dataScope:
                    req.dataScope,
                },
                {
                  $set: {
                    ownershipPercentage:
                      Number(
                        item.ownershipPercentage ||
                          0
                      ),
                  },
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
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            error?.message ||
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
