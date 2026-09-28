"use client";

import { useEffect, useState } from "react";

import { getMyMemberProfile } from "@/services/profileApi";

interface MemberProfile {
  _id: string;
  memberCode: string;
  phone?: string;
  address?: string;
  monthlyContribution: number;
  totalContribution: number;
  ownershipPercentage: number;
  joinDate: string;
  membershipStatus: string;

  user: {
    name: string;
    email: string;
    role: string;
    status: string;
  };
}

export default function ProfilePage() {
  const [member, setMember] =
    useState<MemberProfile | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data =
          await getMyMemberProfile();

        setMember(data.member);
      } catch (error: any) {
        setError(
          error?.response?.data?.message ||
            "Failed to load profile"
        );
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  if (loading) {
    return (
      <p className="text-gray-500">
        Loading profile...
      </p>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4 text-red-600">
        {error}
      </div>
    );
  }

  if (!member) {
    return null;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold">
          My Profile
        </h1>

        <p className="mt-2 text-gray-500">
          Your membership and savings information.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <InfoCard
          title="Name"
          value={member.user.name}
        />

        <InfoCard
          title="Email"
          value={member.user.email}
        />

        <InfoCard
          title="Member Code"
          value={member.memberCode}
        />

        <InfoCard
          title="Phone"
          value={member.phone || "-"}
        />

        <InfoCard
          title="Address"
          value={member.address || "-"}
        />

        <InfoCard
          title="Monthly Contribution"
          value={`৳${member.monthlyContribution.toLocaleString()}`}
        />

        <InfoCard
          title="Total Contribution"
          value={`৳${member.totalContribution.toLocaleString()}`}
        />

        <InfoCard
          title="Ownership"
          value={`${(
            member.ownershipPercentage || 0
          ).toFixed(2)}%`}
        />

        <InfoCard
          title="Status"
          value={member.membershipStatus}
        />
      </div>
    </div>
  );
}

function InfoCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-2 text-lg font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}