import api from "./api";
import { assertWritable } from "./demoMode";

export type LoanStatus = "pending" | "approved" | "rejected" | "active" | "repaid" | "cancelled";
export type LoanFilters = { status?: LoanStatus; memberId?: string };
export type CreateLoanRequestInput = {
  // Required for admins; members may omit to use their own profile.
  memberId?: string;
  amount: number;
  reason: string;
};
export type ApproveLoanInput = {
  approvedAmount?: number;
  repaymentDueDate?: string;
  adminNote?: string;
};
export type RejectLoanInput = { adminNote?: string };
export type LoanRepaymentInput = {
  // This payment only, not the cumulative total.
  amount: number;
  note?: string;
};
const loanPath = (id: string) => `/loans/${encodeURIComponent(id)}`;
export const getLoans = async (params?: LoanFilters) => {
  const response = await api.get("/loans", { params });
  return response.data;
};
export const getLoanById = async (id: string) => {
  const response = await api.get(loanPath(id));
  return response.data;
};
export const createLoanRequest = async (data: CreateLoanRequestInput) => {
  assertWritable();
  const response = await api.post("/loans", data);
  return response.data;
};
export const approveLoan = async (id: string, data: ApproveLoanInput = {}) => {
  assertWritable();
  const response = await api.patch(`${loanPath(id)}/approve`, data);
  return response.data;
};
export const rejectLoan = async (id: string, data: RejectLoanInput = {}) => {
  assertWritable();
  const response = await api.patch(`${loanPath(id)}/reject`, data);
  return response.data;
};
// Records a transfer; does not send money.
export const disburseLoan = async (id: string) => {
  assertWritable();
  const response = await api.post(`${loanPath(id)}/disburse`, {});
  return response.data;
};
export const recordLoanRepayment = async (id: string, data: LoanRepaymentInput) => {
  assertWritable();
  const response = await api.post(`${loanPath(id)}/repayments`, data);
  return response.data;
};

