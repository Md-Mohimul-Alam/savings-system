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
  const [
    members,
    setMembers,
  ] =
    useState<Member[]>([]);

  const [
    pendingUsers,
    setPendingUsers,
  ] =
    useState<PendingUser[]>([]);

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
    useState<string | null>(
      null
    );

  const loadData =
    async () => {
      try {
        setLoading(true);
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
        setLoading(false);
      }
    };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove =
    async (
      userId: string
    ) => {
      try {
        await approveUser(
          userId,
          {}
        );

        await loadData();
      } catch (
        error: any
      ) {
        alert(
          error?.response
            ?.data
            ?.message ||
            "Failed to approve user"
        );
      }
    };

  const handleDelete =
    async (
      memberId: string,
      memberName: string
    ) => {
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
        alert(
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

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading members...
      </p>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Members
        </h1>

        <p className="mt-2 text-gray-500">
          Manage group
          members and pending
          registrations.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {/* Pending Users */}
      <section className="mb-10">
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Pending Users
        </h2>

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
                  (user) => (
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

                      <td className="px-5 py-4 capitalize">
                        {
                          user.status
                        }
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          onClick={() =>
                            handleApprove(
                              user._id
                            )
                          }
                          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-800"
                        >
                          Approve
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
        <h2 className="mb-4 text-xl font-semibold text-gray-900">
          Active Members
        </h2>

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
                  (member) => (
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

                      <td className="px-5 py-4 capitalize">
                        {
                          member.membershipStatus
                        }
                      </td>

                      <td className="px-5 py-4">
                        <button
                          type="button"
                          disabled={
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
                          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {deletingId ===
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