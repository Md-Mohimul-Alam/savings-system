"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  addInvestment,
  getInvestments,
  updateInvestment,
} from "@/services/investmentApi";

import {
  useDemoMode,
} from "@/hooks/useDemoMode";

interface Investment {
  _id: string;
  name: string;
  description?: string;
  investedAmount: number;
  currentValue: number;
  profitLoss?: number;
  roi?: number;

  status:
    | "active"
    | "closed";

  startDate: string;
  endDate?: string | null;
}

export default function InvestmentsPage() {
  const isDemo =
    useDemoMode();

  const [
    investments,
    setInvestments,
  ] =
    useState<
      Investment[]
    >([]);

  const [
    name,
    setName,
  ] =
    useState("");

  const [
    description,
    setDescription,
  ] =
    useState("");

  const [
    investedAmount,
    setInvestedAmount,
  ] =
    useState<number>(
      0
    );

  const [
    currentValue,
    setCurrentValue,
  ] =
    useState<number>(
      0
    );

  const [
    startDate,
    setStartDate,
  ] =
    useState("");

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  // --------------------------------------------------
  // LOAD INVESTMENTS
  // --------------------------------------------------

  const loadInvestments =
    async () => {
      try {
        setLoading(
          true
        );

        setError("");

        const data =
          await getInvestments();

        setInvestments(
          data.investments ||
            []
        );
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to load investments"
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  useEffect(() => {
    loadInvestments();
  }, []);

  // --------------------------------------------------
  // CREATE INVESTMENT
  // --------------------------------------------------

  const handleSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      if (isDemo) {
        setError(
          "Demo Mode is read-only. Creating investments is disabled."
        );

        return;
      }

      if (!name.trim()) {
        setError(
          "Investment name is required."
        );

        return;
      }

      if (
        investedAmount <=
        0
      ) {
        setError(
          "Invested amount must be greater than 0."
        );

        return;
      }

      try {
        setSubmitting(
          true
        );

        await addInvestment({
          name,
          description,
          investedAmount,

          currentValue:
            currentValue >
            0
              ? currentValue
              : investedAmount,

          startDate:
            startDate ||
            undefined,
        });

        setSuccess(
          "Investment created successfully."
        );

        setName(
          ""
        );

        setDescription(
          ""
        );

        setInvestedAmount(
          0
        );

        setCurrentValue(
          0
        );

        setStartDate(
          ""
        );

        await loadInvestments();
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to create investment"
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  // --------------------------------------------------
  // UPDATE CURRENT VALUE
  // --------------------------------------------------

  const handleValueUpdate =
    async (
      investment: Investment
    ) => {
      if (isDemo) {
        setError(
          "Demo Mode is read-only. Updating investments is disabled."
        );

        return;
      }

      const input =
        window.prompt(
          `Current value for ${investment.name}`,
          String(
            investment.currentValue
          )
        );

      if (
        input === null
      ) {
        return;
      }

      const value =
        Number(
          input
        );

      if (
        Number.isNaN(
          value
        ) ||
        value < 0
      ) {
        alert(
          "Enter a valid amount."
        );

        return;
      }

      try {
        setError("");
        setSuccess("");

        await updateInvestment(
          investment._id,
          {
            currentValue:
              value,
          }
        );

        setSuccess(
          "Investment value updated successfully."
        );

        await loadInvestments();
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to update investment"
        );
      }
    };

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------

  const totalInvested =
    investments.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.investedAmount,
      0
    );

  const totalCurrentValue =
    investments.reduce(
      (
        sum,
        item
      ) =>
        sum +
        item.currentValue,
      0
    );

  const totalProfitLoss =
    totalCurrentValue -
    totalInvested;

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading investments...
      </p>
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
              Investments
            </h1>

            <p className="mt-2 text-gray-500">
              Track group investments, value,
              profit/loss, and ROI.
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
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Demo Mode
          </p>

          <p className="mt-1 text-sm text-amber-700">
            You can view all sample investment
            data and performance metrics, but
            creating or updating investments is
            disabled.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="mb-5 rounded-lg bg-green-50 p-4 text-green-700">
          {success}
        </div>
      )}

      {/* Summary */}
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

      {/* Add Investment */}
      <div
        className={`mb-8 rounded-xl border bg-white p-6 ${
          isDemo
            ? "border-amber-200"
            : "border-gray-200"
        }`}
      >
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">
            Add Investment
          </h2>

          {isDemo && (
            <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
              Disabled in Demo Mode
            </span>
          )}
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          {/* Name */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Name
            </label>

            <input
              type="text"
              value={
                name
              }
              onChange={(
                event
              ) =>
                setName(
                  event
                    .target
                    .value
                )
              }
              required
              placeholder="Business Investment A"
              disabled={
                isDemo ||
                submitting
              }
              className={`w-full rounded-lg border border-gray-300 px-4 py-3 ${
                isDemo
                  ? "cursor-not-allowed bg-gray-100 text-gray-500"
                  : "bg-white"
              }`}
            />
          </div>

          {/* Invested Amount */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Invested Amount
            </label>

            <input
              type="number"
              min="1"
              value={
                investedAmount
              }
              onChange={(
                event
              ) =>
                setInvestedAmount(
                  Number(
                    event
                      .target
                      .value
                  )
                )
              }
              required
              disabled={
                isDemo ||
                submitting
              }
              className={`w-full rounded-lg border border-gray-300 px-4 py-3 ${
                isDemo
                  ? "cursor-not-allowed bg-gray-100 text-gray-500"
                  : "bg-white"
              }`}
            />
          </div>

          {/* Current Value */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Current Value
            </label>

            <input
              type="number"
              min="0"
              value={
                currentValue
              }
              onChange={(
                event
              ) =>
                setCurrentValue(
                  Number(
                    event
                      .target
                      .value
                  )
                )
              }
              disabled={
                isDemo ||
                submitting
              }
              className={`w-full rounded-lg border border-gray-300 px-4 py-3 ${
                isDemo
                  ? "cursor-not-allowed bg-gray-100 text-gray-500"
                  : "bg-white"
              }`}
            />
          </div>

          {/* Start Date */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Start Date
            </label>

            <input
              type="date"
              value={
                startDate
              }
              onChange={(
                event
              ) =>
                setStartDate(
                  event
                    .target
                    .value
                )
              }
              disabled={
                isDemo ||
                submitting
              }
              className={`w-full rounded-lg border border-gray-300 px-4 py-3 ${
                isDemo
                  ? "cursor-not-allowed bg-gray-100 text-gray-500"
                  : "bg-white"
              }`}
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">
              Description
            </label>

            <input
              type="text"
              value={
                description
              }
              onChange={(
                event
              ) =>
                setDescription(
                  event
                    .target
                    .value
                )
              }
              placeholder="Optional description"
              disabled={
                isDemo ||
                submitting
              }
              className={`w-full rounded-lg border border-gray-300 px-4 py-3 ${
                isDemo
                  ? "cursor-not-allowed bg-gray-100 text-gray-500"
                  : "bg-white"
              }`}
            />
          </div>

          {/* Submit */}
          <div>
            <button
              type="submit"
              disabled={
                submitting ||
                isDemo
              }
              title={
                isDemo
                  ? "Disabled in Demo Mode"
                  : undefined
              }
              className={`rounded-lg px-6 py-3 font-medium text-white transition ${
                isDemo
                  ? "cursor-not-allowed bg-gray-400"
                  : "bg-black hover:bg-gray-800"
              } disabled:opacity-50`}
            >
              {isDemo
                ? "Add Disabled"
                : submitting
                ? "Saving..."
                : "Add Investment"}
            </button>
          </div>
        </form>
      </div>

      {/* Investment Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                Investment Portfolio
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {investments.length} investment
                {investments.length ===
                1
                  ? ""
                  : "s"}
              </p>
            </div>

            {isDemo && (
              <span className="text-xs font-medium text-amber-700">
                Sample data
              </span>
            )}
          </div>
        </div>

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
            {investments.length ===
            0 ? (
              <tr>
                <td
                  colSpan={
                    7
                  }
                  className="px-5 py-8 text-center text-gray-500"
                >
                  No investments found.
                </td>
              </tr>
            ) : (
              investments.map(
                (
                  investment
                ) => {
                  const profitLoss =
                    investment.currentValue -
                    investment.investedAmount;

                  const roi =
                    investment.investedAmount >
                    0
                      ? (
                          profitLoss /
                          investment.investedAmount
                        ) *
                        100
                      : 0;

                  return (
                    <tr
                      key={
                        investment._id
                      }
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium">
                          {
                            investment.name
                          }
                        </div>

                        <div className="text-sm text-gray-500">
                          {investment.description ||
                            "-"}
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

                      <td
                        className={`px-5 py-4 font-medium ${
                          profitLoss >
                          0
                            ? "text-green-700"
                            : profitLoss <
                              0
                            ? "text-red-600"
                            : "text-gray-700"
                        }`}
                      >
                        {profitLoss >
                        0
                          ? "+"
                          : ""}
                        ৳
                        {profitLoss.toLocaleString()}
                      </td>

                      <td
                        className={`px-5 py-4 ${
                          roi > 0
                            ? "text-green-700"
                            : roi <
                              0
                            ? "text-red-600"
                            : ""
                        }`}
                      >
                        {roi.toFixed(
                          2
                        )}
                        %
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`rounded-full px-3 py-1 text-sm capitalize ${
                            investment.status ===
                            "active"
                              ? "bg-green-50 text-green-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {
                            investment.status
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            handleValueUpdate(
                              investment
                            )
                          }
                          disabled={
                            isDemo
                          }
                          title={
                            isDemo
                              ? "Disabled in Demo Mode"
                              : "Update investment value"
                          }
                          className={`rounded-lg border px-3 py-2 text-sm transition ${
                            isDemo
                              ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                              : "border-gray-300 hover:bg-gray-50"
                          }`}
                        >
                          {isDemo
                            ? "Read Only"
                            : "Update Value"}
                        </button>
                      </td>
                    </tr>
                  );
                }
              )
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