/* This code fixed By Tg:@ImxCodex */
/**
 * Token utilities — single source of truth for JWT storage.
 * Using 'tg_token' as the key to avoid conflicts with other apps.
 */

const TOKEN_KEY = 'tg_token';
const USER_KEY  = 'tg_user';

export const tokenUtils = {
  /** Store the raw JWT string */
  set: (token) => localStorage.setItem(TOKEN_KEY, token),

  /** Retrieve the raw JWT string */
  get: () => localStorage.getItem(TOKEN_KEY),

  /** Remove JWT from storage */
  remove: () => localStorage.removeItem(TOKEN_KEY),

  /** Returns true if a token exists (does NOT validate expiry) */
  exists: () => !!localStorage.getItem(TOKEN_KEY),

  /**
   * Decode the payload of a JWT (Base64url → JSON).
   * Does NOT verify the signature — that's the backend's job.
   */
  decode: (token) => {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    } catch {
      return null;
    }
  },

  /** Returns true if the stored token is expired */
  isExpired: () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return true;
    const payload = tokenUtils.decode(token);
    if (!payload?.exp) return false; // no expiry field = treat as valid
    return Date.now() >= payload.exp * 1000;
  },

  /** Persist user object so we don't need an extra /me call on reload */
  setUser: (user) => localStorage.setItem(USER_KEY, JSON.stringify(user)),
  getUser: () => {
    try { return JSON.parse(localStorage.getItem(USER_KEY)); }
    catch { return null; }
  },
  removeUser: () => localStorage.removeItem(USER_KEY),

  /** Wipe all auth-related storage in one call */
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};
