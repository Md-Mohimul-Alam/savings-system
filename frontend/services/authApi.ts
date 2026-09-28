import api from "./api";
import { saveAuthSession } from "./demoMode";

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

export const loginUser = async (
  email: string,
  phone: string,
  password: string
) => {
  const response = await api.post("/auth/login", {
    email,
    phone,
    password,
  });

  saveAuthSession(response.data);

  return response.data;
};

export const registerUser = async (data: RegisterData) => {
  const response = await api.post("/auth/register", data);

  return response.data;
};

export const getCurrentUser = async () => {
  const response = await api.get("/auth/me");

  const payload = response.data;
  const user = payload?.user || payload;

  if (typeof window !== "undefined" && user) {
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem(
      "isDemo",
      user?.isDemo === true || user?.dataScope === "demo"
        ? "true"
        : "false"
    );
  }

  return response.data;
};
