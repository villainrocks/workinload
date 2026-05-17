/* This code fixed By Tg:@ImxCodex */
import axios from 'axios';
import { tokenUtils } from '../utils/token';

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

/* ─── Request interceptor ─────────────────────────────────────
   Attach JWT to every outgoing request.
   If the token is expired, clear storage & redirect immediately
   rather than letting the backend reject it.
──────────────────────────────────────────────────────────────── */
api.interceptors.request.use(
  (config) => {
    // Skip expiry check for public auth routes
    if (config.url.includes('/auth/login') || config.url.includes('/auth/register')) {
      return config;
    }

    if (tokenUtils.exists() && tokenUtils.isExpired()) {
      tokenUtils.clear();
      window.location.replace('/login');
      return Promise.reject(new Error('Token expired'));
    }

    const token = tokenUtils.get();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

/* ─── Response interceptor ────────────────────────────────────
   Extract 'data' from our consistent backend wrapper { success: true, data: ... }.
   401 → wipe auth and redirect to /login.
──────────────────────────────────────────────────────────────── */
api.interceptors.response.use(
  (response) => {
    // If our backend sent a success wrapper, unwrap it
    if (response.data?.success && response.data?.data !== undefined) {
      return { ...response, data: response.data.data };
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      tokenUtils.clear();
      window.location.replace('/login');
    }
    return Promise.reject(error);
  }
);

export default api;
