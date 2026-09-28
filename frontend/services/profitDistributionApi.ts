import api from "./api";
import { assertWritable } from "./demoMode";

export const getProfitDistributions = async () => {
  const response = await api.get("/profit-distributions");

  return response.data;
};

export const createProfitDistribution = async (data: {
  investmentId: string;
  totalProfit: number;
  note?: string;
}) => {
  assertWritable();

  const response = await api.post("/profit-distributions", data);

  return response.data;
};
