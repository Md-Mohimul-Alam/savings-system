"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getDashboardReport,
  getMembersReport,
  getContributionsReport,
  getExpensesReport,
  getInvestmentsReport,
} from "@/services/reportApi";

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
  const [dashboard, setDashboard] =
    useState<DashboardReport | null>(null);

  const [members, setMembers] =
    useState<Member[]>([]);

  const [contributions, setContributions] =
    useState<Contribution[]>([]);

  const [expenses, setExpenses] =
    useState<Expense[]>([]);

  const [investments, setInvestments] =
    useState<Investment[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        setError("");

        const [
          dashboardData,
          membersData,
          contributionsData,
          expensesData,
          investmentsData,
        ] = await Promise.all([
          getDashboardReport(),
          getMembersReport(),
          getContributionsReport(),
          getExpensesReport(),
          getInvestmentsReport(),
        ]);

        setDashboard(dashboardData);

        setMembers(
          membersData.members || []
        );

        setContributions(
          contributionsData.contributions || []
        );

        setExpenses(
          expensesData.expenses || []
        );

        setInvestments(
          investmentsData.investments || []
        );
      } catch (error: any) {
        setError(
          error?.response?.data?.message ||
            "Failed to load reports"
        );
      } finally {
        setLoading(false);
      }
    };

    loadReports();
  }, []);

  const totalExpectedContributions =
    useMemo(() => {
      return contributions.reduce(
        (sum, contribution) =>
          sum +
          contribution.expectedAmount,
        0
      );
    }, [contributions]);

  const totalPaidContributions =
    useMemo(() => {
      return contributions.reduce(
        (sum, contribution) =>
          sum + contribution.paidAmount,
        0
      );
    }, [contributions]);

  const totalOutstanding =
    Math.max(
      totalExpectedContributions -
        totalPaidContributions,
      0
    );

  const activeMembers =
    members.filter(
      (member) =>
        member.membershipStatus ===
        "active"
    );

  const activeInvestments =
    investments.filter(
      (investment) =>
        investment.status === "active"
    );

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading reports...
      </p>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-600">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Reports
        </h1>

        <p className="mt-2 text-gray-500">
          Group financial and member overview.
        </p>
      </div>

      {dashboard && (
        <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard
            title="Total Savings"
            value={`৳${dashboard.summary.totalSavings.toLocaleString()}`}
          />

          <SummaryCard
            title="Available Cash"
            value={`৳${dashboard.summary.availableCash.toLocaleString()}`}
          />

          <SummaryCard
            title="Investment Value"
            value={`৳${dashboard.summary.totalInvestmentValue.toLocaleString()}`}
          />

          <SummaryCard
            title="Profit / Loss"
            value={`৳${dashboard.summary.totalProfitLoss.toLocaleString()}`}
          />

          <SummaryCard
            title="Total Expenses"
            value={`৳${dashboard.summary.totalExpenses.toLocaleString()}`}
          />

          <SummaryCard
            title="Active Members"
            value={activeMembers.length.toString()}
          />

          <SummaryCard
            title="Active Investments"
            value={activeInvestments.length.toString()}
          />

          <SummaryCard
            title="Outstanding Contributions"
            value={`৳${totalOutstanding.toLocaleString()}`}
          />
        </div>
      )}

      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-5 text-xl font-semibold">
          Contribution Summary
        </h2>

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

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">
          Member Report
        </h2>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left">
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
              {members.map((member) => (
                <tr
                  key={member._id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-5 py-4">
                    {member.memberCode}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-medium">
                      {member.user?.name}
                    </div>

                    <div className="text-sm text-gray-500">
                      {member.user?.email}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    ৳
                    {member.monthlyContribution.toLocaleString()}
                  </td>

                  <td className="px-5 py-4">
                    ৳
                    {member.totalContribution.toLocaleString()}
                  </td>

                  <td className="px-5 py-4">
                    {(
                      member.ownershipPercentage ||
                      0
                    ).toFixed(2)}
                    %
                  </td>

                  <td className="px-5 py-4 capitalize">
                    {member.membershipStatus}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">
          Investment Report
        </h2>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left">
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
              {investments.map(
                (investment) => {
                  const profitLoss =
                    investment.currentValue -
                    investment.investedAmount;

                  const roi =
                    investment.investedAmount >
                    0
                      ? (profitLoss /
                          investment.investedAmount) *
                        100
                      : 0;

                  return (
                    <tr
                      key={investment._id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-5 py-4 font-medium">
                        {investment.name}
                      </td>

                      <td className="px-5 py-4">
                        ৳
                        {investment.investedAmount.toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        ৳
                        {investment.currentValue.toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        ৳
                        {profitLoss.toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        {roi.toFixed(2)}%
                      </td>

                      <td className="px-5 py-4 capitalize">
                        {investment.status}
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold">
          Expense Report
        </h2>

        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left">
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
              {expenses.map((expense) => (
                <tr
                  key={expense._id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-5 py-4">
                    {new Date(
                      expense.expenseDate
                    ).toLocaleDateString()}
                  </td>

                  <td className="px-5 py-4">
                    {expense.title}
                  </td>

                  <td className="px-5 py-4">
                    {expense.category}
                  </td>

                  <td className="px-5 py-4">
                    ৳
                    {expense.amount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

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