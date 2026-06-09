

import {apiClient} from '../client';
import type {
  RouteStarCustomer,
  CustomerSyncStatus,
  CustomerStats,
  CustomersListResponse,
  CustomersQueryParams,
} from '../../../features/admin/types/routestarCustomer.types';

const BASE_PATH = '/api/routestar-customers';

export const routestarCustomersApi = {
  async getAll(
    params?: CustomersQueryParams,
  ): Promise<CustomersListResponse | null> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.search) queryParams.set('search', params.search);
      if (params?.state) queryParams.set('state', params.state);
      if (params?.isActive !== undefined)
        queryParams.set('isActive', String(params.isActive));
      if (params?.limit) queryParams.set('limit', String(params.limit));
      if (params?.skip) queryParams.set('skip', String(params.skip));

      const response = await apiClient.get<CustomersListResponse>(
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
      console.error('Error fetching RouteStar customers:', error);
      return null;
    }
  },

  async getById(id: string): Promise<RouteStarCustomer | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: RouteStarCustomer;
      }>(`${BASE_PATH}/${id}`);
      const body = response.data as any;
      return body?.success ? body.data : null;
    } catch (error) {
      console.error('Error fetching customer:', error);
      return null;
    }
  },

  async getStats(): Promise<CustomerStats | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: CustomerStats;
      }>(`${BASE_PATH}/stats`);

      const body = response.data as any;
      if (body) {
        return body.data ?? body;
      }
      return null;
    } catch (error) {
      console.error('Error fetching customer stats:', error);
      return null;
    }
  },

  async getSyncStatus(): Promise<CustomerSyncStatus | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: CustomerSyncStatus;
      }>(`${BASE_PATH}/sync/status`);

      const body = response.data as any;
      if (body) {
        return body.data ?? body;
      }
      return null;
    } catch (error) {
      console.error('Error fetching sync status:', error);
      return null;
    }
  },

  async startSync(): Promise<{message: string; syncId?: string} | null> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        syncId?: string;
      }>(`${BASE_PATH}/sync/start`, {});

      const body = response.data as any;
      if (body && body.success !== false) {
        return {
          message: body.message || 'Sync started',
          syncId: body.syncId,
        };
      }
      return null;
    } catch (error) {
      console.error('Error starting sync:', error);
      return null;
    }
  },

  async search(query: string): Promise<RouteStarCustomer[] | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: RouteStarCustomer[];
      }>(`${BASE_PATH}?search=${encodeURIComponent(query)}&limit=20`);

      const body = response.data as any;
      if (body) {
        return body.data || [];
      }
      return null;
    } catch (error) {
      console.error('Error searching customers:', error);
      return null;
    }
  },
};

export default routestarCustomersApi;
