import api from "./api";

import type {
  ContributionFilters,
} from "./contributionApi";

import type {
  InvestmentFilters,
} from "./investmentApi";

import type {
  LoanFilters,
} from "./loanApi";

export type TransactionReportFilters = {
  type?: string;
  direction?: "IN" | "OUT";
  memberId?: string;
};

// Dashboard totals and charts.
// Response depends on the authenticated user's role.
export const getDashboardReport = async () => {
  const response = await api.get("/dashboard");

  return response.data;
};

// Admin: all financial member profiles.
export const getMembersReport = async () => {
  const response = await api.get("/members");

  return response.data;
};

// Admin: monthly savings and fines.
// Includes unpaid records that exist in the database.
export const getContributionsReport = async (
  params?: ContributionFilters
) => {
  const response = await api.get("/contributions", {
    params,
  });

  return response.data;
};

// Member: own contribution history.
export const getMyContributionsReport = async () => {
  const response = await api.get("/contributions/my");

  return response.data;
};

export const getExpensesReport = async () => {
  const response = await api.get("/expenses");

  return response.data;
};

export const getInvestmentsReport = async (
  params?: InvestmentFilters
) => {
  const response = await api.get("/investments", {
    params,
  });

  return response.data;
};

// Shared loan register for active members and admins.
export const getLoansReport = async (
  params?: LoanFilters
) => {
  const response = await api.get("/loans", {
    params,
  });

  return response.data;
};

export const getTransactionsReport = async (
  params?: TransactionReportFilters
) => {
  const response = await api.get("/transactions", {
    params,
  });

  return response.data;
};

// Ledger cash summary.
export const getCashSummaryReport = async () => {
  const response = await api.get("/transactions/summary");

  return response.data;
};