import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';
const ROLE_KEY = 'user_role';

// Legacy keys for migration
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

const store = Platform.OS === 'windows'
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

export const storage = {
  async getToken(): Promise<string | null> {
    // Try new key first, then fallback to legacy
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
      // Try legacy key
      const legacyRaw = await store.getItem(LEGACY_USER_KEY);
      if (legacyRaw) {
        try {
          const legacyUser = JSON.parse(legacyRaw);
          // Convert legacy admin user to new format
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
    // Check if we have a user with role
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
    // Also clear legacy keys
    await store.removeItem(LEGACY_TOKEN_KEY);
    await store.removeItem(LEGACY_USER_KEY);
  },

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getToken();
    const user = await this.getUser();
    return !!(token && user);
  },

  // Legacy methods for backwards compatibility
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
