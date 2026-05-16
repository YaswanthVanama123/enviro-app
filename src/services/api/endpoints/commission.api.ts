import {apiClient, ApiResponse} from '../client';
import type {
  CommissionRules,
  CommissionCalculationInput,
  CommissionCalculationResult,
  CommissionRecord,
} from '../../../features/admin/types/commission.types';

export interface CommissionRecordsResponse {
  records: CommissionRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export const commissionApi = {
  // =========================================
  // Commission Rules Endpoints
  // =========================================

  /**
   * Get the currently active commission rules
   */
  async getActiveRules(): Promise<CommissionRules | null> {
    const res = await apiClient.get<CommissionRules>('/api/commission/rules/active');
    return res.data ?? null;
  },

  /**
   * Get all commission rules (admin only)
   */
  async getAllRules(): Promise<CommissionRules[]> {
    const res = await apiClient.get<CommissionRules[]>('/api/commission/rules');
    return res.data ?? [];
  },

  /**
   * Update commission rules (admin only)
   */
  async updateRules(
    id: string,
    payload: Partial<CommissionRules>,
  ): Promise<ApiResponse<CommissionRules>> {
    return apiClient.put<CommissionRules>(`/api/commission/rules/${id}`, payload);
  },

  // =========================================
  // Commission Calculation Endpoints
  // =========================================

  /**
   * Calculate commission based on input
   */
  async calculate(
    input: CommissionCalculationInput,
  ): Promise<CommissionCalculationResult | null> {
    const res = await apiClient.post<CommissionCalculationResult>(
      '/api/commission/calculate',
      input,
    );
    return res.data ?? null;
  },

  // =========================================
  // Commission Records Endpoints
  // =========================================

  /**
   * Save a commission calculation as a record
   */
  async saveRecord(
    record: Omit<CommissionRecord, '_id' | 'createdAt' | 'createdBy'>,
  ): Promise<CommissionRecord | null> {
    const res = await apiClient.post<CommissionRecord>('/api/commission/records', record);
    return res.data ?? null;
  },

  /**
   * Get commission records with optional filters
   */
  async getRecords(params?: {
    salesPersonId?: string;
    status?: string;
    limit?: number;
    page?: number;
  }): Promise<CommissionRecordsResponse | null> {
    const queryParams = new URLSearchParams();

    if (params?.salesPersonId) {
      queryParams.set('salesPersonId', params.salesPersonId);
    }
    if (params?.status) {
      queryParams.set('status', params.status);
    }
    if (params?.limit) {
      queryParams.set('limit', params.limit.toString());
    }
    if (params?.page) {
      queryParams.set('page', params.page.toString());
    }

    const queryString = queryParams.toString();
    const url = queryString
      ? `/api/commission/records?${queryString}`
      : '/api/commission/records';

    const res = await apiClient.get<CommissionRecordsResponse>(url);
    return res.data ?? null;
  },

  /**
   * Get a single commission record by ID
   */
  async getRecordById(id: string): Promise<CommissionRecord | null> {
    const res = await apiClient.get<CommissionRecord>(`/api/commission/records/${id}`);
    return res.data ?? null;
  },

  /**
   * Update commission record status (admin only)
   */
  async updateRecordStatus(
    id: string,
    status: CommissionRecord['status'],
  ): Promise<ApiResponse<CommissionRecord>> {
    return apiClient.patch<CommissionRecord>(`/api/commission/records/${id}/status`, {
      status,
    });
  },

  /**
   * Delete a commission record (admin only)
   */
  async deleteRecord(id: string): Promise<ApiResponse<{message: string}>> {
    return apiClient.delete<{message: string}>(`/api/commission/records/${id}`);
  },
};
