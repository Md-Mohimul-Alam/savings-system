"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { clearAuthSession, getStoredUser } from "@/services/demoMode";

const adminOnlyRoutes = [
  "/dashboard/members", "/dashboard/contributions", "/dashboard/transactions",
  "/dashboard/expenses", "/dashboard/ownership", "/dashboard/profits",
  "/dashboard/join-requests", "/dashboard/exit-requests", "/dashboard/reports",
  "/dashboard/audit-logs",
];
const memberOnlyRoutes = [
  "/dashboard/profile", "/dashboard/my-contributions",
  "/dashboard/my-ownership", "/dashboard/my-exit-request",
];
const matches = (pathname: string, route: string) =>
  pathname === route || pathname.startsWith(`${route}/`);

// /dashboard/loans is deliberately shared by admins and members.
// This is a UI guard. Backend authorization remains authoritative.
export default function DashboardAccessGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [approvedPath, setApprovedPath] = useState<string | null>(null);

  useEffect(() => {
    setApprovedPath(null);
    const user = getStoredUser();
    if (!localStorage.getItem("token") || !user ||
        !["admin", "member"].includes(user.role || "") || user.status !== "active") {
      clearAuthSession();
      router.replace("/login");
      return;
    }
    const forbidden =
      (user.role !== "admin" && adminOnlyRoutes.some((route) => matches(pathname, route))) ||
      (user.role !== "member" && memberOnlyRoutes.some((route) => matches(pathname, route)));
    if (forbidden) {
      router.replace("/dashboard");
      return;
    }
    setApprovedPath(pathname);
  }, [pathname, router]);

  // A previous successful check cannot authorize a newly navigated path.
  if (approvedPath !== pathname) {
    return <div role="status" className="flex min-h-[50vh] items-center justify-center text-gray-500">
      Checking access…
    </div>;
  }
  return <>{children}</>;
}

