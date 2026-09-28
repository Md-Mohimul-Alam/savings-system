const ProfitDistribution = require(
  "../models/ProfitDistribution"
);

const Investment = require("../models/Investment");
const Transaction = require("../models/Transaction");

const Member = require("../models/Member");

const calculateScopedOwnership = async (dataScope) => {
  const members = await Member.find({
    membershipStatus: "active",
    dataScope,
  })
    .select("_id totalContribution")
    .lean();

  const totalGroupContribution = members.reduce(
    (sum, member) =>
      sum + Number(member.totalContribution || 0),
    0
  );

  return {
    totalGroupContribution,
    ownershipData: members.map((member) => ({
      memberId: member._id,
      ownershipPercentage:
        totalGroupContribution > 0
          ? (Number(member.totalContribution || 0) /
              totalGroupContribution) *
            100
          : 0,
    })),
  };
};

const distributeProfit = async (req, res) => {
  try {
    const {
      investmentId,
      totalProfit,
      note,
    } = req.body;

    if (!investmentId || totalProfit === undefined) {
      return res.status(400).json({
        success: false,
        message:
          "investmentId and totalProfit are required",
      });
    }

    if (Number(totalProfit) <= 0) {
      return res.status(400).json({
        success: false,
        message:
          "Total profit must be greater than 0",
      });
    }

    const investment = await Investment.findOne({
      _id: investmentId,
      dataScope: req.dataScope,
    });

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: "Investment not found",
      });
    }

    const ownershipResult =
      await calculateScopedOwnership(req.dataScope);

    if (
      !ownershipResult.ownershipData.length
    ) {
      return res.status(400).json({
        success: false,
        message:
          "No active members found for profit distribution",
      });
    }

    const memberShares =
      ownershipResult.ownershipData.map(
        (member) => {
          const share =
            Number(totalProfit) *
            (member.ownershipPercentage / 100);

          return {
            member: member.memberId,
            ownershipPercentage:
              member.ownershipPercentage,
            profitShare: Number(
              share.toFixed(2)
            ),
          };
        }
      );

    const distribution =
      await ProfitDistribution.create({
        investment: investmentId,
        totalProfit: Number(totalProfit),
        members: memberShares,
        note: note || "",
        createdBy: req.user._id,
        dataScope: req.dataScope,
      });

    await Transaction.create({
      type: "INVESTMENT_RETURN",
      direction: "IN",
      amount: Number(totalProfit),
      referenceType: "ProfitDistribution",
      referenceId: distribution._id,
      description: `Profit received from ${investment.name}`,
      createdBy: req.user._id,
      dataScope: req.dataScope,
    });

    const populatedDistribution =
      await ProfitDistribution.findOne({
        _id: distribution._id,
        dataScope: req.dataScope,
      })
        .populate(
          "investment",
          "name investedAmount currentValue"
        )
        .populate({
          path: "members.member",
          populate: {
            path: "user",
            select: "name email",
          },
        })
        .populate(
          "createdBy",
          "name email"
        );

    return res.status(201).json({
      success: true,
      message:
        "Profit distributed successfully",
      distribution:
        populatedDistribution,
    });
  } catch (error) {
    console.error(
      "Profit distribution error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getAllProfitDistributions = async (
  req,
  res
) => {
  try {
    const distributions =
      await ProfitDistribution.find({ dataScope: req.dataScope })
        .populate(
          "investment",
          "name investedAmount currentValue"
        )
        .populate({
          path: "members.member",
          populate: {
            path: "user",
            select: "name email",
          },
        })
        .populate(
          "createdBy",
          "name email"
        )
        .sort({
          distributionDate: -1,
        });

    return res.status(200).json({
      success: true,
      count: distributions.length,
      distributions,
    });
  } catch (error) {
    console.error(
      "Get profit distributions error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getProfitDistributionById = async (
  req,
  res
) => {
  try {
    const distribution =
      await ProfitDistribution.findOne({
        _id: req.params.id,
        dataScope: req.dataScope,
      })
        .populate(
          "investment",
          "name investedAmount currentValue"
        )
        .populate({
          path: "members.member",
          populate: {
            path: "user",
            select: "name email",
          },
        })
        .populate(
          "createdBy",
          "name email"
        );

    if (!distribution) {
      return res.status(404).json({
        success: false,
        message:
          "Profit distribution not found",
      });
    }

    return res.status(200).json({
      success: true,
      distribution,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  distributeProfit,
  getAllProfitDistributions,
  getProfitDistributionById,
};