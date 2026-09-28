import api from "./api";

export const getMyMemberProfile = async () => {
  const response = await api.get(
    "/members/me/profile"
  );

  return response.data;
};