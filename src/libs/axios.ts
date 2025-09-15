import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'https://couples.test/api',
  timeout: 15000,
});

// attach token from localStorage if exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// optional: unify errors
api.interceptors.response.use(
  (resp) => resp,
  (err) => {
    const msg = err?.response?.data?.message || 'Something went wrong';
    return Promise.reject(new Error(msg));
  }
);
export default api;
