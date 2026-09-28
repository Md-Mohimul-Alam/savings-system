"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  getMyNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "@/services/notificationApi";

import {
  useDemoMode,
} from "@/hooks/useDemoMode";

interface Notification {
  _id: string;
  title: string;
  message: string;

  type:
    | "INFO"
    | "CONTRIBUTION"
    | "INVESTMENT"
    | "JOIN_REQUEST"
    | "EXIT_REQUEST"
    | "PROFIT"
    | "SYSTEM";

  isRead: boolean;
  link?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const router =
    useRouter();

  const isDemo =
    useDemoMode();

  const [
    notifications,
    setNotifications,
  ] =
    useState<
      Notification[]
    >([]);

  const [
    unreadCount,
    setUnreadCount,
  ] =
    useState(0);

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
    markingAll,
    setMarkingAll,
  ] =
    useState(false);

  // --------------------------------------------------
  // LOAD NOTIFICATIONS
  // --------------------------------------------------

  const loadNotifications =
    async () => {
      try {
        setError("");

        const data =
          await getMyNotifications();

        setNotifications(
          data.notifications ||
            []
        );

        setUnreadCount(
          data.unreadCount ||
            0
        );
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to load notifications"
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  useEffect(() => {
    loadNotifications();
  }, []);

  // --------------------------------------------------
  // NOTIFICATION CLICK
  // --------------------------------------------------

  const handleNotificationClick =
    async (
      notification: Notification
    ) => {
      try {
        // Demo mode:
        // never modify notification state in backend.
        if (
          !isDemo &&
          !notification.isRead
        ) {
          await markNotificationAsRead(
            notification._id
          );

          setNotifications(
            (
              current
            ) =>
              current.map(
                (
                  item
                ) =>
                  item._id ===
                  notification._id
                    ? {
                        ...item,
                        isRead:
                          true,
                      }
                    : item
              )
          );

          setUnreadCount(
            (
              count
            ) =>
              Math.max(
                count -
                  1,
                0
              )
          );
        }

        // Demo users are still allowed
        // to navigate to the notification target.
        if (
          notification.link
        ) {
          router.push(
            notification.link
          );
        }
      } catch (
        error
      ) {
        console.error(
          "Failed to update notification:",
          error
        );
      }
    };

  // --------------------------------------------------
  // MARK ALL AS READ
  // --------------------------------------------------

  const handleMarkAllAsRead =
    async () => {
      if (isDemo) {
        setError(
          "Demo Mode is read-only. Updating notification status is disabled."
        );

        return;
      }

      try {
        setMarkingAll(
          true
        );

        setError("");

        await markAllNotificationsAsRead();

        setNotifications(
          (
            current
          ) =>
            current.map(
              (
                item
              ) => ({
                ...item,
                isRead:
                  true,
              })
            )
        );

        setUnreadCount(
          0
        );
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to mark notifications as read"
        );
      } finally {
        setMarkingAll(
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
        Loading notifications...
      </p>
    );
  }

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">
              Notifications
            </h1>

            {isDemo && (
              <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                Demo Mode · Read Only
              </span>
            )}
          </div>

          <p className="mt-2 text-gray-500">
            You have{" "}
            <strong>
              {
                unreadCount
              }
            </strong>{" "}
            unread notification
            {unreadCount ===
            1
              ? ""
              : "s"}
            .
          </p>
        </div>

        {unreadCount >
          0 && (
          <button
            type="button"
            onClick={
              handleMarkAllAsRead
            }
            disabled={
              markingAll ||
              isDemo
            }
            title={
              isDemo
                ? "Disabled in Demo Mode"
                : undefined
            }
            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${
              isDemo
                ? "cursor-not-allowed border-gray-200 bg-gray-100 text-gray-400"
                : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            } disabled:opacity-50`}
          >
            {isDemo
              ? "Mark All Disabled"
              : markingAll
              ? "Updating..."
              : "Mark all as read"}
          </button>
        )}
      </div>

      {/* Demo Notice */}
      {isDemo && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Demo Mode
          </p>

          <p className="mt-1 text-sm text-amber-700">
            You can view sample notifications and open linked pages,
            but notification read status cannot be changed.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-5 rounded-lg bg-red-50 p-4 text-red-600">
          {
            error
          }
        </div>
      )}

      {/* Empty */}
      {notifications.length ===
      0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <h2 className="text-lg font-semibold text-gray-900">
            No notifications yet
          </h2>

          <p className="mt-2 text-sm text-gray-500">
            Important updates will appear here.
          </p>
        </div>
      ) : (
        /* Notification List */
        <div className="space-y-3">
          {notifications.map(
            (
              notification
            ) => (
              <button
                key={
                  notification._id
                }
                type="button"
                onClick={() =>
                  handleNotificationClick(
                    notification
                  )
                }
                className={`w-full rounded-xl border p-5 text-left transition hover:shadow-sm ${
                  notification.isRead
                    ? "border-gray-200 bg-white"
                    : "border-gray-300 bg-gray-50"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2
                        className={`text-base ${
                          notification.isRead
                            ? "font-medium text-gray-800"
                            : "font-bold text-gray-900"
                        }`}
                      >
                        {
                          notification.title
                        }
                      </h2>

                      <TypeBadge
                        type={
                          notification.type
                        }
                      />

                      {!notification.isRead && (
                        <span className="rounded-full bg-black px-2 py-0.5 text-xs font-medium text-white">
                          New
                        </span>
                      )}

                      {isDemo && (
                        <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-700">
                          Sample
                        </span>
                      )}
                    </div>

                    <p className="mt-2 text-sm leading-6 text-gray-600">
                      {
                        notification.message
                      }
                    </p>
                  </div>

                  <span className="shrink-0 text-xs text-gray-400">
                    {formatDate(
                      notification.createdAt
                    )}
                  </span>
                </div>

                {notification.link && (
                  <p className="mt-3 text-xs font-medium text-gray-500">
                    Click to view details →
                  </p>
                )}

                {isDemo &&
                  !notification.isRead && (
                    <p className="mt-2 text-xs text-amber-600">
                      Read status will not change in Demo Mode.
                    </p>
                  )}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
}

// --------------------------------------------------
// TYPE BADGE
// --------------------------------------------------

function TypeBadge({
  type,
}: {
  type: Notification["type"];
}) {
  const styles: Record<
    Notification["type"],
    string
  > = {
    INFO:
      "bg-gray-100 text-gray-700",

    CONTRIBUTION:
      "bg-green-50 text-green-700",

    INVESTMENT:
      "bg-blue-50 text-blue-700",

    JOIN_REQUEST:
      "bg-purple-50 text-purple-700",

    EXIT_REQUEST:
      "bg-orange-50 text-orange-700",

    PROFIT:
      "bg-emerald-50 text-emerald-700",

    SYSTEM:
      "bg-red-50 text-red-700",
  };

  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
        styles[
          type
        ]
      }`}
    >
      {type
        .replaceAll(
          "_",
          " "
        )
        .toLowerCase()
        .replace(
          /\b\w/g,
          (
            char
          ) =>
            char.toUpperCase()
        )}
    </span>
  );
}

// --------------------------------------------------
// FORMAT DATE
// --------------------------------------------------

function formatDate(
  dateString: string
) {
  const date =
    new Date(
      dateString
    );

  return date.toLocaleString(
    "en-BD",
    {
      day:
        "2-digit",

      month:
        "short",

      year:
        "numeric",

      hour:
        "2-digit",

      minute:
        "2-digit",
    }
  );
}