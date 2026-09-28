"use client";

import { useEffect, useState } from "react";

import {
  getTransactions,
  getTransactionSummary,
} from "@/services/transactionApi";

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
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [type, setType] = useState("");
  const [direction, setDirection] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [transactionsData, summaryData] =
        await Promise.all([
          getTransactions({
            type: type || undefined,
            direction: direction || undefined,
          }),
          getTransactionSummary(),
        ]);

      setTransactions(
        transactionsData.transactions || []
      );

      setSummary(summaryData.summary || null);
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to load transactions"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [type, direction]);

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading transactions...
      </p>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Transactions
        </h1>

        <p className="mt-2 text-gray-500">
          View all cash inflows and outflows.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {summary && (
        <div className="mb-8 grid gap-5 sm:grid-cols-3">
          <SummaryCard
            title="Total In"
            value={`৳${summary.totalIn.toLocaleString()}`}
          />

          <SummaryCard
            title="Total Out"
            value={`৳${summary.totalOut.toLocaleString()}`}
          />

          <SummaryCard
            title="Available Cash"
            value={`৳${summary.availableCash.toLocaleString()}`}
          />
        </div>
      )}

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium">
              Type
            </label>

            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
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
              value={direction}
              onChange={(event) =>
                setDirection(event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
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

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left">
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
            {transactions.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-gray-500"
                >
                  No transactions found.
                </td>
              </tr>
            ) : (
              transactions.map((transaction) => (
                <tr
                  key={transaction._id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-5 py-4">
                    {new Date(
                      transaction.transactionDate
                    ).toLocaleDateString()}
                  </td>

                  <td className="px-5 py-4">
                    {transaction.type}
                  </td>

                  <td className="px-5 py-4">
                    {transaction.member?.user?.name ||
                      "-"}
                  </td>

                  <td className="px-5 py-4">
                    {transaction.description}
                  </td>

                  <td className="px-5 py-4">
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-medium ${
                        transaction.direction === "IN"
                          ? "bg-green-50 text-green-700"
                          : "bg-red-50 text-red-700"
                      }`}
                    >
                      {transaction.direction}
                    </span>
                  </td>

                  <td className="px-5 py-4 font-medium">
                    ৳
                    {transaction.amount.toLocaleString()}
                  </td>
                </tr>
              ))
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