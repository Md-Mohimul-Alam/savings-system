"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getMembers,
  getPendingUsers,
  approveUser,
  deleteMember,
} from "@/services/memberApi";

import {
  useDemoMode,
} from "@/hooks/useDemoMode";

interface PendingUser {
  _id: string;
  name: string;
  email: string;
  status: string;
}

interface Member {
  _id: string;
  memberCode: string;
  phone?: string;
  address?: string;
  monthlyContribution: number;
  totalContribution: number;
  membershipStatus: string;

  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
}

export default function MembersPage() {
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
    pendingUsers,
    setPendingUsers,
  ] =
    useState<
      PendingUser[]
    >([]);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    deletingId,
    setDeletingId,
  ] =
    useState<
      string | null
    >(
      null
    );

  const [
    approvingId,
    setApprovingId,
  ] =
    useState<
      string | null
    >(
      null
    );

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
          pendingData,
        ] =
          await Promise.all([
            getMembers(),
            getPendingUsers(),
          ]);

        setMembers(
          membersData.members ||
            []
        );

        setPendingUsers(
          pendingData.users ||
            []
        );
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to load members"
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
  // APPROVE USER
  // --------------------------------------------------

  const handleApprove =
    async (
      userId: string
    ) => {
      if (isDemo) {
        setError(
          "Demo Mode is read-only. Approving users is disabled."
        );

        return;
      }

      try {
        setError("");

        setApprovingId(
          userId
        );

        await approveUser(
          userId,
          {}
        );

        await loadData();
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to approve user"
        );
      } finally {
        setApprovingId(
          null
        );
      }
    };

  // --------------------------------------------------
  // DELETE MEMBER
  // --------------------------------------------------

  const handleDelete =
    async (
      memberId: string,
      memberName: string
    ) => {
      if (isDemo) {
        setError(
          "Demo Mode is read-only. Deleting members is disabled."
        );

        return;
      }

      const confirmed =
        window.confirm(
          `Are you sure you want to delete ${
            memberName ||
            "this member"
          }? This action cannot be undone.`
        );

      if (!confirmed) {
        return;
      }

      try {
        setError("");

        setDeletingId(
          memberId
        );

        await deleteMember(
          memberId
        );

        await loadData();
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to delete member"
        );
      } finally {
        setDeletingId(
          null
        );
      }
    };

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------

  const totalSaved =
    members.reduce(
      (
        sum,
        member
      ) =>
        sum +
        Number(
          member.totalContribution ||
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
        Loading members...
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
              Members
            </h1>

            <p className="mt-2 text-gray-500">
              Manage group members and pending registrations.
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
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Demo Mode
          </p>

          <p className="mt-1 text-sm text-amber-700">
            You can review all sample members and pending users,
            but approval and deletion actions are disabled.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {/* Summary */}
      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Active Members
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {
              members.length
            }
          </h2>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Pending Users
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            {
              pendingUsers.length
            }
          </h2>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <p className="text-sm text-gray-500">
            Total Saved
          </p>

          <h2 className="mt-2 text-2xl font-bold text-gray-900">
            ৳
            {totalSaved.toLocaleString()}
          </h2>
        </div>
      </div>

      {/* Pending Users */}
      <section className="mb-10">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Pending Users
          </h2>

          {isDemo && (
            <span className="text-xs font-medium text-amber-700">
              Approval disabled
            </span>
          )}
        </div>

        {pendingUsers.length ===
        0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-500">
            No pending users.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-left">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-sm font-medium text-gray-600">
                    Name
                  </th>

                  <th className="px-5 py-3 text-sm font-medium text-gray-600">
                    Email
                  </th>

                  <th className="px-5 py-3 text-sm font-medium text-gray-600">
                    Status
                  </th>

                  <th className="px-5 py-3 text-sm font-medium text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {pendingUsers.map(
                  (
                    user
                  ) => (
                    <tr
                      key={
                        user._id
                      }
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-5 py-4">
                        {
                          user.name
                        }
                      </td>

                      <td className="px-5 py-4">
                        {
                          user.email
                        }
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-sm capitalize text-amber-700">
                          {
                            user.status
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            handleApprove(
                              user._id
                            )
                          }
                          disabled={
                            isDemo ||
                            approvingId ===
                              user._id
                          }
                          title={
                            isDemo
                              ? "Disabled in Demo Mode"
                              : undefined
                          }
                          className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
                            isDemo
                              ? "cursor-not-allowed bg-gray-400"
                              : "bg-black hover:bg-gray-800"
                          } disabled:opacity-50`}
                        >
                          {isDemo
                            ? "Read Only"
                            : approvingId ===
                              user._id
                            ? "Approving..."
                            : "Approve"}
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Active Members */}
      <section>
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            Active Members
          </h2>

          {isDemo && (
            <span className="text-xs font-medium text-amber-700">
              Sample data
            </span>
          )}
        </div>

        {members.length ===
        0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-500">
            No members found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="min-w-[1000px] w-full text-left">
              <thead className="border-b border-gray-200 bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-sm font-medium text-gray-600">
                    Code
                  </th>

                  <th className="px-5 py-3 text-sm font-medium text-gray-600">
                    Name
                  </th>

                  <th className="px-5 py-3 text-sm font-medium text-gray-600">
                    Email
                  </th>

                  <th className="px-5 py-3 text-sm font-medium text-gray-600">
                    Monthly
                  </th>

                  <th className="px-5 py-3 text-sm font-medium text-gray-600">
                    Total Saved
                  </th>

                  <th className="px-5 py-3 text-sm font-medium text-gray-600">
                    Status
                  </th>

                  <th className="px-5 py-3 text-sm font-medium text-gray-600">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {members.map(
                  (
                    member
                  ) => (
                    <tr
                      key={
                        member._id
                      }
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {
                          member.memberCode
                        }
                      </td>

                      <td className="px-5 py-4">
                        {member.user
                          ?.name ||
                          "-"}
                      </td>

                      <td className="px-5 py-4">
                        {member.user
                          ?.email ||
                          "-"}
                      </td>

                      <td className="px-5 py-4">
                        ৳
                        {Number(
                          member.monthlyContribution ||
                            0
                        ).toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        ৳
                        {Number(
                          member.totalContribution ||
                            0
                        ).toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        <span className="rounded-full bg-green-50 px-3 py-1 text-sm capitalize text-green-700">
                          {
                            member.membershipStatus
                          }
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          disabled={
                            isDemo ||
                            deletingId ===
                              member._id
                          }
                          onClick={() =>
                            handleDelete(
                              member._id,
                              member.user
                                ?.name ||
                                member.memberCode
                            )
                          }
                          title={
                            isDemo
                              ? "Disabled in Demo Mode"
                              : undefined
                          }
                          className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition ${
                            isDemo
                              ? "cursor-not-allowed bg-gray-400"
                              : "bg-red-600 hover:bg-red-700"
                          } disabled:opacity-50`}
                        >
                          {isDemo
                            ? "Read Only"
                            : deletingId ===
                              member._id
                            ? "Deleting..."
                            : "Delete"}
                        </button>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}