 "use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  addInvestment,
  getInvestments,
  updateInvestment,
} from "@/services/investmentApi";
import { useDemoMode } from "@/hooks/useDemoMode";

type InvestmentStatus = "active" | "closed";

interface Investment {
  _id: string;
  name: string;
  description?: string;
  investedAmount: number;
  currentValue: number | null;
  profitLoss?: number;
  roi?: number;
  status: InvestmentStatus;
  startDate: string;
  endDate?: string | null;
}

type StatusFilter = "all" | InvestmentStatus;

const money = (value: number) =>
  `৳${value.toLocaleString("en-BD", { maximumFractionDigits: 2 })}`;

const dateLabel = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export default function InvestmentsPage() {
  const isDemo = useDemoMode();

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [investedAmount, setInvestedAmount] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [startDate, setStartDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [closingInvestment, setClosingInvestment] =
    useState<Investment | null>(null);
  const [returnedAmount, setReturnedAmount] = useState("");
  const [closingDate, setClosingDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [closingSubmitting, setClosingSubmitting] = useState(false);

  const loadInvestments = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getInvestments();
      setInvestments(data.investments || []);
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to load investments.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInvestments();
  }, []);

  const filteredInvestments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return investments.filter((investment) => {
      const matchesStatus =
        statusFilter === "all" || investment.status === statusFilter;
      const matchesSearch =
        !query ||
        investment.name.toLowerCase().includes(query) ||
        (investment.description || "").toLowerCase().includes(query);
      return matchesStatus && matchesSearch;
    });
  }, [investments, statusFilter, search]);

  const activeInvestments = investments.filter(
    (investment) => investment.status === "active",
  );
  const closedInvestments = investments.filter(
    (investment) => investment.status === "closed",
  );

  const totalInvested = investments.reduce(
    (sum, item) => sum + item.investedAmount,
    0,
  );
  const activeCapital = activeInvestments.reduce(
    (sum, item) => sum + item.investedAmount,
    0,
  );
  const realizedProfitLoss = closedInvestments.reduce(
    (sum, item) =>
      sum +
      (item.currentValue === null
        ? 0
        : item.currentValue - item.investedAmount),
    0,
  );
  const knownActiveValuations = activeInvestments.filter(
    (item) => item.currentValue !== null && item.currentValue !== undefined,
  ).length;

  const handleAddInvestment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (isDemo) {
      setError("Demo Mode is read-only. Creating investments is disabled.");
      return;
    }

    const amount = Number(investedAmount);
    const valuation = currentValue.trim() === "" ? null : Number(currentValue);

    if (!name.trim()) {
      setError("Investment name is required.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Enter an invested amount greater than zero.");
      return;
    }
    if (valuation !== null && (!Number.isFinite(valuation) || valuation < 0)) {
      setError("Current value must be zero or greater, or left blank if unknown.");
      return;
    }
    if (!startDate) {
      setError("Start date is required.");
      return;
    }

    try {
      setSubmitting(true);
      // Backend/model must accept currentValue: null for unknown valuations.
      await addInvestment({
        name: name.trim(),
        description: description.trim(),
        investedAmount: amount,
        currentValue: valuation,
        startDate,
      } as any);

      setSuccess("Investment added successfully.");
      setName("");
      setDescription("");
      setInvestedAmount("");
      setCurrentValue("");
      setStartDate(new Date().toISOString().slice(0, 10));
      await loadInvestments();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to create investment.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseInvestment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!closingInvestment) return;

    setError("");
    setSuccess("");

    if (isDemo) {
      setError("Demo Mode is read-only. Closing investments is disabled.");
      return;
    }

    const returned = Number(returnedAmount);
    if (returnedAmount.trim() === "" || !Number.isFinite(returned) || returned < 0) {
      setError("Enter the total amount returned, including the original capital.");
      return;
    }
    if (!closingDate) {
      setError("Closing date is required.");
      return;
    }
    if (new Date(closingDate) < new Date(closingInvestment.startDate)) {
      setError("Closing date cannot be earlier than the start date.");
      return;
    }

    try {
      setClosingSubmitting(true);
      await updateInvestment(closingInvestment._id, {
        status: "closed",
        returnedAmount: returned,
        endDate: closingDate,
      } as any);

      const difference = returned - closingInvestment.investedAmount;
      setSuccess(
        `Investment closed. ${
          difference > 0
            ? `Realized profit: ${money(difference)}.`
            : difference < 0
              ? `Realized loss: ${money(Math.abs(difference))}.`
              : "Break-even settlement."
        }`,
      );
      setClosingInvestment(null);
      setReturnedAmount("");
      setClosingDate(new Date().toISOString().slice(0, 10));
      await loadInvestments();
    } catch (err: any) {
      setError(
        err?.response?.data?.message || "Failed to close investment.",
      );
    } finally {
      setClosingSubmitting(false);
    }
  };

  const openCloseModal = (investment: Investment) => {
    setError("");
    setSuccess("");
    setClosingInvestment(investment);
    setReturnedAmount("");
    setClosingDate(new Date().toISOString().slice(0, 10));
  };

  if (loading) {
    return <p className="text-gray-500">Loading investments...</p>;
  }

  return (
    <main className="space-y-7">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Investments</h1>
          <p className="mt-2 text-gray-500">
            Track active investments, settlement dates, and realized returns.
          </p>
        </div>
        {isDemo && (
          <span className="w-fit rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
            Demo Mode · Read Only
          </span>
        )}
      </header>

      {error && (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Total Invested" value={money(totalInvested)} />
        <SummaryCard title="Active Capital" value={money(activeCapital)} />
        <SummaryCard title="Active Investments" value={String(activeInvestments.length)} />
        <SummaryCard
          title="Realized Profit / Loss"
          value={money(realizedProfitLoss)}
          note="Closed investments only"
        />
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-gray-900">Add Investment</h2>
          <p className="mt-1 text-sm text-gray-500">
            Leave current value blank if it has not been assessed yet.
          </p>
        </div>
        <form onSubmit={handleAddInvestment} className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Investment Name">
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Grocery Business"
              required
              disabled={isDemo || submitting}
            />
          </Field>
          <Field label="Invested Amount (৳)">
            <input
              className={inputClass}
              type="number"
              min="0.01"
              step="0.01"
              value={investedAmount}
              onChange={(e) => setInvestedAmount(e.target.value)}
              placeholder="50000"
              required
              disabled={isDemo || submitting}
            />
          </Field>
          <Field label="Current Estimated Value (৳)">
            <input
              className={inputClass}
              type="number"
              min="0"
              step="0.01"
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              placeholder="Leave blank if unknown"
              disabled={isDemo || submitting}
            />
          </Field>
          <Field label="Start Date">
            <input
              className={inputClass}
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              disabled={isDemo || submitting}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Description (optional)">
              <input
                className={inputClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Purpose, business, or notes"
                disabled={isDemo || submitting}
              />
            </Field>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={isDemo || submitting}
              className="w-full rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-400"
            >
              {submitting ? "Saving..." : "Add Investment"}
            </button>
          </div>
        </form>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="flex flex-col gap-4 border-b border-gray-200 p-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Investment Portfolio</h2>
            <p className="mt-1 text-sm text-gray-500">
              {filteredInvestments.length} shown · {knownActiveValuations} of {activeInvestments.length} active investments have a known valuation
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              className={`${inputClass} min-w-52`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search investments..."
              aria-label="Search investments"
            />
            <select
              className={inputClass}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="Filter by status"
            >
              <option value="all">All investments</option>
              <option value="active">Active only</option>
              <option value="closed">Closed only</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-gray-100 px-5 py-3">
          {([
            ["all", `All (${investments.length})`],
            ["active", `Active (${activeInvestments.length})`],
            ["closed", `Closed (${closedInvestments.length})`],
          ] as [StatusFilter, string][]).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStatusFilter(value)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                statusFilter === value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left">
            <thead className="bg-gray-50">
              <tr>
                {["Investment", "Invested", "Current / Final Value", "Profit / Loss", "Start Date", "Closing Date", "Status", "Action"].map((heading) => (
                  <th key={heading} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredInvestments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-gray-500">
                    No investments match your filters.
                  </td>
                </tr>
              ) : (
                filteredInvestments.map((investment) => {
                  const value = investment.currentValue;
                  const profitLoss = value === null || value === undefined
                    ? null
                    : value - investment.investedAmount;
                  const roi = profitLoss === null || investment.investedAmount <= 0
                    ? null
                    : (profitLoss / investment.investedAmount) * 100;

                  return (
                    <tr key={investment._id} className="border-t border-gray-100 align-top">
                      <td className="px-5 py-4">
                        <div className="font-semibold text-gray-900">{investment.name}</div>
                        <div className="mt-1 max-w-xs text-sm text-gray-500">
                          {investment.description || "No description"}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">{money(investment.investedAmount)}</td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {value === null || value === undefined ? (
                          <span className="text-sm italic text-gray-400">Unknown</span>
                        ) : money(value)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4">
                        {profitLoss === null ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <span className={profitLoss > 0 ? "font-medium text-green-700" : profitLoss < 0 ? "font-medium text-red-600" : "text-gray-700"}>
                            {profitLoss > 0 ? "+" : profitLoss < 0 ? "−" : ""}
                            {money(Math.abs(profitLoss))}
                            {roi !== null && <span className="mt-1 block text-xs opacity-80">{roi.toFixed(2)}% ROI</span>}
                          </span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                        {dateLabel(investment.startDate)}
                      </td>
                      <td className="whitespace-nowrap px-5 py-4 text-sm text-gray-600">
                        {investment.status === "closed" ? dateLabel(investment.endDate) : <span className="text-green-700">Ongoing</span>}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          investment.status === "active"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}>
                          {investment.status === "active" ? "Active" : "Closed"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {investment.status === "active" ? (
                          <button
                            type="button"
                            onClick={() => openCloseModal(investment)}
                            disabled={isDemo}
                            className="whitespace-nowrap rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Close Investment
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">Settled</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {closingInvestment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="close-investment-title"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 id="close-investment-title" className="text-xl font-bold text-gray-900">
                  Close Investment
                </h2>
                <p className="mt-1 text-sm text-gray-500">{closingInvestment.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setClosingInvestment(null)}
                className="rounded-lg px-3 py-1 text-gray-500 hover:bg-gray-100"
                aria-label="Cancel closing"
              >
                ✕
              </button>
            </div>

            <div className="mb-5 grid grid-cols-2 gap-3 rounded-xl bg-gray-50 p-4">
              <div>
                <p className="text-xs text-gray-500">Original investment</p>
                <p className="mt-1 font-semibold">{money(closingInvestment.investedAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Start date</p>
                <p className="mt-1 font-semibold">{dateLabel(closingInvestment.startDate)}</p>
              </div>
            </div>

            <form onSubmit={handleCloseInvestment} className="space-y-4">
              <Field label="Total amount returned (৳)">
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={returnedAmount}
                  onChange={(e) => setReturnedAmount(e.target.value)}
                  placeholder="Include original capital + profit"
                  required
                  autoFocus
                />
              </Field>
              <Field label="Closing Date">
                <input
                  className={inputClass}
                  type="date"
                  min={closingInvestment.startDate.slice(0, 10)}
                  value={closingDate}
                  onChange={(e) => setClosingDate(e.target.value)}
                  required
                />
              </Field>

              {returnedAmount.trim() !== "" && Number.isFinite(Number(returnedAmount)) && Number(returnedAmount) >= 0 && (
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="text-sm text-gray-500">Estimated settlement result</p>
                  <p className={`mt-1 text-xl font-bold ${
                    Number(returnedAmount) > closingInvestment.investedAmount
                      ? "text-green-700"
                      : Number(returnedAmount) < closingInvestment.investedAmount
                        ? "text-red-600"
                        : "text-gray-900"
                  }`}>
                    {Number(returnedAmount) > closingInvestment.investedAmount ? "+" : Number(returnedAmount) < closingInvestment.investedAmount ? "−" : ""}
                    {money(Math.abs(Number(returnedAmount) - closingInvestment.investedAmount))}
                    <span className="ml-2 text-sm font-medium">
                      {Number(returnedAmount) > closingInvestment.investedAmount
                        ? "Profit"
                        : Number(returnedAmount) < closingInvestment.investedAmount
                          ? "Loss"
                          : "Break-even"}
                    </span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Closing date preview: {dateLabel(closingDate)}
                  </p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setClosingInvestment(null)}
                  className="rounded-lg border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
                  disabled={closingSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={closingSubmitting || isDemo}
                  className="rounded-lg bg-red-600 px-4 py-3 font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {closingSubmitting ? "Closing..." : "Confirm Close"}
                </button>
              </div>
              <p className="text-xs leading-5 text-gray-500">
                Closing records the total cash received as a transaction. Confirm that this amount is the total settlement, not profit alone.
              </p>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-3 text-sm text-gray-900 outline-none transition focus:border-gray-700 focus:ring-2 focus:ring-gray-200 disabled:cursor-not-allowed disabled:bg-gray-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}

function SummaryCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-sm text-gray-500">{title}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      {note && <p className="mt-1 text-xs text-gray-400">{note}</p>}
    </div>
  );
}
