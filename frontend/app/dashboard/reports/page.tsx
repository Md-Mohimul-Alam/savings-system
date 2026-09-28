"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getDashboardReport,
  getMembersReport,
  getContributionsReport,
  getExpensesReport,
  getInvestmentsReport,
} from "@/services/reportApi";

import {
  useDemoMode,
} from "@/hooks/useDemoMode";

interface Member {
  _id: string;
  memberCode: string;
  monthlyContribution: number;
  totalContribution: number;
  ownershipPercentage: number;
  membershipStatus: string;

  user?: {
    name?: string;
    email?: string;
  };
}

interface Contribution {
  _id: string;
  month: number;
  year: number;
  expectedAmount: number;
  paidAmount: number;
  status: string;

  member?: {
    memberCode?: string;

    user?: {
      name?: string;
    };
  };
}

interface Expense {
  _id: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
}

interface Investment {
  _id: string;
  name: string;
  investedAmount: number;
  currentValue: number;
  status: string;
}

interface DashboardReport {
  summary: {
    totalMembers: number;
    totalSavings: number;
    availableCash: number;
    totalInvested: number;
    totalInvestmentValue: number;
    totalProfitLoss: number;
    totalExpenses: number;
  };

  currentMonth: {
    expectedAmount: number;
    collectedAmount: number;
    outstandingAmount: number;
    paidMembers: number;
    partialMembers: number;
    dueMembers: number;
  };
}

export default function ReportsPage() {
  const isDemo =
    useDemoMode();

  const [
    dashboard,
    setDashboard,
  ] =
    useState<DashboardReport | null>(
      null
    );

  const [
    members,
    setMembers,
  ] =
    useState<Member[]>(
      []
    );

  const [
    contributions,
    setContributions,
  ] =
    useState<Contribution[]>(
      []
    );

  const [
    expenses,
    setExpenses,
  ] =
    useState<Expense[]>(
      []
    );

  const [
    investments,
    setInvestments,
  ] =
    useState<Investment[]>(
      []
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    error,
    setError,
  ] =
    useState("");

  // --------------------------------------------------
  // LOAD REPORTS
  // --------------------------------------------------

  useEffect(() => {
    const loadReports =
      async () => {
        try {
          setLoading(
            true
          );

          setError("");

          const [
            dashboardData,
            membersData,
            contributionsData,
            expensesData,
            investmentsData,
          ] =
            await Promise.all([
              getDashboardReport(),
              getMembersReport(),
              getContributionsReport(),
              getExpensesReport(),
              getInvestmentsReport(),
            ]);

          setDashboard(
            dashboardData
          );

          setMembers(
            membersData.members ||
              []
          );

          setContributions(
            contributionsData.contributions ||
              []
          );

          setExpenses(
            expensesData.expenses ||
              []
          );

          setInvestments(
            investmentsData.investments ||
              []
          );
        } catch (
          error: any
        ) {
          setError(
            error?.response
              ?.data
              ?.message ||
              "Failed to load reports"
          );
        } finally {
          setLoading(
            false
          );
        }
      };

    loadReports();
  }, []);

  // --------------------------------------------------
  // CALCULATIONS
  // --------------------------------------------------

  const totalExpectedContributions =
    useMemo(() => {
      return contributions.reduce(
        (
          sum,
          contribution
        ) =>
          sum +
          Number(
            contribution.expectedAmount ||
              0
          ),
        0
      );
    }, [
      contributions,
    ]);

  const totalPaidContributions =
    useMemo(() => {
      return contributions.reduce(
        (
          sum,
          contribution
        ) =>
          sum +
          Number(
            contribution.paidAmount ||
              0
          ),
        0
      );
    }, [
      contributions,
    ]);

  const totalOutstanding =
    Math.max(
      totalExpectedContributions -
        totalPaidContributions,
      0
    );

  const activeMembers =
    members.filter(
      (
        member
      ) =>
        member.membershipStatus ===
        "active"
    );

  const activeInvestments =
    investments.filter(
      (
        investment
      ) =>
        investment.status ===
        "active"
    );

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading reports...
      </p>
    );
  }

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-600">
        {error}
      </div>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Reports
            </h1>

            <p className="mt-2 text-gray-500">
              Group financial and member overview.
            </p>
          </div>

          {isDemo && (
            <span className="w-fit rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
              Demo Mode · Read Only
            </span>
          )}
        </div>
      </div>

      {/* Demo Notice */}
      {isDemo && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Demo Reports
          </p>

          <p className="mt-1 text-sm text-amber-700">
            You are viewing sample organization reports.
            All information is read-only and isolated from
            live organization data.
          </p>
        </div>
      )}

      {/* Summary */}
      {dashboard && (
        <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Savings"
            value={`৳${Number(
              dashboard.summary
                .totalSavings ||
                0
            ).toLocaleString()}`}
          />

          <SummaryCard
            title="Available Cash"
            value={`৳${Number(
              dashboard.summary
                .availableCash ||
                0
            ).toLocaleString()}`}
          />

          <SummaryCard
            title="Investment Value"
            value={`৳${Number(
              dashboard.summary
                .totalInvestmentValue ||
                0
            ).toLocaleString()}`}
          />

          <SummaryCard
            title="Profit / Loss"
            value={`৳${Number(
              dashboard.summary
                .totalProfitLoss ||
                0
            ).toLocaleString()}`}
          />

          <SummaryCard
            title="Total Expenses"
            value={`৳${Number(
              dashboard.summary
                .totalExpenses ||
                0
            ).toLocaleString()}`}
          />

          <SummaryCard
            title="Active Members"
            value={
              activeMembers.length.toString()
            }
          />

          <SummaryCard
            title="Active Investments"
            value={
              activeInvestments.length.toString()
            }
          />

          <SummaryCard
            title="Outstanding Contributions"
            value={`৳${totalOutstanding.toLocaleString()}`}
          />
        </div>
      )}

      {/* Contribution Summary */}
      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">
            Contribution Summary
          </h2>

          {isDemo && (
            <span className="text-xs font-medium text-amber-700">
              Sample data
            </span>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <MiniCard
            title="Expected"
            value={`৳${totalExpectedContributions.toLocaleString()}`}
          />

          <MiniCard
            title="Paid"
            value={`৳${totalPaidContributions.toLocaleString()}`}
          />

          <MiniCard
            title="Outstanding"
            value={`৳${totalOutstanding.toLocaleString()}`}
          />
        </div>
      </section>

      {/* Member Report */}
      <section className="mb-8">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">
            Member Report
          </h2>

          <p className="text-sm text-gray-500">
            {members.length} member
            {members.length ===
            1
              ? ""
              : "s"}
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-[900px] w-full text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Code
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Member
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Monthly
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Total Contribution
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Ownership
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {members.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={
                      6
                    }
                    className="px-5 py-8 text-center text-gray-500"
                  >
                    No member report data found.
                  </td>
                </tr>
              ) : (
                members.map(
                  (
                    member
                  ) => (
                    <tr
                      key={
                        member._id
                      }
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {
                          member.memberCode
                        }
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium">
                          {member.user
                            ?.name ||
                            "-"}
                        </div>

                        <div className="text-sm text-gray-500">
                          {member.user
                            ?.email ||
                            "-"}
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        ৳
                        {Number(
                          member.monthlyContribution ||
                            0
                        ).toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        ৳
                        {Number(
                          member.totalContribution ||
                            0
                        ).toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        {Number(
                          member.ownershipPercentage ||
                            0
                        ).toFixed(
                          2
                        )}
                        %
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            member.membershipStatus
                          }
                        />
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Investment Report */}
      <section className="mb-8">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">
            Investment Report
          </h2>

          <p className="text-sm text-gray-500">
            {investments.length} investment
            {investments.length ===
            1
              ? ""
              : "s"}
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-[850px] w-full text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Investment
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Invested
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Current Value
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Profit / Loss
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  ROI
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {investments.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={
                      6
                    }
                    className="px-5 py-8 text-center text-gray-500"
                  >
                    No investment report data found.
                  </td>
                </tr>
              ) : (
                investments.map(
                  (
                    investment
                  ) => {
                    const profitLoss =
                      Number(
                        investment.currentValue ||
                          0
                      ) -
                      Number(
                        investment.investedAmount ||
                          0
                      );

                    const roi =
                      Number(
                        investment.investedAmount ||
                          0
                      ) >
                      0
                        ? (profitLoss /
                            Number(
                              investment.investedAmount
                            )) *
                          100
                        : 0;

                    return (
                      <tr
                        key={
                          investment._id
                        }
                        className="border-b border-gray-100 last:border-0"
                      >
                        <td className="px-5 py-4 font-medium">
                          {
                            investment.name
                          }
                        </td>

                        <td className="px-5 py-4">
                          ৳
                          {Number(
                            investment.investedAmount ||
                              0
                          ).toLocaleString()}
                        </td>

                        <td className="px-5 py-4">
                          ৳
                          {Number(
                            investment.currentValue ||
                              0
                          ).toLocaleString()}
                        </td>

                        <td
                          className={`px-5 py-4 font-medium ${
                            profitLoss >=
                            0
                              ? "text-green-700"
                              : "text-red-600"
                          }`}
                        >
                          {profitLoss >=
                          0
                            ? "+"
                            : ""}
                          ৳
                          {profitLoss.toLocaleString()}
                        </td>

                        <td
                          className={`px-5 py-4 font-medium ${
                            roi >=
                            0
                              ? "text-green-700"
                              : "text-red-600"
                          }`}
                        >
                          {roi.toFixed(
                            2
                          )}
                          %
                        </td>

                        <td className="px-5 py-4">
                          <StatusBadge
                            status={
                              investment.status
                            }
                          />
                        </td>
                      </tr>
                    );
                  }
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Expense Report */}
      <section>
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">
            Expense Report
          </h2>

          <p className="text-sm text-gray-500">
            {expenses.length} expense
            {expenses.length ===
            1
              ? ""
              : "s"}
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-[700px] w-full text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Date
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Title
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Category
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Amount
                </th>
              </tr>
            </thead>

            <tbody>
              {expenses.length ===
              0 ? (
                <tr>
                  <td
                    colSpan={
                      4
                    }
                    className="px-5 py-8 text-center text-gray-500"
                  >
                    No expense report data found.
                  </td>
                </tr>
              ) : (
                expenses.map(
                  (
                    expense
                  ) => (
                    <tr
                      key={
                        expense._id
                      }
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-5 py-4">
                        {new Date(
                          expense.expenseDate
                        ).toLocaleDateString(
                          "en-BD"
                        )}
                      </td>

                      <td className="px-5 py-4 font-medium text-gray-900">
                        {
                          expense.title
                        }
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          {
                            expense.category
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4 font-medium">
                        ৳
                        {Number(
                          expense.amount ||
                            0
                        ).toLocaleString()}
                      </td>
                    </tr>
                  )
                )
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

// --------------------------------------------------
// SUMMARY CARD
// --------------------------------------------------

function SummaryCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-2xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

// --------------------------------------------------
// MINI CARD
// --------------------------------------------------

function MiniCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-1 text-lg font-semibold">
        {value}
      </p>
    </div>
  );
}

// --------------------------------------------------
// STATUS BADGE
// --------------------------------------------------

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const normalized =
    status?.toLowerCase();

  const className =
    normalized ===
      "active" ||
    normalized ===
      "paid"
      ? "bg-green-50 text-green-700"
      : normalized ===
          "pending" ||
        normalized ===
          "partial"
      ? "bg-amber-50 text-amber-700"
      : normalized ===
          "rejected" ||
        normalized ===
          "inactive"
      ? "bg-red-50 text-red-700"
      : "bg-gray-100 text-gray-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${className}`}
    >
      {status ||
        "-"}
    </span>
  );
}