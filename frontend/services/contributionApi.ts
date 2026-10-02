import api from "./api";
import { assertWritable } from "./demoMode";

export type ContributionStatus = "due" | "partial" | "paid";
export type ContributionFilters = {
  month?: number;
  year?: number;
  memberId?: string;
  status?: ContributionStatus;
};
export type AddContributionInput = {
  memberId: string;
  month: number;
  year: number;
  // Cumulative savings for this month only; excludes fines.
  paidAmount: number;
  finePaidAmount?: number;
  // Actual receipt timestamp with timezone, required when money increases.
  paymentDate?: string;
  note?: string;
};
export type UpdateContributionInput = {
  paidAmount?: number;
  finePaidAmount?: number;
  paymentDate?: string;
  note?: string;
};
export const getContributions = async (params?: ContributionFilters) => {
  const response = await api.get("/contributions", { params });
  return response.data;
};
export const getContributionById = async (id: string) => {
  const response = await api.get(`/contributions/${encodeURIComponent(id)}`);
  return response.data;
};
export const addContribution = async (data: AddContributionInput) => {
  assertWritable();
  const response = await api.post("/contributions", data);
  return response.data;
};
export const updateContribution = async (id: string, data: UpdateContributionInput) => {
  assertWritable();
  const response = await api.patch(`/contributions/${encodeURIComponent(id)}`, data);
  return response.data;
};
export const getMyContributions = async () => {
  const response = await api.get("/contributions/my");
  return response.data;
};

