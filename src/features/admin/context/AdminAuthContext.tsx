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

      if (!token || !storedUser) {
        setAuthReady(true);
        return;
      }

      

      apiClient.setToken(token);
      const profileEndpoint =
        storedUser.role === 'admin' ? '/api/admin/me' : '/api/employee/me';
      const verify = await apiClient.get<{user?: any; admin?: any; role?: string}>(profileEndpoint);

      if (verify.error || verify.status === 401 || verify.status === 403 || verify.status === 0) {
        
        apiClient.setToken(null);
        await storage.clearAuth();
        setUser(null);
      } else {

        const freshAdmin = verify.data?.admin;
        const freshEmp = verify.data?.user;
        let merged: AuthUser = storedUser;
        if (storedUser.role === 'admin' && freshAdmin) {
          const adminUsername = (freshAdmin.username || '').trim() || storedUser.username;
          merged = {
            ...storedUser,
            id: freshAdmin.id || storedUser.id,
            username: adminUsername,
            fullName: adminUsername,
            role: 'admin',
          };
        } else if (storedUser.role === 'employee' && freshEmp) {
          const empUsername = (freshEmp.username || '').trim() || storedUser.username;
          const empFullName = (freshEmp.fullName || '').trim() || empUsername;
          merged = {
            ...storedUser,
            id: freshEmp.id || storedUser.id,
            username: empUsername,
            fullName: empFullName,
            email: freshEmp.email ?? storedUser.email,
            isActive: freshEmp.isActive ?? storedUser.isActive,
            role: 'employee',
          };
        }

        
        
        const hasIdentity =
          (merged.fullName?.trim() || '').length > 0 ||
          (merged.username?.trim() || '').length > 0 ||
          (merged.email?.trim() || '').length > 0;

        if (!hasIdentity) {
          apiClient.setToken(null);
          await storage.clearAuth();
          setUser(null);
        } else {
          await storage.setUser(merged);
          setUser(merged);
        }
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
          const adminUsername = (adminData.username || '').trim() || (adminData.id || '').toString();
          authUser = {
            id: adminData.id,
            username: adminUsername,
            fullName: adminUsername,
            role: 'admin',
          };
        } else {
          const userData = res.data.user;
          if (!userData) {
            return 'Invalid response from server';
          }
          const empUsername = (userData.username || '').trim();
          const empFullName = (userData.fullName || '').trim() || empUsername;
          authUser = {
            id: userData.id,
            username: empUsername,
            fullName: empFullName,
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

export {AuthProvider as AdminAuthProvider};
export {useAuth as useAdminAuth};
export type {AuthUser as AdminUser};
