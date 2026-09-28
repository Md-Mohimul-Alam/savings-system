"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  createProfitDistribution,
  getProfitDistributions,
} from "@/services/profitDistributionApi";

import { getInvestments } from "@/services/investmentApi";

interface Investment {
  _id: string;
  name: string;
  investedAmount: number;
  currentValue: number;
  status: string;
}

interface DistributionMember {
  member: {
    _id: string;
    memberCode?: string;

    user?: {
      name?: string;
      email?: string;
    };
  };

  ownershipPercentage: number;
  profitShare: number;
}

interface ProfitDistribution {
  _id: string;

  investment: {
    _id: string;
    name: string;
    investedAmount: number;
    currentValue: number;
  };

  totalProfit: number;
  distributionDate: string;
  note?: string;

  members: DistributionMember[];
}

export default function ProfitDistributionPage() {
  const [investments, setInvestments] = useState<
    Investment[]
  >([]);

  const [distributions, setDistributions] = useState<
    ProfitDistribution[]
  >([]);

  const [investmentId, setInvestmentId] =
    useState("");

  const [totalProfit, setTotalProfit] =
    useState<number>(0);

  const [note, setNote] = useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [investmentData, distributionData] =
        await Promise.all([
          getInvestments({
            status: "active",
          }),
          getProfitDistributions(),
        ]);

      setInvestments(
        investmentData.investments || []
      );

      setDistributions(
        distributionData.distributions || []
      );
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to load profit distribution data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!investmentId) {
      setError("Please select an investment.");
      return;
    }

    if (totalProfit <= 0) {
      setError(
        "Total profit must be greater than 0."
      );

      return;
    }

    try {
      setSubmitting(true);

      await createProfitDistribution({
        investmentId,
        totalProfit,
        note,
      });

      setSuccess(
        "Profit distributed successfully."
      );

      setInvestmentId("");
      setTotalProfit(0);
      setNote("");

      await loadData();
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to distribute profit"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const totalDistributed = distributions.reduce(
    (sum, distribution) =>
      sum + distribution.totalProfit,
    0
  );

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading profit distributions...
      </p>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Profit Distribution
        </h1>

        <p className="mt-2 text-gray-500">
          Allocate investment profit according to
          member ownership.
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
            Total Profit Distributed
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            ৳
            {totalDistributed.toLocaleString()}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Distribution Records
          </p>

          <h2 className="mt-2 text-2xl font-bold">
            {distributions.length}
          </h2>
        </div>
      </div>

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-5 text-xl font-semibold">
          Distribute Profit
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">
              Investment
            </label>

            <select
              value={investmentId}
              onChange={(event) =>
                setInvestmentId(
                  event.target.value
                )
              }
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            >
              <option value="">
                Select investment
              </option>

              {investments.map(
                (investment) => (
                  <option
                    key={investment._id}
                    value={investment._id}
                  >
                    {investment.name}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Total Profit
            </label>

            <input
              type="number"
              min="1"
              value={totalProfit}
              onChange={(event) =>
                setTotalProfit(
                  Number(event.target.value)
                )
              }
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
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
                ? "Distributing..."
                : "Distribute Profit"}
            </button>
          </div>
        </form>
      </div>

      <div className="space-y-5">
        {distributions.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-500">
            No profit distributions found.
          </div>
        ) : (
          distributions.map((distribution) => (
            <div
              key={distribution._id}
              className="rounded-xl border border-gray-200 bg-white p-6"
            >
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-semibold">
                    {
                      distribution.investment
                        ?.name
                    }
                  </h3>

                  <p className="text-sm text-gray-500">
                    {new Date(
                      distribution.distributionDate
                    ).toLocaleDateString()}
                  </p>
                </div>

                <div className="text-lg font-bold">
                  ৳
                  {distribution.totalProfit.toLocaleString()}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-gray-200">
                    <tr>
                      <th className="py-3 text-sm font-medium text-gray-600">
                        Member
                      </th>

                      <th className="py-3 text-sm font-medium text-gray-600">
                        Ownership
                      </th>

                      <th className="py-3 text-sm font-medium text-gray-600">
                        Profit Share
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {distribution.members.map(
                      (item) => (
                        <tr
                          key={
                            item.member?._id
                          }
                          className="border-b border-gray-100 last:border-0"
                        >
                          <td className="py-3">
                            {item.member?.user
                              ?.name || "-"}
                          </td>

                          <td className="py-3">
                            {item.ownershipPercentage.toFixed(
                              2
                            )}
                            %
                          </td>

                          <td className="py-3 font-medium">
                            ৳
                            {item.profitShare.toLocaleString()}
                          </td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              {distribution.note && (
                <p className="mt-4 text-sm text-gray-500">
                  Note: {distribution.note}
                </p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}