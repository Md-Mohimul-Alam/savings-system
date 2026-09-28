import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
} from "axios";
import { clearAuthSession } from "./demoMode";

const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL ||
    "https://savings-system-api.vercel.app/api",

  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  }
);

api.interceptors.response.use(
  (response) => response,
  (
    error: AxiosError<{
      success?: boolean;
      message?: string;
      demoMode?: boolean;
    }>
  ) => {
    const status = error.response?.status;
    const data = error.response?.data;

    if (status === 403 && data?.demoMode) {
      console.warn(
        data.message ||
          "Demo Mode is read-only. Changes are disabled."
      );
    }

    if (status === 401) {
      clearAuthSession();
    }

    return Promise.reject(error);
  }
);

export default api;
