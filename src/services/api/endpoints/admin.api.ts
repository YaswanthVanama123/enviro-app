import {apiClient} from '../client';
import {API_BASE_URL} from '../../../config';

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
  email?: string | null;
  role: 'admin' | 'employee';
  isActive: boolean;
  lastLoginAt?: string;
  createdAt?: string;
  permissions?: {backupManagement: boolean; priceChanges: boolean};
}

export interface CreateAdminPayload {
  username: string;
  password: string;
  email?: string;
  permissions?: {backupManagement: boolean; priceChanges: boolean};
  isActive?: boolean;
}

export interface CreateEmployeePayload {
  username: string;
  password: string;
  fullName: string;
  email?: string;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  username?: string;
  fullName?: string;
  email?: string;
  isActive?: boolean;
  permissions?: {backupManagement?: boolean; priceChanges?: boolean};
}

export interface UserListResponse {
  users: UserListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface PayrollSettings {
  startDate: string | null;
  cycleType: 'weekly' | 'biweekly' | 'monthly';
  cycleDayOfWeek: number;
}

export interface ApprovalCutoff {
  enabled: boolean;
  dayOfWeek: number;
  hour: number;
  minute: number;
}

export interface AdminSettings {
  defaultApprovalTaskOwner: {id: string | null; name: string | null};
  approvalTaskSubject: string;
  payrollSettings?: PayrollSettings;
  approvalCutoff?: ApprovalCutoff;
}

export interface AdminSettingsResponse {
  success: boolean;
  settings: AdminSettings;
}

export interface PayrollPeriod {
  start: string;
  end: string;
  label: string;
}

export interface PayrollPeriodsResponse {
  success: boolean;
  settings: PayrollSettings;
  periods: {
    current: PayrollPeriod;
    previous: PayrollPeriod;
  };
}

export interface EmployeeAgreement {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  monthlyValue: number;
  annualCommission: number;
  weeklyCommission: number;
}

export interface EmployeePayroll {
  username: string;
  totalAgreements: number;
  totalMonthlyRevenue: number;
  totalAnnualCommission: number;
  totalWeeklyCommission: number;
  statusCounts: {
    draft: number;
    saved: number;
    pending_approval: number;
    approved: number;
    active: number;
  };
  agreements: EmployeeAgreement[];
}

export interface PayrollTotals {
  totalEmployees: number;
  totalAgreements: number;
  totalMonthlyRevenue: number;
  totalAnnualCommission: number;
  totalWeeklyCommission: number;
}

export interface PayrollEmployeesResponse {
  success: boolean;
  totals: PayrollTotals;
  employees: EmployeePayroll[];
  finalized?: boolean;
  snapshotAt?: string | null;
}

export interface PayrollHistoryItem {
  period: PayrollPeriod;
  employeeCount: number;
  totalAgreements: number;
  totalRevenue: number;
  totalCommission: number;
  finalized?: boolean;
  snapshotAt?: string | null;
}

export interface PayrollHistoryResponse {
  success: boolean;
  history: PayrollHistoryItem[];
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
    const parts: string[] = [];
    if (params?.role) parts.push(`role=${encodeURIComponent(params.role)}`);
    if (params?.limit) parts.push(`limit=${encodeURIComponent(String(params.limit))}`);
    const url = parts.length ? `/api/users?${parts.join('&')}` : '/api/users';

    const res = await apiClient.get<UserListResponse>(url);
    return res.data ?? null;
  },

  async createAdmin(data: CreateAdminPayload): Promise<{ok: boolean; message?: string}> {
    const res = await apiClient.post<{success: boolean}>('/api/users/admin', data);
    if (res.error || !res.data?.success) return {ok: false, message: res.error};
    return {ok: true};
  },

  async createEmployee(data: CreateEmployeePayload): Promise<{ok: boolean; message?: string}> {
    const res = await apiClient.post<{success: boolean}>('/api/users/employee', data);
    if (res.error || !res.data?.success) return {ok: false, message: res.error};
    return {ok: true};
  },

  async updateUser(
    type: 'admin' | 'employee',
    id: string,
    data: UpdateUserPayload,
  ): Promise<{ok: boolean; message?: string}> {
    const res = await apiClient.put<{success: boolean}>(`/api/users/${type}/${id}`, data);
    if (res.error || !res.data?.success) return {ok: false, message: res.error};
    return {ok: true};
  },

  async toggleUserStatus(
    type: 'admin' | 'employee',
    id: string,
    isActive: boolean,
  ): Promise<{ok: boolean; message?: string}> {
    const res = await apiClient.patch<{success: boolean}>(`/api/users/${type}/${id}/status`, {isActive});
    if (res.error || !res.data?.success) return {ok: false, message: res.error};
    return {ok: true};
  },

  async resetUserPassword(
    type: 'admin' | 'employee',
    id: string,
    newPassword: string,
  ): Promise<{ok: boolean; message?: string}> {
    const res = await apiClient.patch<{success: boolean}>(
      `/api/users/${type}/${id}/reset-password`,
      {newPassword},
    );
    if (res.error || !res.data?.success) return {ok: false, message: res.error};
    return {ok: true};
  },

  async getSettings(): Promise<AdminSettings | null> {
    const res = await apiClient.get<AdminSettingsResponse>('/api/admin-settings');
    if (res.error || !res.data?.success) return null;
    return res.data.settings;
  },

  async updateSettings(
    settings: Partial<AdminSettings>,
  ): Promise<AdminSettings | null> {
    const res = await apiClient.patch<AdminSettingsResponse>(
      '/api/admin-settings',
      settings,
    );
    if (res.error || !res.data?.success) return null;
    return res.data.settings;
  },

  async getPayrollPeriods(): Promise<PayrollPeriodsResponse | null> {
    const res = await apiClient.get<PayrollPeriodsResponse>('/api/payroll/periods');
    if (res.error || !res.data?.success) return null;
    return res.data;
  },

  async getPayrollEmployees(
    periodStart?: string,
    periodEnd?: string,
  ): Promise<PayrollEmployeesResponse | null> {
    const query =
      periodStart && periodEnd
        ? `?periodStart=${encodeURIComponent(periodStart)}&periodEnd=${encodeURIComponent(periodEnd)}`
        : '';
    const res = await apiClient.get<PayrollEmployeesResponse>(
      `/api/payroll/employees${query}`,
    );
    if (res.error || !res.data?.success) return null;
    return res.data;
  },

  async getPayrollHistory(limit: number = 12): Promise<PayrollHistoryResponse | null> {
    const res = await apiClient.get<PayrollHistoryResponse>(`/api/payroll/history?limit=${limit}`);
    if (res.error || !res.data?.success) return null;
    return res.data;
  },

  // Authenticated download URL (token in query so browser/Linking can fetch it).
  getPayrollPdfUrl(periodStart?: string, periodEnd?: string): string {
    const base = API_BASE_URL.replace(/\/+$/, '');
    const parts: string[] = [];
    const token = apiClient.getToken();
    if (token) parts.push(`token=${encodeURIComponent(token)}`);
    if (periodStart) parts.push(`periodStart=${encodeURIComponent(periodStart)}`);
    if (periodEnd) parts.push(`periodEnd=${encodeURIComponent(periodEnd)}`);
    return `${base}/api/payroll/download-pdf${parts.length ? `?${parts.join('&')}` : ''}`;
  },
};
