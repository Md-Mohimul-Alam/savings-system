"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  addExpense,
  getExpenses,
} from "@/services/expenseApi";

interface Expense {
  _id: string;
  title: string;
  category: string;
  amount: number;
  expenseDate: string;
  note?: string;

  createdBy?: {
    name?: string;
    email?: string;
  };
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("GENERAL");
  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState("");
  const [note, setNote] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getExpenses();

      setExpenses(data.expenses || []);
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to load expenses"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError("Expense title is required.");
      return;
    }

    if (amount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }

    try {
      setSubmitting(true);

      await addExpense({
        title,
        category,
        amount,
        expenseDate:
          expenseDate || undefined,
        note,
      });

      setSuccess("Expense added successfully.");

      setTitle("");
      setCategory("GENERAL");
      setAmount(0);
      setExpenseDate("");
      setNote("");

      await loadExpenses();
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to add expense"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading expenses...
      </p>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Expenses
        </h1>

        <p className="mt-2 text-gray-500">
          Record and review group expenses.
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

      <div className="mb-8 grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Total Expenses
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            ৳{totalExpenses.toLocaleString()}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Expense Records
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            {expenses.length}
          </h2>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-5 text-xl font-semibold">
          Add Expense
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">
              Title
            </label>

            <input
              type="text"
              value={title}
              onChange={(event) =>
                setTitle(event.target.value)
              }
              placeholder="e.g. Bank service charge"
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Category
            </label>

            <select
              value={category}
              onChange={(event) =>
                setCategory(event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            >
              <option value="GENERAL">
                General
              </option>

              <option value="ADMIN">
                Admin
              </option>

              <option value="INVESTMENT">
                Investment
              </option>

              <option value="BANK_FEE">
                Bank Fee
              </option>

              <option value="TRANSPORT">
                Transport
              </option>

              <option value="OTHER">
                Other
              </option>
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Amount
            </label>

            <input
              type="number"
              min="1"
              value={amount}
              onChange={(event) =>
                setAmount(
                  Number(event.target.value)
                )
              }
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Expense Date
            </label>

            <input
              type="date"
              value={expenseDate}
              onChange={(event) =>
                setExpenseDate(event.target.value)
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">
              Note
            </label>

            <input
              type="text"
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              placeholder="Optional note"
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
                : "Add Expense"}
            </button>
          </div>
        </form>
      </div>

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

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Created By
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Note
              </th>
            </tr>
          </thead>

          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-gray-500"
                >
                  No expenses found.
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr
                  key={expense._id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-5 py-4">
                    {new Date(
                      expense.expenseDate
                    ).toLocaleDateString()}
                  </td>

                  <td className="px-5 py-4 font-medium">
                    {expense.title}
                  </td>

                  <td className="px-5 py-4">
                    {expense.category}
                  </td>

                  <td className="px-5 py-4">
                    ৳
                    {expense.amount.toLocaleString()}
                  </td>

                  <td className="px-5 py-4">
                    {expense.createdBy?.name ||
                      "-"}
                  </td>

                  <td className="px-5 py-4 text-gray-500">
                    {expense.note || "-"}
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