import api from "./api";

export const getTransactions = async (params?: {
  type?: string;
  direction?: string;
  memberId?: string;
}) => {
  const response = await api.get("/transactions", {
    params,
  });

  return response.data;
};

export const getTransactionSummary = async () => {
  const response = await api.get("/transactions/summary");

  return response.data;
};