

import {apiClient} from '../client';
import type {
  BiginAuditLog,
  ScrapeStatus,
  ScrapeSession,
  AuditStats,
  AuditLogsListResponse,
  AuditLogsQueryParams,
} from '../../../features/admin/types/biginAudit.types';

const BASE_PATH = '/api/bigin-audit';

export const biginAuditApi = {
  
  async getAll(
    params?: AuditLogsQueryParams,
  ): Promise<AuditLogsListResponse | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.set('search', params.search);
      if (params?.user) queryParams.set('user', params.user);
      if (params?.action) queryParams.set('action', params.action);
      if (params?.module) queryParams.set('module', params.module);
      if (params?.startDate) queryParams.set('startDate', params.startDate);
      if (params?.endDate) queryParams.set('endDate', params.endDate);
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.skip) queryParams.set('skip', String(params.skip));

      const response = await apiClient.get<AuditLogsListResponse>(
        `${BASE_PATH}?${queryParams.toString()}`,
      );

      const body = response.data as any;
      if (body && body.success !== false) {
        return {
          success: true,
          data: body.data || [],
          pagination: body.pagination || {
            total: 0,
            skip: 0,
            limit: 50,
            hasMore: false,
          },
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching Bigin audit logs:', error);
      return null;
    }
  },

  async getById(id: string): Promise<BiginAuditLog | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: BiginAuditLog;
      }>(`${BASE_PATH}/${id}`);
      const body = response.data as any;
      return body?.success ? body.data : null;
    } catch (error) {
      console.error('Error fetching audit log:', error);
      return null;
    }
  },

  async getStats(): Promise<AuditStats | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: AuditStats;
      }>(`${BASE_PATH}/stats`);

      const body = response.data as any;
      return body ? (body.data ?? body) : null;
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      return null;
    }
  },

  async getScrapeStatus(): Promise<ScrapeStatus | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: ScrapeStatus;
      }>(`${BASE_PATH}/scrape/status`);

      const body = response.data as any;
      return body ? (body.data ?? body) : null;
    } catch (error) {
      console.error('Error fetching scrape status:', error);
      return null;
    }
  },

  async getScrapeHistory(params?: {
    limit?: number;
    skip?: number;
  }): Promise<{
    data: ScrapeSession[];
    pagination: {total: number; limit: number; skip: number; hasMore: boolean};
  } | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.limit) {queryParams.append('limit', String(params.limit));}
      if (params?.skip) {queryParams.append('skip', String(params.skip));}

      const response = await apiClient.get<{
        success: boolean;
        data: ScrapeSession[];
        pagination: {total: number; limit: number; skip: number; hasMore: boolean};
      }>(`${BASE_PATH}/scrape/history?${queryParams.toString()}`);

      const body = response.data as any;
      if (body && body.success !== false) {
        return {
          data: body.data || [],
          pagination: body.pagination || {total: 0, limit: 20, skip: 0, hasMore: false},
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching scrape history:', error);
      return null;
    }
  },

  async startScrape(): Promise<{message: string; sessionId?: string} | null> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        sessionId?: string;
      }>(`${BASE_PATH}/scrape/start`, {});

      const body = response.data as any;
      if (body && body.success !== false) {
        return {
          message: body.message || 'Scrape started',
          sessionId: body.sessionId,
        };
      }
      return null;
    } catch (error) {
      console.error('Error starting scrape:', error);
      return null;
    }
  },

  async uploadCsv(fileUri: string, fileName: string): Promise<{
    success: boolean;
    message: string;
    data?: {
      totalRows: number;
      saved: number;
      skipped: number;
      errors: number;
      sessionId: string;
    };
  } | null> {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: 'text/csv',
        name: fileName,
      } as unknown as Blob);

      const response = await apiClient.postFormData<{
        success: boolean;
        message: string;
        data: {
          totalRows: number;
          saved: number;
          skipped: number;
          errors: number;
          sessionId: string;
        };
      }>(`${BASE_PATH}/upload-csv`, formData);

      const body = response.data as any;
      if (body && body.success !== false) {
        return {
          success: true,
          message: body.message || 'Upload complete',
          data: body.data,
        };
      }
      return null;
    } catch (error) {
      console.error('Error uploading CSV:', error);
      return null;
    }
  },

  async deleteAll(): Promise<{
    success: boolean;
    message: string;
    data?: {deletedCount: number; previousCount: number};
  } | null> {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message: string;
        data: {deletedCount: number; previousCount: number};
      }>(`${BASE_PATH}/delete-all`);

      const body = response.data as any;
      if (body && body.success !== false) {
        return {
          success: true,
          message: body.message || 'All audit logs deleted',
          data: body.data,
        };
      }
      return null;
    } catch (error) {
      console.error('Error deleting all audit logs:', error);
      return null;
    }
  },

  async deleteUnnecessary(): Promise<{
    success: boolean;
    message: string;
    data?: {deletedCount: number; keptCount: number; previousTotal: number};
  } | null> {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message: string;
        data: {deletedCount: number; keptCount: number; previousTotal: number};
      }>(`${BASE_PATH}/delete-unnecessary`);

      const body = response.data as any;
      if (body && body.success !== false) {
        return {
          success: true,
          message: body.message || 'Unnecessary audit logs deleted',
          data: body.data,
        };
      }
      return null;
    } catch (error) {
      console.error('Error deleting unnecessary audit logs:', error);
      return null;
    }
  },

  async checkInsideSalesEligibility(salespersonName: string): Promise<{
    success: boolean;
    data?: {
      salespersonName: string;
      isInsideSales: boolean;
      matchCount: number;
      totalAgreementsByUser?: number;
      agreementCount?: number;
      biginIdCount?: number;
      allBiginIds?: string[];
      agreementDetails?: Array<{
        agreementId?: string;
        biginId: string | null;
        title: string;
        createdAt: string;
        createdBy?: string;
        dealName?: string;
      }>;
      matchedBiginIds?: string[];
      message?: string;
      matchDetails: Array<{
        recordId?: string;
        recordName: string;
        action: string;
        timestamp: string;
        module: string;
      }>;
    };
  } | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: {
          salespersonName: string;
          isInsideSales: boolean;
          matchCount: number;
          totalAgreementsByUser?: number;
          agreementCount?: number;
          biginIdCount?: number;
          allBiginIds?: string[];
          agreementDetails?: Array<{
            agreementId?: string;
            biginId: string | null;
            title: string;
            createdAt: string;
            createdBy?: string;
            dealName?: string;
          }>;
          matchedBiginIds?: string[];
          message?: string;
          matchDetails: Array<{
            recordId?: string;
            recordName: string;
            action: string;
            timestamp: string;
            module: string;
          }>;
        };
      }>(`${BASE_PATH}/check-inside-sales?salespersonName=${encodeURIComponent(salespersonName)}`);

      const result = response.data;
      return result?.success ? result : null;
    } catch (error) {
      console.error('Error checking inside sales eligibility:', error);
      return null;
    }
  },
};

export default biginAuditApi;
