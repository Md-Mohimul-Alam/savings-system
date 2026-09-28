"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  addExpense,
  getExpenses,
} from "@/services/expenseApi";

import {
  useDemoMode,
} from "@/hooks/useDemoMode";

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
  const isDemo =
    useDemoMode();

  const [
    expenses,
    setExpenses,
  ] =
    useState<Expense[]>(
      []
    );

  const [
    title,
    setTitle,
  ] =
    useState("");

  const [
    category,
    setCategory,
  ] =
    useState(
      "GENERAL"
    );

  const [
    amount,
    setAmount,
  ] =
    useState<number>(
      0
    );

  const [
    expenseDate,
    setExpenseDate,
  ] =
    useState("");

  const [
    note,
    setNote,
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
  // LOAD EXPENSES
  // --------------------------------------------------

  const loadExpenses =
    async () => {
      try {
        setLoading(
          true
        );

        setError("");

        const data =
          await getExpenses();

        setExpenses(
          data.expenses ||
            []
        );
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to load expenses"
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  useEffect(() => {
    loadExpenses();
  }, []);

  // --------------------------------------------------
  // ADD EXPENSE
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
          "Demo Mode is read-only. Adding expenses is disabled."
        );

        return;
      }

      if (
        !title.trim()
      ) {
        setError(
          "Expense title is required."
        );

        return;
      }

      if (
        amount <= 0
      ) {
        setError(
          "Amount must be greater than 0."
        );

        return;
      }

      try {
        setSubmitting(
          true
        );

        await addExpense({
          title,
          category,
          amount,

          expenseDate:
            expenseDate ||
            undefined,

          note,
        });

        setSuccess(
          "Expense added successfully."
        );

        setTitle(
          ""
        );

        setCategory(
          "GENERAL"
        );

        setAmount(
          0
        );

        setExpenseDate(
          ""
        );

        setNote(
          ""
        );

        await loadExpenses();
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to add expense"
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------

  const totalExpenses =
    expenses.reduce(
      (
        sum,
        expense
      ) =>
        sum +
        expense.amount,
      0
    );

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading expenses...
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
              Expenses
            </h1>

            <p className="mt-2 text-gray-500">
              Record and review group expenses.
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
            You can review all sample expense records,
            but creating or modifying expenses is disabled.
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
      <div className="mb-8 grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Total Expenses
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            ৳
            {totalExpenses.toLocaleString()}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Expense Records
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            {
              expenses.length
            }
          </h2>
        </div>
      </div>

      {/* Add Expense */}
      <div
        className={`mb-8 rounded-xl border bg-white p-6 ${
          isDemo
            ? "border-amber-200"
            : "border-gray-200"
        }`}
      >
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">
            Add Expense
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
          {/* Title */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Title
            </label>

            <input
              type="text"
              value={
                title
              }
              onChange={(
                event
              ) =>
                setTitle(
                  event
                    .target
                    .value
                )
              }
              placeholder="e.g. Bank service charge"
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

          {/* Category */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Category
            </label>

            <select
              value={
                category
              }
              onChange={(
                event
              ) =>
                setCategory(
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

          {/* Amount */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Amount
            </label>

            <input
              type="number"
              min="1"
              value={
                amount
              }
              onChange={(
                event
              ) =>
                setAmount(
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

          {/* Date */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Expense Date
            </label>

            <input
              type="date"
              value={
                expenseDate
              }
              onChange={(
                event
              ) =>
                setExpenseDate(
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

          {/* Note */}
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">
              Note
            </label>

            <input
              type="text"
              value={
                note
              }
              onChange={(
                event
              ) =>
                setNote(
                  event
                    .target
                    .value
                )
              }
              placeholder="Optional note"
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
                : "Add Expense"}
            </button>
          </div>
        </form>
      </div>

      {/* Expense Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                Expense History
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {
                  expenses.length
                }{" "}
                expense record
                {expenses.length ===
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
            {expenses.length ===
            0 ? (
              <tr>
                <td
                  colSpan={
                    6
                  }
                  className="px-5 py-8 text-center text-gray-500"
                >
                  No expenses found.
                </td>
              </tr>
            ) : (
              expenses.map(
                (
                  expense
                ) => (
                  <tr
                    key={
                      expense._id
                    }
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-5 py-4">
                      {new Date(
                        expense.expenseDate
                      ).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4 font-medium">
                      {
                        expense.title
                      }
                    </td>

                    <td className="px-5 py-4">
                      <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                        {
                          expense.category
                        }
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      ৳
                      {expense.amount.toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      {expense
                        .createdBy
                        ?.name ||
                        "-"}
                    </td>

                    <td className="px-5 py-4 text-gray-500">
                      {expense.note ||
                        "-"}
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