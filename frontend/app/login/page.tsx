"use client";

import Image from "next/image";
import Link from "next/link";

import {
  FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  loginUser,
} from "@/services/authApi";

export default function LoginPage() {
  const router =
    useRouter();

  const [email, setEmail] =
    useState("");

  const [phone, setPhone] =
    useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      setError("");
      setLoading(true);

      try {
        const data =
          await loginUser(
            email,
            phone,
            password
          );

        localStorage.setItem(
          "token",
          data.token
        );

        localStorage.setItem(
          "user",
          JSON.stringify(
            data.user
          )
        );

        router.push(
          "/dashboard"
        );
      } catch (error: any) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Login failed"
        );
      } finally {
        setLoading(false);
      }
    };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-white to-emerald-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-xl sm:p-8">
        {/* Logo */}
        <div className="mb-7 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <Image
              src="/logo.png"
              alt="FAME'S Organization Logo"
              width={80}
              height={80}
              priority
              className="h-full w-full object-contain"
            />
          </div>

          <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
            FAME&apos;S Organization
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Savings & Investment Management
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Sign in to continue
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-5"
        >
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>

            <input
              type="email"
              value={email}
              onChange={(
                event
              ) =>
                setEmail(
                  event.target
                    .value
                )
              }
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Phone Number
            </label>

            <input
              type="text"
              value={phone}
              onChange={(
                event
              ) =>
                setPhone(
                  event.target
                    .value
                )
              }
              required
              autoComplete="tel"
              placeholder="01XXXXXXXXX"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              value={
                password
              }
              onChange={(
                event
              ) =>
                setPassword(
                  event.target
                    .value
                )
              }
              required
              autoComplete="current-password"
              placeholder="Enter password"
              className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          <button
            type="submit"
            disabled={
              loading
            }
            className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading
              ? "Logging in..."
              : "Login"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Want to join the
          organization?{" "}
          <Link
            href="/register"
            className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
          >
            Create an account
          </Link>
        </p>
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            FAME&apos;S Organization Savings Management System
          </p>

          <p className="mt-1 text-xs text-gray-400">
            Designed &amp; Developed by{" "}
            <a
              href="https://mohim-portfolio.netlify.app/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-gray-600 hover:text-gray-900 hover:underline"
            >
              Md Mohimul Alam
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}