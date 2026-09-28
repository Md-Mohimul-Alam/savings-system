import api from "./api";

interface RegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
  nidNumber?: string;
  passportNumber?: string;
  reason?: string;
}

export const loginUser =
  async (
    email: string,
    phone: string,
    password: string
  ) => {
    const response =
      await api.post(
        "/auth/login",
        {
          email,
          phone,
          password,
        }
      );

    return response.data;
  };

export const registerUser =
  async (
    data: RegisterData
  ) => {
    const response =
      await api.post(
        "/auth/register",
        data
      );

    return response.data;
  };

export const getCurrentUser =
  async () => {
    const response =
      await api.get(
        "/auth/me"
      );

    return response.data;
  };
