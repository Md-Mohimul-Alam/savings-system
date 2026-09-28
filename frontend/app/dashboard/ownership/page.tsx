"use client";

import { useEffect, useState } from "react";

import {
  getOwnershipSummary,
  syncOwnership,
} from "@/services/ownershipApi";

interface OwnershipMember {
  memberId: string;
  memberCode: string;
  name: string;
  email: string;
  totalContribution: number;
  ownershipPercentage: number;
}

export default function OwnershipPage() {
  const [members, setMembers] = useState<
    OwnershipMember[]
  >([]);

  const [totalGroupContribution, setTotalGroupContribution] =
    useState(0);

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadOwnership = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getOwnershipSummary();

      setMembers(data.members || []);
      setTotalGroupContribution(
        data.totalGroupContribution || 0
      );
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to load ownership data"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOwnership();
  }, []);

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError("");
      setSuccess("");

      await syncOwnership();

      setSuccess(
        "Ownership percentages synchronized successfully."
      );

      await loadOwnership();
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to synchronize ownership"
      );
    } finally {
      setSyncing(false);
    }
  };

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading ownership...
      </p>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Ownership
          </h1>

          <p className="mt-2 text-gray-500">
            View each member&apos;s contribution and ownership share.
          </p>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          className="rounded-lg bg-black px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          {syncing
            ? "Syncing..."
            : "Sync Ownership"}
        </button>
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
            Total Group Contribution
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            ৳{totalGroupContribution.toLocaleString()}
          </h2>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Active Owners
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {members.length}
          </h2>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left">
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
            {members.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="px-5 py-8 text-center text-gray-500"
                >
                  No ownership data found.
                </td>
              </tr>
            ) : (
              members.map((member) => (
                <tr
                  key={member.memberId}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-5 py-4">
                    {member.memberCode}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-medium">
                      {member.name}
                    </div>

                    <div className="text-sm text-gray-500">
                      {member.email}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    ৳
                    {member.totalContribution.toLocaleString()}
                  </td>

                  <td className="px-5 py-4 font-medium">
                    {member.ownershipPercentage.toFixed(
                      2
                    )}
                    %
                  </td>

                  <td className="px-5 py-4">
                    <div className="h-2 w-40 overflow-hidden rounded-full bg-gray-200">
                      <div
                        className="h-full bg-black"
                        style={{
                          width: `${Math.min(
                            member.ownershipPercentage,
                            100
                          )}%`,
                        }}
                      />
                    </div>
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