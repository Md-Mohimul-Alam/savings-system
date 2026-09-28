"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  addInvestment,
  getInvestments,
  updateInvestment,
} from "@/services/investmentApi";

interface Investment {
  _id: string;
  name: string;
  description?: string;
  investedAmount: number;
  currentValue: number;
  profitLoss?: number;
  roi?: number;
  status: "active" | "closed";
  startDate: string;
  endDate?: string | null;
}

export default function InvestmentsPage() {
  const [investments, setInvestments] = useState<Investment[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [investedAmount, setInvestedAmount] = useState<number>(0);
  const [currentValue, setCurrentValue] = useState<number>(0);
  const [startDate, setStartDate] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadInvestments = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getInvestments();

      setInvestments(data.investments || []);
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to load investments"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvestments();
  }, []);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!name.trim()) {
      setError("Investment name is required.");
      return;
    }

    if (investedAmount <= 0) {
      setError("Invested amount must be greater than 0.");
      return;
    }

    try {
      setSubmitting(true);

      await addInvestment({
        name,
        description,
        investedAmount,
        currentValue:
          currentValue > 0
            ? currentValue
            : investedAmount,
        startDate:
          startDate || undefined,
      });

      setSuccess("Investment created successfully.");

      setName("");
      setDescription("");
      setInvestedAmount(0);
      setCurrentValue(0);
      setStartDate("");

      await loadInvestments();
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to create investment"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleValueUpdate = async (
    investment: Investment
  ) => {
    const input = window.prompt(
      `Current value for ${investment.name}`,
      String(investment.currentValue)
    );

    if (input === null) return;

    const value = Number(input);

    if (Number.isNaN(value) || value < 0) {
      alert("Enter a valid amount.");
      return;
    }

    try {
      await updateInvestment(investment._id, {
        currentValue: value,
      });

      await loadInvestments();
    } catch (error: any) {
      alert(
        error?.response?.data?.message ||
          "Failed to update investment"
      );
    }
  };

  const totalInvested = investments.reduce(
    (sum, item) => sum + item.investedAmount,
    0
  );

  const totalCurrentValue = investments.reduce(
    (sum, item) => sum + item.currentValue,
    0
  );

  const totalProfitLoss =
    totalCurrentValue - totalInvested;

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading investments...
      </p>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Investments
        </h1>

        <p className="mt-2 text-gray-500">
          Track group investments, value, profit/loss, and ROI.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-5 rounded-lg bg-green-50 p-4 text-green-700">
          {success}
        </div>
      )}

      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <SummaryCard
          title="Total Invested"
          value={`৳${totalInvested.toLocaleString()}`}
        />

        <SummaryCard
          title="Current Value"
          value={`৳${totalCurrentValue.toLocaleString()}`}
        />

        <SummaryCard
          title="Profit / Loss"
          value={`৳${totalProfitLoss.toLocaleString()}`}
        />
      </div>

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-5 text-xl font-semibold">
          Add Investment
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">
              Name
            </label>

            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
              placeholder="Business Investment A"
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Invested Amount
            </label>

            <input
              type="number"
              min="1"
              value={investedAmount}
              onChange={(event) =>
                setInvestedAmount(
                  Number(event.target.value)
                )
              }
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Current Value
            </label>

            <input
              type="number"
              min="0"
              value={currentValue}
              onChange={(event) =>
                setCurrentValue(
                  Number(event.target.value)
                )
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Start Date
            </label>

            <input
              type="date"
              value={startDate}
              onChange={(event) =>
                setStartDate(event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">
              Description
            </label>

            <input
              type="text"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Optional description"
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-black px-6 py-3 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : "Add Investment"}
            </button>
          </div>
        </form>
      </div>

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
                Profit/Loss
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                ROI
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Status
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Action
              </th>
            </tr>
          </thead>

          <tbody>
            {investments.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-5 py-8 text-center text-gray-500"
                >
                  No investments found.
                </td>
              </tr>
            ) : (
              investments.map((investment) => {
                const profitLoss =
                  investment.currentValue -
                  investment.investedAmount;

                const roi =
                  investment.investedAmount > 0
                    ? (profitLoss /
                        investment.investedAmount) *
                      100
                    : 0;

                return (
                  <tr
                    key={investment._id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium">
                        {investment.name}
                      </div>

                      <div className="text-sm text-gray-500">
                        {investment.description || "-"}
                      </div>
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
                      ৳{profitLoss.toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      {roi.toFixed(2)}%
                    </td>

                    <td className="px-5 py-4 capitalize">
                      {investment.status}
                    </td>

                    <td className="px-5 py-4">
                      <button
                        onClick={() =>
                          handleValueUpdate(
                            investment
                          )
                        }
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
                      >
                        Update Value
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
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