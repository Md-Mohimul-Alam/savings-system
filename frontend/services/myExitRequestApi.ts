import api from "./api";

export const getMyExitRequest = async () => {
  const response = await api.get(
    "/exit-requests/my"
  );

  return response.data;
};

export const createMyExitRequest = async (
  reason: string
) => {
  const response = await api.post(
    "/exit-requests",
    {
      reason,
    }
  );

  return response.data;
};