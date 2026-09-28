"use client";

import { useEffect, useState } from "react";
import { getAuditLogs } from "@/services/auditApi";

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
  const [logs, setLogs] =
    useState<AuditLog[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setLoading(true);

        const data = await getAuditLogs();

        setLogs(data.logs || []);
      } catch (error: any) {
        setError(
          error?.response?.data?.message ||
            "Failed to load audit logs"
        );
      } finally {
        setLoading(false);
      }
    };

    loadLogs();
  }, []);

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading audit logs...
      </p>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Audit Logs
        </h1>

        <p className="mt-2 text-gray-500">
          Review important activity performed in the system.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left">
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
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-5 py-8 text-center text-gray-500"
                >
                  No audit logs found.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log._id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-5 py-4">
                    {new Date(
                      log.createdAt
                    ).toLocaleString()}
                  </td>

                  <td className="px-5 py-4">
                    <div className="font-medium">
                      {log.user?.name || "-"}
                    </div>

                    <div className="text-sm text-gray-500">
                      {log.user?.email || ""}
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {log.method}
                  </td>

                  <td className="px-5 py-4">
                    {log.endpoint}
                  </td>

                  <td className="px-5 py-4">
                    {log.action}
                  </td>

                  <td className="px-5 py-4">
                    {log.statusCode || "-"}
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