import api from "./api";
import { assertWritable } from "./demoMode";

export type MemberPersonalFields = {
  phone?: string;
  address?: string;
  nidNumber?: string;
  passportNumber?: string;
};

export type CreateMemberInput = MemberPersonalFields & {
  name: string;

  // Optional actual membership start date.
  joinDate?: string;
};

export type ApproveUserInput = MemberPersonalFields & {
  // Supply the existing member profile's MongoDB _id
  // to link the registration without creating another profile.
  memberId?: string;
};

export type UpdateMemberInput = MemberPersonalFields & {
  name?: string;
  monthlyContribution?: number;

  // Exits must use the exit-request workflow.
  membershipStatus?: "active" | "inactive";
};

const memberPath = (memberId: string) =>
  `/members/${encodeURIComponent(memberId)}`;

// Admin: list all financial member profiles,
// including members without login accounts.
export const getMembers = async () => {
  const response = await api.get("/members");

  return response.data;
};

// Admin: get one member profile.
export const getMemberById = async (memberId: string) => {
  const response = await api.get(memberPath(memberId));

  return response.data;
};

// Admin: create a member profile without a login account.
// The backend assigns the member code and defaults
// monthlyContribution to 1000.
export const createMember = async (
  data: CreateMemberInput
) => {
  assertWritable();

  const response = await api.post("/members", data);

  return response.data;
};

// Admin: list pending registrations.
export const getPendingUsers = async () => {
  const response = await api.get("/members/pending");

  return response.data;
};

// Admin: approve a pending registration.
// With memberId: link to an existing member profile.
// Without memberId: create a new member profile.
export const approveUser = async (
  userId: string,
  data: ApproveUserInput = {}
) => {
  assertWritable();

  const response = await api.post(
    `/members/approve/${encodeURIComponent(userId)}`,
    data
  );

  return response.data;
};

// Admin: update supported profile fields.
export const updateMember = async (
  memberId: string,
  data: UpdateMemberInput
) => {
  assertWritable();

  const response = await api.patch(
    memberPath(memberId),
    data
  );

  return response.data;
};

// Preserves your existing delete service.
// The backend determines whether deletion is permitted.
export const deleteMember = async (memberId: string) => {
  assertWritable();

  const response = await api.delete(memberPath(memberId));

  return response.data;
};