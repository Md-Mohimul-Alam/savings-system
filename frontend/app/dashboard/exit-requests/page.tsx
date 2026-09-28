"use client";

import { useEffect, useState } from "react";

import {
  approveExitRequest,
  getExitRequests,
  markExitAsPaid,
  rejectExitRequest,
} from "@/services/exitRequestApi";

interface ExitRequest {
  _id: string;

  member: {
    _id: string;
    memberCode: string;
    totalContribution: number;

    user?: {
      name?: string;
      email?: string;
    };
  };

  reason?: string;

  status:
    | "pending"
    | "approved"
    | "rejected"
    | "paid";

  estimatedPayout: number;
  finalPayout: number;

  adminNote?: string;

  reviewedBy?: {
    name?: string;
    email?: string;
  };

  reviewedAt?: string;
  paidAt?: string;

  createdAt: string;
}

export default function ExitRequestsPage() {
  const [requests, setRequests] = useState<
    ExitRequest[]
  >([]);

  const [statusFilter, setStatusFilter] =
    useState("pending");

  const [loading, setLoading] =
    useState(true);

  const [actionId, setActionId] =
    useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] =
    useState("");

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError("");

      const data = await getExitRequests(
        statusFilter || undefined
      );

      setRequests(data.requests || []);
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to load exit requests"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  const handleApprove = async (
    request: ExitRequest
  ) => {
    const adminNote =
      window.prompt(
        `Approve exit request for ${request.member?.user?.name}?`,
        ""
      ) ?? "";

    try {
      setActionId(request._id);
      setError("");
      setSuccess("");

      await approveExitRequest(
        request._id,
        adminNote
      );

      setSuccess(
        "Exit request approved successfully."
      );

      await loadRequests();
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to approve exit request"
      );
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (
    request: ExitRequest
  ) => {
    const adminNote = window.prompt(
      `Reason for rejecting ${request.member?.user?.name}'s exit request:`,
      ""
    );

    if (adminNote === null) {
      return;
    }

    try {
      setActionId(request._id);
      setError("");
      setSuccess("");

      await rejectExitRequest(
        request._id,
        adminNote
      );

      setSuccess(
        "Exit request rejected."
      );

      await loadRequests();
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to reject exit request"
      );
    } finally {
      setActionId(null);
    }
  };

  const handlePay = async (
    request: ExitRequest
  ) => {
    const amount =
      request.finalPayout ||
      request.estimatedPayout;

    const confirmed = window.confirm(
      `Mark ৳${amount.toLocaleString()} payout for ${request.member?.user?.name} as paid?`
    );

    if (!confirmed) return;

    try {
      setActionId(request._id);
      setError("");
      setSuccess("");

      await markExitAsPaid(
        request._id
      );

      setSuccess(
        "Exit payout marked as paid."
      );

      await loadRequests();
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to complete exit payout"
      );
    } finally {
      setActionId(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Exit Requests
        </h1>

        <p className="mt-2 text-gray-500">
          Review member exit requests and
          final payout calculations.
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
            setStatusFilter(
              event.target.value
            )
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

          <option value="paid">
            Paid
          </option>
        </select>
      </div>

      {loading ? (
        <p className="text-gray-500">
          Loading exit requests...
        </p>
      ) : requests.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          No exit requests found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-left">
            <thead className="border-b border-gray-200 bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Member
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Reason
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Contribution
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Estimated Payout
                </th>

                <th className="px-5 py-3 text-sm font-medium text-gray-600">
                  Final Payout
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
                      {request.member?.user
                        ?.name || "-"}
                    </div>

                    <div className="text-sm text-gray-500">
                      {
                        request.member
                          ?.memberCode
                      }
                    </div>

                    <div className="text-sm text-gray-500">
                      {request.member?.user
                        ?.email || ""}
                    </div>
                  </td>

                  <td className="max-w-xs px-5 py-4">
                    {request.reason || "-"}
                  </td>

                  <td className="px-5 py-4">
                    ৳
                    {(
                      request.member
                        ?.totalContribution ||
                      0
                    ).toLocaleString()}
                  </td>

                  <td className="px-5 py-4 font-medium">
                    ৳
                    {(
                      request.estimatedPayout ||
                      0
                    ).toLocaleString()}
                  </td>

                  <td className="px-5 py-4 font-medium">
                    ৳
                    {(
                      request.finalPayout ||
                      0
                    ).toLocaleString()}
                  </td>

                  <td className="px-5 py-4 capitalize">
                    {request.status}
                  </td>

                  <td className="px-5 py-4">
                    {request.status ===
                      "pending" && (
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
                    )}

                    {request.status ===
                      "approved" && (
                      <button
                        onClick={() =>
                          handlePay(
                            request
                          )
                        }
                        disabled={
                          actionId ===
                          request._id
                        }
                        className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        Mark Paid
                      </button>
                    )}

                    {(request.status ===
                      "paid" ||
                      request.status ===
                        "rejected") && (
                      <span className="text-sm text-gray-500">
                        Completed
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