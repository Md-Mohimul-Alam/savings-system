"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  getAuditLogs,
} from "@/services/auditApi";

import {
  useDemoMode,
} from "@/hooks/useDemoMode";

interface AuditLog {
  _id: string;

  user?: {
    name?: string;
    email?: string;
    role?: string;
  };

  action: string;
  method: string;
  endpoint: string;
  ipAddress?: string;
  statusCode?: number;
  createdAt: string;
}

export default function AuditLogsPage() {
  const isDemo =
    useDemoMode();

  const [
    logs,
    setLogs,
  ] =
    useState<
      AuditLog[]
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

  // --------------------------------------------------
  // LOAD AUDIT LOGS
  // --------------------------------------------------

  useEffect(() => {
    const loadLogs =
      async () => {
        try {
          setLoading(
            true
          );

          setError("");

          const data =
            await getAuditLogs();

          setLogs(
            data.logs ||
              []
          );
        } catch (
          error: any
        ) {
          setError(
            error?.response
              ?.data
              ?.message ||
              "Failed to load audit logs"
          );
        } finally {
          setLoading(
            false
          );
        }
      };

    loadLogs();
  }, []);

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading audit logs...
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
              Audit Logs
            </h1>

            <p className="mt-2 text-gray-500">
              Review important activity performed in the system.
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
            Demo Audit Logs
          </p>

          <p className="mt-1 text-sm text-amber-700">
            You are viewing sample audit activity.
            These records are read-only and isolated from live system logs.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold text-gray-900">
                System Activity
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                {
                  logs.length
                }{" "}
                log
                {logs.length ===
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
                Date
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                User
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Method
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Endpoint
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Action
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {logs.length ===
            0 ? (
              <tr>
                <td
                  colSpan={
                    6
                  }
                  className="px-5 py-8 text-center text-gray-500"
                >
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map(
                (
                  log
                ) => (
                  <tr
                    key={
                      log._id
                    }
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-5 py-4 text-sm text-gray-700">
                      {new Date(
                        log.createdAt
                      ).toLocaleString(
                        "en-BD"
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <div className="font-medium text-gray-900">
                        {log.user
                          ?.name ||
                          "-"}
                      </div>

                      <div className="text-sm text-gray-500">
                        {log.user
                          ?.email ||
                          ""}
                      </div>

                      {log.user
                        ?.role && (
                        <div className="mt-1 text-xs capitalize text-gray-400">
                          {
                            log.user
                              .role
                          }
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <MethodBadge
                        method={
                          log.method
                        }
                      />
                    </td>

                    <td className="max-w-sm break-all px-5 py-4 font-mono text-xs text-gray-600">
                      {
                        log.endpoint
                      }
                    </td>

                    <td className="px-5 py-4 text-gray-700">
                      {
                        log.action
                      }
                    </td>

                    <td className="px-5 py-4">
                      <StatusCodeBadge
                        statusCode={
                          log.statusCode
                        }
                      />
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

// --------------------------------------------------
// METHOD BADGE
// --------------------------------------------------

function MethodBadge({
  method,
}: {
  method: string;
}) {
  const normalized =
    method?.toUpperCase() ||
    "-";

  const className =
    normalized ===
    "GET"
      ? "bg-blue-50 text-blue-700"
      : normalized ===
          "POST"
      ? "bg-green-50 text-green-700"
      : normalized ===
          "PUT" ||
        normalized ===
          "PATCH"
      ? "bg-amber-50 text-amber-700"
      : normalized ===
          "DELETE"
      ? "bg-red-50 text-red-700"
      : "bg-gray-100 text-gray-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {normalized}
    </span>
  );
}

// --------------------------------------------------
// STATUS BADGE
// --------------------------------------------------

function StatusCodeBadge({
  statusCode,
}: {
  statusCode?: number;
}) {
  if (
    statusCode ==
    null
  ) {
    return (
      <span className="text-sm text-gray-500">
        -
      </span>
    );
  }

  const className =
    statusCode >=
      200 &&
    statusCode <
      300
      ? "bg-green-50 text-green-700"
      : statusCode >=
          400 &&
        statusCode <
          500
      ? "bg-amber-50 text-amber-700"
      : statusCode >=
          500
      ? "bg-red-50 text-red-700"
      : "bg-gray-100 text-gray-700";

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}
    >
      {
        statusCode
      }
    </span>
  );
}