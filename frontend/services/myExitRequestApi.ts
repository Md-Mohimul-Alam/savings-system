import api from "./api";
import { assertWritable } from "./demoMode";

export const getMyExitRequest = async () => {
  const response = await api.get("/exit-requests/my");

  return response.data;
};

export const createMyExitRequest = async (reason: string) => {
  assertWritable();

  const response = await api.post("/exit-requests", {
    reason,
  });

  return response.data;
};
