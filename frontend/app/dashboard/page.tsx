"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { getDashboardSummary } from "@/services/dashboardApi";
import DashboardCharts from "@/components/DashboardCharts";

type Amount = number | null | undefined;
type Status = "paid" | "partial" | "due";
type CardTone = "blue" | "green" | "purple" | "orange" | "red" | "cyan" | "slate";
interface MonthlySaving { month: string; amount: number }
interface InvestmentPerformance {
  id: string;
  name: string;
  investedAmount: number;
  currentValue: number;
  profitLoss: number;
  roi: number;
  status: string;
}
interface AdminDashboardData {
  success: true;
  role: "admin";
  demoMode?: boolean;
  summary: {
    totalMembers: number;
    totalFinancialProfiles?: number;
    registeredMembers?: number;
    unregisteredMembers?: number;
    totalSavings: number;
    openingSavings?: number;
    availableCash: number;
    totalCollectedFines?: number;
    outstandingLoans?: number;
    totalLoanDisbursed?: number;
    totalLoanRepaid?: number;
    totalInvested: number;
    activeInvestedAmount?: number;
    totalInvestmentValue: number;
    totalProfitLoss: number;
    realizedProfitLoss?: number;
    unrealizedProfitLoss?: number;
    totalExpenses: number;
    totalGroupAssets?: number;
    outstandingRecordedContributions?: number;
    outstandingRecordedFines?: number;
    fineAllocationAvailable?: boolean;
    fineAllocationMessage?: string | null;
    fineSharePerMember?: number | null;
  };
  currentMonth: {
    month: number;
    year: number;
    expectedAmount: number;
    collectedAmount: number;
    outstandingAmount: number;
    collectedFines?: number;
    outstandingFines?: number;
    totalDue?: number;
    paidMembers: number;
    partialMembers: number;
    dueMembers: number;
  };
  charts: {
    monthlySavings: MonthlySaving[];
    investmentPerformance: InvestmentPerformance[];
  };
}
interface MemberDashboardData {
  success: true;
  role: "member";
  demoMode?: boolean;
  member: {
    memberCode: string;
    name?: string;
    monthlyContribution: number;
    membershipStatus: string;
  };
  summary: {
    totalContribution: number;
    openingContribution?: number;
    expectedContribution: number;
    outstandingContribution: number;
    outstandingFines?: number;
    ownershipAvailable?: boolean;
    ownershipPercentage: number | null;
    totalInvestmentShare: number | null;
    totalGroupSavings: number;
    totalExpenses: number;
    availableCash?: number;
    totalCollectedFines?: number;
    fineShare?: number | null;
    fineAllocationAvailable?: boolean;
    fineAllocationMessage?: string | null;
    savingsIncludingFineShare?: number | null;
    outstandingLoan?: number;
    totalLoanDisbursed?: number;
    totalLoanRepaid?: number;
    groupOutstandingLoans?: number;
  };
  currentMonth: {
    month: number;
    year: number;
    applicable?: boolean;
    recorded?: boolean;
    expectedAmount: number;
    paidAmount: number;
    status: Status;
    remainingAmount?: number;
    fineAmount?: number;
    finePaidAmount?: number;
    remainingFine?: number;
    totalDue?: number;
  };
  charts: { monthlySavings: MonthlySaving[] };
}
type DashboardData = AdminDashboardData | MemberDashboardData;

const finite = (value: Amount): value is number =>
  typeof value === "number" && Number.isFinite(value);
const currency = (value: Amount) =>
  finite(value) ? `৳${value.toLocaleString("en-BD", { maximumFractionDigits: 2 })}` : "Unavailable";
const count = (value: Amount) => finite(value) ? value.toLocaleString("en-BD") : "Unavailable";
const percent = (value: Amount) => finite(value) ? `${value.toFixed(2)}%` : "Unavailable";
const difference = (total: Amount, opening: Amount) =>
  finite(total) && finite(opening) ? (Math.round(total * 100) - Math.round(opening * 100)) / 100 : null;
const progress = (paid: Amount, expected: Amount) =>
  finite(paid) && finite(expected) && expected > 0
    ? Math.max(0, Math.min(100, Math.round(paid / expected * 100))) : null;
const formatMonth = (month: number) => [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
][month - 1] || "Unknown month";

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const load = async () => {
      try {
        const result = await getDashboardSummary();
        if (!result || result.success !== true || !["admin", "member"].includes(result.role) ||
            !result.summary || !result.currentMonth || (result.role === "member" && !result.member)) {
          throw new Error("Unexpected dashboard response. Check the installed dashboard controller.");
        }
        if (active) setData(result as DashboardData);
      } catch (err: unknown) {
        const item = err as { response?: { data?: { message?: string } }; message?: string };
        if (active) setError(item?.response?.data?.message || item?.message || "Failed to load dashboard");
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [attempt]);

  if (loading) return <DashboardLoading />;
  if (error || !data) return (
    <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5">
      <p className="font-semibold text-red-700">Unable to load dashboard</p>
      <p className="mt-1 text-sm text-red-600">{error || "No dashboard data returned."}</p>
      <button type="button" onClick={() => setAttempt((value) => value + 1)}
        className="mt-4 rounded-lg border border-red-300 px-4 py-2">Retry</button>
    </div>
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>{data.demoMode && <span className="rounded-full bg-amber-100 px-3 py-1 text-sm text-amber-800">Demo — sample data</span>}</div>
        <div className="flex gap-3">
          <Link href="/dashboard/loans" className="rounded-lg border bg-white px-4 py-2 text-sm">Group Loans</Link>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}
            className="rounded-lg border bg-white px-4 py-2 text-sm">Refresh</button>
        </div>
      </div>
      {data.role === "admin" ? <AdminDashboard data={data} /> : <MemberDashboard data={data} />}
    </div>
  );
}

function AdminDashboard({ data }: { data: AdminDashboardData }) {
  const s = data.summary;
  const m = data.currentMonth;
  return (
    <div className="space-y-8">
      <Header title="Dashboard Overview" subtitle="Savings, fines, loans, investments, and available cash." badge="Admin" details={<Period month={m.month} year={m.year} />} />
      <Section title="Group financial summary">
        <Cards>
          <SummaryCard title="Total Savings" value={currency(s.totalSavings)} description="Includes opening savings. Excludes fines and loans." tone="blue" />
          <SummaryCard title="Opening Savings" value={currency(s.openingSavings)} description="Historical savings through December 2025; already included above." tone="purple" />
          <SummaryCard title="Savings Since Opening" value={currency(difference(s.totalSavings, s.openingSavings))} description="Total savings minus the opening portion." tone="blue" />
          <SummaryCard title="Available Cash" value={currency(s.availableCash)} description="Ledger cash balance; collected fines are already included." tone="green" />
          <SummaryCard title="Collected Fine Fund" value={currency(s.totalCollectedFines)} description="Opening fines plus net collected monthly fines." tone="orange" />
          <SummaryCard title="Outstanding Loans" value={currency(s.outstandingLoans)} description="Money owed to the group; not spendable cash." tone="orange" />
          <SummaryCard title="Loans Disbursed" value={currency(s.totalLoanDisbursed)} description="Net disbursements recorded in the ledger." tone="slate" />
          <SummaryCard title="Loans Repaid" value={currency(s.totalLoanRepaid)} description="Net repayments; not savings contributions." tone="green" />
          <SummaryCard title="Total Group Assets" value={currency(s.totalGroupAssets)} description="Cash + active investment value + outstanding loans." tone="cyan" />
          <SummaryCard title="Total Expenses" value={currency(s.totalExpenses)} description="Recorded organization expenses." tone="orange" />
        </Cards>
      </Section>
      <Section title="Membership and recorded dues">
        <Cards>
          <SummaryCard title="Active Members" value={count(s.totalMembers)} tone="slate" />
          <SummaryCard title="Financial Profiles" value={count(s.totalFinancialProfiles)} description="All membership statuses." />
          <SummaryCard title="With Login Accounts" value={count(s.registeredMembers)} description="Active members linked to a login." />
          <SummaryCard title="Without Login Accounts" value={count(s.unregisteredMembers)} description="Active financial profiles awaiting account linking." />
          <SummaryCard title="Recorded Savings Due" value={currency(s.outstandingRecordedContributions)} description="Existing contribution records only." tone="red" />
          <SummaryCard title="Recorded Fines Due" value={currency(s.outstandingRecordedFines)} description="Uncollected fines; not available cash." tone="red" />
        </Cards>
        <Notice>Historical months without contribution records are not included in recorded dues. Import and reconcile the history before treating these as complete totals.</Notice>
        {s.fineAllocationAvailable === false && <Notice>{s.fineAllocationMessage || "Fine allocation requires reconciliation."}</Notice>}
      </Section>
      <Section title="Investments">
        <Cards>
          <SummaryCard title="Lifetime Invested" value={currency(s.totalInvested)} description="Principal across active and closed investments." tone="purple" />
          <SummaryCard title="Active Invested Principal" value={currency(s.activeInvestedAmount)} description="Principal in active investments only." tone="purple" />
          <SummaryCard title="Active Investment Value" value={currency(s.totalInvestmentValue)} description="Closed investment proceeds are already in the cash ledger." tone="cyan" />
          <SummaryCard title="Total Profit / Loss" value={currency(s.totalProfitLoss)} description="Realized plus unrealized investment result." tone={s.totalProfitLoss < 0 ? "red" : "green"} />
          <SummaryCard title="Realized Profit / Loss" value={currency(s.realizedProfitLoss)} description="Closed investment proceeds minus principal." />
          <SummaryCard title="Unrealized Profit / Loss" value={currency(s.unrealizedProfitLoss)} description="Active investment valuation minus principal." />
        </Cards>
      </Section>
      <Section title={`Monthly contributions — ${formatMonth(m.month)} ${m.year}`}>
        <ProgressBar value={progress(m.collectedAmount, m.expectedAmount)} label="Savings collection progress" />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <MiniCard title="Expected Savings" value={currency(m.expectedAmount)} />
          <MiniCard title="Savings Collected" value={currency(m.collectedAmount)} />
          <MiniCard title="Savings Outstanding" value={currency(m.outstandingAmount)} />
          <MiniCard title="Fines Collected" value={currency(m.collectedFines)} />
          <MiniCard title="Fines Outstanding" value={currency(m.outstandingFines)} />
          <MiniCard title="Total Due (Savings + Fines)" value={currency(m.totalDue)} />
          <MiniCard title="Savings Paid Members" value={count(m.paidMembers)} />
          <MiniCard title="Savings Partial Members" value={count(m.partialMembers)} />
          <MiniCard title="Savings Due Members" value={count(m.dueMembers)} />
        </div>
        <Notice>Monthly figures are allocated to the contribution month, not necessarily the month cash was received. A savings-paid member may still owe a fine.</Notice>
      </Section>
      <Section title="Financial Performance">
        <DashboardCharts monthlySavings={data.charts?.monthlySavings ?? []}
          investmentPerformance={data.charts?.investmentPerformance ?? []} />
      </Section>
    </div>
  );
}

function MemberDashboard({ data }: { data: MemberDashboardData }) {
  const s = data.summary;
  const m = data.currentMonth;
  const ownershipUnavailable = s.ownershipAvailable === false;
  const fineUnavailable = s.fineAllocationAvailable === false;
  return (
    <div className="space-y-8">
      <Header title={`Welcome${data.member.name ? ", " + data.member.name : ""}`}
        subtitle="View your savings, contributions, fines, loans, and investment share." badge="Member Dashboard"
        details={<div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
          <p className="text-xs text-gray-500">Member ID</p>
          <p className="mt-1 break-all font-semibold text-gray-900">{data.member.memberCode}</p>
          <span className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize ${data.member.membershipStatus === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"}`}>{data.member.membershipStatus}</span>
        </div>} />
      <Section title="My savings and dues">
        <Cards>
          <SummaryCard title="My Total Savings" value={currency(s.totalContribution)} description="Includes opening savings. Excludes fines and loans." tone="blue" />
          <SummaryCard title="My Opening Savings" value={currency(s.openingContribution)} description="Historical savings; already included in the total." tone="purple" />
          <SummaryCard title="My Savings Since Opening" value={currency(difference(s.totalContribution, s.openingContribution))} tone="blue" />
          <SummaryCard title="Expected Savings" value={currency(s.expectedContribution)} description="Opening plus recorded expectations and applicable current month." />
          <SummaryCard title="Savings Outstanding" value={currency(s.outstandingContribution)} description="Recorded months plus the applicable current month." tone="orange" />
          <SummaryCard title="Fines Outstanding" value={currency(s.outstandingFines)} description="Unpaid fines, separate from personal savings." tone="red" />
          <SummaryCard title="Monthly Target" value={currency(data.member.monthlyContribution)} description="Regular monthly savings amount." />
        </Cards>
        <Notice>Missing historical contribution records can understate dues. The opening savings portion is never added to your total twice.</Notice>
      </Section>
      <Section title="My loans and estimated shares">
        <Cards>
          <SummaryCard title="My Outstanding Loan" value={currency(s.outstandingLoan)} description="Your remaining debt to the group." tone="orange" />
          <SummaryCard title="My Loans Disbursed" value={currency(s.totalLoanDisbursed)} />
          <SummaryCard title="My Loans Repaid" value={currency(s.totalLoanRepaid)} />
          <SummaryCard title="Ownership" value={percent(ownershipUnavailable ? null : s.ownershipPercentage)} description="Savings-based ownership estimate." tone="cyan" />
          <SummaryCard title="Investment Share" value={currency(ownershipUnavailable ? null : s.totalInvestmentShare)} description="Estimated share of active investment value; not cash." tone="green" />
          <SummaryCard title="Equal Fine Entitlement" value={currency(fineUnavailable ? null : s.fineShare)} description="Informational share of the collected fine fund." tone="orange" />
          <SummaryCard title="Savings + Fine Entitlement" value={currency(fineUnavailable ? null : s.savingsIncludingFineShare)} description="Informational only. Not a withdrawal or exit payout." tone="purple" />
        </Cards>
        {ownershipUnavailable && <Notice>Ownership and investment shares are unavailable until membership or exit settlements are reconciled.</Notice>}
        {fineUnavailable && <Notice>{s.fineAllocationMessage || "Fine allocation requires reconciliation."}</Notice>}
      </Section>
      <Section title="Group financial summary">
        <Cards>
          <SummaryCard title="Total Group Savings" value={currency(s.totalGroupSavings)} description="Personal savings of all financial profiles." tone="blue" />
          <SummaryCard title="Available Group Cash" value={currency(s.availableCash)} description="Group cash, not your personal withdrawable balance." tone="green" />
          <SummaryCard title="Collected Fine Fund" value={currency(s.totalCollectedFines)} description="Already included in cash; do not add it again." tone="orange" />
          <SummaryCard title="Group Outstanding Loans" value={currency(s.groupOutstandingLoans)} description="Loan receivables, not available cash." tone="orange" />
          <SummaryCard title="Group Expenses" value={currency(s.totalExpenses)} />
        </Cards>
      </Section>
      <Section title={`This month — ${formatMonth(m.month)} ${m.year}`}>
        {m.applicable === false ? <Notice>This month is not applicable to your membership. It is not shown as a paid contribution.</Notice> : <>
          <div className="mb-4"><StatusBadge status={m.status} /></div>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <MiniCard title="Expected Savings" value={currency(m.expectedAmount)} />
            <MiniCard title="Savings Paid" value={currency(m.paidAmount)} />
            <MiniCard title="Savings Due" value={currency(m.remainingAmount)} />
            <MiniCard title="Fine Assessed" value={currency(m.fineAmount)} />
            <MiniCard title="Fine Collected" value={currency(m.finePaidAmount)} />
            <MiniCard title="Fine Due" value={currency(m.remainingFine)} />
            <MiniCard title="Total Due" value={currency(m.totalDue)} />
          </div>
          <ProgressBar value={progress(m.paidAmount, m.expectedAmount)} label="Savings payment progress" />
          {m.recorded === false && <Notice>This is the current-month expectation; no contribution record has been entered yet.</Notice>}
          <Notice>Savings status and fine status are separate. A paid savings status does not mean an outstanding fine has been settled.</Notice>
        </>}
      </Section>
      <Section title="My Savings History">
        <DashboardCharts monthlySavings={data.charts?.monthlySavings ?? []} investmentPerformance={[]} showInvestmentChart={false} />
      </Section>
    </div>
  );
}

function Period({ month, year }: { month: number; year: number }) {
  return <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Current Period</p>
    <p className="mt-1 font-semibold text-gray-900">{formatMonth(month)} {year}</p>
  </div>;
}
function Header({ title, subtitle, badge, details }: {
  title: string; subtitle: string; badge: string; details?: ReactNode;
}) {
  return <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
    <div>
      <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white">{badge}</span>
      <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-950 sm:text-4xl">{title}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">{subtitle}</p>
    </div>
    {details}
  </header>;
}
function Section({ title, children }: { title: string; children: ReactNode }) {
  return <section><h2 className="mb-4 text-xl font-bold text-gray-900">{title}</h2>{children}</section>;
}
function Cards({ children }: { children: ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>;
}
function Notice({ children }: { children: ReactNode }) {
  return <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">{children}</p>;
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
      dot:
        "bg-blue-500",
      soft:
        "bg-blue-50",
    },

    green: {
      dot:
        "bg-emerald-500",
      soft:
        "bg-emerald-50",
    },

    purple: {
      dot:
        "bg-violet-500",
      soft:
        "bg-violet-50",
    },

    orange: {
      dot:
        "bg-orange-500",
      soft:
        "bg-orange-50",
    },

    red: {
      dot:
        "bg-red-500",
      soft:
        "bg-red-50",
    },

    cyan: {
      dot:
        "bg-cyan-500",
      soft:
        "bg-cyan-50",
    },

    slate: {
      dot:
        "bg-gray-700",
      soft:
        "bg-gray-100",
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

function MiniCard({ title, value }: { title: string; value: string }) {
  return <div className="rounded-xl border border-gray-100 bg-white p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{title}</p>
    <p className="mt-2 text-lg font-bold text-gray-900">{value}</p>
  </div>;
}
function ProgressBar({ value, label }: { value: number | null; label: string }) {
  return <div>
    <p className="mb-2 text-sm text-gray-600">{label}: {value === null ? "Not applicable / unavailable" : `${value}%`}</p>
    {value !== null && <div role="progressbar" aria-label={label} aria-valuenow={value}
      aria-valuemin={0} aria-valuemax={100} className="h-2.5 overflow-hidden rounded-full bg-gray-100">
      <div className="h-full rounded-full bg-gray-900" style={{ width: `${value}%` }} />
    </div>}
  </div>;
}
function StatusBadge({ status }: { status: Status }) {
  const styles = {
    paid: "bg-green-50 text-green-700 border-green-200",
    partial: "bg-orange-50 text-orange-700 border-orange-200",
    due: "bg-red-50 text-red-700 border-red-200",
  };
  return <span className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize ${styles[status]}`}>
    Savings: {status}
  </span>;
}
function DashboardLoading() {
  return <div role="status" aria-label="Loading dashboard" className="animate-pulse space-y-8">
    <div className="h-8 w-64 max-w-full rounded bg-gray-200" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 9 }, (_, index) => <div key={index} className="h-36 rounded-2xl border border-gray-200 bg-white" />)}
    </div>
  </div>;
}
