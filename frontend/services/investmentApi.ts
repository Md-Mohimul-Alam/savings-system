import api from "./api";
import { assertWritable } from "./demoMode";

export type InvestmentStatus = "active" | "closed";

export type InvestmentFilters = {
  status?: InvestmentStatus;
};

export type AddInvestmentInput = {
  name: string;
  description?: string;
  investedAmount: number;
  currentValue?: number;
  startDate?: string;
};

export type UpdateInvestmentInput = {
  name?: string;
  description?: string;
  currentValue?: number;
  status?: InvestmentStatus;

  // Required when closing an investment.
  // Total cash received, including recovered principal.
  returnedAmount?: number;

  endDate?: string;
};

export type CloseInvestmentInput = {
  // Use 0 if no money was recovered.
  returnedAmount: number;
  endDate?: string;
};

const investmentPath = (id: string) =>
  `/investments/${encodeURIComponent(id)}`;

export const getInvestments = async (
  params?: InvestmentFilters
) => {
  const response = await api.get("/investments", {
    params,
  });

  return response.data;
};

export const getInvestmentById = async (id: string) => {
  const response = await api.get(investmentPath(id));

  return response.data;
};

export const addInvestment = async (
  data: AddInvestmentInput
) => {
  assertWritable();

  const response = await api.post("/investments", data);

  return response.data;
};

export const updateInvestment = async (
  id: string,
  data: UpdateInvestmentInput
) => {
  assertWritable();

  const response = await api.patch(
    investmentPath(id),
    data
  );

  return response.data;
};

// Uses the existing PATCH endpoint to close an investment.
export const closeInvestment = async (
  id: string,
  data: CloseInvestmentInput
) => {
  return updateInvestment(id, {
    status: "closed",
    returnedAmount: data.returnedAmount,
    ...(data.endDate !== undefined
      ? { endDate: data.endDate }
      : {}),
  });
};