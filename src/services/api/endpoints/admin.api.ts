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
};
