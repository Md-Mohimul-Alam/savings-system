"use client";

import {
  FormEvent,
  useState,
} from "react";

import Link from "next/link";

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

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Join the Group
          </h1>

          <p className="mt-2 text-gray-500">
            Create an account
            and submit your
            membership
            application.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-lg bg-red-50 p-4 text-sm text-red-600">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-lg bg-green-50 p-4 text-sm text-green-700">
            {success}
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
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
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
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
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
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
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
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />
          </div>

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
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Passport Number
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
              className="w-full rounded-lg border border-gray-300 px-4 py-3 uppercase outline-none focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Why do you want
              to join?
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
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />
          </div>

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
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
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
              className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-black"
            />
          </div>

          <button
            type="submit"
            disabled={
              loading
            }
            className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? "Submitting..."
              : "Create Account & Apply"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already
          registered?{" "}
          <Link
            href="/login"
            className="font-medium text-black underline"
          >
            Login
          </Link>
        </p>
      </div>
    </main>
  );
}
