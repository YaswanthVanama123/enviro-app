import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

export const storage = {
  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },
  async setToken(token: string): Promise<void> {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },
  async removeToken(): Promise<void> {
    await AsyncStorage.removeItem(TOKEN_KEY);
  },
  async getAdminUser(): Promise<any | null> {
    const raw = await AsyncStorage.getItem(USER_KEY);
    if (!raw) {return null;}
    try {return JSON.parse(raw);} catch {return null;}
  },
  async setAdminUser(user: any): Promise<void> {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  async clearAuth(): Promise<void> {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  },
};
