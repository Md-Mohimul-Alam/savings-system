"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  approveExitRequest,
  getExitRequests,
  markExitAsPaid,
  rejectExitRequest,
} from "@/services/exitRequestApi";

import {
  useDemoMode,
} from "@/hooks/useDemoMode";

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
  const isDemo =
    useDemoMode();

  const [
    requests,
    setRequests,
  ] =
    useState<
      ExitRequest[]
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
    useState(true);

  const [
    actionId,
    setActionId,
  ] =
    useState<
      string | null
    >(null);

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
          await getExitRequests(
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
            "Failed to load exit requests"
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
      request: ExitRequest
    ) => {
      if (isDemo) {
        setError(
          "Demo Mode is read-only. Approving exit requests is disabled."
        );

        return;
      }

      const adminNote =
        window.prompt(
          `Approve exit request for ${
            request.member
              ?.user
              ?.name ||
            request.member
              ?.memberCode ||
            "this member"
          }?`,
          ""
        ) ?? "";

      try {
        setActionId(
          request._id
        );

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
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to approve exit request"
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
      request: ExitRequest
    ) => {
      if (isDemo) {
        setError(
          "Demo Mode is read-only. Rejecting exit requests is disabled."
        );

        return;
      }

      const adminNote =
        window.prompt(
          `Reason for rejecting ${
            request.member
              ?.user
              ?.name ||
            request.member
              ?.memberCode ||
            "this member"
          }'s exit request:`,
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

        await rejectExitRequest(
          request._id,
          adminNote
        );

        setSuccess(
          "Exit request rejected."
        );

        await loadRequests();
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to reject exit request"
        );
      } finally {
        setActionId(
          null
        );
      }
    };

  // --------------------------------------------------
  // MARK PAID
  // --------------------------------------------------

  const handlePay =
    async (
      request: ExitRequest
    ) => {
      if (isDemo) {
        setError(
          "Demo Mode is read-only. Completing exit payouts is disabled."
        );

        return;
      }

      const amount =
        request.finalPayout ||
        request.estimatedPayout ||
        0;

      const memberName =
        request.member
          ?.user
          ?.name ||
        request.member
          ?.memberCode ||
        "this member";

      const confirmed =
        window.confirm(
          `Mark ৳${Number(
            amount
          ).toLocaleString()} payout for ${memberName} as paid?`
        );

      if (!confirmed) {
        return;
      }

      try {
        setActionId(
          request._id
        );

        setError("");
        setSuccess("");

        await markExitAsPaid(
          request._id
        );

        setSuccess(
          "Exit payout marked as paid."
        );

        await loadRequests();
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to complete exit payout"
        );
      } finally {
        setActionId(
          null
        );
      }
    };

  // --------------------------------------------------
  // SUMMARY
  // --------------------------------------------------

  const totalRequests =
    requests.length;

  const totalEstimatedPayout =
    requests.reduce(
      (
        sum,
        request
      ) =>
        sum +
        Number(
          request.estimatedPayout ||
            0
        ),
      0
    );

  const totalFinalPayout =
    requests.reduce(
      (
        sum,
        request
      ) =>
        sum +
        Number(
          request.finalPayout ||
            0
        ),
      0
    );

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
              Exit Requests
            </h1>

            <p className="mt-2 text-gray-500">
              Review member exit requests and
              final payout calculations.
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
            You can review sample exit requests and payout
            calculations, but approving, rejecting, and
            marking payouts as paid are disabled.
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
            Requests
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            {totalRequests}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Estimated Payout
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            ৳
            {totalEstimatedPayout.toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <p className="text-sm text-gray-500">
            Final Payout
          </p>

          <p className="mt-2 text-2xl font-bold text-gray-900">
            ৳
            {totalFinalPayout.toLocaleString()}
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

          <option value="paid">
            Paid
          </option>
        </select>
      </div>

      {/* Requests */}
      {loading ? (
        <p className="text-gray-500">
          Loading exit requests...
        </p>
      ) : requests.length ===
        0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-500">
          No exit requests found.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <div className="border-b border-gray-200 px-5 py-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Exit Request Records
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

          <table className="min-w-[1200px] w-full text-left">
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
              {requests.map(
                (
                  request
                ) => {
                  const memberName =
                    request.member
                      ?.user
                      ?.name ||
                    "-";

                  const memberCode =
                    request.member
                      ?.memberCode ||
                    "-";

                  return (
                    <tr
                      key={
                        request._id
                      }
                      className="border-b border-gray-100 align-top last:border-0"
                    >
                      <td className="px-5 py-4">
                        <div className="font-medium text-gray-900">
                          {
                            memberName
                          }
                        </div>

                        <div className="text-sm text-gray-500">
                          {
                            memberCode
                          }
                        </div>

                        <div className="text-sm text-gray-500">
                          {request.member
                            ?.user
                            ?.email ||
                            ""}
                        </div>
                      </td>

                      <td className="max-w-xs px-5 py-4">
                        {request.reason ||
                          "-"}
                      </td>

                      <td className="px-5 py-4">
                        ৳
                        {Number(
                          request.member
                            ?.totalContribution ||
                            0
                        ).toLocaleString()}
                      </td>

                      <td className="px-5 py-4 font-medium">
                        ৳
                        {Number(
                          request.estimatedPayout ||
                            0
                        ).toLocaleString()}
                      </td>

                      <td className="px-5 py-4 font-medium">
                        ৳
                        {Number(
                          request.finalPayout ||
                            0
                        ).toLocaleString()}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge
                          status={
                            request.status
                          }
                        />
                      </td>

                      <td className="px-5 py-4">
                        {request.status ===
                          "pending" && (
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
                        )}

                        {request.status ===
                          "approved" && (
                          <button
                            type="button"
                            onClick={() =>
                              handlePay(
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
                                : "bg-green-600 hover:bg-green-700"
                            } disabled:opacity-50`}
                          >
                            {isDemo
                              ? "Read Only"
                              : actionId ===
                                request._id
                              ? "Processing..."
                              : "Mark Paid"}
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
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: string;
}) {
  const styles: Record<
    string,
    string
  > = {
    pending:
      "bg-yellow-50 text-yellow-700",

    approved:
      "bg-blue-50 text-blue-700",

    rejected:
      "bg-red-50 text-red-700",

    paid:
      "bg-green-50 text-green-700",
  };

  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-medium capitalize ${
        styles[
          status
        ] ||
        "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}