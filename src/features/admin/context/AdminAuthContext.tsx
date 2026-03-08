import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {apiClient} from '../../../services/api/client';
import {storage} from '../../../services/storage/storage.service';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
  id: string;
  username: string;
}

interface AdminAuthContextValue {
  user: AdminUser | null;
  isAuthenticated: boolean;
  authReady: boolean;
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AdminAuthContext = createContext<AdminAuthContextValue>({
  user: null,
  isAuthenticated: false,
  authReady: false,
  login: async () => null,
  logout: async () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AdminAuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Restore persisted session on mount
  useEffect(() => {
    (async () => {
      const token = await storage.getToken();
      const storedUser = await storage.getAdminUser();
      if (token && storedUser) {
        apiClient.setToken(token);
        setUser(storedUser);
      }
      setAuthReady(true);
    })();
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<string | null> => {
      const res = await apiClient.post<{token: string; admin: AdminUser}>(
        '/api/admin/login',
        {username: username.trim(), password},
      );
      if (res.error || !res.data) {
        return res.error ?? 'Login failed. Please try again.';
      }
      apiClient.setToken(res.data.token);
      await storage.setToken(res.data.token);
      await storage.setAdminUser(res.data.admin);
      setUser(res.data.admin);
      return null;
    },
    [],
  );

  const logout = useCallback(async () => {
    apiClient.setToken(null);
    await storage.clearAuth();
    setUser(null);
  }, []);

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        authReady,
        login,
        logout,
      }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
