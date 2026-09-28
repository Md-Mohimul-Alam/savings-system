"use client";

import { useEffect, useState } from "react";

import {
  getMyOwnership,
} from "@/services/ownershipApi";

interface InvestmentShare {
  investmentId: string;
  name: string;
  investedAmount: number;
  currentValue: number;
  memberShare: number;
  status: string;
}

interface OwnershipData {
  member: {
    _id: string;
    memberCode: string;
    totalContribution: number;
    ownershipPercentage: number;
    user?: {
      name: string;
      email: string;
    };
  };

  totalGroupContribution: number;
  ownershipPercentage: number;
  investmentShares: InvestmentShare[];
}

export default function MyOwnershipPage() {
  const [data, setData] =
    useState<OwnershipData | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadOwnership = async () => {
      try {
        setError("");

        const result =
          await getMyOwnership();

        setData(result);
      } catch (error: any) {
        setError(
          error?.response?.data?.message ||
            "Failed to load ownership information"
        );
      } finally {
        setLoading(false);
      }
    };

    loadOwnership();
  }, []);

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading ownership...
      </p>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-600">
        {error}
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const {
    member,
    totalGroupContribution,
    ownershipPercentage,
    investmentShares,
  } = data;

  const totalInvestmentShare =
    investmentShares.reduce(
      (sum, investment) =>
        sum +
        Number(
          investment.memberShare || 0
        ),
      0
    );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          My Ownership
        </h1>

        <p className="mt-2 text-gray-500">
          Review your current contribution share and
          investment ownership.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="My Contribution"
          value={`৳${Number(
            member.totalContribution || 0
          ).toLocaleString()}`}
        />

        <SummaryCard
          title="Group Contribution"
          value={`৳${Number(
            totalGroupContribution || 0
          ).toLocaleString()}`}
        />

        <SummaryCard
          title="Ownership"
          value={`${Number(
            ownershipPercentage || 0
          ).toFixed(2)}%`}
        />

        <SummaryCard
          title="Investment Share"
          value={`৳${totalInvestmentShare.toLocaleString()}`}
        />
      </div>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Ownership Share
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              Based on your contribution compared with
              total active-member contributions.
            </p>
          </div>

          <span className="rounded-full bg-gray-100 px-3 py-1 text-sm font-semibold text-gray-700">
            {Number(
              ownershipPercentage || 0
            ).toFixed(2)}
            %
          </span>
        </div>

        <div className="mt-6 h-4 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-black transition-all"
            style={{
              width: `${Math.min(
                Math.max(
                  Number(
                    ownershipPercentage || 0
                  ),
                  0
                ),
                100
              )}%`,
            }}
          />
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            My Investment Shares
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Your proportional share of active group
            investments.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="bg-gray-50">
              <tr className="border-b border-gray-200">
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
                  My Share
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {investmentShares.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-5 py-10 text-center text-gray-500"
                  >
                    No active investments found.
                  </td>
                </tr>
              ) : (
                investmentShares.map(
                  (investment) => (
                    <tr
                      key={
                        investment.investmentId
                      }
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {investment.name}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        ৳
                        {Number(
                          investment.investedAmount ||
                            0
                        ).toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-sm text-gray-700">
                        ৳
                        {Number(
                          investment.currentValue ||
                            0
                        ).toLocaleString()}
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-gray-900">
                        ৳
                        {Number(
                          investment.memberShare ||
                            0
                        ).toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-green-50 px-2.5 py-1 text-xs font-medium capitalize text-green-700">
                          {investment.status}
                        </span>
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
