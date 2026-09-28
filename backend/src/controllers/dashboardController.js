const Member = require("../models/Member");
const Contribution = require("../models/Contribution");
const Transaction = require("../models/Transaction");
const Investment = require("../models/Investment");
const Expense = require("../models/Expense");

const {
  calculateOwnership,
} = require("../utils/calculateOwnership");

// --------------------------------------------------
// ADMIN DASHBOARD
// --------------------------------------------------

const getAdminDashboard = async (
  req,
  res
) => {
  try {
    const now = new Date();

    const currentMonth =
      now.getMonth() + 1;

    const currentYear =
      now.getFullYear();

    const [
      members,
      contributions,
      transactions,
      investments,
      expenses,
    ] = await Promise.all([
      Member.find({
        membershipStatus: "active",
      }).lean(),

      Contribution.find().lean(),

      Transaction.find().lean(),

      Investment.find().lean(),

      Expense.find().lean(),
    ]);

    const totalMembers =
      members.length;

    const totalSavings =
      contributions.reduce(
        (sum, item) =>
          sum +
          Number(
            item.paidAmount || 0
          ),
        0
      );

    const totalIn =
      transactions
        .filter(
          (item) =>
            item.direction === "IN"
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(
              item.amount || 0
            ),
          0
        );

    const totalOut =
      transactions
        .filter(
          (item) =>
            item.direction === "OUT"
        )
        .reduce(
          (sum, item) =>
            sum +
            Number(
              item.amount || 0
            ),
          0
        );

    const availableCash =
      totalIn - totalOut;

    const totalInvested =
      investments.reduce(
        (sum, item) =>
          sum +
          Number(
            item.investedAmount || 0
          ),
        0
      );

    const totalInvestmentValue =
      investments.reduce(
        (sum, item) =>
          sum +
          Number(
            item.currentValue || 0
          ),
        0
      );

    const totalProfitLoss =
      totalInvestmentValue -
      totalInvested;

    const totalExpenses =
      expenses.reduce(
        (sum, item) =>
          sum +
          Number(
            item.amount || 0
          ),
        0
      );

    const currentMonthContributions =
      contributions.filter(
        (item) =>
          Number(item.month) ===
            currentMonth &&
          Number(item.year) ===
            currentYear
      );

    const expectedAmount =
      members.reduce(
        (sum, member) =>
          sum +
          Number(
            member.monthlyContribution ||
              0
          ),
        0
      );

    const collectedAmount =
      currentMonthContributions.reduce(
        (sum, item) =>
          sum +
          Number(
            item.paidAmount || 0
          ),
        0
      );

    const outstandingAmount =
      Math.max(
        expectedAmount -
          collectedAmount,
        0
      );

    const paidMembers =
      currentMonthContributions.filter(
        (item) =>
          item.status === "paid"
      ).length;

    const partialMembers =
      currentMonthContributions.filter(
        (item) =>
          item.status === "partial"
      ).length;

    const dueMembers =
      Math.max(
        totalMembers -
          paidMembers -
          partialMembers,
        0
      );

    const monthlySavingsMap = {};

    contributions.forEach(
      (item) => {
        const key = `${item.year}-${String(
          item.month
        ).padStart(2, "0")}`;

        if (
          !monthlySavingsMap[key]
        ) {
          monthlySavingsMap[key] =
            0;
        }

        monthlySavingsMap[key] +=
          Number(
            item.paidAmount || 0
          );
      }
    );

    const monthlySavings =
      Object.entries(
        monthlySavingsMap
      )
        .sort(
          ([a], [b]) =>
            a.localeCompare(b)
        )
        .map(
          ([month, amount]) => ({
            month,
            amount,
          })
        );

    const investmentPerformance =
      investments.map(
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

          const profitLoss =
            currentValue -
            investedAmount;

          const roi =
            investedAmount > 0
              ? (profitLoss /
                  investedAmount) *
                100
              : 0;

          return {
            id:
              investment._id,

            name:
              investment.name,

            investedAmount,

            currentValue,

            profitLoss,

            roi,

            status:
              investment.status,
          };
        }
      );

    return res.status(200).json({
      success: true,
      role: "admin",

      summary: {
        totalMembers,
        totalSavings,
        availableCash,
        totalInvested,
        totalInvestmentValue,
        totalProfitLoss,
        totalExpenses,
      },

      currentMonth: {
        month: currentMonth,
        year: currentYear,
        expectedAmount,
        collectedAmount,
        outstandingAmount,
        paidMembers,
        partialMembers,
        dueMembers,
      },

      charts: {
        monthlySavings,
        investmentPerformance,
      },
    });
  } catch (error) {
    console.error(
      "Admin dashboard error:",
      {
        name: error?.name,
        message: error?.message,
        stack: error?.stack,
      }
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to load dashboard",
    });
  }
};

// --------------------------------------------------
// MEMBER DASHBOARD
// --------------------------------------------------

const getMemberDashboard = async (
  req,
  res
) => {
  try {
    console.log(
      "Loading member dashboard for:",
      req.user?._id
    );

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,
        message:
          "Authentication required",
      });
    }

    const member =
      await Member.findOne({
        user: req.user._id,
      })
        .populate(
          "user",
          "name email"
        )
        .lean();

    if (!member) {
      return res.status(404).json({
        success: false,
        message:
          "Member profile not found",
      });
    }

    const now = new Date();

    const currentMonth =
      now.getMonth() + 1;

    const currentYear =
      now.getFullYear();

    const [
      contributions,
      investments,
      ownershipResult,
    ] = await Promise.all([
      Contribution.find({
        member: member._id,
      })
        .sort({
          year: 1,
          month: 1,
        })
        .lean(),

      Investment.find({
        status: "active",
      })
        .select(
          "name investedAmount currentValue status"
        )
        .lean(),

      calculateOwnership(),
    ]);

    // -----------------------------
    // Contribution calculations
    // -----------------------------

    const totalContribution =
      contributions.reduce(
        (sum, item) =>
          sum +
          Number(
            item.paidAmount || 0
          ),
        0
      );

    const expectedContribution =
      contributions.reduce(
        (sum, item) =>
          sum +
          Number(
            item.expectedAmount || 0
          ),
        0
      );

    const outstandingContribution =
      Math.max(
        expectedContribution -
          totalContribution,
        0
      );

    const currentContribution =
      contributions.find(
        (item) =>
          Number(item.month) ===
            currentMonth &&
          Number(item.year) ===
            currentYear
      );

    // -----------------------------
    // Ownership
    // -----------------------------

    let ownershipPercentage = 0;

    if (
      ownershipResult &&
      Array.isArray(
        ownershipResult.ownershipData
      )
    ) {
      const ownershipData =
        ownershipResult.ownershipData.find(
          (item) =>
            String(
              item.memberId
            ) ===
            String(
              member._id
            )
        );

      ownershipPercentage =
        Number(
          ownershipData
            ?.ownershipPercentage ||
            0
        );
    }

    // -----------------------------
    // Investment share
    // -----------------------------

    const totalInvestmentShare =
      investments.reduce(
        (
          sum,
          investment
        ) => {
          const currentValue =
            Number(
              investment.currentValue ||
                0
            );

          const share =
            (currentValue *
              ownershipPercentage) /
            100;

          return sum + share;
        },
        0
      );

    // -----------------------------
    // Monthly chart
    // -----------------------------

    const monthlySavings =
      contributions.map(
        (item) => ({
          month: `${item.year}-${String(
            item.month
          ).padStart(2, "0")}`,

          amount: Number(
            item.paidAmount || 0
          ),
        })
      );

    return res.status(200).json({
      success: true,
      role: "member",

      member: {
        memberCode:
          member.memberCode,

        name:
          member.user?.name ||
          "Member",

        monthlyContribution:
          Number(
            member.monthlyContribution ||
              0
          ),

        membershipStatus:
          member.membershipStatus,
      },

      summary: {
        totalContribution,

        expectedContribution,

        outstandingContribution,

        ownershipPercentage,

        totalInvestmentShare,
      },

      currentMonth: {
        month:
          currentMonth,

        year:
          currentYear,

        expectedAmount:
          Number(
            member.monthlyContribution ||
              0
          ),

        paidAmount:
          Number(
            currentContribution
              ?.paidAmount ||
              0
          ),

        status:
          currentContribution
            ?.status ||
          "due",
      },

      charts: {
        monthlySavings,
      },
    });
  } catch (error) {
    console.error(
      "Member dashboard error:",
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
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : "Failed to load dashboard",
    });
  }
};

// --------------------------------------------------
// ROLE-BASED DASHBOARD
// --------------------------------------------------

const getDashboardSummary = async (
  req,
  res
) => {
  if (
    req.user.role === "admin"
  ) {
    return getAdminDashboard(
      req,
      res
    );
  }

  return getMemberDashboard(
    req,
    res
  );
};

module.exports = {
  getDashboardSummary,
};