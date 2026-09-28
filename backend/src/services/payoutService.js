const Member = require("../models/Member");
const Investment = require("../models/Investment");
const Transaction = require("../models/Transaction");

// --------------------------------------------------
// CALCULATE SCOPED OWNERSHIP
// --------------------------------------------------

const calculateScopedOwnership =
  async (
    dataScope
  ) => {
    const members =
      await Member.find({
        membershipStatus:
          "active",
        dataScope,
      })
        .select(
          "_id totalContribution"
        )
        .lean();

    const totalGroupContribution =
      members.reduce(
        (
          sum,
          member
        ) =>
          sum +
          Number(
            member.totalContribution ||
              0
          ),
        0
      );

    const ownershipData =
      members.map(
        (
          member
        ) => {
          const contribution =
            Number(
              member.totalContribution ||
                0
            );

          const ownershipPercentage =
            totalGroupContribution >
            0
              ? (
                  contribution /
                  totalGroupContribution
                ) *
                100
              : 0;

          return {
            memberId:
              member._id,

            ownershipPercentage:
              Number(
                ownershipPercentage.toFixed(
                  4
                )
              ),
          };
        }
      );

    return {
      totalGroupContribution,
      ownershipData,
    };
  };

// --------------------------------------------------
// CALCULATE MEMBER PAYOUT
// --------------------------------------------------

const calculateMemberPayout =
  async (
    memberId,
    dataScope = "live"
  ) => {
    const member =
      await Member.findOne({
        _id:
          memberId,

        dataScope,
      });

    if (!member) {
      throw new Error(
        "Member not found"
      );
    }

    // -----------------------------------
    // Ownership
    // -----------------------------------

    const ownershipResult =
      await calculateScopedOwnership(
        dataScope
      );

    const ownership =
      ownershipResult
        .ownershipData
        .find(
          (
            item
          ) =>
            item.memberId.toString() ===
            memberId.toString()
        );

    const ownershipPercentage =
      Number(
        ownership
          ?.ownershipPercentage ||
          0
      );

    // -----------------------------------
    // Available Cash
    // -----------------------------------

    const transactions =
      await Transaction.find({
        dataScope,
      });

    let totalIn = 0;
    let totalOut = 0;

    for (
      const transaction
      of transactions
    ) {
      const amount =
        Number(
          transaction.amount ||
            0
        );

      if (
        transaction.direction ===
        "IN"
      ) {
        totalIn +=
          amount;
      }

      if (
        transaction.direction ===
        "OUT"
      ) {
        totalOut +=
          amount;
      }
    }

    const availableCash =
      totalIn -
      totalOut;

    // -----------------------------------
    // Member Cash Share
    // -----------------------------------

    const memberCashShare =
      availableCash *
      (
        ownershipPercentage /
        100
      );

    // -----------------------------------
    // Active Investments
    // -----------------------------------

    const investments =
      await Investment.find({
        status:
          "active",

        dataScope,
      });

    const totalInvestmentCurrentValue =
      investments.reduce(
        (
          sum,
          investment
        ) =>
          sum +
          Number(
            investment.currentValue ||
              0
          ),
        0
      );

    // -----------------------------------
    // Investment Share
    // -----------------------------------

    const investmentShare =
      totalInvestmentCurrentValue *
      (
        ownershipPercentage /
        100
      );

    // -----------------------------------
    // Estimated Payout
    // -----------------------------------

    const estimatedPayout =
      memberCashShare +
      investmentShare;

    return {
      memberId:
        member._id,

      dataScope,

      ownershipPercentage:
        Number(
          ownershipPercentage.toFixed(
            4
          )
        ),

      availableCash:
        Number(
          availableCash.toFixed(
            2
          )
        ),

      memberCashShare:
        Number(
          memberCashShare.toFixed(
            2
          )
        ),

      totalInvestmentCurrentValue:
        Number(
          totalInvestmentCurrentValue.toFixed(
            2
          )
        ),

      investmentShare:
        Number(
          investmentShare.toFixed(
            2
          )
        ),

      estimatedPayout:
        Number(
          estimatedPayout.toFixed(
            2
          )
        ),
    };
  };

module.exports = {
  calculateMemberPayout,
};