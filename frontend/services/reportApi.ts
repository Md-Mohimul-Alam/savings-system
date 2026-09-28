import api from "./api";

export const getDashboardReport = async () => {
  const response = await api.get("/dashboard");
  return response.data;
};

export const getMembersReport = async () => {
  const response = await api.get("/members");
  return response.data;
};

export const getContributionsReport = async () => {
  const response = await api.get("/contributions");
  return response.data;
};

export const getExpensesReport = async () => {
  const response = await api.get("/expenses");
  return response.data;
};

export const getInvestmentsReport = async () => {
  const response = await api.get("/investments");
  return response.data;
};