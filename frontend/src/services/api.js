import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:8085/api",
  timeout: 12000,
});

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem("clinic-session");
  if (!raw) {
    return config;
  }

  try {
    const session = JSON.parse(raw);
    if (session?.token) {
      config.headers = {
        ...config.headers,
        Authorization: `Bearer ${session.token}`,
      };
    }
  } catch (_err) {
    // Ignore malformed local session and continue request.
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Handle session expiration
      if (error.response.status === 401) {
        localStorage.removeItem("clinic-session");
        window.location.href = "/";
      }
      
      // Extract structured error message from GlobalExceptionHandler
      const message = error.response.data?.message || error.response.data || "An unexpected error occurred";
      return Promise.reject({ ...error, message });
    }
    return Promise.reject(error);
  }
);

export default api;
