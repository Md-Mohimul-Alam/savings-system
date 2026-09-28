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

import {
  useDemoMode,
} from "@/hooks/useDemoMode";

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
  const isDemo =
    useDemoMode();

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

  // --------------------------------------------------
  // LOAD PROFILE
  // --------------------------------------------------

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
          setLoading(
            false
          );
        }
      };

    loadProfile();
  }, []);

  // --------------------------------------------------
  // FIELD CHANGE
  // --------------------------------------------------

  const handleChange =
    (
      event: ChangeEvent<HTMLInputElement>
    ) => {
      if (isDemo) {
        return;
      }

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

  // --------------------------------------------------
  // CANCEL EDIT
  // --------------------------------------------------

  const handleCancel =
    () => {
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
      setEditing(
        false
      );
    };

  // --------------------------------------------------
  // START EDITING
  // --------------------------------------------------

  const handleStartEditing =
    () => {
      if (isDemo) {
        setError(
          "Demo Mode is read-only. Profile editing is disabled."
        );

        return;
      }

      setEditing(
        true
      );

      setSuccess("");
      setError("");
    };

  // --------------------------------------------------
  // SAVE PROFILE
  // --------------------------------------------------

  const handleSubmit =
    async (
      event: FormEvent<HTMLFormElement>
    ) => {
      event.preventDefault();

      if (isDemo) {
        setError(
          "Demo Mode is read-only. Updating profile information is disabled."
        );

        return;
      }

      try {
        setSaving(
          true
        );

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

        setEditing(
          false
        );
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
        setSaving(
          false
        );
      }
    };

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

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

  // --------------------------------------------------
  // ERROR
  // --------------------------------------------------

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

  // --------------------------------------------------
  // UI
  // --------------------------------------------------

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-gray-950">
              My Profile
            </h1>

            {isDemo && (
              <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                Demo Mode · Read Only
              </span>
            )}
          </div>

          <p className="mt-2 text-sm text-gray-500">
            Manage your personal and membership information.
          </p>
        </div>

        {!editing && (
          <button
            type="button"
            onClick={
              handleStartEditing
            }
            disabled={
              isDemo
            }
            title={
              isDemo
                ? "Disabled in Demo Mode"
                : undefined
            }
            className={`w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition sm:w-auto ${
              isDemo
                ? "cursor-not-allowed bg-gray-400"
                : "bg-gray-900 hover:bg-gray-800"
            } disabled:opacity-60`}
          >
            {isDemo
              ? "Editing Disabled"
              : "Edit Profile"}
          </button>
        )}
      </div>

      {/* Demo Notice */}
      {isDemo && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">
            Demo Mode
          </p>

          <p className="mt-1 text-sm text-amber-700">
            You can view this sample profile, but personal information
            cannot be edited or updated.
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Success */}
      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {success}
        </div>
      )}

      {/* Profile Summary */}
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

          <InfoCard
            title="Account Status"
            value={
              member.user
                .status ||
              "-"
            }
          />
        </div>
      </section>

      {/* Personal Information */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
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

            {isDemo && (
              <span className="w-fit rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                Read Only
              </span>
            )}
          </div>
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
                disabled={
                  isDemo ||
                  saving
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
                disabled={
                  isDemo ||
                  saving
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
                disabled={
                  isDemo ||
                  saving
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
                disabled={
                  isDemo ||
                  saving
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
                  saving ||
                  isDemo
                }
                title={
                  isDemo
                    ? "Disabled in Demo Mode"
                    : undefined
                }
                className={`rounded-xl px-5 py-3 text-sm font-semibold text-white transition ${
                  isDemo
                    ? "cursor-not-allowed bg-gray-400"
                    : "bg-emerald-700 hover:bg-emerald-800"
                } disabled:opacity-60`}
              >
                {isDemo
                  ? "Save Disabled"
                  : saving
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

// --------------------------------------------------
// INFO CARD
// --------------------------------------------------

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

// --------------------------------------------------
// PROFILE FIELD
// --------------------------------------------------

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

// --------------------------------------------------
// EDITABLE FIELD
// --------------------------------------------------

function EditableField({
  label,
  name,
  value,
  placeholder,
  autoComplete,
  uppercase = false,
  onChange,
  disabled = false,
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
  disabled?: boolean;
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
        disabled={
          disabled
        }
        className={`w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition placeholder:text-gray-400 ${
          disabled
            ? "cursor-not-allowed bg-gray-100 text-gray-500"
            : "bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
        } ${
          uppercase
            ? "uppercase"
            : ""
        }`}
      />
    </div>
  );
}