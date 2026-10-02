"use client";

import Link from "next/link";

import {
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";

import {
  useRouter,
} from "next/navigation";

import Sidebar from "@/components/Sidebar";

import {
  getMyNotifications,
} from "@/services/notificationApi";

import {
  NOTIFICATION_UPDATED_EVENT,
} from "@/services/notificationEvents";

interface User {
  id: string;
  name: string;
  email: string;

  role:
    | "admin"
    | "member";

  status: string;

  isDemo?: boolean;

  dataScope?:
    | "live"
    | "demo";
}

export default function DashboardShell({
  children,
}: {
  children: ReactNode;
}) {
  const router =
    useRouter();

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    profileOpen,
    setProfileOpen,
  ] = useState(false);

  const [
    unreadCount,
    setUnreadCount,
  ] = useState(0);

  const [
    user,
    setUser,
  ] =
    useState<User | null>(
      null
    );

  const dropdownRef =
    useRef<HTMLDivElement | null>(
      null
    );

  // --------------------------------------------------
  // LOAD USER
  // --------------------------------------------------

  useEffect(() => {
    const savedUser =
      localStorage.getItem(
        "user"
      );

    if (!savedUser) {
      return;
    }

    try {
      const parsedUser: User =
        JSON.parse(
          savedUser
        );

      setUser(
        parsedUser
      );
    } catch (
      error
    ) {
      console.error(
        "Failed to parse saved user:",
        error
      );

      setUser(
        null
      );
    }
  }, []);

  // --------------------------------------------------
  // NOTIFICATIONS
  // --------------------------------------------------

  useEffect(() => {
    const loadNotifications =
      async () => {
        try {
          const data =
            await getMyNotifications();

          setUnreadCount(
            data.unreadCount ||
              0
          );
        } catch (
          error
        ) {
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

  // --------------------------------------------------
  // CLOSE PROFILE DROPDOWN
  // --------------------------------------------------

  useEffect(() => {
    const handleClickOutside =
      (
        event: MouseEvent
      ) => {
        if (
          dropdownRef.current &&
          !dropdownRef.current.contains(
            event.target as Node
          )
        ) {
          setProfileOpen(
            false
          );
        }
      };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setProfileOpen(false);
        setSidebarOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  const handleLogout =
    () => {
      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      localStorage.removeItem(
        "isDemo"
      );

      router.push(
        "/login"
      );
    };

  // --------------------------------------------------
  // USER STATE
  // --------------------------------------------------

  const isDemo =
    user?.isDemo === true || user?.dataScope === "demo";

  const initials =
    user?.name
      ?.split(" ")
      .map(
        (part) =>
          part[0]
      )
      .join("")
      .slice(0, 2)
      .toUpperCase() ||
    "U";

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        open={
          sidebarOpen
        }
        onClose={() =>
          setSidebarOpen(
            false
          )
        }
      />

      <div className="min-h-screen lg:ml-64">

        {/* Header */}
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
                setSidebarOpen(
                  true
                )
              }
              className="mr-3 rounded-lg border border-gray-200 px-3 py-2 text-xl text-gray-700 transition hover:bg-gray-50 lg:hidden"
              aria-label="Open sidebar"
              aria-expanded={sidebarOpen}
            >
              ☰
            </button>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-semibold text-gray-900">
                  FAME&apos;S Organization
                </p>

                {isDemo && (
                  <span className="hidden rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 sm:inline-flex">
                    Demo
                  </span>
                )}
              </div>

              <p className="hidden text-xs text-gray-500 sm:block">
                Savings &amp; Investment Management
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">

            {/* Notification */}
            <Link
              href="/dashboard/notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-lg transition hover:bg-gray-50"
              aria-label="Notifications"
            >
              🔔

              {unreadCount >
                0 && (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount >
                  99
                    ? "99+"
                    : unreadCount}
                </span>
              )}
            </Link>

            {/* User Dropdown */}
            <div
              ref={
                dropdownRef
              }
              className="relative"
            >
              <button
                type="button"
                aria-label="Account options"
                aria-expanded={profileOpen}
                onClick={() =>
                  setProfileOpen(
                    (
                      current
                    ) =>
                      !current
                  )
                }
                className="flex items-center gap-2 rounded-full border border-gray-200 bg-white p-1 sm:pr-3"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-semibold text-white">
                  {
                    initials
                  }
                </div>

                <div className="hidden text-left md:block">
                  <p className="max-w-32 truncate text-sm font-medium text-gray-900">
                    {user?.name ||
                      "User"}
                  </p>

                  <p className="text-xs capitalize text-gray-500">
                    {isDemo
                      ? "Demo Admin"
                      : user?.role ||
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

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-medium capitalize text-gray-700">
                        {user?.role ||
                          "member"}
                      </span>

                      <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium capitalize text-green-700">
                        {user?.status ||
                          "active"}
                      </span>

                      {isDemo && (
                        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800">
                          Demo
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-2">
                    <Link href="/dashboard/loans" onClick={() => setProfileOpen(false)}
                      className="block rounded-lg px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Group Loans
                    </Link>
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

        {/* Demo Mode Banner */}
        {isDemo && (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6 lg:px-8">
            <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Demo Mode — Read Only
                </p>

                <p className="mt-0.5 text-xs text-amber-700">
                  You are viewing sample organization data.
                  Add, edit, delete, approve, reject, payment,
                  and other modification actions are disabled.
                </p>
              </div>

              <span className="mt-1 w-fit rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 sm:mt-0">
                Sample Data
              </span>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="min-w-0 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
