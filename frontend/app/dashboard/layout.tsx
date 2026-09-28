import {
  ReactNode,
} from "react";

import ProtectedRoute from "@/components/ProtectedRoute";
import DashboardAccessGuard from "@/components/DashboardAccessGuard";
import DashboardShell from "@/components/DashboardShell";

export default function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <ProtectedRoute>
      <DashboardAccessGuard>
        <DashboardShell>
          {children}
        </DashboardShell>
      </DashboardAccessGuard>
    </ProtectedRoute>
  );
}