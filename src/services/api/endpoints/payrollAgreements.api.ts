import {apiClient, ApiResponse} from '../client';

export interface PayrollAgreement {
  id: string;
  title: string;
  createdBy: string;
  status: string;
  biginDealId: string | null;
  monthlyValue: number;
  annualCommission: number;
  weeklyCommission: number;
  createdAt: string;
  addedToPayroll: boolean;
  payrollAddedAt: string | null;
  payrollPeriodLabel: string | null;
  lockedAnnualCommission: number | null;
  lockedWeeklyCommission: number | null;
}

export interface PayrollAgreementsResponse {
  success: boolean;
  currentPeriod: {start: string; end: string; label: string} | null;
  agreements: PayrollAgreement[];
}

export const payrollAgreementsApi = {
  async list(): Promise<PayrollAgreementsResponse | null> {
    const res = await apiClient.get<PayrollAgreementsResponse>('/api/payroll/agreements');
    return res.data ?? null;
  },

  async complete(id: string): Promise<ApiResponse<any>> {
    return apiClient.post<any>(`/api/payroll/agreements/${id}/complete`, {});
  },
};
