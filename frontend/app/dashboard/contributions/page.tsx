"use client";

import { FormEvent, useEffect, useState } from "react";

import {
  addContribution,
  getContributions,
} from "@/services/contributionApi";

import { getMembers } from "@/services/memberApi";

interface Member {
  _id: string;
  memberCode: string;
  monthlyContribution: number;

  user: {
    name: string;
    email: string;
  };
}

interface Contribution {
  _id: string;
  month: number;
  year: number;
  expectedAmount: number;
  paidAmount: number;
  status: "due" | "partial" | "paid";
  paymentDate?: string;
  note?: string;

  member: {
    _id: string;
    memberCode: string;

    user: {
      name: string;
      email: string;
    };
  };
}

export default function ContributionsPage() {
  const now = new Date();

  const [members, setMembers] = useState<Member[]>([]);
  const [contributions, setContributions] = useState<
    Contribution[]
  >([]);

  const [memberId, setMemberId] = useState("");
  const [month, setMonth] = useState(
    now.getMonth() + 1
  );
  const [year, setYear] = useState(
    now.getFullYear()
  );
  const [paidAmount, setPaidAmount] =
    useState<number>(1000);
  const [note, setNote] = useState("");

  const [loading, setLoading] =
    useState(true);
  const [submitting, setSubmitting] =
    useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const [membersData, contributionsData] =
        await Promise.all([
          getMembers(),
          getContributions(),
        ]);

      setMembers(membersData.members || []);
      setContributions(
        contributionsData.contributions || []
      );
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to load contributions"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleMemberChange = (
    selectedMemberId: string
  ) => {
    setMemberId(selectedMemberId);

    const selectedMember = members.find(
      (member) =>
        member._id === selectedMemberId
    );

    if (selectedMember) {
      setPaidAmount(
        selectedMember.monthlyContribution
      );
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!memberId) {
      setError("Please select a member.");
      return;
    }

    try {
      setSubmitting(true);

      await addContribution({
        memberId,
        month,
        year,
        paidAmount,
        note,
      });

      setSuccess(
        "Contribution added successfully."
      );

      setMemberId("");
      setPaidAmount(1000);
      setNote("");

      await loadData();
    } catch (error: any) {
      setError(
        error?.response?.data?.message ||
          "Failed to add contribution"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading contributions...
      </p>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Contributions
        </h1>

        <p className="mt-2 text-gray-500">
          Record and review monthly member contributions.
        </p>
      </div>

      {error && (
        <div className="mb-5 rounded-lg bg-red-50 p-4 text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-5 rounded-lg bg-green-50 p-4 text-green-700">
          {success}
        </div>
      )}

      <div className="mb-8 rounded-xl border border-gray-200 bg-white p-6">
        <h2 className="mb-5 text-xl font-semibold">
          Add Contribution
        </h2>

        <form
          onSubmit={handleSubmit}
          className="grid gap-5 md:grid-cols-2 xl:grid-cols-3"
        >
          <div>
            <label className="mb-2 block text-sm font-medium">
              Member
            </label>

            <select
              value={memberId}
              onChange={(event) =>
                handleMemberChange(
                  event.target.value
                )
              }
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            >
              <option value="">
                Select member
              </option>

              {members.map((member) => (
                <option
                  key={member._id}
                  value={member._id}
                >
                  {member.memberCode} -{" "}
                  {member.user?.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Month
            </label>

            <select
              value={month}
              onChange={(event) =>
                setMonth(
                  Number(event.target.value)
                )
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            >
              {[
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ].map((name, index) => (
                <option
                  key={name}
                  value={index + 1}
                >
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Year
            </label>

            <input
              type="number"
              value={year}
              onChange={(event) =>
                setYear(
                  Number(event.target.value)
                )
              }
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium">
              Paid Amount
            </label>

            <input
              type="number"
              min="0"
              value={paidAmount}
              onChange={(event) =>
                setPaidAmount(
                  Number(event.target.value)
                )
              }
              required
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium">
              Note
            </label>

            <input
              type="text"
              value={note}
              onChange={(event) =>
                setNote(event.target.value)
              }
              placeholder="Optional note"
              className="w-full rounded-lg border border-gray-300 px-4 py-3"
            />
          </div>

          <div>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-black px-6 py-3 font-medium text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {submitting
                ? "Saving..."
                : "Add Contribution"}
            </button>
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Member
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Month
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Expected
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Paid
              </th>

              <th className="px-5 py-3 text-sm font-medium text-gray-600">
                Status
              </th>
            </tr>
          </thead>

          <tbody>
            {contributions.map(
              (contribution) => (
                <tr
                  key={contribution._id}
                  className="border-b border-gray-100 last:border-0"
                >
                  <td className="px-5 py-4">
                    <div className="font-medium">
                      {
                        contribution.member?.user
                          ?.name
                      }
                    </div>

                    <div className="text-sm text-gray-500">
                      {
                        contribution.member
                          ?.memberCode
                      }
                    </div>
                  </td>

                  <td className="px-5 py-4">
                    {contribution.month}/
                    {contribution.year}
                  </td>

                  <td className="px-5 py-4">
                    ৳
                    {contribution.expectedAmount.toLocaleString()}
                  </td>

                  <td className="px-5 py-4">
                    ৳
                    {contribution.paidAmount.toLocaleString()}
                  </td>

                  <td className="px-5 py-4">
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-sm capitalize">
                      {contribution.status}
                    </span>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}