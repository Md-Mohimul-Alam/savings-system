import api from "./api";

export const getExitRequests = async (status?: string) => {
  const response = await api.get("/exit-requests", {
    params: status ? { status } : undefined,
  });

  return response.data;
};

export const approveExitRequest = async (
  id: string,
  adminNote?: string
) => {
  const response = await api.patch(
    `/exit-requests/${id}/approve`,
    {
      adminNote,
    }
  );

  return response.data;
};

export const rejectExitRequest = async (
  id: string,
  adminNote?: string
) => {
  const response = await api.patch(
    `/exit-requests/${id}/reject`,
    {
      adminNote,
    }
  );

  return response.data;
};

export const markExitAsPaid = async (
  id: string
) => {
  const response = await api.patch(
    `/exit-requests/${id}/pay`
  );

  return response.data;
};