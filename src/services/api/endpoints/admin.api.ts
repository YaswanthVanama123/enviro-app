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

export interface PayrollSettings {
  startDate: string | null;
  cycleType: 'weekly' | 'biweekly' | 'monthly';
  cycleDayOfWeek: number;
}

export interface AdminSettings {
  defaultApprovalTaskOwner: {id: string | null; name: string | null};
  approvalTaskSubject: string;
  payrollSettings?: PayrollSettings;
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
}

export interface PayrollHistoryItem {
  period: PayrollPeriod;
  employeeCount: number;
  totalAgreements: number;
  totalRevenue: number;
  totalCommission: number;
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
    const queryParams = new URLSearchParams();
    if (params?.role) queryParams.set('role', params.role);
    if (params?.limit) queryParams.set('limit', params.limit.toString());

    const queryString = queryParams.toString();
    const url = queryString ? `/api/users?${queryString}` : '/api/users';

    const res = await apiClient.get<UserListResponse>(url);
    return res.data ?? null;
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

  // Payroll API methods
  async getPayrollPeriods(): Promise<PayrollPeriodsResponse | null> {
    const res = await apiClient.get<PayrollPeriodsResponse>('/api/payroll/periods');
    if (res.error || !res.data?.success) return null;
    return res.data;
  },

  async getPayrollEmployees(): Promise<PayrollEmployeesResponse | null> {
    const res = await apiClient.get<PayrollEmployeesResponse>('/api/payroll/employees');
    if (res.error || !res.data?.success) return null;
    return res.data;
  },

  async getPayrollHistory(limit: number = 12): Promise<PayrollHistoryResponse | null> {
    const res = await apiClient.get<PayrollHistoryResponse>(`/api/payroll/history?limit=${limit}`);
    if (res.error || !res.data?.success) return null;
    return res.data;
  },
};
