import api from "./api";

export const getOwnershipSummary =
  async () => {
    const response =
      await api.get(
        "/ownership"
      );

    return response.data;
  };

export const getMemberOwnership =
  async (
    memberId: string
  ) => {
    const response =
      await api.get(
        `/ownership/member/${memberId}`
      );

    return response.data;
  };

export const getMyOwnership =
  async () => {
    const response =
      await api.get(
        "/ownership/me"
      );

    return response.data;
  };

export const syncOwnership =
  async () => {
    const response =
      await api.post(
        "/ownership/sync"
      );

    return response.data;
  };