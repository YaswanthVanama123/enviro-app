import {apiClient} from '../client';

export type ActivityRange = 'today' | 'week' | 'month' | 'date';

export interface ActivityAgreement {
  id: string;
  title: string;
  status: string;
  createdAt: string;
}

export interface ActivityEmployee {
  username: string;
  name: string;
  count: number;
}

export interface AgreementActivityResponse {
  success: boolean;
  range: string;
  start: string;
  end: string;
  totalAgreements: number;
  totalEmployees: number;
  employees: ActivityEmployee[];
}

export interface EmployeeAgreementsResponse {
  success: boolean;
  username: string;
  count: number;
  agreements: ActivityAgreement[];
}

export interface ActivityDateRange {
  from?: string;
  to?: string;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const parts: string[] = [];
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
    }
  });
  return parts.length ? `?${parts.join('&')}` : '';
}

export const agreementActivityApi = {
  async getActivity(
    range: ActivityRange,
    dates?: ActivityDateRange,
  ): Promise<AgreementActivityResponse | null> {
    const query = buildQuery({
      range,
      from: range === 'date' ? dates?.from : undefined,
      to: range === 'date' ? dates?.to : undefined,
    });
    const res = await apiClient.get<AgreementActivityResponse>(
      `/api/agreement-activity${query}`,
    );
    if (res.error || !res.data?.success) return null;
    return res.data;
  },

  async getEmployeeAgreements(
    username: string,
    range: ActivityRange,
    dates?: ActivityDateRange,
  ): Promise<ActivityAgreement[] | null> {
    const query = buildQuery({
      username,
      range,
      from: range === 'date' ? dates?.from : undefined,
      to: range === 'date' ? dates?.to : undefined,
    });
    const res = await apiClient.get<EmployeeAgreementsResponse>(
      `/api/agreement-activity/employee${query}`,
    );
    if (res.error || !res.data?.success) return null;
    return res.data.agreements;
  },
};
