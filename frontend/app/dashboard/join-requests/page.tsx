"use client";

import { useEffect, useState } from "react";

import {
  approveJoinRequest,
  getJoinRequests,
  rejectJoinRequest,
} from "@/services/joinRequestApi";

interface JoinRequest {
  _id: string;

  user: {
    _id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };

  phone?: string;
  address?: string;
  reason?: string;

  status: "pending" | "approved" | "rejected";

  adminNote?: string;

  reviewedBy?: {
    name?: string;
    email?: string;
  };

  reviewedAt?: string;
  createdAt: string;
}

export default function JoinRequestsPage() {
  const [requests, setRequests] = useState<JoinRequest[]>([]);

  const [statusFilter, setStatusFilter] =
    useState("pending");

  const [loading, setLoading] = useState(true);

  const [actionId, setActionId] = useState<
    string | null
  >(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getJoinRequests(
        statusFilter || undefined
      );

      setRequests(data.requests || []);
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to load join requests"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const handleApprove = async (
    request: JoinRequest
  ) => {
    const adminNote =
      window.prompt(
        `Approve ${request.user.name}? Add an optional note:`,
        ""
      ) ?? "";

    try {
      setActionId(request._id);
      setError("");
      setSuccess("");

      await approveJoinRequest(
        request._id,
        adminNote
      );

      setSuccess(
        `${request.user.name} has been approved.`
      );

      await loadRequests();
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to approve join request"
      );
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (
    request: JoinRequest
  ) => {
    const adminNote = window.prompt(
      `Why are you rejecting ${request.user.name}?`,
      ""
    );

    if (adminNote === null) {
      return;
    }

    try {
      setActionId(request._id);
      setError("");
      setSuccess("");

      await rejectJoinRequest(
        request._id,
        adminNote
      );

      setSuccess(
        `${request.user.name}'s request was rejected.`
      );

      await loadRequests();
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to reject join request"
      );
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Join Requests
        </h1>

        <p className="mt-2 text-gray-500">
          Review applications from people who want to
          join the savings group.
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

      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <label className="mb-2 block text-sm font-medium">
          Filter by Status
        </label>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          className="w-full max-w-xs rounded-lg border border-gray-300 px-4 py-3"
        >
          <option value="">
            All Requests
          </option>

          <option value="pending">
            Pending
          </option>

          <option value="approved">
            Approved
          </option>

          <option value="rejected">
            Rejected
          </option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">
          Loading join requests...
        </p>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          No join requests found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Applicant
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Contact
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Reason
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Applied
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
              {requests.map((request) => (
                <tr
                  key={request._id}
                  className="border-b border-gray-100 align-top last:border-0"
                >
                  <td className="px-5 py-4">
                    <div className="font-medium">
                      {request.user?.name}
                    </div>

                    <div className="text-sm text-gray-500">
                      {request.user?.email}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    <div>
                      {request.phone || "-"}
                    </div>

                    <div className="mt-1 text-sm text-gray-500">
                      {request.address || "-"}
                    </div>
                  </td>

                  <td className="max-w-sm px-5 py-4">
                    {request.reason || "-"}
                  </td>

                  <td className="px-5 py-4">
                    {new Date(
                      request.createdAt
                    ).toLocaleDateString()}
                  </td>

                  <td className="px-5 py-4 capitalize">
                    {request.status}
                  </td>

                  <td className="px-5 py-4">
                    {request.status ===
                    "pending" ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            handleApprove(
                              request
                            )
                          }
                          disabled={
                            actionId ===
                            request._id
                          }
                          className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
                        >
                          Approve
                        </button>

                        <button
                          onClick={() =>
                            handleReject(
                              request
                            )
                          }
                          disabled={
                            actionId ===
                            request._id
                          }
                          className="rounded-lg bg-red-50 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">
                        Reviewed
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}