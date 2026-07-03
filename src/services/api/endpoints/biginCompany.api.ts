import {apiClient} from '../client';
import type {
  BiginCompany,
  FetchStatus,
  CompanyStats,
  CompaniesListResponse,
  CompaniesQueryParams,
  LocationTypeStatus,
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
      if (params?.industry) queryParams.set('industry', params.industry);
      if (params?.owner) queryParams.set('owner', params.owner);
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.skip) queryParams.set('skip', String(params.skip));

      const response = await apiClient.get<CompaniesListResponse>(
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
      const body = response.data as any;
      return body && body.success !== false ? body.data ?? null : null;
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
      const body = response.data as any;
      if (body && body.success !== false) {
        return (body.data as CompanyStats) || (body as CompanyStats);
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
      const body = response.data as any;
      if (body && body.success !== false) {
        return (body.data as FetchStatus) || (body as FetchStatus);
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
      const body = response.data as any;
      if (body && body.success !== false) {
        return {
          message: body.message || 'Fetch started',
          sessionId: body.sessionId,
        };
      }
      return null;
    } catch (error) {
      console.error('Error starting fetch:', error);
      return null;
    }
  },

  async getLocationTypeStatus(): Promise<LocationTypeStatus | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: LocationTypeStatus;
      }>(`${BASE_PATH}/location-types/status`);
      const body = response.data as any;
      return body && body.success !== false ? body.data ?? null : null;
    } catch (error) {
      console.error('Error fetching location type status:', error);
      return null;
    }
  },

  async refreshLocationTypes(): Promise<{
    success: boolean;
    started?: boolean;
    alreadyRunning?: boolean;
    data?: LocationTypeStatus;
  } | null> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        started?: boolean;
        alreadyRunning?: boolean;
        data?: LocationTypeStatus;
      }>(`${BASE_PATH}/location-types/refresh`, {});
      const body = response.data as any;
      return body && body.success !== false ? body : null;
    } catch (error) {
      console.error('Error refreshing location types:', error);
      return null;
    }
  },

  async update(
    id: string,
    updates: Partial<BiginCompany>,
  ): Promise<BiginCompany | null> {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: BiginCompany;
      }>(`${BASE_PATH}/${id}`, updates);
      const body = response.data as any;
      return body && body.success !== false ? body.data ?? null : null;
    } catch (error) {
      console.error('Error updating company:', error);
      return null;
    }
  },

  async delete(id: string): Promise<boolean> {
    try {
      const response = await apiClient.delete<{success: boolean}>(
        `${BASE_PATH}/${id}`,
      );
      const body = response.data as any;
      return !!body && body.success !== false;
    } catch (error) {
      console.error('Error deleting company:', error);
      return false;
    }
  },
};

export default biginCompanyApi;
