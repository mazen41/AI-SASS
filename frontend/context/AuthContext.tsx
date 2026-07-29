'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from 'react';
import {
  ApiError,
  AuthUser,
  apiGetUser,
  apiLogout,
  clearToken,
  isAuthenticated,
  saveToken,
} from '@/lib/api';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => Promise<void>;
  isLoggedIn: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      setLoading(false);
      return;
    }
    apiGetUser()
      .then(({ user }) => setUser(user))
      .catch((err: unknown) => {
        // Only treat this as "logged out" if the server explicitly rejected
        // the token (401). Network errors, CORS issues, 5xx, etc. should NOT
        // wipe a valid token — that's what was causing users to get logged
        // out on reload for reasons unrelated to their auth status.
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
          setUser(null);
        }
        // Otherwise: leave the token in place. `user` stays null for this
        // render, so protected UI won't show, but the next successful
        // request (or reload) can still pick the session back up.
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback((token: string, user: AuthUser) => {
    saveToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      clearToken();
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, isLoggedIn: Boolean(user) }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
