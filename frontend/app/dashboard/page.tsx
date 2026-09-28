"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getDashboardSummary,
} from "@/services/dashboardApi";

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

type CardTone =
  | "blue"
  | "green"
  | "purple"
  | "orange"
  | "red"
  | "cyan"
  | "slate";

export default function DashboardPage() {
  const [data, setData] =
    useState<DashboardData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadDashboard =
      async () => {
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
    return <DashboardLoading />;
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
        <p className="font-semibold text-red-700">
          Unable to load dashboard
        </p>

        <p className="mt-1 text-sm text-red-600">
          {error}
        </p>
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

  const collectionRate =
    month.expectedAmount > 0
      ? Math.min(
          100,
          Math.round(
            (month.collectedAmount /
              month.expectedAmount) *
              100
          )
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
                Admin
              </span>

              <span className="text-sm text-gray-500">
                Savings & Investment Management
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
              Dashboard Overview
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500 sm:text-base">
              Monitor savings, investments,
              expenses and member activity
              from one place.
            </p>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
              Current Period
            </p>

            <p className="mt-1 font-semibold text-gray-900">
              {formatMonth(
                month.month
              )}{" "}
              {month.year}
            </p>
          </div>
        </div>
      </section>

      {/* Main stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Savings"
          value={`৳${totalSavings.toLocaleString()}`}
          description="Total member contributions"
          tone="blue"
        />

        <SummaryCard
          title="Available Cash"
          value={`৳${availableCash.toLocaleString()}`}
          description="Current liquid balance"
          tone="green"
        />

        <SummaryCard
          title="Total Invested"
          value={`৳${totalInvested.toLocaleString()}`}
          description="Capital currently invested"
          tone="purple"
        />

        <SummaryCard
          title="Total Members"
          value={totalMembers.toString()}
          description="Active group members"
          tone="slate"
        />

        <SummaryCard
          title="Investment Value"
          value={`৳${totalInvestmentValue.toLocaleString()}`}
          description="Current portfolio value"
          tone="cyan"
        />

        <SummaryCard
          title="Profit / Loss"
          value={`৳${totalProfitLoss.toLocaleString()}`}
          description={
            totalProfitLoss >= 0
              ? "Current portfolio gain"
              : "Current portfolio loss"
          }
          tone={
            totalProfitLoss >= 0
              ? "green"
              : "red"
          }
        />

        <SummaryCard
          title="Total Expenses"
          value={`৳${totalExpenses.toLocaleString()}`}
          description="Recorded operating expenses"
          tone="orange"
        />
      </section>

      {/* Current month */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Monthly Contribution
              </p>

              <h2 className="mt-1 text-xl font-bold text-gray-900">
                {formatMonth(
                  month.month
                )}{" "}
                {month.year}
              </h2>
            </div>

            <div className="min-w-[190px]">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Collection progress
                </span>

                <span className="font-semibold text-gray-900">
                  {collectionRate}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-gray-900 transition-all"
                  style={{
                    width: `${collectionRate}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-px bg-gray-200 sm:grid-cols-2 xl:grid-cols-3">
          <MonthlyStat
            title="Expected"
            value={`৳${month.expectedAmount.toLocaleString()}`}
          />

          <MonthlyStat
            title="Collected"
            value={`৳${month.collectedAmount.toLocaleString()}`}
          />

          <MonthlyStat
            title="Outstanding"
            value={`৳${month.outstandingAmount.toLocaleString()}`}
          />

          <MonthlyStat
            title="Paid Members"
            value={month.paidMembers.toString()}
          />

          <MonthlyStat
            title="Partial Members"
            value={month.partialMembers.toString()}
          />

          <MonthlyStat
            title="Due Members"
            value={month.dueMembers.toString()}
          />
        </div>
      </section>

      {/* Charts */}
      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Analytics
          </p>

          <h2 className="mt-1 text-xl font-bold text-gray-900">
            Financial Performance
          </h2>
        </div>

        <DashboardCharts
          monthlySavings={
            data.charts.monthlySavings
          }
          investmentPerformance={
            data.charts
              .investmentPerformance
          }
        />
      </section>
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

  const monthlyProgress =
    month.expectedAmount > 0
      ? Math.min(
          100,
          Math.round(
            (month.paidAmount /
              month.expectedAmount) *
              100
          )
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <section>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2">
              <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">
                Member Dashboard
              </span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">
              Welcome
              {data.member.name
                ? `, ${data.member.name}`
                : ""}
            </h1>

            <p className="mt-2 text-sm leading-6 text-gray-500 sm:text-base">
              View your savings,
              contribution history,
              ownership and investment share.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
            <div>
              <p className="text-xs text-gray-400">
                Member ID
              </p>

              <p className="font-semibold text-gray-900">
                {
                  data.member
                    .memberCode
                }
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                data.member
                  .membershipStatus ===
                "active"
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {
                data.member
                  .membershipStatus
              }
            </span>
          </div>
        </div>
      </section>

      {/* Member stats */}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="My Contribution"
          value={`৳${totalContribution.toLocaleString()}`}
          description="Total amount contributed"
          tone="blue"
        />

        <SummaryCard
          title="Expected Contribution"
          value={`৳${expectedContribution.toLocaleString()}`}
          description="Expected contribution total"
          tone="purple"
        />

        <SummaryCard
          title="Outstanding"
          value={`৳${outstandingContribution.toLocaleString()}`}
          description="Remaining unpaid contribution"
          tone={
            outstandingContribution >
            0
              ? "orange"
              : "green"
          }
        />

        <SummaryCard
          title="Ownership"
          value={`${Number(
            ownershipPercentage
          ).toFixed(2)}%`}
          description="Your current group ownership"
          tone="cyan"
        />

        <SummaryCard
          title="Investment Share"
          value={`৳${totalInvestmentShare.toLocaleString()}`}
          description="Your estimated investment share"
          tone="green"
        />

        <SummaryCard
          title="Monthly Target"
          value={`৳${Number(
            data.member
              .monthlyContribution
          ).toLocaleString()}`}
          description="Regular monthly contribution"
          tone="slate"
        />
      </section>

      {/* Current month */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              This Month
            </p>

            <h2 className="mt-1 text-xl font-bold text-gray-900">
              {formatMonth(
                month.month
              )}{" "}
              {month.year}
            </h2>
          </div>

          <StatusBadge
            status={month.status}
          />
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MiniCard
            title="Expected"
            value={`৳${month.expectedAmount.toLocaleString()}`}
          />

          <MiniCard
            title="Paid"
            value={`৳${month.paidAmount.toLocaleString()}`}
          />

          <MiniCard
            title="Progress"
            value={`${monthlyProgress}%`}
          />
        </div>

        <div className="mt-5">
          <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-gray-900 transition-all"
              style={{
                width: `${monthlyProgress}%`,
              }}
            />
          </div>
        </div>
      </section>

      {/* Savings chart */}
      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Savings Activity
          </p>

          <h2 className="mt-1 text-xl font-bold text-gray-900">
            My Savings History
          </h2>
        </div>

        <DashboardCharts
          monthlySavings={
            data.charts.monthlySavings
          }
          investmentPerformance={[]}
          showInvestmentChart={
            false
          }
        />
      </section>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  description,
  tone = "slate",
}: {
  title: string;
  value: string;
  description?: string;
  tone?: CardTone;
}) {
  const tones: Record<
    CardTone,
    {
      dot: string;
      soft: string;
    }
  > = {
    blue: {
      dot: "bg-blue-500",
      soft: "bg-blue-50",
    },

    green: {
      dot: "bg-emerald-500",
      soft: "bg-emerald-50",
    },

    purple: {
      dot: "bg-violet-500",
      soft: "bg-violet-50",
    },

    orange: {
      dot: "bg-orange-500",
      soft: "bg-orange-50",
    },

    red: {
      dot: "bg-red-500",
      soft: "bg-red-50",
    },

    cyan: {
      dot: "bg-cyan-500",
      soft: "bg-cyan-50",
    },

    slate: {
      dot: "bg-gray-700",
      soft: "bg-gray-100",
    },
  };

  const selected =
    tones[tone];

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md sm:p-6">
      <div
        className={`absolute right-4 top-4 h-12 w-12 rounded-2xl ${selected.soft}`}
      />

      <div className="relative">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${selected.dot}`}
          />

          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>
        </div>

        <p className="mt-4 text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
          {value}
        </p>

        {description && (
          <p className="mt-2 text-xs leading-5 text-gray-400">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

function MonthlyStat({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white p-5 transition hover:bg-gray-50 sm:p-6">
      <p className="text-sm font-medium text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-xl font-bold text-gray-950">
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
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {title}
      </p>

      <p className="mt-2 text-lg font-bold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: "paid" | "partial" | "due";
}) {
  const styles = {
    paid:
      "bg-green-50 text-green-700 border-green-200",

    partial:
      "bg-orange-50 text-orange-700 border-orange-200",

    due:
      "bg-red-50 text-red-700 border-red-200",
  };

  return (
    <span
      className={`w-fit rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-8">
      <div>
        <div className="h-8 w-64 rounded bg-gray-200" />
        <div className="mt-3 h-4 w-80 max-w-full rounded bg-gray-100" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({
          length: 7,
        }).map((_, index) => (
          <div
            key={index}
            className="h-36 rounded-2xl border border-gray-200 bg-white"
          />
        ))}
      </div>

      <div className="h-72 rounded-2xl border border-gray-200 bg-white" />
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

  return (
    months[month - 1] ||
    ""
  );
}