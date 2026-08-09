import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";

const baseURL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const api = axios.create({
  baseURL,
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const adminToken = localStorage.getItem("admin_token");
    const guestToken = localStorage.getItem("guest_token");

    if (config.url?.startsWith("/admin")) {
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
    } else if (
      config.url?.startsWith("/guest") ||
      config.url?.startsWith("/companion")
    ) {
      if (guestToken) {
        config.headers.Authorization = `Bearer ${guestToken}`;
      }
    }

    return config;
  },
);
