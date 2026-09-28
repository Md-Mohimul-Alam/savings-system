import api from "./api";

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
  const response = await api.post(
    `/members/approve/${userId}`,
    data
  );

  return response.data;
};

export const deleteMember = async (
  memberId: string
) => {
  const response = await api.delete(
    `/members/${memberId}`
  );

  return response.data;
};