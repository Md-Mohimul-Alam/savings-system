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
  const [request, setRequest] =
    useState<ExitRequest | null>(null);

  const [reason, setReason] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [message, setMessage] =
    useState("");

  const loadRequest = async () => {
    try {
      setLoading(true);
      setError("");

      const data =
        await getMyExitRequest();

      setRequest(
        data.exitRequest ||
          data.request ||
          null
      );
    } catch (error: any) {
      if (
        error?.response?.status === 404
      ) {
        setRequest(null);
      } else {
        setError(
          error?.response?.data?.message ||
            "Failed to load exit request"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequest();
  }, []);

  const handleSubmit = async (
    event: FormEvent
  ) => {
    event.preventDefault();

    if (!reason.trim()) {
      setError(
        "Please provide a reason for your exit request."
      );
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      await createMyExitRequest(
        reason.trim()
      );

      setReason("");

      setMessage(
        "Exit request submitted successfully."
      );

      await loadRequest();
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to submit exit request"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading exit request...
      </p>
    );
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          My Exit Request
        </h1>

        <p className="mt-2 text-gray-500">
          Request to leave the group and review your
          estimated final payout.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-5 rounded-lg bg-green-50 p-4 text-green-700">
          {message}
        </div>
      )}

      {request ? (
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-gray-500">
                Request Status
              </p>

              <p className="mt-1 text-xl font-bold capitalize">
                {request.status}
              </p>
            </div>

            <StatusBadge
              status={request.status}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <InfoCard
              title="Estimated Payout"
              value={`৳${Number(
                request.estimatedPayout || 0
              ).toLocaleString()}`}
            />

            <InfoCard
              title="Final Payout"
              value={
                request.finalPayout != null
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
              {request.reason || "-"}
            </p>
          </div>

          {request.adminNote && (
            <div className="mt-6 rounded-lg bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">
                Admin Note
              </p>

              <p className="mt-2 text-sm text-gray-600">
                {request.adminNote}
              </p>
            </div>
          )}

          <div className="mt-6 text-sm text-gray-500">
            Submitted:{" "}
            {new Date(
              request.createdAt
            ).toLocaleString()}
          </div>

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
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900">
            Submit Exit Request
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            The system will calculate an estimated payout
            using your current ownership share.
          </p>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Reason
            </label>

            <textarea
              value={reason}
              onChange={(event) =>
                setReason(
                  event.target.value
                )
              }
              rows={5}
              placeholder="Why do you want to leave the group?"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="mt-5 rounded-lg bg-black px-5 py-3 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "Submitting..."
              : "Submit Exit Request"}
          </button>
        </form>
      )}
    </div>
  );
}

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
        styles[status] ||
        "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  );
}