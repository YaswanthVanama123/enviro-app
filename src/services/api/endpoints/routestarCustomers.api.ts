/**
 * RouteStar Customers API for Mobile
 * API client for RouteStar customer management and sync
 */

import {apiClient} from '../client';
import type {
  RouteStarCustomer,
  CustomerSyncStatus,
  CustomerStats,
  CustomersListResponse,
  CustomersQueryParams,
} from '../../../features/admin/types/routestarCustomer.types';

const BASE_PATH = '/api/routestar-customers';

// ============================================================
// CUSTOMERS API
// ============================================================

export const routestarCustomersApi = {
  /**
   * Get all customers with pagination and filters
   */
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
      console.error('Error fetching RouteStar customers:', error);
      return null;
    }
  },

  /**
   * Get a single customer by ID
   */
  async getById(id: string): Promise<RouteStarCustomer | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: RouteStarCustomer;
      }>(`${BASE_PATH}/${id}`);
      return response.success ? response.data : null;
    } catch (error) {
      console.error('Error fetching customer:', error);
      return null;
    }
  },

  /**
   * Get customer statistics
   */
  async getStats(): Promise<CustomerStats | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: CustomerStats;
      }>(`${BASE_PATH}/stats`);

      if (response.success !== false) {
        // Handle both nested and flat response
        return response.data || (response as unknown as CustomerStats);
      }
      return null;
    } catch (error) {
      console.error('Error fetching customer stats:', error);
      return null;
    }
  },

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<CustomerSyncStatus | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: CustomerSyncStatus;
      }>(`${BASE_PATH}/sync/status`);

      if (response.success !== false) {
        // Handle both nested and flat response
        return response.data || (response as unknown as CustomerSyncStatus);
      }
      return null;
    } catch (error) {
      console.error('Error fetching sync status:', error);
      return null;
    }
  },

  /**
   * Start sync from RouteStar
   */
  async startSync(): Promise<{message: string; syncId?: string} | null> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        message: string;
        syncId?: string;
      }>(`${BASE_PATH}/sync/start`, {});

      if (response.success !== false) {
        return {
          message: response.message || 'Sync started',
          syncId: response.syncId,
        };
      }
      return null;
    } catch (error) {
      console.error('Error starting sync:', error);
      return null;
    }
  },

  /**
   * Search customers
   */
  async search(query: string): Promise<RouteStarCustomer[] | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: RouteStarCustomer[];
      }>(`${BASE_PATH}?search=${encodeURIComponent(query)}&limit=20`);

      if (response.success !== false) {
        return response.data || [];
      }
      return null;
    } catch (error) {
      console.error('Error searching customers:', error);
      return null;
    }
  },
};

export default routestarCustomersApi;
