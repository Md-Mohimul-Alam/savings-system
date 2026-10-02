"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/services/authApi";
import { clearAuthSession } from "@/services/demoMode";

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState("loading");
    const check = async () => {
      if (!localStorage.getItem("token")) {
        clearAuthSession();
        router.replace("/login");
        return;
      }
      try {
        const data = await getCurrentUser();
        if (cancelled) return;
        const user = data?.user;
        if (!user || !["admin", "member"].includes(user.role) || user.status !== "active") {
          clearAuthSession();
          router.replace("/login");
          return;
        }
        localStorage.setItem("user", JSON.stringify(user));
        localStorage.setItem("isDemo",
          user.isDemo === true || user.dataScope === "demo" ? "true" : "false");
        setState("ready");
      } catch (error: unknown) {
        if (cancelled) return;
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status === 401 || status === 403) {
          clearAuthSession();
          router.replace("/login");
        } else {
          // A network outage should not erase a valid login.
          setState("error");
        }
      }
    };
    void check();
    return () => { cancelled = true; };
  }, [router, attempt]);

  if (state === "error") {
    return <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <p role="alert">Could not verify your session. Check your connection and try again.</p>
      <button type="button" className="rounded-lg bg-black px-5 py-3 text-white"
        onClick={() => setAttempt((value) => value + 1)}>Retry</button>
    </div>;
  }
  if (state !== "ready") {
    return <div role="status" className="flex min-h-screen items-center justify-center text-gray-500">
      Verifying your session…
    </div>;
  }
  return <>{children}</>;
}

