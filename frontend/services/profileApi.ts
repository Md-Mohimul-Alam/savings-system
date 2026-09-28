import api from "./api";
import { assertWritable } from "./demoMode";

export const getMyMemberProfile = async () => {
  const response = await api.get("/members/me/profile");

  return response.data;
};

export const updateMyMemberProfile = async (data: {
  phone: string;
  address: string;
  nidNumber: string;
  passportNumber: string;
}) => {
  assertWritable();

  const response = await api.patch("/members/me/profile", data);

  return response.data;
};
