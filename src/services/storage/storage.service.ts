import {Platform} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import EncryptedStorage from 'react-native-encrypted-storage';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

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
    return store.getItem(TOKEN_KEY);
  },
  async setToken(token: string): Promise<void> {
    await store.setItem(TOKEN_KEY, token);
  },
  async removeToken(): Promise<void> {
    await store.removeItem(TOKEN_KEY);
  },
  async getAdminUser(): Promise<any | null> {
    const raw = await store.getItem(USER_KEY);
    if (!raw) {return null;}
    try {return JSON.parse(raw);} catch {return null;}
  },
  async setAdminUser(user: any): Promise<void> {
    await store.setItem(USER_KEY, JSON.stringify(user));
  },
  async clearAuth(): Promise<void> {
    await store.removeItem(TOKEN_KEY);
    await store.removeItem(USER_KEY);
  },
};
