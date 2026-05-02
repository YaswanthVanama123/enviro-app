import EncryptedStorage from 'react-native-encrypted-storage';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

export const storage = {
  async getToken(): Promise<string | null> {
    return EncryptedStorage.getItem(TOKEN_KEY);
  },
  async setToken(token: string): Promise<void> {
    await EncryptedStorage.setItem(TOKEN_KEY, token);
  },
  async removeToken(): Promise<void> {
    await EncryptedStorage.removeItem(TOKEN_KEY);
  },
  async getAdminUser(): Promise<any | null> {
    const raw = await EncryptedStorage.getItem(USER_KEY);
    if (!raw) {return null;}
    try {return JSON.parse(raw);} catch {return null;}
  },
  async setAdminUser(user: any): Promise<void> {
    await EncryptedStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  async clearAuth(): Promise<void> {
    await EncryptedStorage.removeItem(TOKEN_KEY);
    await EncryptedStorage.removeItem(USER_KEY);
  },
};
