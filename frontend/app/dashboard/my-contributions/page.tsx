"use client";

import { useEffect, useState } from "react";

import {
  getMyContributions,
} from "@/services/contributionApi";

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
  paymentDate?: string | null;
  note?: string;
}

export default function MyContributionsPage() {
  const [contributions, setContributions] =
    useState<Contribution[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadContributions = async () => {
      try {
        setError("");

        const data =
          await getMyContributions();

        setContributions(
          data.contributions || []
        );
      } catch (error: any) {
        setError(
          error?.response?.data?.message ||
            "Failed to load contributions"
        );
      } finally {
        setLoading(false);
      }
    };

    loadContributions();
  }, []);

  const totalExpected =
    contributions.reduce(
      (sum, contribution) =>
        sum +
        Number(
          contribution.expectedAmount || 0
        ),
      0
    );

  const totalPaid =
    contributions.reduce(
      (sum, contribution) =>
        sum +
        Number(
          contribution.paidAmount || 0
        ),
      0
    );

  const outstandingAmount =
    Math.max(
      totalExpected - totalPaid,
      0
    );

  const paidCount =
    contributions.filter(
      (contribution) =>
        contribution.status === "paid"
    ).length;

  const partialCount =
    contributions.filter(
      (contribution) =>
        contribution.status === "partial"
    ).length;

  const dueCount =
    contributions.filter(
      (contribution) =>
        contribution.status === "due"
    ).length;

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading contributions...
      </p>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          My Contributions
        </h1>

        <p className="mt-2 text-gray-500">
          Review your monthly savings
          and payment history.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Expected"
          value={`৳${totalExpected.toLocaleString()}`}
        />

        <SummaryCard
          title="Total Paid"
          value={`৳${totalPaid.toLocaleString()}`}
        />

        <SummaryCard
          title="Outstanding"
          value={`৳${outstandingAmount.toLocaleString()}`}
        />

        <SummaryCard
          title="Records"
          value={contributions.length.toString()}
        />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <MiniCard
          title="Paid"
          value={paidCount.toString()}
        />

        <MiniCard
          title="Partial"
          value={partialCount.toString()}
        />

        <MiniCard
          title="Due"
          value={dueCount.toString()}
        />
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Contribution History
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px] text-left">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
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

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Payment Date
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Note
                </th>
              </tr>
            </thead>

            <tbody>
              {contributions.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    No contributions found.
                  </td>
                </tr>
              ) : (
                contributions.map(
                  (contribution) => (
                    <tr
                      key={contribution._id}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-5 py-4 text-sm font-medium text-gray-900">
                        {formatMonth(
                          contribution.month
                        )}{" "}
                        {
                          contribution.year
                        }
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        ৳
                        {Number(
                          contribution.expectedAmount
                        ).toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-sm font-medium text-gray-900">
                        ৳
                        {Number(
                          contribution.paidAmount
                        ).toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            contribution.status
                          }
                        />
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-600">
                        {contribution.paymentDate
                          ? new Date(
                              contribution.paymentDate
                            ).toLocaleDateString(
                              "en-BD",
                              {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              }
                            )
                          : "-"}
                      </td>

                      <td className="max-w-xs px-5 py-4 text-sm text-gray-600">
                        {contribution.note ||
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

function MiniCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-gray-100 p-4">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-1 text-lg font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: Contribution["status"];
}) {
  const styles: Record<
    Contribution["status"],
    string
  > = {
    paid:
      "bg-green-50 text-green-700",
    partial:
      "bg-yellow-50 text-yellow-700",
    due:
      "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function formatMonth(
  month: number
) {
  const months = [
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

  return months[month - 1] || "Unknown";
}
