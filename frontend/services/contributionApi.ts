import api from "./api";

export const getContributions = async (params?: {
  month?: number;
  year?: number;
  memberId?: string;
  status?: string;
}) => {
  const response = await api.get("/contributions", {
    params,
  });

  return response.data;
};

export const addContribution = async (data: {
  memberId: string;
  month: number;
  year: number;
  paidAmount: number;
  note?: string;
}) => {
  const response = await api.post("/contributions", data);

  return response.data;
};

export const updateContribution = async (
  id: string,
  data: {
    paidAmount?: number;
    note?: string;
  }
) => {
  const response = await api.patch(
    `/contributions/${id}`,
    data
  );

  return response.data;
};

export const getMyContributions =
  async () => {
    const response =
      await api.get(
        "/contributions/my"
      );

    return response.data;
  };