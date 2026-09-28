import api from "./api";
import { assertWritable } from "./demoMode";

export const getMembers = async () => {
  const response = await api.get("/members");
  return response.data;
};

export const getPendingUsers = async () => {
  const response = await api.get("/members/pending");
  return response.data;
};

export const approveUser = async (
  userId: string,
  data: {
    phone?: string;
    address?: string;
  }
) => {
  assertWritable();

  const response = await api.post(`/members/approve/${userId}`, data);

  return response.data;
};

export const deleteMember = async (memberId: string) => {
  assertWritable();

  const response = await api.delete(`/members/${memberId}`);

  return response.data;
};
