"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  approveJoinRequest,
  getJoinRequests,
  rejectJoinRequest,
} from "@/services/joinRequestApi";

import {
  useDemoMode,
} from "@/hooks/useDemoMode";

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

  status:
    | "pending"
    | "approved"
    | "rejected";

  adminNote?: string;

  reviewedBy?: {
    name?: string;
    email?: string;
  };

  reviewedAt?: string;
  createdAt: string;
}

export default function JoinRequestsPage() {
  const isDemo =
    useDemoMode();

  const [
    requests,
    setRequests,
  ] =
    useState<
      JoinRequest[]
    >([]);

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState(
      "pending"
    );

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    actionId,
    setActionId,
  ] =
    useState<
      string | null
    >(
      null
    );

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
  // LOAD REQUESTS
  // --------------------------------------------------

  const loadRequests =
    async () => {
      try {
        setLoading(
          true
        );

        setError("");

        const data =
          await getJoinRequests(
            statusFilter ||
              undefined
          );

        setRequests(
          data.requests ||
            []
        );
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to load join requests"
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  useEffect(() => {
    loadRequests();
  }, [
    statusFilter,
  ]);

  // --------------------------------------------------
  // APPROVE
  // --------------------------------------------------

  const handleApprove =
    async (
      request: JoinRequest
    ) => {
      if (isDemo) {
        setError(
          "Demo Mode is read-only. Approving join requests is disabled."
        );

        return;
      }

      const adminNote =
        window.prompt(
          `Approve ${request.user.name}? Add an optional note:`,
          ""
        ) ?? "";

      try {
        setActionId(
          request._id
        );

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
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to approve join request"
        );
      } finally {
        setActionId(
          null
        );
      }
    };

  // --------------------------------------------------
  // REJECT
  // --------------------------------------------------

  const handleReject =
    async (
      request: JoinRequest
    ) => {
      if (isDemo) {
        setError(
          "Demo Mode is read-only. Rejecting join requests is disabled."
        );

        return;
      }

      const adminNote =
        window.prompt(
          `Why are you rejecting ${request.user.name}?`,
          ""
        );

      if (
        adminNote ===
        null
      ) {
        return;
      }

      try {
        setActionId(
          request._id
        );

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
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to reject join request"
        );
      } finally {
        setActionId(
          null
        );
      }
    };

  // --------------------------------------------------
  // COUNTS
  // --------------------------------------------------

  const pendingCount =
    requests.filter(
      (
        request
      ) =>
        request.status ===
        "pending"
    ).length;

  const approvedCount =
    requests.filter(
      (
        request
      ) =>
        request.status ===
        "approved"
    ).length;

  const rejectedCount =
    requests.filter(
      (
        request
      ) =>
        request.status ===
        "rejected"
    ).length;

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
              Join Requests
            </h1>

            <p className="mt-2 text-gray-500">
              Review applications from people who want to join the savings group.
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
            You can review all sample join requests,
            but approving or rejecting applications is disabled.
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
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Pending
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {pendingCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Approved
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {approvedCount}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Rejected
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {rejectedCount}
          </p>
        </div>
      </div>

      {/* Filter */}
      <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5">
        <label className="mb-2 block text-sm font-medium">
          Filter by Status
        </label>

        <select
          value={
            statusFilter
          }
          onChange={(
            event
          ) =>
            setStatusFilter(
              event.target
                .value
            )
          }
          className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-4 py-3"
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

      {/* Requests */}
      {loading ? (
        <p className="text-gray-500">
          Loading join requests...
        </p>
      ) : requests.length ===
        0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          No join requests found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Applications
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  {requests.length} request
                  {requests.length ===
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

          <table className="min-w-[1050px] w-full text-left">
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
              {requests.map(
                (
                  request
                ) => (
                  <tr
                    key={
                      request._id
                    }
                    className="border-b border-gray-100 align-top last:border-0"
                  >
                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">
                        {request.user
                          ?.name ||
                          "-"}
                      </div>

                      <div className="mt-1 text-sm text-gray-500">
                        {request.user
                          ?.email ||
                          "-"}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div>
                        {request.phone ||
                          "-"}
                      </div>

                      <div className="mt-1 text-sm text-gray-500">
                        {request.address ||
                          "-"}
                      </div>
                    </td>

                    <td className="max-w-sm px-5 py-4">
                      {request.reason ||
                        "-"}
                    </td>

                    <td className="px-5 py-4">
                      {new Date(
                        request.createdAt
                      ).toLocaleDateString()}
                    </td>

                    <td className="px-5 py-4">
                      <span
                        className={`rounded-full px-3 py-1 text-sm capitalize ${
                          request.status ===
                          "approved"
                            ? "bg-green-50 text-green-700"
                            : request.status ===
                              "rejected"
                            ? "bg-red-50 text-red-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {
                          request.status
                        }
                      </span>
                    </td>

                    <td className="px-5 py-4">
                      {request.status ===
                      "pending" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleApprove(
                                request
                              )
                            }
                            disabled={
                              isDemo ||
                              actionId ===
                                request._id
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
                              : actionId ===
                                request._id
                              ? "Processing..."
                              : "Approve"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleReject(
                                request
                              )
                            }
                            disabled={
                              isDemo ||
                              actionId ===
                                request._id
                            }
                            title={
                              isDemo
                                ? "Disabled in Demo Mode"
                                : undefined
                            }
                            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                              isDemo
                                ? "cursor-not-allowed bg-gray-100 text-gray-400"
                                : "bg-red-50 text-red-600 hover:bg-red-100"
                            } disabled:opacity-50`}
                          >
                            {isDemo
                              ? "Read Only"
                              : actionId ===
                                request._id
                              ? "Processing..."
                              : "Reject"}
                          </button>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <p className="text-gray-500">
                            Reviewed
                          </p>

                          {request.adminNote && (
                            <p className="mt-1 max-w-xs text-xs text-gray-400">
                              {
                                request.adminNote
                              }
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}