

import {apiClient} from '../client';
import type {
  BiginCompany,
  FetchStatus,
  CompanyStats,
  CompaniesListResponse,
  CompaniesQueryParams,
} from '../../../features/admin/types/biginCompany.types';

const BASE_PATH = '/api/bigin-companies';

export const biginCompanyApi = {
  
  async getAll(
    params?: CompaniesQueryParams,
  ): Promise<CompaniesListResponse | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.set('search', params.search);
      if (params?.city) queryParams.set('city', params.city);
      if (params?.state) queryParams.set('state', params.state);
      if (params?.owner) queryParams.set('owner', params.owner);
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.skip) queryParams.set('skip', String(params.skip));

      const response = await apiClient.get<CompaniesListResponse>(
        `${BASE_PATH}?${queryParams.toString()}`,
      );

      if (response.success !== false) {
        return {
          success: true,
          data: response.data || [],
          pagination: response.pagination || {
            total: 0,
            skip: 0,
            limit: 50,
            hasMore: false,
          },
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching Bigin companies:', error);
      return null;
    }
  },

  async getById(id: string): Promise<BiginCompany | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: BiginCompany;
      }>(`${BASE_PATH}/${id}`);
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Error fetching company:', error);
      return null;
    }
  },

  async getStats(): Promise<CompanyStats | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: CompanyStats;
      }>(`${BASE_PATH}/stats`);

      if (response.success !== false) {
        return response.data || (response as unknown as CompanyStats);
      }
      return null;
    } catch (error) {
      console.error('Error fetching company stats:', error);
      return null;
    }
  },

  async getFetchStatus(): Promise<FetchStatus | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: FetchStatus;
      }>(`${BASE_PATH}/fetch/status`);

      if (response.success !== false) {
        return response.data || (response as unknown as FetchStatus);
      }
      return null;
    } catch (error) {
      console.error('Error fetching fetch status:', error);
      return null;
    }
  },

  async startFetch(): Promise<{message: string; sessionId?: string} | null> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        sessionId?: string;
      }>(`${BASE_PATH}/fetch/start`, {});

      if (response.success !== false) {
        return {
          message: response.message || 'Fetch started',
          sessionId: response.sessionId,
        };
      }
      return null;
    } catch (error) {
      console.error('Error starting fetch:', error);
      return null;
    }
  },
};

export default biginCompanyApi;
