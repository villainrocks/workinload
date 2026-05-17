/* This code fixed By Tg:@ImxCodex */
import api from '../api/axios';

export const authService = {
  /**
   * POST /auth/login
   * Body: { email, password }
   * Returns: { token: string, user: object }
   */
  login: (credentials) => api.post('/auth/login', credentials),

  /**
   * POST /auth/register
   * Body: { username, email, password }
   * Returns: { token: string, user: object }
   */
  register: (data) => api.post('/auth/register', data),

  /**
   * POST /auth/logout
   * Invalidates the session server-side (optional endpoint).
   */
  logout: () => api.post('/auth/logout'),

  /**
   * GET /auth/me
   * Returns the current user from the server using the stored token.
   * Used on app mount to validate a cached token.
   */
  me: () => api.get('/auth/me'),

  /**
   * POST /auth/refresh
   * Exchange a refresh token for a new access token.
   */
  refresh: (refreshToken) => api.post('/auth/refresh', { refresh_token: refreshToken }),
};
