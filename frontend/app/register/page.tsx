"use client";

import Image from "next/image";
import Link from "next/link";

import {
  FormEvent,
  useState,
} from "react";

import {
  registerUser,
} from "@/services/authApi";

export default function RegisterPage() {
  const [
    form,
    setForm,
  ] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    nidNumber: "",
    passportNumber: "",
    reason: "",
    password: "",
    confirmPassword: "",
  });

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [
    success,
    setSuccess,
  ] = useState("");

  const handleChange = (
    event:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setForm({
      ...form,
      [event.target.name]:
        event.target.value,
    });
  };

  const handleSubmit =
    async (
      event: FormEvent
    ) => {
      event.preventDefault();

      setError("");
      setSuccess("");

      if (
        form.password !==
        form.confirmPassword
      ) {
        setError(
          "Passwords do not match"
        );

        return;
      }

      if (
        form.password
          .length < 6
      ) {
        setError(
          "Password must be at least 6 characters"
        );

        return;
      }

      try {
        setLoading(true);

        const result =
          await registerUser(
            {
              name:
                form.name,

              email:
                form.email,

              phone:
                form.phone,

              password:
                form.password,

              address:
                form.address,

              nidNumber:
                form.nidNumber,

              passportNumber:
                form.passportNumber,

              reason:
                form.reason,
            }
          );

        setSuccess(
          result.message ||
            "Registration successful. Please wait for admin approval."
        );

        setForm({
          name: "",
          email: "",
          phone: "",
          address: "",
          nidNumber: "",
          passportNumber: "",
          reason: "",
          password: "",
          confirmPassword:
            "",
        });
      } catch (error: any) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Registration failed"
        );
      } finally {
        setLoading(
          false
        );
      }
    };

  const inputClass =
    "w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50 px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
          {/* Header */}
          <div className="border-b border-gray-100 px-6 py-7 sm:px-8">
            <div className="flex flex-col items-center text-center sm:flex-row sm:items-center sm:text-left">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                <Image
                  src="/logo.png"
                  alt="FAME'S Organization Logo"
                  width={80}
                  height={80}
                  priority
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="mt-4 sm:ml-5 sm:mt-0">
                <h1 className="text-2xl font-bold tracking-tight text-gray-950 sm:text-3xl">
                  Join FAME&apos;S Organization
                </h1>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-500">
                  Create your account and submit your membership application.
                </p>
              </div>
            </div>
          </div>

          <div className="px-6 py-7 sm:px-8">
            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                {success}
              </div>
            )}

            <form
              onSubmit={
                handleSubmit
              }
              className="space-y-6"
            >
              {/* Personal info */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Personal Information
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Basic details for your membership application.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Full Name
                    </label>

                    <input
                      type="text"
                      name="name"
                      required
                      value={
                        form.name
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Your full name"
                      className={
                        inputClass
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Email
                    </label>

                    <input
                      type="email"
                      name="email"
                      required
                      value={
                        form.email
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="you@example.com"
                      className={
                        inputClass
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Phone Number
                    </label>

                    <input
                      type="text"
                      name="phone"
                      required
                      value={
                        form.phone
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="01XXXXXXXXX"
                      className={
                        inputClass
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Address
                    </label>

                    <input
                      type="text"
                      name="address"
                      value={
                        form.address
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Your address"
                      className={
                        inputClass
                      }
                    />
                  </div>
                </div>
              </section>

              <div className="border-t border-gray-100" />

              {/* Identity */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Identity Information
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Provide your identification details.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      NID Number
                    </label>

                    <input
                      type="text"
                      name="nidNumber"
                      required
                      value={
                        form.nidNumber
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Enter NID number"
                      className={
                        inputClass
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Passport Number
                      <span className="ml-1 text-xs font-normal text-gray-400">
                        (optional)
                      </span>
                    </label>

                    <input
                      type="text"
                      name="passportNumber"
                      value={
                        form.passportNumber
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Enter passport number"
                      className={`${inputClass} uppercase`}
                    />
                  </div>
                </div>
              </section>

              <div className="border-t border-gray-100" />

              {/* Application reason */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Membership Application
                  </h2>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Why do you want to join?
                  </label>

                  <textarea
                    name="reason"
                    rows={4}
                    value={
                      form.reason
                    }
                    onChange={
                      handleChange
                    }
                    placeholder="Tell us briefly why you want to join..."
                    className={`${inputClass} resize-none`}
                  />
                </div>
              </section>

              <div className="border-t border-gray-100" />

              {/* Security */}
              <section>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Account Security
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Use at least 6 characters for your password.
                  </p>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Password
                    </label>

                    <input
                      type="password"
                      name="password"
                      required
                      minLength={6}
                      value={
                        form.password
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Minimum 6 characters"
                      className={
                        inputClass
                      }
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-700">
                      Confirm Password
                    </label>

                    <input
                      type="password"
                      name="confirmPassword"
                      required
                      value={
                        form.confirmPassword
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Enter password again"
                      className={
                        inputClass
                      }
                    />
                  </div>
                </div>
              </section>

              <button
                type="submit"
                disabled={
                  loading
                }
                className="w-full rounded-xl bg-emerald-700 px-4 py-3.5 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Submitting..."
                  : "Create Account & Apply"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Already registered?{" "}
              <Link
                href="/login"
                className="font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}