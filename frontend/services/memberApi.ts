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
  joinDate?: string;
};
export type ApproveUserInput = MemberPersonalFields & {
  // Existing financial profile ID, not the registration's user ID.
  memberId?: string;
};
export type UpdateMemberInput = MemberPersonalFields & {
  name?: string;
  monthlyContribution?: number;
  membershipStatus?: "active" | "inactive";
};
const memberPath = (id: string) => `/members/${encodeURIComponent(id)}`;
export const getMembers = async () => {
  const response = await api.get("/members");
  return response.data;
};
export const getMemberById = async (id: string) => {
  const response = await api.get(memberPath(id));
  return response.data;
};
export const createMember = async (data: CreateMemberInput) => {
  assertWritable();
  const response = await api.post("/members", data);
  return response.data;
};
export const getPendingUsers = async () => {
  const response = await api.get("/members/pending");
  return response.data;
};
export const approveUser = async (userId: string, data: ApproveUserInput = {}) => {
  assertWritable();
  const response = await api.post(`/members/approve/${encodeURIComponent(userId)}`, data);
  return response.data;
};
export const updateMember = async (id: string, data: UpdateMemberInput) => {
  assertWritable();
  const response = await api.patch(memberPath(id), data);
  return response.data;
};
export const deleteMember = async (id: string) => {
  assertWritable();
  const response = await api.delete(memberPath(id));
  return response.data;
};

