import api from "./api";
import { assertWritable } from "./demoMode";

export type LoanStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "active"
  | "repaid"
  | "cancelled";

export type LoanFilters = {
  status?: LoanStatus;
  memberId?: string;
};

export type CreateLoanRequestInput = {
  // Required when an admin requests for a member.
  // Members can omit it: the backend uses their own profile.
  memberId?: string;

  amount: number;
  reason: string;
};

export type ApproveLoanInput = {
  // Omit to approve the full requested amount.
  approvedAmount?: number;

  // Optional future deadline, as an ISO timestamp.
  repaymentDueDate?: string;

  adminNote?: string;
};

export type RejectLoanInput = {
  adminNote?: string;
};

export type LoanRepaymentInput = {
  // This payment only, not the cumulative repayment total.
  amount: number;
  note?: string;
};

const loanPath = (id: string) =>
  `/loans/${encodeURIComponent(id)}`;

// Shared loan register, visible to active members and admins.
export const getLoans = async (params?: LoanFilters) => {
  const response = await api.get("/loans", {
    params,
  });

  return response.data;
};

export const getLoanById = async (id: string) => {
  const response = await api.get(loanPath(id));

  return response.data;
};

// Members request for themselves.
// Admins provide memberId to select the borrower.
export const createLoanRequest = async (
  data: CreateLoanRequestInput
) => {
  assertWritable();

  const response = await api.post("/loans", data);

  return response.data;
};

// Admin only. Approval does not move cash.
export const approveLoan = async (
  id: string,
  data: ApproveLoanInput = {}
) => {
  assertWritable();

  const response = await api.patch(
    `${loanPath(id)}/approve`,
    data
  );

  return response.data;
};

// Admin only.
export const rejectLoan = async (
  id: string,
  data: RejectLoanInput = {}
) => {
  assertWritable();

  const response = await api.patch(
    `${loanPath(id)}/reject`,
    data
  );

  return response.data;
};

// Admin only. Records the full approved amount as disbursed.
// This records a transfer; it does not send money.
export const disburseLoan = async (id: string) => {
  assertWritable();

  const response = await api.post(
    `${loanPath(id)}/disburse`,
    {}
  );

  return response.data;
};

// Admin only. Records money received against an active loan.
export const recordLoanRepayment = async (
  id: string,
  data: LoanRepaymentInput
) => {
  assertWritable();

  const response = await api.post(
    `${loanPath(id)}/repayments`,
    data
  );

  return response.data;
};