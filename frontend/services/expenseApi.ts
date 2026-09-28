import api from "./api";
import { assertWritable } from "./demoMode";

export const getExpenses = async (params?: {
  category?: string;
  fromDate?: string;
  toDate?: string;
}) => {
  const response = await api.get("/expenses", {
    params,
  });

  return response.data;
};

export const addExpense = async (data: {
  title: string;
  category?: string;
  amount: number;
  expenseDate?: string;
  note?: string;
}) => {
  assertWritable();

  const response = await api.post("/expenses", data);

  return response.data;
};
