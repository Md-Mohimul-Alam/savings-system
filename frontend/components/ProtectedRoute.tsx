"use client";

import {
  ReactNode,
  useEffect,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  getCurrentUser,
} from "@/services/authApi";

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({
  children,
}: ProtectedRouteProps) {
  const router =
    useRouter();

  const [
    loading,
    setLoading,
  ] = useState(true);

  useEffect(() => {
    const checkAuth =
      async () => {
        const token =
          localStorage.getItem(
            "token"
          );

        if (!token) {
          localStorage.removeItem(
            "user"
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
          const data =
            await getCurrentUser();

          localStorage.setItem(
            "user",
            JSON.stringify(
              data.user
            )
          );

          localStorage.setItem(
            "isDemo",
            data.user?.isDemo
              ? "true"
              : "false"
          );

          setLoading(
            false
          );
        } catch (
          error
        ) {
          console.error(
            "Authentication check failed:",
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
      };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-emerald-600" />

          <p className="mt-3 text-sm text-gray-500">
            Loading...
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