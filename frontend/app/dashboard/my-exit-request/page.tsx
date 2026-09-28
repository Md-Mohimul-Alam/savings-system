"use client";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  createMyExitRequest,
  getMyExitRequest,
} from "@/services/myExitRequestApi";

import {
  useDemoMode,
} from "@/hooks/useDemoMode";

interface ExitRequest {
  _id: string;

  reason?: string;

  status:
    | "pending"
    | "approved"
    | "rejected"
    | "paid";

  estimatedPayout?: number;
  finalPayout?: number;
  adminNote?: string;
  reviewedAt?: string;
  paidAt?: string;
  createdAt: string;
}

export default function MyExitRequestPage() {
  const isDemo =
    useDemoMode();

  const [
    request,
    setRequest,
  ] =
    useState<
      ExitRequest | null
    >(null);

  const [
    reason,
    setReason,
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
    message,
    setMessage,
  ] =
    useState("");

  // --------------------------------------------------
  // LOAD REQUEST
  // --------------------------------------------------

  const loadRequest =
    async () => {
      try {
        setLoading(
          true
        );

        setError("");

        const data =
          await getMyExitRequest();

        setRequest(
          data.exitRequest ||
            data.request ||
            null
        );
      } catch (
        error: any
      ) {
        if (
          error?.response
            ?.status ===
          404
        ) {
          setRequest(
            null
          );
        } else {
          setError(
            error?.response
              ?.data
              ?.message ||
              "Failed to load exit request"
          );
        }
      } finally {
        setLoading(
          false
        );
      }
    };

  useEffect(() => {
    loadRequest();
  }, []);

  // --------------------------------------------------
  // SUBMIT EXIT REQUEST
  // --------------------------------------------------

  const handleSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setError("");
      setMessage("");

      if (isDemo) {
        setError(
          "Demo Mode is read-only. Submitting an exit request is disabled."
        );

        return;
      }

      if (
        !reason.trim()
      ) {
        setError(
          "Please provide a reason for your exit request."
        );

        return;
      }

      try {
        setSubmitting(
          true
        );

        await createMyExitRequest(
          reason.trim()
        );

        setReason(
          ""
        );

        setMessage(
          "Exit request submitted successfully."
        );

        await loadRequest();
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to submit exit request"
        );
      } finally {
        setSubmitting(
          false
        );
      }
    };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading exit request...
      </p>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="max-w-4xl">

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              My Exit Request
            </h1>

            <p className="mt-2 text-gray-500">
              Request to leave the group and review your
              estimated final payout.
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
            You can review sample exit-request information,
            but submitting a new exit request is disabled.
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
      {message && (
        <div className="mb-5 rounded-lg bg-green-50 p-4 text-green-700">
          {message}
        </div>
      )}

      {/* Existing Request */}
      {request ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6">

          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">
                Request Status
              </p>

              <p className="mt-1 text-xl font-bold capitalize">
                {
                  request.status
                }
              </p>
            </div>

            <StatusBadge
              status={
                request.status
              }
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <InfoCard
              title="Estimated Payout"
              value={`৳${Number(
                request.estimatedPayout ||
                  0
              ).toLocaleString()}`}
            />

            <InfoCard
              title="Final Payout"
              value={
                request.finalPayout !=
                null
                  ? `৳${Number(
                      request.finalPayout
                    ).toLocaleString()}`
                  : "Not finalized"
              }
            />
          </div>

          <div className="mt-6">
            <p className="text-sm text-gray-500">
              Reason
            </p>

            <p className="mt-1 text-gray-900">
              {request.reason ||
                "-"}
            </p>
          </div>

          {request.adminNote && (
            <div className="mt-6 rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">
                Admin Note
              </p>

              <p className="mt-2 text-sm text-gray-600">
                {
                  request.adminNote
                }
              </p>
            </div>
          )}

          <div className="mt-6 text-sm text-gray-500">
            Submitted:{" "}
            {new Date(
              request.createdAt
            ).toLocaleString()}
          </div>

          {request.reviewedAt && (
            <div className="mt-2 text-sm text-gray-500">
              Reviewed:{" "}
              {new Date(
                request.reviewedAt
              ).toLocaleString()}
            </div>
          )}

          {request.paidAt && (
            <div className="mt-2 text-sm text-gray-500">
              Paid:{" "}
              {new Date(
                request.paidAt
              ).toLocaleString()}
            </div>
          )}
        </div>
      ) : (

        /* New Exit Request */
        <form
          onSubmit={
            handleSubmit
          }
          className={`rounded-xl border bg-white p-6 ${
            isDemo
              ? "border-amber-200"
              : "border-gray-200"
          }`}
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Submit Exit Request
              </h2>

              <p className="mt-2 text-sm text-gray-500">
                The system will calculate an estimated payout
                using your current ownership share.
              </p>
            </div>

            {isDemo && (
              <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                Disabled in Demo Mode
              </span>
            )}
          </div>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Reason
            </label>

            <textarea
              value={
                reason
              }
              onChange={(
                event
              ) =>
                setReason(
                  event.target
                    .value
                )
              }
              rows={
                5
              }
              disabled={
                isDemo ||
                submitting
              }
              placeholder="Why do you want to leave the group?"
              className={`w-full rounded-lg border border-gray-300 px-4 py-3 outline-none ${
                isDemo
                  ? "cursor-not-allowed bg-gray-100 text-gray-500"
                  : "bg-white focus:border-black"
              }`}
            />
          </div>

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
            className={`mt-5 rounded-lg px-5 py-3 font-medium text-white transition ${
              isDemo
                ? "cursor-not-allowed bg-gray-400"
                : "bg-black hover:bg-gray-800"
            } disabled:opacity-50`}
          >
            {isDemo
              ? "Submission Disabled"
              : submitting
              ? "Submitting..."
              : "Submit Exit Request"}
          </button>
        </form>
      )}
    </div>
  );
}

// --------------------------------------------------
// INFO CARD
// --------------------------------------------------

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-gray-50 p-4">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-1 text-lg font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}

// --------------------------------------------------
// STATUS BADGE
// --------------------------------------------------

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