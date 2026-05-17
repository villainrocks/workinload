/* This code fixed By Tg:@ImxCodex */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/auth.service';
import { tokenUtils } from '../utils/token';

/* ─── Context shape ────────────────────────────────────────────
  {
    user:            object | null,
    loading:         boolean,        // true only during initial hydration
    isAuthenticated: boolean,
    authError:       string | null,  // last login error message
    login(creds):    Promise<void>,
    logout():        void,
    clearError():    void,
  }
──────────────────────────────────────────────────────────────── */
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]         = useState(tokenUtils.getUser); // hydrate from cache
  const [loading, setLoading]   = useState(true);
  const [authError, setAuthError] = useState(null);

  /* ── Hydration on mount ─────────────────────────────────────
     If a token exists and isn't expired, validate it against /me.
     If /me fails (revoked, server restart, etc.) we clear everything.
  ─────────────────────────────────────────────────────────────── */
  useEffect(() => {
    const hydrate = async () => {
      if (!tokenUtils.exists() || tokenUtils.isExpired()) {
        tokenUtils.clear();
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const { data: userData } = await authService.me();
        setUser(userData);
        tokenUtils.setUser(userData);
      } catch {
        tokenUtils.clear();
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    hydrate();
  }, []);

  /* ── Login ──────────────────────────────────────────────────
     Calls POST /auth/login, stores token + user, updates state.
     On failure, sets authError so the UI can display it.
  ─────────────────────────────────────────────────────────────── */
  const login = useCallback(async (credentials) => {
    setAuthError(null);
    try {
      const { data: userData } = await authService.login(credentials);
      
      tokenUtils.set(userData.accessToken);
      tokenUtils.setUser(userData);
      setUser(userData);
    } catch (err) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Invalid credentials. Please try again.';
      setAuthError(message);
      throw err; // re-throw so the form can react too
    }
  }, []);

  /* ── Logout ─────────────────────────────────────────────────
     Optionally calls POST /auth/logout (for server-side session
     invalidation), then always clears local state regardless.
  ─────────────────────────────────────────────────────────────── */
  const logout = useCallback(async () => {
    try { await authService.logout(); } catch { /* ignore server errors */ }
    tokenUtils.clear();
    setUser(null);
    setAuthError(null);
  }, []);

  const clearError = useCallback(() => setAuthError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        authError,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
};
