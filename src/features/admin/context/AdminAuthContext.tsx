import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import {apiClient} from '../../../services/api/client';
import {storage, AuthUser, UserRole} from '../../../services/storage/storage.service';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  authReady: boolean;
  loading: boolean;
  login: (username: string, password: string, userType: UserRole) => Promise<string | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  authReady: false,
  loading: false,
  login: async () => null,
  logout: async () => {},
});

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const token = await storage.getToken();
      const storedUser = await storage.getUser();
      if (token && storedUser) {
        apiClient.setToken(token);
        setUser(storedUser);
      }
      setAuthReady(true);
    })();
  }, []);

  const login = useCallback(
    async (username: string, password: string, userType: UserRole): Promise<string | null> => {
      setLoading(true);
      try {
        const endpoint = userType === 'admin'
          ? '/api/admin/login'
          : '/api/employee/login';

        interface LoginResponse {
          token: string;
          admin?: {id: string; username: string};
          user?: {id: string; username: string; fullName?: string; email?: string; isActive?: boolean};
          role?: string;
        }

        const res = await apiClient.post<LoginResponse>(endpoint, {
          username: username.trim(),
          password,
        });

        if (res.error || !res.data) {
          return res.error ?? 'Login failed. Please check your credentials.';
        }

        const {token} = res.data;
        let authUser: AuthUser;

        if (userType === 'admin') {
          const adminData = res.data.admin;
          if (!adminData) {
            return 'Invalid response from server';
          }
          authUser = {
            id: adminData.id,
            username: adminData.username,
            fullName: adminData.username,
            role: 'admin',
          };
        } else {
          const userData = res.data.user;
          if (!userData) {
            return 'Invalid response from server';
          }
          authUser = {
            id: userData.id,
            username: userData.username,
            fullName: userData.fullName || userData.username,
            email: userData.email,
            isActive: userData.isActive,
            role: 'employee',
          };
        }

        apiClient.setToken(token);
        await storage.setToken(token);
        await storage.setUser(authUser);
        await storage.setRole(authUser.role);
        setUser(authUser);

        return null;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    apiClient.setToken(null);
    await storage.clearAuth();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isAdmin: user?.role === 'admin',
        authReady,
        loading,
        login,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Legacy export for backwards compatibility
export {AuthProvider as AdminAuthProvider};
export {useAuth as useAdminAuth};
export type {AuthUser as AdminUser};
