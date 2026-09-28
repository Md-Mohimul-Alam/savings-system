"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getOwnershipSummary,
  syncOwnership,
} from "@/services/ownershipApi";

import {
  useDemoMode,
} from "@/hooks/useDemoMode";

interface OwnershipMember {
  memberId: string;
  memberCode: string;
  name: string;
  email: string;
  totalContribution: number;
  ownershipPercentage: number;
}

export default function OwnershipPage() {
  const isDemo =
    useDemoMode();

  const [
    members,
    setMembers,
  ] =
    useState<
      OwnershipMember[]
    >([]);

  const [
    totalGroupContribution,
    setTotalGroupContribution,
  ] =
    useState(0);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    syncing,
    setSyncing,
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
  // LOAD OWNERSHIP
  // --------------------------------------------------

  const loadOwnership =
    async () => {
      try {
        setLoading(
          true
        );

        setError("");

        const data =
          await getOwnershipSummary();

        setMembers(
          data.members ||
            []
        );

        setTotalGroupContribution(
          data.totalGroupContribution ||
            0
        );
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to load ownership data"
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  useEffect(() => {
    loadOwnership();
  }, []);

  // --------------------------------------------------
  // SYNC OWNERSHIP
  // --------------------------------------------------

  const handleSync =
    async () => {
      if (isDemo) {
        setError(
          "Demo Mode is read-only. Synchronizing ownership is disabled."
        );

        return;
      }

      try {
        setSyncing(
          true
        );

        setError("");
        setSuccess("");

        await syncOwnership();

        setSuccess(
          "Ownership percentages synchronized successfully."
        );

        await loadOwnership();
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to synchronize ownership"
        );
      } finally {
        setSyncing(
          false
        );
      }
    };

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------

  const totalOwnership =
    members.reduce(
      (
        sum,
        member
      ) =>
        sum +
        Number(
          member.ownershipPercentage ||
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
        Loading ownership...
      </p>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              Ownership
            </h1>

            {isDemo && (
              <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                Demo Mode · Read Only
              </span>
            )}
          </div>

          <p className="mt-2 text-gray-500">
            View each member&apos;s contribution and ownership share.
          </p>
        </div>

        <button
          type="button"
          onClick={
            handleSync
          }
          disabled={
            syncing ||
            isDemo
          }
          title={
            isDemo
              ? "Disabled in Demo Mode"
              : undefined
          }
          className={`rounded-lg px-5 py-3 text-sm font-medium text-white transition ${
            isDemo
              ? "cursor-not-allowed bg-gray-400"
              : "bg-black hover:bg-gray-800"
          } disabled:opacity-50`}
        >
          {isDemo
            ? "Sync Disabled"
            : syncing
            ? "Syncing..."
            : "Sync Ownership"}
        </button>
      </div>

      {/* Demo Notice */}
      {isDemo && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Demo Mode
          </p>

          <p className="mt-1 text-sm text-amber-700">
            You can review sample ownership data,
            contribution totals, percentages, and visual shares,
            but recalculating or synchronizing ownership is disabled.
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
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Total Group Contribution
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            ৳
            {Number(
              totalGroupContribution ||
                0
            ).toLocaleString()}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Active Owners
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {
              members.length
            }
          </h2>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Total Ownership
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {totalOwnership.toFixed(
              2
            )}
            %
          </h2>
        </div>
      </div>

      {/* Ownership Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                Ownership Distribution
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {
                  members.length
                }{" "}
                owner
                {members.length ===
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

        <table className="min-w-[850px] w-full text-left">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Code
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Member
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Total Contribution
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Ownership
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Visual Share
              </th>
            </tr>
          </thead>

          <tbody>
            {members.length ===
            0 ? (
              <tr>
                <td
                  colSpan={
                    5
                  }
                  className="px-5 py-8 text-center text-gray-500"
                >
                  No ownership data found.
                </td>
              </tr>
            ) : (
              members.map(
                (
                  member
                ) => (
                  <tr
                    key={
                      member.memberId
                    }
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-5 py-4 font-medium text-gray-900">
                      {
                        member.memberCode
                      }
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">
                        {
                          member.name
                        }
                      </div>

                      <div className="text-sm text-gray-500">
                        {
                          member.email
                        }
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      ৳
                      {Number(
                        member.totalContribution ||
                          0
                      ).toLocaleString()}
                    </td>

                    <td className="px-5 py-4 font-medium">
                      {Number(
                        member.ownershipPercentage ||
                          0
                      ).toFixed(
                        2
                      )}
                      %
                    </td>

                    <td className="px-5 py-4">
                      <div className="h-2 w-40 overflow-hidden rounded-full bg-gray-200">
                        <div
                          className="h-full bg-black transition-all"
                          style={{
                            width: `${Math.min(
                              Math.max(
                                Number(
                                  member.ownershipPercentage ||
                                    0
                                ),
                                0
                              ),
                              100
                            )}%`,
                          }}
                        />
                      </div>

                      <p className="mt-1 text-xs text-gray-500">
                        {Number(
                          member.ownershipPercentage ||
                            0
                        ).toFixed(
                          2
                        )}
                        %
                      </p>
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