"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  createProfitDistribution,
  getProfitDistributions,
} from "@/services/profitDistributionApi";

import {
  getInvestments,
} from "@/services/investmentApi";

import {
  useDemoMode,
} from "@/hooks/useDemoMode";

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
    distributions,
    setDistributions,
  ] =
    useState<
      ProfitDistribution[]
    >([]);

  const [
    investmentId,
    setInvestmentId,
  ] =
    useState("");

  const [
    totalProfit,
    setTotalProfit,
  ] =
    useState<number>(
      0
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
          investmentData,
          distributionData,
        ] =
          await Promise.all([
            getInvestments({
              status:
                "active",
            }),

            getProfitDistributions(),
          ]);

        setInvestments(
          investmentData.investments ||
            []
        );

        setDistributions(
          distributionData.distributions ||
            []
        );
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to load profit distribution data"
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
  // CREATE DISTRIBUTION
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
          "Demo Mode is read-only. Profit distribution is disabled."
        );

        return;
      }

      if (!investmentId) {
        setError(
          "Please select an investment."
        );

        return;
      }

      if (
        totalProfit <=
        0
      ) {
        setError(
          "Total profit must be greater than 0."
        );

        return;
      }

      try {
        setSubmitting(
          true
        );

        await createProfitDistribution({
          investmentId,
          totalProfit,
          note,
        });

        setSuccess(
          "Profit distributed successfully."
        );

        setInvestmentId(
          ""
        );

        setTotalProfit(
          0
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
            "Failed to distribute profit"
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

  const totalDistributed =
    distributions.reduce(
      (
        sum,
        distribution
      ) =>
        sum +
        Number(
          distribution.totalProfit ||
            0
        ),
      0
    );

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading profit distributions...
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
              Profit Distribution
            </h1>

            <p className="mt-2 text-gray-500">
              Allocate investment profit according to member ownership.
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
            You can view sample profit distributions and member shares,
            but creating a new profit distribution is disabled.
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
            Total Profit Distributed
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            ৳
            {totalDistributed.toLocaleString()}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Distribution Records
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {
              distributions.length
            }
          </h2>
        </div>
      </div>

      {/* Distribution Form */}
      <div
        className={`mb-8 rounded-xl border bg-white p-6 ${
          isDemo
            ? "border-amber-200"
            : "border-gray-200"
        }`}
      >
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold">
            Distribute Profit
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
          {/* Investment */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Investment
            </label>

            <select
              value={
                investmentId
              }
              onChange={(
                event
              ) =>
                setInvestmentId(
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
                Select investment
              </option>

              {investments.map(
                (
                  investment
                ) => (
                  <option
                    key={
                      investment._id
                    }
                    value={
                      investment._id
                    }
                  >
                    {
                      investment.name
                    }
                  </option>
                )
              )}
            </select>
          </div>

          {/* Profit */}
          <div>
            <label className="mb-2 block text-sm font-medium">
              Total Profit
            </label>

            <input
              type="number"
              min="1"
              value={
                totalProfit
              }
              onChange={(
                event
              ) =>
                setTotalProfit(
                  Number(
                    event.target
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
          <div>
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
                  event.target
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
                ? "Distribution Disabled"
                : submitting
                ? "Distributing..."
                : "Distribute Profit"}
            </button>
          </div>
        </form>
      </div>

      {/* Existing Distributions */}
      <div className="space-y-5">
        {distributions.length ===
        0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-500">
            No profit distributions found.
          </div>
        ) : (
          distributions.map(
            (
              distribution
            ) => (
              <div
                key={
                  distribution._id
                }
                className="rounded-xl border border-gray-200 bg-white p-6"
              >
                <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {distribution.investment
                          ?.name ||
                          "Investment"}
                      </h3>

                      {isDemo && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                          Sample
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-sm text-gray-500">
                      {new Date(
                        distribution.distributionDate
                      ).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="text-lg font-bold text-gray-900">
                    ৳
                    {Number(
                      distribution.totalProfit ||
                        0
                    ).toLocaleString()}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-[600px] w-full text-left">
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
                        (
                          item
                        ) => (
                          <tr
                            key={
                              item.member
                                ?._id
                            }
                            className="border-b border-gray-100 last:border-0"
                          >
                            <td className="py-3">
                              <div className="font-medium text-gray-900">
                                {item.member
                                  ?.user
                                  ?.name ||
                                  "-"}
                              </div>

                              <div className="text-sm text-gray-500">
                                {item.member
                                  ?.memberCode ||
                                  ""}
                              </div>
                            </td>

                            <td className="py-3">
                              {Number(
                                item.ownershipPercentage ||
                                  0
                              ).toFixed(
                                2
                              )}
                              %
                            </td>

                            <td className="py-3 font-medium">
                              ৳
                              {Number(
                                item.profitShare ||
                                  0
                              ).toLocaleString()}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>

                {distribution.note && (
                  <p className="mt-4 text-sm text-gray-500">
                    Note:{" "}
                    {
                      distribution.note
                    }
                  </p>
                )}
              </div>
            )
          )
        )}
      </div>
    </div>
  );
}