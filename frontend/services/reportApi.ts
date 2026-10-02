import api from "./api";
import type { ContributionFilters } from "./contributionApi";
import type { InvestmentFilters } from "./investmentApi";
import type { LoanFilters } from "./loanApi";

export type TransactionReportFilters = {
  type?: string;
  direction?: "IN" | "OUT";
  memberId?: string;
};
export const getDashboardReport = async () => {
  const response = await api.get("/dashboard");
  return response.data;
};
export const getMembersReport = async () => {
  const response = await api.get("/members");
  return response.data;
};
export const getContributionsReport = async (params?: ContributionFilters) => {
  const response = await api.get("/contributions", { params });
  return response.data;
};
export const getMyContributionsReport = async () => {
  const response = await api.get("/contributions/my");
  return response.data;
};
export const getExpensesReport = async () => {
  const response = await api.get("/expenses");
  return response.data;
};
export const getInvestmentsReport = async (params?: InvestmentFilters) => {
  const response = await api.get("/investments", { params });
  return response.data;
};
export const getLoansReport = async (params?: LoanFilters) => {
  const response = await api.get("/loans", { params });
  return response.data;
};
export const getTransactionsReport = async (params?: TransactionReportFilters) => {
  const response = await api.get("/transactions", { params });
  return response.data;
};
export const getCashSummaryReport = async () => {
  const response = await api.get("/transactions/summary");
  return response.data;
};

