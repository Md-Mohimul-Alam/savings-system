"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getTransactions,
  getTransactionSummary,
} from "@/services/transactionApi";

import {
  useDemoMode,
} from "@/hooks/useDemoMode";

interface Transaction {
  _id: string;
  type: string;
  direction: "IN" | "OUT";
  amount: number;
  description: string;
  transactionDate: string;

  member?: {
    memberCode?: string;

    user?: {
      name?: string;
      email?: string;
    };
  };

  createdBy?: {
    name?: string;
    email?: string;
  };
}

interface Summary {
  totalIn: number;
  totalOut: number;
  availableCash: number;
}

export default function TransactionsPage() {
  const isDemo =
    useDemoMode();

  const [
    transactions,
    setTransactions,
  ] =
    useState<
      Transaction[]
    >([]);

  const [
    summary,
    setSummary,
  ] =
    useState<
      Summary | null
    >(null);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    type,
    setType,
  ] =
    useState("");

  const [
    direction,
    setDirection,
  ] =
    useState("");

  // --------------------------------------------------
  // LOAD DATA
  // --------------------------------------------------

  const loadData =
    async () => {
      try {
        setLoading(
          true
        );

        setError("");

        const [
          transactionsData,
          summaryData,
        ] =
          await Promise.all([
            getTransactions({
              type:
                type ||
                undefined,

              direction:
                direction ||
                undefined,
            }),

            getTransactionSummary(),
          ]);

        setTransactions(
          transactionsData.transactions ||
            []
        );

        setSummary(
          summaryData.summary ||
            null
        );
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to load transactions"
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  useEffect(() => {
    loadData();
  }, [
    type,
    direction,
  ]);

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading transactions...
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
              Transactions
            </h1>

            <p className="mt-2 text-gray-500">
              View all cash inflows and outflows.
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
            You are viewing sample transaction data.
            Filters remain available, but no transaction
            data can be modified.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {/* Summary */}
      {summary && (
        <div className="mb-8 grid gap-5 sm:grid-cols-3">
          <SummaryCard
            title="Total In"
            value={`৳${Number(
              summary.totalIn ||
                0
            ).toLocaleString()}`}
          />

          <SummaryCard
            title="Total Out"
            value={`৳${Number(
              summary.totalOut ||
                0
            ).toLocaleString()}`}
          />

          <SummaryCard
            title="Available Cash"
            value={`৳${Number(
              summary.availableCash ||
                0
            ).toLocaleString()}`}
          />
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Type
            </label>

            <select
              value={
                type
              }
              onChange={(
                event
              ) =>
                setType(
                  event.target
                    .value
                )
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            >
              <option value="">
                All Types
              </option>

              <option value="CONTRIBUTION">
                Contribution
              </option>

              <option value="EXPENSE">
                Expense
              </option>

              <option value="INVESTMENT">
                Investment
              </option>

              <option value="INVESTMENT_RETURN">
                Investment Return
              </option>

              <option value="PROFIT_DISTRIBUTION">
                Profit Distribution
              </option>

              <option value="MEMBER_PAYOUT">
                Member Payout
              </option>

              <option value="ADJUSTMENT">
                Adjustment
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Direction
            </label>

            <select
              value={
                direction
              }
              onChange={(
                event
              ) =>
                setDirection(
                  event.target
                    .value
                )
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
            >
              <option value="">
                All Directions
              </option>

              <option value="IN">
                Money In
              </option>

              <option value="OUT">
                Money Out
              </option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                Transaction History
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {
                  transactions.length
                }{" "}
                transaction
                {transactions.length ===
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

        <table className="min-w-[950px] w-full text-left">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Date
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Type
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Member
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Description
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Direction
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Amount
              </th>
            </tr>
          </thead>

          <tbody>
            {transactions.length ===
            0 ? (
              <tr>
                <td
                  colSpan={
                    6
                  }
                  className="px-5 py-8 text-center text-gray-500"
                >
                  No transactions found.
                </td>
              </tr>
            ) : (
              transactions.map(
                (
                  transaction
                ) => (
                  <tr
                    key={
                      transaction._id
                    }
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-5 py-4">
                      {new Date(
                        transaction.transactionDate
                      ).toLocaleDateString(
                        "en-BD"
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                        {formatTransactionType(
                          transaction.type
                        )}
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">
                        {transaction.member
                          ?.user
                          ?.name ||
                          "-"}
                      </div>

                      {transaction.member
                        ?.memberCode && (
                        <div className="mt-1 text-xs text-gray-500">
                          {
                            transaction.member
                              .memberCode
                          }
                        </div>
                      )}
                    </td>

                    <td className="max-w-sm px-5 py-4 text-gray-700">
                      {transaction.description ||
                        "-"}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-sm font-medium ${
                          transaction.direction ===
                          "IN"
                            ? "bg-green-50 text-green-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {transaction.direction ===
                        "IN"
                          ? "Money In"
                          : "Money Out"}
                      </span>
                    </td>

                    <td
                      className={`px-5 py-4 font-semibold ${
                        transaction.direction ===
                        "IN"
                          ? "text-green-700"
                          : "text-red-600"
                      }`}
                    >
                      {transaction.direction ===
                      "IN"
                        ? "+"
                        : "-"}
                      ৳
                      {Number(
                        transaction.amount ||
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

function formatTransactionType(
  type: string
) {
  return type
    .replaceAll(
      "_",
      " "
    )
    .toLowerCase()
    .replace(
      /\b\w/g,
      (
        char
      ) =>
        char.toUpperCase()
    );
}