"use client";

import {
  ReactNode,
  useEffect,
  useState,
} from "react";

import {
  usePathname,
  useRouter,
} from "next/navigation";

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

// --------------------------------------------------
// ADMIN ONLY ROUTES
// --------------------------------------------------

const adminOnlyRoutes =
  [
    "/dashboard/members",
    "/dashboard/contributions",
    "/dashboard/transactions",
    "/dashboard/expenses",
    "/dashboard/ownership",
    "/dashboard/profits",
    "/dashboard/join-requests",
    "/dashboard/exit-requests",
    "/dashboard/reports",
    "/dashboard/audit-logs",
  ];

// --------------------------------------------------
// MEMBER ONLY ROUTES
// --------------------------------------------------

const memberOnlyRoutes =
  [
    "/dashboard/profile",
    "/dashboard/my-contributions",
    "/dashboard/my-ownership",
    "/dashboard/my-exit-request",
  ];

export default function DashboardAccessGuard({
  children,
}: {
  children: ReactNode;
}) {
  const pathname =
    usePathname();

  const router =
    useRouter();

  const [
    checking,
    setChecking,
  ] =
    useState(true);

  useEffect(() => {
    const savedUser =
      localStorage.getItem(
        "user"
      );

    if (!savedUser) {
      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "isDemo"
      );

      router.replace(
        "/login"
      );

      return;
    }

    try {
      const user: User =
        JSON.parse(
          savedUser
        );

      const isAdminOnlyRoute =
        adminOnlyRoutes.some(
          (
            route
          ) =>
            pathname ===
              route ||
            pathname.startsWith(
              `${route}/`
            )
        );

      const isMemberOnlyRoute =
        memberOnlyRoutes.some(
          (
            route
          ) =>
            pathname ===
              route ||
            pathname.startsWith(
              `${route}/`
            )
        );

      // Non-admin cannot access admin pages
      if (
        user.role !==
          "admin" &&
        isAdminOnlyRoute
      ) {
        router.replace(
          "/dashboard"
        );

        return;
      }

      // Admin / Demo Admin cannot access member-only pages
      if (
        user.role ===
          "admin" &&
        isMemberOnlyRoute
      ) {
        router.replace(
          "/dashboard"
        );

        return;
      }

      setChecking(
        false
      );
    } catch (
      error
    ) {
      console.error(
        "Dashboard access check failed:",
        error
      );

      localStorage.removeItem(
        "token"
      );

      localStorage.removeItem(
        "user"
      );

      localStorage.removeItem(
        "isDemo"
      );

      router.replace(
        "/login"
      );
    }
  }, [
    pathname,
    router,
  ]);

  if (checking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-7 w-7 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-600" />

          <p className="mt-3 text-sm text-gray-500">
            Checking access...
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      {children}
    </>
  );
}