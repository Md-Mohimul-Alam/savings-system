import api from "./api";

export const getInvestments = async (params?: {
  status?: string;
}) => {
  const response = await api.get("/investments", {
    params,
  });

  return response.data;
};

export const addInvestment = async (data: {
  name: string;
  description?: string;
  investedAmount: number;
  currentValue?: number;
  startDate?: string;
}) => {
  const response = await api.post("/investments", data);

  return response.data;
};

export const updateInvestment = async (
  id: string,
  data: {
    name?: string;
    description?: string;
    currentValue?: number;
    status?: "active" | "closed";
    endDate?: string;
  }
) => {
  const response = await api.patch(
    `/investments/${id}`,
    data
  );

  return response.data;
};