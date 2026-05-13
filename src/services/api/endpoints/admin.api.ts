import {apiClient} from '../client';

export interface DashboardStats {
  manualUploads: number;
  savedDocuments: number;
  totalDocuments: number;
}

export interface DashboardStatusCounts {
  done: number;
  pending: number;
  saved: number;
  drafts: number;
}

export interface AdminDashboardData {
  stats: DashboardStats;
  documentStatus: DashboardStatusCounts;
}

export interface UserListItem {
  id: string;
  username: string;
  fullName?: string;
  email?: string;
  role: 'admin' | 'employee';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface UserListResponse {
  users: UserListItem[];
  total: number;
  page: number;
  limit: number;
}

export const adminApi = {
  async getDashboard(): Promise<AdminDashboardData | null> {
    const res = await apiClient.get<AdminDashboardData>('/api/admin/dashboard');
    return res.data ?? null;
  },

  async resetPassword(
    developerName: string,
    newPassword: string,
  ): Promise<{ok: boolean; message?: string}> {
    const res = await apiClient.post<{message?: string}>(
      '/api/admin/reset-password',
      {developerName, newPassword},
    );
    if (res.error) {return {ok: false, message: res.error};}
    return {ok: true};
  },

  async listUsers(params?: {
    role?: 'admin' | 'employee';
    limit?: number;
  }): Promise<UserListResponse | null> {
    const queryParams = new URLSearchParams();
    if (params?.role) queryParams.set('role', params.role);
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = queryString ? `/api/users?${queryString}` : '/api/users';

    const res = await apiClient.get<UserListResponse>(url);
    return res.data ?? null;
  },
};
