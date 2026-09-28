"use client";

import { useEffect, useState } from "react";

import { getDashboardSummary } from "@/services/dashboardApi";
import DashboardCharts from "@/components/DashboardCharts";

interface AdminDashboardData {
  success: true;
  role: "admin";

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
    month: number;
    year: number;
    expectedAmount: number;
    collectedAmount: number;
    outstandingAmount: number;
    paidMembers: number;
    partialMembers: number;
    dueMembers: number;
  };

  charts: {
    monthlySavings: {
      month: string;
      amount: number;
    }[];

    investmentPerformance: {
      id: string;
      name: string;
      investedAmount: number;
      currentValue: number;
      profitLoss: number;
      roi: number;
      status: string;
    }[];
  };
}

interface MemberDashboardData {
  success: true;
  role: "member";

  member: {
    memberCode: string;
    name?: string;
    monthlyContribution: number;
    membershipStatus: string;
  };

  summary: {
    totalContribution: number;
    expectedContribution: number;
    outstandingContribution: number;
    ownershipPercentage: number;
    totalInvestmentShare: number;
  };

  currentMonth: {
    month: number;
    year: number;
    expectedAmount: number;
    paidAmount: number;
    status: "paid" | "partial" | "due";
  };

  charts: {
    monthlySavings: {
      month: string;
      amount: number;
    }[];
  };
}

type DashboardData =
  | AdminDashboardData
  | MemberDashboardData;

export default function DashboardPage() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setError("");

        const result =
          await getDashboardSummary();

        setData(result);
      } catch (error: any) {
        setError(
          error?.response?.data?.message ||
            "Failed to load dashboard"
        );
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="text-gray-500">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-600">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  if (data.role === "admin") {
    return (
      <AdminDashboard
        data={data}
      />
    );
  }

  return (
    <MemberDashboard
      data={data}
    />
  );
}

function AdminDashboard({
  data,
}: {
  data: AdminDashboardData;
}) {
  const {
    totalMembers,
    totalSavings,
    availableCash,
    totalInvested,
    totalInvestmentValue,
    totalProfitLoss,
    totalExpenses,
  } = data.summary;

  const month =
    data.currentMonth;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Admin Dashboard
        </h1>

        <p className="mt-2 text-gray-500">
          Group savings and investment overview.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Savings"
          value={`৳${totalSavings.toLocaleString()}`}
        />

        <SummaryCard
          title="Available Cash"
          value={`৳${availableCash.toLocaleString()}`}
        />

        <SummaryCard
          title="Total Invested"
          value={`৳${totalInvested.toLocaleString()}`}
        />

        <SummaryCard
          title="Members"
          value={totalMembers.toString()}
        />

        <SummaryCard
          title="Investment Value"
          value={`৳${totalInvestmentValue.toLocaleString()}`}
        />

        <SummaryCard
          title="Profit / Loss"
          value={`৳${totalProfitLoss.toLocaleString()}`}
        />

        <SummaryCard
          title="Total Expenses"
          value={`৳${totalExpenses.toLocaleString()}`}
        />
      </div>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gray-900">
          Current Month
        </h2>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MiniCard
            title="Expected"
            value={`৳${month.expectedAmount.toLocaleString()}`}
          />

          <MiniCard
            title="Collected"
            value={`৳${month.collectedAmount.toLocaleString()}`}
          />

          <MiniCard
            title="Outstanding"
            value={`৳${month.outstandingAmount.toLocaleString()}`}
          />

          <MiniCard
            title="Paid Members"
            value={month.paidMembers.toString()}
          />
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <MiniCard
            title="Partial Members"
            value={month.partialMembers.toString()}
          />

          <MiniCard
            title="Due Members"
            value={month.dueMembers.toString()}
          />
        </div>
      </div>

      <DashboardCharts
        monthlySavings={
          data.charts.monthlySavings
        }
        investmentPerformance={
          data.charts.investmentPerformance
        }
      />
    </div>
  );
}

function MemberDashboard({
  data,
}: {
  data: MemberDashboardData;
}) {
  const {
    totalContribution,
    expectedContribution,
    outstandingContribution,
    ownershipPercentage,
    totalInvestmentShare,
  } = data.summary;

  const month =
    data.currentMonth;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome
          {data.member.name
            ? `, ${data.member.name}`
            : ""}
        </h1>

        <p className="mt-2 text-gray-500">
          Your personal savings and ownership overview.
        </p>
      </div>

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">
              Member Code
            </p>

            <p className="mt-1 text-lg font-semibold text-gray-900">
              {data.member.memberCode}
            </p>
          </div>

          <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium capitalize text-green-700">
            {
              data.member
                .membershipStatus
            }
          </span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="My Contribution"
          value={`৳${totalContribution.toLocaleString()}`}
        />

        <SummaryCard
          title="Expected Contribution"
          value={`৳${expectedContribution.toLocaleString()}`}
        />

        <SummaryCard
          title="Outstanding"
          value={`৳${outstandingContribution.toLocaleString()}`}
        />

        <SummaryCard
          title="Ownership"
          value={`${Number(
            ownershipPercentage
          ).toFixed(2)}%`}
        />

        <SummaryCard
          title="Investment Share"
          value={`৳${totalInvestmentShare.toLocaleString()}`}
        />

        <SummaryCard
          title="Monthly Target"
          value={`৳${Number(
            data.member
              .monthlyContribution
          ).toLocaleString()}`}
        />
      </div>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-gray-900">
          This Month
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          {formatMonth(
            month.month
          )}{" "}
          {month.year}
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <MiniCard
            title="Expected"
            value={`৳${month.expectedAmount.toLocaleString()}`}
          />

          <MiniCard
            title="Paid"
            value={`৳${month.paidAmount.toLocaleString()}`}
          />

          <MiniCard
            title="Status"
            value={
              month.status
                .charAt(0)
                .toUpperCase() +
              month.status.slice(1)
            }
          />
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-5 text-xl font-semibold text-gray-900">
          My Savings History
        </h2>

        <DashboardCharts
          monthlySavings={
            data.charts.monthlySavings
          }
          investmentPerformance={[]}
        />
      </div>
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

      <h2 className="mt-2 text-2xl font-bold text-gray-900">
        {value}
      </h2>
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

      <p className="mt-1 text-lg font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function formatMonth(
  month: number
) {
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return months[month - 1] || "";
}
