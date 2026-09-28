import api from "./api";
import { assertWritable } from "./demoMode";

export const getJoinRequests = async (status?: string) => {
  const response = await api.get("/join-requests", {
    params: status ? { status } : undefined,
  });

  return response.data;
};

export const approveJoinRequest = async (
  id: string,
  adminNote?: string
) => {
  assertWritable();

  const response = await api.patch(`/join-requests/${id}/approve`, {
    adminNote,
  });

  return response.data;
};

export const rejectJoinRequest = async (
  id: string,
  adminNote?: string
) => {
  assertWritable();

  const response = await api.patch(`/join-requests/${id}/reject`, {
    adminNote,
  });

  return response.data;
};
