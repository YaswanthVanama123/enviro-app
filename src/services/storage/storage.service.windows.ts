const TOKEN_KEY = 'admin_token';
const USER_KEY = 'admin_user';

const memory = new Map<string, string>();

export const storage = {
  async getToken(): Promise<string | null> {
    return memory.get(TOKEN_KEY) ?? null;
  },
  async setToken(token: string): Promise<void> {
    memory.set(TOKEN_KEY, token);
  },
  async removeToken(): Promise<void> {
    memory.delete(TOKEN_KEY);
  },
  async getAdminUser(): Promise<any | null> {
    const raw = memory.get(USER_KEY);
    if (!raw) {return null;}
    try {return JSON.parse(raw);} catch {return null;}
  },
  async setAdminUser(user: any): Promise<void> {
    memory.set(USER_KEY, JSON.stringify(user));
  },
  async clearAuth(): Promise<void> {
    memory.delete(TOKEN_KEY);
    memory.delete(USER_KEY);
  },
};
