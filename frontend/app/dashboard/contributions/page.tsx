"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  addContribution,
  getContributions,
} from "@/services/contributionApi";

import {
  getMembers,
} from "@/services/memberApi";

import {
  useDemoMode,
} from "@/hooks/useDemoMode";

interface Member {
  _id: string;
  memberCode: string;
  monthlyContribution: number;

  user: {
    name: string;
    email: string;
  };
}

interface Contribution {
  _id: string;
  month: number;
  year: number;
  expectedAmount: number;
  paidAmount: number;

  status:
    | "due"
    | "partial"
    | "paid";

  paymentDate?: string;
  note?: string;

  member: {
    _id: string;
    memberCode: string;

    user: {
      name: string;
      email: string;
    };
  };
}

const monthNames = [
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

export default function ContributionsPage() {
  const now =
    new Date();

  const isDemo =
    useDemoMode();

  const [
    members,
    setMembers,
  ] =
    useState<Member[]>(
      []
    );

  const [
    contributions,
    setContributions,
  ] =
    useState<
      Contribution[]
    >([]);

  const [
    memberId,
    setMemberId,
  ] =
    useState("");

  const [
    month,
    setMonth,
  ] =
    useState(
      now.getMonth() +
        1
    );

  const [
    year,
    setYear,
  ] =
    useState(
      now.getFullYear()
    );

  const [
    paidAmount,
    setPaidAmount,
  ] =
    useState<number>(
      1000
    );

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
          membersData,
          contributionsData,
        ] =
          await Promise.all([
            getMembers(),
            getContributions(),
          ]);

        setMembers(
          membersData.members ||
            []
        );

        setContributions(
          contributionsData.contributions ||
            []
        );
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to load contributions"
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  useEffect(() => {
    loadData();
  }, []);

  // --------------------------------------------------
  // MEMBER CHANGE
  // --------------------------------------------------

  const handleMemberChange =
    (
      selectedMemberId: string
    ) => {
      if (isDemo) {
        return;
      }

      setMemberId(
        selectedMemberId
      );

      const selectedMember =
        members.find(
          (
            member
          ) =>
            member._id ===
            selectedMemberId
        );

      if (
        selectedMember
      ) {
        setPaidAmount(
          selectedMember.monthlyContribution
        );
      }
    };

  // --------------------------------------------------
  // ADD CONTRIBUTION
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
          "Demo Mode is read-only. Adding contributions is disabled."
        );

        return;
      }

      if (!memberId) {
        setError(
          "Please select a member."
        );

        return;
      }

      try {
        setSubmitting(
          true
        );

        await addContribution({
          memberId,
          month,
          year,
          paidAmount,
          note,
        });

        setSuccess(
          "Contribution added successfully."
        );

        setMemberId(
          ""
        );

        setPaidAmount(
          1000
        );

        setNote(
          ""
        );

        await loadData();
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to add contribution"
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading contributions...
      </p>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Contributions
            </h1>

            <p className="mt-2 text-gray-500">
              Record and review monthly member contributions.
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
            You can view all sample contribution records,
            but adding or modifying contributions is disabled.
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

      {/* Add Contribution */}
      <div
        className={`mb-8 rounded-xl border bg-white p-6 ${
          isDemo
            ? "border-amber-200"
            : "border-gray-200"
        }`}
      >
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">
            Add Contribution
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
          {/* Member */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Member
            </label>

            <select
              value={
                memberId
              }
              onChange={(
                event
              ) =>
                handleMemberChange(
                  event.target
                    .value
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
            >
              <option value="">
                Select member
              </option>

              {members.map(
                (
                  member
                ) => (
                  <option
                    key={
                      member._id
                    }
                    value={
                      member._id
                    }
                  >
                    {
                      member.memberCode
                    }{" "}
                    -{" "}
                    {
                      member
                        .user
                        ?.name
                    }
                  </option>
                )
              )}
            </select>
          </div>

          {/* Month */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Month
            </label>

            <select
              value={
                month
              }
              onChange={(
                event
              ) =>
                setMonth(
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
            >
              {monthNames.map(
                (
                  name,
                  index
                ) => (
                  <option
                    key={
                      name
                    }
                    value={
                      index +
                      1
                    }
                  >
                    {
                      name
                    }
                  </option>
                )
              )}
            </select>
          </div>

          {/* Year */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Year
            </label>

            <input
              type="number"
              value={
                year
              }
              onChange={(
                event
              ) =>
                setYear(
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

          {/* Paid Amount */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Paid Amount
            </label>

            <input
              type="number"
              min="0"
              value={
                paidAmount
              }
              onChange={(
                event
              ) =>
                setPaidAmount(
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
              disabled={
                isDemo ||
                submitting
              }
              placeholder="Optional note"
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
                : "Add Contribution"}
            </button>
          </div>
        </form>
      </div>

      {/* Contribution History */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                Contribution History
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {contributions.length} contribution record
                {contributions.length ===
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

        {contributions.length ===
        0 ? (
          <div className="p-8 text-center text-sm text-gray-500">
            No contribution records found.
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Member
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Month
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Expected
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Paid
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {contributions.map(
                (
                  contribution
                ) => (
                  <tr
                    key={
                      contribution._id
                    }
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium">
                        {
                          contribution
                            .member
                            ?.user
                            ?.name
                        }
                      </div>

                      <div className="text-sm text-gray-500">
                        {
                          contribution
                            .member
                            ?.memberCode
                        }
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      {
                        monthNames[
                          contribution.month -
                            1
                        ]
                      }{" "}
                      {
                        contribution.year
                      }
                    </td>

                    <td className="px-5 py-4">
                      ৳
                      {contribution.expectedAmount.toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      ৳
                      {contribution.paidAmount.toLocaleString()}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-sm capitalize ${
                          contribution.status ===
                          "paid"
                            ? "bg-green-50 text-green-700"
                            : contribution.status ===
                              "partial"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {
                          contribution.status
                        }
                      </span>
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}