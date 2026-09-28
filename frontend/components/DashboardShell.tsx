"use client";

import Link from "next/link";
import {
  ReactNode,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

import Sidebar from "@/components/Sidebar";
import { getMyNotifications } from "@/services/notificationApi";
import {
  NOTIFICATION_UPDATED_EVENT,
} from "@/services/notificationEvents";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: string;
}

export default function DashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] =
    useState(false);

  const [profileOpen, setProfileOpen] =
    useState(false);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [user, setUser] =
    useState<User | null>(null);

  const dropdownRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedUser =
      localStorage.getItem("user");

    if (savedUser) {
      try {
        setUser(
          JSON.parse(savedUser)
        );
      } catch {
        setUser(null);
      }
    }
  }, []);

  useEffect(() => {
    const loadNotifications =
      async () => {
        try {
          const data =
            await getMyNotifications();

          setUnreadCount(
            data.unreadCount || 0
          );
        } catch (error) {
          console.error(
            "Failed to load notification count:",
            error
          );
        }
      };

    loadNotifications();

    window.addEventListener(
      NOTIFICATION_UPDATED_EVENT,
      loadNotifications
    );

    return () => {
      window.removeEventListener(
        NOTIFICATION_UPDATED_EVENT,
        loadNotifications
      );
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (
      event: MouseEvent
    ) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(
          event.target as Node
        )
      ) {
        setProfileOpen(false);
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    router.push("/login");
  };

  const initials =
    user?.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        open={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
      />

      <div className="min-h-screen lg:ml-64">
        <header
          className="
            sticky top-0 z-30
            flex h-16 items-center justify-between
            border-b border-gray-200
            bg-white/95 px-4 backdrop-blur
            sm:px-6 lg:px-8
          "
        >
          <div className="flex min-w-0 items-center">
            <button
              type="button"
              onClick={() =>
                setSidebarOpen(true)
              }
              className="mr-3 rounded-lg border border-gray-200 px-3 py-2 text-xl text-gray-700 transition hover:bg-gray-50 lg:hidden"
              aria-label="Open sidebar"
            >
              ☰
            </button>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">
                Group Savings
              </p>

              <p className="hidden text-xs text-gray-500 sm:block">
                Savings & Investment Management
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link
              href="/dashboard/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-lg transition hover:bg-gray-50"
              aria-label="Notifications"
            >
              🔔

              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99
                    ? "99+"
                    : unreadCount}
                </span>
              )}
            </Link>

            <div
              ref={dropdownRef}
              className="relative"
            >
              <button
                type="button"
                onClick={() =>
                  setProfileOpen(
                    (current) =>
                      !current
                  )
                }
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1 sm:pr-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                  {initials}
                </div>

                <div className="hidden text-left md:block">
                  <p className="max-w-32 truncate text-sm font-medium text-gray-900">
                    {user?.name ||
                      "User"}
                  </p>

                  <p className="text-xs capitalize text-gray-500">
                    {user?.role ||
                      "member"}
                  </p>
                </div>

                <span className="hidden text-xs text-gray-500 md:block">
                  ▼
                </span>
              </button>

              {profileOpen && (
                <div className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
                  <div className="border-b border-gray-100 p-4">
                    <p className="font-medium text-gray-900">
                      {user?.name ||
                        "User"}
                    </p>

                    <p className="mt-1 truncate text-sm text-gray-500">
                      {user?.email ||
                        ""}
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium capitalize text-gray-700">
                        {user?.role ||
                          "member"}
                      </span>

                      <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium capitalize text-green-700">
                        {user?.status ||
                          "active"}
                      </span>
                    </div>
                  </div>

                  <div className="p-2">
                    {user?.role ===
                      "member" && (
                      <Link
                        href="/dashboard/profile"
                        onClick={() =>
                          setProfileOpen(
                            false
                          )
                        }
                        className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        My Profile
                      </Link>
                    )}

                    <Link
                      href="/dashboard/notifications"
                      onClick={() =>
                        setProfileOpen(
                          false
                        )
                      }
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <span>
                        Notifications
                      </span>

                      {unreadCount >
                        0 && (
                        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-medium text-white">
                          {unreadCount >
                          99
                            ? "99+"
                            : unreadCount}
                        </span>
                      )}
                    </Link>

                    <button
                      type="button"
                      onClick={
                        handleLogout
                      }
                      className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
