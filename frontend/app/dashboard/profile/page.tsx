"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  getMyMemberProfile,
  updateMyMemberProfile,
} from "@/services/profileApi";

interface MemberProfile {
  _id: string;
  memberCode: string;

  phone?: string;
  address?: string;
  nidNumber?: string;
  passportNumber?: string;

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

interface EditableProfile {
  phone: string;
  address: string;
  nidNumber: string;
  passportNumber: string;
}

export default function ProfilePage() {
  const [
    member,
    setMember,
  ] =
    useState<MemberProfile | null>(
      null
    );

  const [
    form,
    setForm,
  ] =
    useState<EditableProfile>({
      phone: "",
      address: "",
      nidNumber: "",
      passportNumber: "",
    });

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    saving,
    setSaving,
  ] =
    useState(false);

  const [
    editing,
    setEditing,
  ] =
    useState(false);

  const [
    error,
    setError,
  ] =
    useState("");

  const [
    success,
    setSuccess,
  ] =
    useState("");

  useEffect(() => {
    const loadProfile =
      async () => {
        try {
          setError("");

          const data =
            await getMyMemberProfile();

          setMember(
            data.member
          );

          setForm({
            phone:
              data.member
                ?.phone ||
              "",

            address:
              data.member
                ?.address ||
              "",

            nidNumber:
              data.member
                ?.nidNumber ||
              "",

            passportNumber:
              data.member
                ?.passportNumber ||
              "",
          });
        } catch (
          error: any
        ) {
          setError(
            error?.response
              ?.data
              ?.message ||
              "Failed to load profile"
          );
        } finally {
          setLoading(false);
        }
      };

    loadProfile();
  }, []);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const {
      name,
      value,
    } =
      event.target;

    setForm(
      (
        previous
      ) => ({
        ...previous,

        [name]:
          value,
      })
    );
  };

  const handleCancel = () => {
    if (!member) {
      return;
    }

    setForm({
      phone:
        member.phone ||
        "",

      address:
        member.address ||
        "",

      nidNumber:
        member.nidNumber ||
        "",

      passportNumber:
        member.passportNumber ||
        "",
    });

    setError("");
    setSuccess("");
    setEditing(false);
  };

  const handleSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      try {
        setSaving(true);
        setError("");
        setSuccess("");

        const data =
          await updateMyMemberProfile(
            {
              phone:
                form.phone.trim(),

              address:
                form.address.trim(),

              nidNumber:
                form.nidNumber.trim(),

              passportNumber:
                form.passportNumber
                  .trim()
                  .toUpperCase(),
            }
          );

        const updatedMember =
          data.member;

        setMember(
          updatedMember
        );

        setForm({
          phone:
            updatedMember
              ?.phone ||
            "",

          address:
            updatedMember
              ?.address ||
            "",

          nidNumber:
            updatedMember
              ?.nidNumber ||
            "",

          passportNumber:
            updatedMember
              ?.passportNumber ||
            "",
        });

        setSuccess(
          data.message ||
            "Profile updated successfully"
        );

        setEditing(false);
      } catch (
        error: any
      ) {
        setError(
          error?.response
            ?.data
            ?.message ||
            "Failed to update profile"
        );
      } finally {
        setSaving(false);
      }
    };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({
            length: 9,
          }).map(
            (
              _,
              index
            ) => (
              <div
                key={
                  index
                }
                className="h-28 animate-pulse rounded-xl border border-gray-200 bg-white"
              />
            )
          )}
        </div>
      </div>
    );
  }

  if (
    error &&
    !member
  ) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600">
        {error}
      </div>
    );
  }

  if (!member) {
    return null;
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-950">
            My Profile
          </h1>

          <p className="mt-2 text-sm text-gray-500">
            Manage your personal and membership information.
          </p>
        </div>

        {!editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(
                true
              );

              setSuccess(
                ""
              );

              setError(
                ""
              );
            }}
            className="w-full rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-gray-800 sm:w-auto"
          >
            Edit Profile
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Profile summary */}
      <section>
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Membership
          </p>

          <h2 className="mt-1 text-xl font-bold text-gray-900">
            Account Information
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <InfoCard
            title="Name"
            value={
              member.user
                .name
            }
          />

          <InfoCard
            title="Email"
            value={
              member.user
                .email
            }
          />

          <InfoCard
            title="Member Code"
            value={
              member.memberCode
            }
          />

          <InfoCard
            title="Monthly Contribution"
            value={`৳${Number(
              member.monthlyContribution ||
                0
            ).toLocaleString()}`}
          />

          <InfoCard
            title="Total Contribution"
            value={`৳${Number(
              member.totalContribution ||
                0
            ).toLocaleString()}`}
          />

          <InfoCard
            title="Ownership"
            value={`${Number(
              member.ownershipPercentage ||
                0
            ).toFixed(2)}%`}
          />

          <InfoCard
            title="Status"
            value={
              member.membershipStatus
            }
          />

          <InfoCard
            title="Join Date"
            value={
              member.joinDate
                ? new Date(
                    member.joinDate
                  ).toLocaleDateString()
                : "-"
            }
          />
        </div>
      </section>

      {/* Editable personal information */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
            Personal Information
          </p>

          <h2 className="mt-1 text-xl font-bold text-gray-900">
            Contact & Identification
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Update your phone, address, NID and passport information.
          </p>
        </div>

        {editing ? (
          <form
            onSubmit={
              handleSubmit
            }
            className="p-5 sm:p-6"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <EditableField
                label="Phone Number"
                name="phone"
                value={
                  form.phone
                }
                placeholder="01XXXXXXXXX"
                autoComplete="tel"
                onChange={
                  handleChange
                }
              />

              <EditableField
                label="Address"
                name="address"
                value={
                  form.address
                }
                placeholder="Enter your address"
                autoComplete="street-address"
                onChange={
                  handleChange
                }
              />

              <EditableField
                label="NID Number"
                name="nidNumber"
                value={
                  form.nidNumber
                }
                placeholder="Enter NID number"
                onChange={
                  handleChange
                }
              />

              <EditableField
                label="Passport Number"
                name="passportNumber"
                value={
                  form.passportNumber
                }
                placeholder="Enter passport number"
                uppercase
                onChange={
                  handleChange
                }
              />
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={
                  saving
                }
                onClick={
                  handleCancel
                }
                className="rounded-xl border border-gray-300 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  saving
                }
                className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : "Save Changes"}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid gap-px bg-gray-200 sm:grid-cols-2">
            <ProfileField
              title="Phone Number"
              value={
                member.phone ||
                "-"
              }
            />

            <ProfileField
              title="Address"
              value={
                member.address ||
                "-"
              }
            />

            <ProfileField
              title="NID Number"
              value={
                member.nidNumber ||
                "-"
              }
            />

            <ProfileField
              title="Passport Number"
              value={
                member.passportNumber ||
                "-"
              }
            />
          </div>
        )}
      </section>
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
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">
        {title}
      </p>

      <p className="mt-2 break-words text-lg font-semibold capitalize text-gray-900">
        {value}
      </p>
    </div>
  );
}

function ProfileField({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="bg-white p-5 sm:p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
        {title}
      </p>

      <p className="mt-2 break-words font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function EditableField({
  label,
  name,
  value,
  placeholder,
  autoComplete,
  uppercase = false,
  onChange,
}: {
  label: string;
  name: keyof EditableProfile;
  value: string;
  placeholder: string;
  autoComplete?: string;
  uppercase?: boolean;
  onChange: (
    event: ChangeEvent<HTMLInputElement>
  ) => void;
}) {
  return (
    <div>
      <label
        htmlFor={
          name
        }
        className="mb-2 block text-sm font-medium text-gray-700"
      >
        {label}
      </label>

      <input
        id={
          name
        }
        type="text"
        name={
          name
        }
        value={
          value
        }
        onChange={
          onChange
        }
        placeholder={
          placeholder
        }
        autoComplete={
          autoComplete
        }
        className={`w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 ${
          uppercase
            ? "uppercase"
            : ""
        }`}
      />
    </div>
  );
}