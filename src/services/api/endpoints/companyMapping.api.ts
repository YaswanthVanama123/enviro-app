

import {apiClient} from '../client';

export interface CompanyMapping {
  _id: string;
  biginCompanyId: string;
  biginId: string;
  biginCompanyName: string;
  biginPhone: string | null;
  biginCity: string | null;
  biginState: string | null;
  routeStarCustomerId: string | null;
  routeStarId: string | null;
  routeStarCustomerName: string | null;
  routeStarCompany: string | null;
  routeStarCity: string | null;
  mappingStatus: 'mapped' | 'unmapped';
  mappedBy: string | null;
  mappedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MappingStats {
  total: number;
  mapped: number;
  unmapped: number;
}

export interface RouteStarCustomerOption {
  _id: string;
  routeStarId: string;
  name: string;
  company: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface MappingsListResponse {
  success: boolean;
  data: CompanyMapping[];
  pagination: {
    total: number;
    limit: number;
    skip: number;
    hasMore: boolean;
  };
}

export interface MappingQueryParams {
  search?: string;
  status?: 'all' | 'mapped' | 'unmapped';
  limit?: number;
  skip?: number;
}

const BASE_PATH = '/api/company-mappings';

export const companyMappingApi = {

  async getAll(params?: MappingQueryParams): Promise<MappingsListResponse | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.set('search', params.search);
      if (params?.status) queryParams.set('status', params.status);
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.skip) queryParams.set('skip', String(params.skip));

      const response = await apiClient.get<MappingsListResponse>(
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
            limit: 30,
            hasMore: false,
          },
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching mappings:', error);
      return null;
    }
  },

  async getStats(): Promise<MappingStats | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: MappingStats;
      }>(`${BASE_PATH}/stats`);

      const body = response.data as any;
      return body ? (body.data ?? body) : null;
    } catch (error) {
      console.error('Error fetching mapping stats:', error);
      return null;
    }
  },

  async getStatusByBigin(
    biginId: string,
  ): Promise<{isMapped: boolean; routeStarId: string | null; routeStarCustomerName: string | null} | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: {isMapped: boolean; routeStarId: string | null; routeStarCustomerName: string | null};
      }>(`${BASE_PATH}/status/${encodeURIComponent(biginId)}`);
      const body = response.data as any;
      const data = body?.data ?? body;
      return data ? {isMapped: !!data.isMapped, routeStarId: data.routeStarId ?? null, routeStarCustomerName: data.routeStarCustomerName ?? null} : null;
    } catch (error) {
      console.error('Error fetching mapping status:', error);
      return null;
    }
  },

  async getAvailableRouteStarCustomers(
    search?: string,
    includeAll?: boolean,
  ): Promise<RouteStarCustomerOption[] | null> {
    try {
      const queryParams = new URLSearchParams();
      if (search) queryParams.set('search', search);
      if (includeAll) queryParams.set('includeAll', 'true');
      queryParams.set('limit', '100');

      const response = await apiClient.get<{
        success: boolean;
        data: RouteStarCustomerOption[];
      }>(`${BASE_PATH}/routestar-available?${queryParams.toString()}`);

      const body = response.data as any;
      return body ? (body.data || []) : null;
    } catch (error) {
      console.error('Error fetching available RouteStar customers:', error);
      return null;
    }
  },

  async saveMapping(
    biginId: string,
    routeStarId: string | null,
    mappedBy?: string,
  ): Promise<CompanyMapping | null> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: CompanyMapping;
      }>(BASE_PATH, {biginId, routeStarId, mappedBy: mappedBy || 'admin'});
      const body = response.data as any;
      return body?.success ? body.data : null;
    } catch (error) {
      console.error('Error saving mapping:', error);
      return null;
    }
  },

  async updateMapping(
    id: string,
    routeStarId: string | null,
    mappedBy?: string,
  ): Promise<CompanyMapping | null> {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: CompanyMapping;
      }>(`${BASE_PATH}/${id}`, {routeStarId, mappedBy: mappedBy || 'admin'});
      const body = response.data as any;
      return body?.success ? body.data : null;
    } catch (error) {
      console.error('Error updating mapping:', error);
      return null;
    }
  },

  async deleteMapping(id: string): Promise<boolean> {
    try {
      const response = await apiClient.delete<{success: boolean}>(
        `${BASE_PATH}/${id}`,
      );
      const body = response.data as any;
      return !!body?.success;
    } catch (error) {
      console.error('Error deleting mapping:', error);
      return false;
    }
  },

  async bulkSave(
    mappings: Array<{biginId: string; routeStarId: string | null}>,
    mappedBy?: string,
  ): Promise<{
    total: number;
    saved: number;
    errors: number;
  } | null> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          total: number;
          saved: number;
          errors: number;
        };
      }>(`${BASE_PATH}/bulk`, {mappings, mappedBy: mappedBy || 'admin'});
      const body = response.data as any;
      return body?.success ? body.data : null;
    } catch (error) {
      console.error('Error bulk saving mappings:', error);
      return null;
    }
  },

  async initialize(): Promise<{
    total: number;
    created: number;
    skipped: number;
  } | null> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {total: number; created: number; skipped: number};
      }>(`${BASE_PATH}/initialize`, {});
      const body = response.data as any;
      return body?.success ? body.data : null;
    } catch (error) {
      console.error('Error initializing mappings:', error);
      return null;
    }
  },
};

export default companyMappingApi;
