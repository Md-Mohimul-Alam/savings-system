"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: string;
}

const adminOnlyRoutes = [
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

const memberOnlyRoutes = [
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
  const pathname = usePathname();
  const router = useRouter();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const savedUser =
      localStorage.getItem("user");

    if (!savedUser) {
      router.replace("/login");
      return;
    }

    try {
      const user: User =
        JSON.parse(savedUser);

      const isAdminOnlyRoute =
        adminOnlyRoutes.some(
          (route) =>
            pathname === route ||
            pathname.startsWith(
              `${route}/`
            )
        );

      const isMemberOnlyRoute =
        memberOnlyRoutes.some(
          (route) =>
            pathname === route ||
            pathname.startsWith(
              `${route}/`
            )
        );

      if (
        user.role !== "admin" &&
        isAdminOnlyRoute
      ) {
        router.replace("/dashboard");
        return;
      }

      if (
        user.role === "admin" &&
        isMemberOnlyRoute
      ) {
        router.replace("/dashboard");
        return;
      }

      setChecking(false);
    } catch (error) {
      console.error(
        "Dashboard access check failed:",
        error
      );

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      router.replace("/login");
    }
  }, [pathname, router]);

  if (checking) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <p className="text-sm text-gray-500">
          Checking access...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
