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

  // Total savings paid for this contribution month.
  // Excludes fines and payments for other months.
  paidAmount: number;

  // Total fine collected for this contribution month.
  finePaidAmount?: number;

  // Actual receipt date, required when recording money.
  // Send an ISO timestamp with a timezone.
  paymentDate?: string;

  note?: string;
};

export type UpdateContributionInput = {
  // These are cumulative totals, not additional payments.
  paidAmount?: number;
  finePaidAmount?: number;

  // Required when either paid total increases.
  paymentDate?: string;

  note?: string;
};

export const getContributions = async (
  params?: ContributionFilters
) => {
  const response = await api.get("/contributions", {
    params,
  });

  return response.data;
};

export const getContributionById = async (id: string) => {
  const response = await api.get(
    `/contributions/${encodeURIComponent(id)}`
  );

  return response.data;
};

export const addContribution = async (
  data: AddContributionInput
) => {
  assertWritable();

  const response = await api.post("/contributions", data);

  return response.data;
};

export const updateContribution = async (
  id: string,
  data: UpdateContributionInput
) => {
  assertWritable();

  const response = await api.patch(
    `/contributions/${encodeURIComponent(id)}`,
    data
  );

  return response.data;
};

export const getMyContributions = async () => {
  const response = await api.get("/contributions/my");

  return response.data;
};