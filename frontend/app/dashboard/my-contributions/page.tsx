"use client";

import { useEffect, useState } from "react";
import { getMyContributions } from "@/services/contributionApi";

type Status = "due" | "partial" | "paid";
interface Contribution {
  _id: string;
  month: number;
  year: number;
  expectedAmount: number;
  paidAmount: number;
  status: Status;
  fineAmount?: number;
  finePaidAmount?: number;
  paymentDate?: string | null;
  finePaymentDate?: string | null;
  note?: string;
}
type Amount = number | null;
const validAmount = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
const amount = (value: unknown): Amount => validAmount(value) ? value : null;
const money = (value: Amount) => value === null ? "Unavailable" :
  `৳${value.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;
const due = (expected: Amount, paid: Amount): Amount =>
  expected === null || paid === null ? null : Math.max(0, Math.round(expected * 100) - Math.round(paid * 100)) / 100;
const add = (values: Amount[]): Amount =>
  values.some(value => value === null) ? null :
    values.reduce<number>((sum, value) => sum + Math.round((value ?? 0) * 100), 0) / 100;
const fineStatus = (record: Contribution): Status | "not_applicable" | "unavailable" => {
  const assessed = amount(record.fineAmount);
  const paid = amount(record.finePaidAmount);
  if (assessed === null || paid === null) return "unavailable";
  if (assessed === 0) return "not_applicable";
  return paid >= assessed ? "paid" : paid > 0 ? "partial" : "due";
};
const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unavailable" : date.toLocaleDateString("en-BD", {
    timeZone: "Asia/Dhaka", day: "2-digit", month: "short", year: "numeric",
  });
};
const formatMonth = (month: number) => [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
][month - 1] || "Unknown";

function isContribution(value: unknown): value is Contribution {
  if (!value || typeof value !== "object") return false;
  const c = value as Contribution;
  return typeof c._id === "string" && Number.isInteger(c.month) && c.month >= 1 && c.month <= 12 &&
    Number.isInteger(c.year) && validAmount(c.expectedAmount) && validAmount(c.paidAmount) &&
    ["paid", "partial", "due"].includes(c.status);
}

export default function MyContributionsPage() {
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const loadContributions = async () => {
      try {
        const data = await getMyContributions();
        if (data?.success === false || !Array.isArray(data?.contributions) ||
            !data.contributions.every(isContribution)) {
          throw new Error("The server returned invalid contribution data.");
        }
        const records: Contribution[] = data.contributions;
        if (active) setContributions([...records].sort((a, b) => b.year - a.year || b.month - a.month));
      } catch (err: unknown) {
        const item = err as { response?: { data?: { message?: string } }; message?: string };
        if (active) setError(item?.response?.data?.message || item?.message || "Failed to load contributions");
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadContributions();
    return () => { active = false; };
  }, [attempt]);

  if (loading) return <p role="status" className="text-gray-500">Loading contributions...</p>;

  const totalExpected = add(contributions.map(c => amount(c.expectedAmount)));
  const totalPaid = add(contributions.map(c => amount(c.paidAmount)));
  // Sum each month's balance so an overpayment cannot hide another month's debt.
  const outstandingAmount = add(contributions.map(c => due(amount(c.expectedAmount), amount(c.paidAmount))));
  const totalFines = add(contributions.map(c => amount(c.fineAmount)));
  const paidFines = add(contributions.map(c => amount(c.finePaidAmount)));
  const outstandingFines = add(contributions.map(c => due(amount(c.fineAmount), amount(c.finePaidAmount))));
  const missingFines = contributions.some(c => !validAmount(c.fineAmount) || !validAmount(c.finePaidAmount));

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Contributions</h1>
          <p className="mt-2 text-gray-500">Review your monthly savings, fines and payment history.</p>
        </div>
        <button type="button" onClick={() => setAttempt(value => value + 1)}
          className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700">
          {error ? "Retry" : "Refresh"}
        </button>
      </div>
      {error ? <div role="alert" className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">{error}</div> : <>
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title="Total Expected Savings" value={money(totalExpected)} />
          <SummaryCard title="Total Savings Paid" value={money(totalPaid)} />
          <SummaryCard title="Outstanding Savings" value={money(outstandingAmount)} />
          <SummaryCard title="Records" value={contributions.length.toString()} />
          <SummaryCard title="Fines Assessed" value={money(totalFines)} />
          <SummaryCard title="Fines Paid" value={money(paidFines)} />
          <SummaryCard title="Outstanding Fines" value={money(outstandingFines)} />
          <SummaryCard title="Total Due (Savings + Fines)" value={money(add([outstandingAmount, outstandingFines]))} />
        </div>
        <p className="mt-4 text-sm leading-6 text-gray-500">
          Totals cover the monthly records shown below. Historical opening savings are shown on your dashboard;
          they are not added here. Missing months are not included. Fines belong to the shared fund, not personal savings.
        </p>
        {missingFines && <p role="status" className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">
          Some records have no fine information. Fine totals are unavailable until that information is returned.
        </p>}
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <MiniCard title="Savings Paid" value={contributions.filter(c => c.status === "paid").length.toString()} />
          <MiniCard title="Savings Partial" value={contributions.filter(c => c.status === "partial").length.toString()} />
          <MiniCard title="Savings Due" value={contributions.filter(c => c.status === "due").length.toString()} />
        </div>
        <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <h2 className="text-lg font-semibold text-gray-900">Contribution History</h2>
            <p className="mt-1 text-sm text-gray-500">Savings and fine statuses are separate. Dates use Bangladesh time.</p>
          </div>
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Contribution history">
            <table className="w-full min-w-[1300px] text-left">
              <thead className="bg-gray-50">
                <tr className="border-b border-gray-200">
                  {["Month", "Expected Savings", "Savings Paid", "Savings Due", "Savings Status", "Fine Assessed", "Fine Paid", "Fine Due", "Fine Status", "Total Due", "Payment Date", "Fine Payment Date", "Note"].map(title =>
                    <th key={title} scope="col" className="px-5 py-3 text-sm font-medium text-gray-600">{title}</th>)}
                </tr>
              </thead>
              <tbody>
                {contributions.length === 0 ? <tr><td colSpan={13} className="px-5 py-10 text-center text-gray-500">No contributions found.</td></tr> :
                  contributions.map(c => {
                    const savingsDue = due(amount(c.expectedAmount), amount(c.paidAmount));
                    const fineDue = due(amount(c.fineAmount), amount(c.finePaidAmount));
                    return <tr key={c._id} className="border-b border-gray-100 last:border-0">
                      <td className="whitespace-nowrap px-5 py-4 text-sm font-medium text-gray-900">{formatMonth(c.month)} {c.year}</td>
                      <Cell value={money(amount(c.expectedAmount))} />
                      <Cell value={money(amount(c.paidAmount))} />
                      <Cell value={money(savingsDue)} />
                      <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                      <Cell value={money(amount(c.fineAmount))} />
                      <Cell value={money(amount(c.finePaidAmount))} />
                      <Cell value={money(fineDue)} />
                      <td className="px-5 py-4"><StatusBadge status={fineStatus(c)} /></td>
                      <Cell value={money(add([savingsDue, fineDue]))} />
                      <Cell value={formatDate(c.paymentDate)} />
                      <Cell value={formatDate(c.finePaymentDate)} />
                      <td className="min-w-48 max-w-xs whitespace-pre-wrap break-words px-5 py-4 text-sm text-gray-600">{c.note || "—"}</td>
                    </tr>;
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </>}
    </div>
  );
}

function Cell({ value }: { value: string }) {
  return <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-700">{value}</td>;
}
function SummaryCard({ title, value }: { title: string; value: string }) {
  return <div className="rounded-xl border border-gray-200 bg-white p-6">
    <p className="text-sm text-gray-500">{title}</p>
    <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
  </div>;
}
function MiniCard({ title, value }: { title: string; value: string }) {
  return <div className="rounded-lg bg-gray-100 p-4">
    <p className="text-sm text-gray-500">{title}</p>
    <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
  </div>;
}
function StatusBadge({ status }: { status: Status | "not_applicable" | "unavailable" }) {
  const styles = {
    paid: "bg-green-50 text-green-700",
    partial: "bg-yellow-50 text-yellow-700",
    due: "bg-red-50 text-red-700",
    not_applicable: "bg-gray-100 text-gray-600",
    unavailable: "bg-gray-100 text-gray-600",
  };
  return <span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium capitalize ${styles[status]}`}>
    {status === "not_applicable" ? "Not applicable" : status}
  </span>;
}
