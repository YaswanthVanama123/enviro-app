import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const ROLE_KEY = 'user_role';

const LEGACY_TOKEN_KEY = 'admin_token';
const LEGACY_USER_KEY = 'admin_user';

export type UserRole = 'admin' | 'employee';

export interface AuthUser {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  role: UserRole;
  isActive?: boolean;
}

const rawStore = Platform.OS === 'windows'
  ? {
      getItem: (key: string) => AsyncStorage.getItem(key),
      setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
      removeItem: (key: string) => AsyncStorage.removeItem(key),
    }
  : {
      getItem: (key: string) => EncryptedStorage.getItem(key),
      setItem: (key: string, value: string) => EncryptedStorage.setItem(key, value),
      removeItem: (key: string) => EncryptedStorage.removeItem(key),
    };

const isKeyMissingError = (err: unknown): boolean => {
  const msg = err instanceof Error ? err.message : String(err);
  return /removing value/i.test(msg) || /not\s+found/i.test(msg);
};

const store = {
  getItem: rawStore.getItem,
  setItem: rawStore.setItem,
  removeItem: async (key: string): Promise<void> => {
    try {
      await rawStore.removeItem(key);
    } catch (err) {
      if (isKeyMissingError(err)) {
        
        return;
      }
      
      if (__DEV__) {
        console.warn(`[storage] removeItem(${key}) failed:`, err);
      }
    }
  },
};

export const storage = {
  async getToken(): Promise<string | null> {
    
    let token = await store.getItem(TOKEN_KEY);
    if (!token) {
      token = await store.getItem(LEGACY_TOKEN_KEY);
    }
    return token;
  },

  async setToken(token: string): Promise<void> {
    await store.setItem(TOKEN_KEY, token);
  },

  async removeToken(): Promise<void> {
    await store.removeItem(TOKEN_KEY);
    await store.removeItem(LEGACY_TOKEN_KEY);
  },

  async getUser(): Promise<AuthUser | null> {
    const raw = await store.getItem(USER_KEY);
    if (!raw) {
      
      const legacyRaw = await store.getItem(LEGACY_USER_KEY);
      if (legacyRaw) {
        try {
          const legacyUser = JSON.parse(legacyRaw);
          
          return {
            id: legacyUser.id,
            username: legacyUser.username,
            fullName: legacyUser.username,
            role: 'admin',
          };
        } catch {
          return null;
        }
      }
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  async setUser(user: AuthUser): Promise<void> {
    await store.setItem(USER_KEY, JSON.stringify(user));
  },

  async getRole(): Promise<UserRole | null> {
    const role = await store.getItem(ROLE_KEY);
    if (role === 'admin' || role === 'employee') {
      return role;
    }
    
    const user = await this.getUser();
    return user?.role || null;
  },

  async setRole(role: UserRole): Promise<void> {
    await store.setItem(ROLE_KEY, role);
  },

  async clearAuth(): Promise<void> {
    await store.removeItem(TOKEN_KEY);
    await store.removeItem(USER_KEY);
    await store.removeItem(ROLE_KEY);
    
    await store.removeItem(LEGACY_TOKEN_KEY);
    await store.removeItem(LEGACY_USER_KEY);
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    const user = await this.getUser();
    return !!(token && user);
  },

  async getAdminUser(): Promise<AuthUser | null> {
    return this.getUser();
  },

  async setAdminUser(user: {id: string; username: string}): Promise<void> {
    const authUser: AuthUser = {
      id: user.id,
      username: user.username,
      fullName: user.username,
      role: 'admin',
    };
    await this.setUser(authUser);
    await this.setRole('admin');
  },
};
