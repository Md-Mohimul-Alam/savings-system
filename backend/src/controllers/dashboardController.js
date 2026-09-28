const Member = require("../models/Member");
const Contribution = require("../models/Contribution");
const Transaction = require("../models/Transaction");
const Investment = require("../models/Investment");
const Expense = require("../models/Expense");

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
        dataScope: req.dataScope,
      }).lean(),

      Contribution.find({ dataScope: req.dataScope }).lean(),

      Transaction.find({ dataScope: req.dataScope }).lean(),

      Investment.find({ dataScope: req.dataScope }).lean(),

      Expense.find({ dataScope: req.dataScope }).lean(),
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
      demoMode: req.user?.isDemo === true,

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
        "Failed to load dashboard",

      errorName:
        error?.name ||
        "UnknownError",
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
      "Loading member dashboard for user:",
      req.user?._id
    );

    if (!req.user?._id) {
      return res.status(401).json({
        success: false,

        message:
          "Authentication required",
      });
    }

    // -----------------------------------
    // Find member profile
    // -----------------------------------

    const member =
      await Member.findOne({
        user: req.user._id,
        dataScope: req.dataScope,
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
          "Member profile not found. Please contact admin.",
      });
    }

    console.log(
      "Member found:",
      String(member._id)
    );

    const now = new Date();

    const currentMonth =
      now.getMonth() + 1;

    const currentYear =
      now.getFullYear();

    // -----------------------------------
    // Load member + organization data
    // -----------------------------------

    const [
      contributions,
      investments,
      allContributions,
      expenses,
    ] = await Promise.all([
      // Current member contributions
      Contribution.find({
        member: member._id,
        dataScope: req.dataScope,
      })
        .sort({
          year: 1,
          month: 1,
        })
        .lean(),

      // Active investments
      Investment.find({
        status: "active",
        dataScope: req.dataScope,
      })
        .select(
          "name investedAmount currentValue status"
        )
        .lean(),

      // All contributions
      Contribution.find({ dataScope: req.dataScope })
        .select(
          "paidAmount"
        )
        .lean(),

      // All expenses
      Expense.find({ dataScope: req.dataScope })
        .select(
          "amount"
        )
        .lean(),
    ]);

    console.log(
      "Member contributions:",
      contributions.length
    );

    console.log(
      "Active investments:",
      investments.length
    );

    console.log(
      "All contributions:",
      allContributions.length
    );

    console.log(
      "Expenses:",
      expenses.length
    );

    // -----------------------------------
    // Member contribution calculations
    // -----------------------------------

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

    // -----------------------------------
    // Organization totals
    // -----------------------------------

    const totalGroupSavings =
      allContributions.reduce(
        (sum, item) =>
          sum +
          Number(
            item.paidAmount || 0
          ),
        0
      );

    const totalExpenses =
      expenses.reduce(
        (sum, item) =>
          sum +
          Number(
            item.amount || 0
          ),
        0
      );

    // -----------------------------------
    // Ownership - scoped to the current data set
    // -----------------------------------

    const ownershipPercentage =
      totalGroupSavings > 0
        ? Number(
            (
              (totalContribution /
                totalGroupSavings) *
              100
            ).toFixed(4)
          )
        : 0;

    // -----------------------------------
    // Investment share
    // -----------------------------------

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

    // -----------------------------------
    // Member savings chart
    // -----------------------------------

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

    // -----------------------------------
    // Response
    // -----------------------------------

    return res.status(200).json({
      success: true,

      role: "member",
      demoMode: req.user?.isDemo === true,

      member: {
        memberCode:
          member.memberCode ||
          "",

        name:
          member.user?.name ||
          "Member",

        monthlyContribution:
          Number(
            member.monthlyContribution ||
              0
          ),

        membershipStatus:
          member.membershipStatus ||
          "active",
      },

      summary: {
        totalContribution,

        expectedContribution,

        outstandingContribution,

        ownershipPercentage,

        totalInvestmentShare,

        totalGroupSavings,

        totalExpenses,
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
      "MEMBER DASHBOARD FATAL ERROR:",
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
        "Failed to load dashboard",

      errorName:
        error?.name ||
        "UnknownError",
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
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,

        message:
          "Authentication required",
      });
    }

    console.log(
      "Dashboard request:",
      {
        userId:
          req.user?._id,

        role:
          req.user?.role,
      }
    );

    if (
      req.user.role === "admin"
    ) {
      return getAdminDashboard(
        req,
        res
      );
    }

    if (
      req.user.role === "member"
    ) {
      return getMemberDashboard(
        req,
        res
      );
    }

    return res.status(403).json({
      success: false,

      message:
        "Invalid user role",
    });
  } catch (error) {
    console.error(
      "Dashboard routing error:",
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
        "Failed to load dashboard",

      errorName:
        error?.name ||
        "UnknownError",
    });
  }
};

module.exports = {
  getDashboardSummary,
};