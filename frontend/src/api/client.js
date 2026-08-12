import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('normToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && localStorage.getItem('normToken')) {
      localStorage.removeItem('normToken');
      window.dispatchEvent(new Event('norm:session-expired'));
    }
    return Promise.reject(error);
  },
);

export const errorMessage = (error, fallback = 'Something went wrong') =>
  error.response?.data?.error?.message || error.message || fallback;
