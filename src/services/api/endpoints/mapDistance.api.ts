/**
 * Map Distance API for Mobile
 * API endpoints for map distance operations
 */

import {apiClient} from '../client';

export interface RouteStarCustomerOption {
  _id: string;
  routeStarId: string;
  name: string;
  company: string | null;
  city: string | null;
  state: string | null;
}

export interface MapDistanceResult {
  locationName: string;
  address: string;
  distance: string;
  duration: string;
}

export interface MapDistanceStats {
  totalCustomers: number;
  customersWithDistance: number;
  customersWithoutDistance: number;
  lastSyncDate: string | null;
}

export interface MapDistanceSyncJob {
  _id: string;
  jobType: 'full_sync' | 'single_fetch';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  totalCustomers: number;
  processedCustomers: number;
  currentCustomerName?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  fetchedData?: MapDistanceResult[];
}

export interface SyncStatusResponse {
  isRunning: boolean;
  isInterrupted: boolean;
  isPaused: boolean;
  job: MapDistanceSyncJob | null;
}

const BASE_PATH = '/api/map-distance';

export const mapDistanceApi = {
  /**
   * Get all RouteStar customers for dropdown selection
   */
  async getCustomers(): Promise<RouteStarCustomerOption[]> {
    try {
      const response = await apiClient.get<RouteStarCustomerOption[]>(
        `${BASE_PATH}/customers`,
      );
      return response || [];
    } catch (error) {
      console.error('Error fetching RouteStar customers:', error);
      return [];
    }
  },

  /**
   * Fetch distance for a specific customer
   */
  async fetchDistance(
    customerName: string,
  ): Promise<{success: boolean; error?: string; jobId?: string}> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        error?: string;
        jobId?: string;
      }>(`${BASE_PATH}/fetch`, {customerName});
      return response || {success: false, error: 'No response'};
    } catch (error) {
      console.error('Error fetching distance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get sync status
   */
  async getSyncStatus(): Promise<SyncStatusResponse> {
    try {
      const response =
        await apiClient.get<SyncStatusResponse>(`${BASE_PATH}/sync-status`);
      return (
        response || {
          isRunning: false,
          isInterrupted: false,
          isPaused: false,
          job: null,
        }
      );
    } catch (error) {
      console.error('Error getting sync status:', error);
      return {
        isRunning: false,
        isInterrupted: false,
        isPaused: false,
        job: null,
      };
    }
  },

  /**
   * Get stats
   */
  async getStats(): Promise<MapDistanceStats | null> {
    try {
      const response =
        await apiClient.get<MapDistanceStats>(`${BASE_PATH}/stats`);
      return response;
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  },

  /**
   * Start full sync
   */
  async startSync(): Promise<{success: boolean; error?: string}> {
    try {
      const response = await apiClient.post<{success: boolean; error?: string}>(
        `${BASE_PATH}/sync`,
        {},
      );
      return response || {success: false, error: 'No response'};
    } catch (error) {
      console.error('Error starting sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Cancel sync
   */
  async cancelSync(): Promise<{success: boolean; error?: string}> {
    try {
      const response = await apiClient.post<{success: boolean; error?: string}>(
        `${BASE_PATH}/cancel-sync`,
        {},
      );
      return response || {success: false, error: 'No response'};
    } catch (error) {
      console.error('Error cancelling sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Pause sync
   */
  async pauseSync(): Promise<{success: boolean; error?: string}> {
    try {
      const response = await apiClient.post<{success: boolean; error?: string}>(
        `${BASE_PATH}/pause-sync`,
        {},
      );
      return response || {success: false, error: 'No response'};
    } catch (error) {
      console.error('Error pausing sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  /**
   * Get sync history
   */
  async getSyncHistory(): Promise<MapDistanceSyncJob[]> {
    try {
      const response = await apiClient.get<MapDistanceSyncJob[]>(
        `${BASE_PATH}/sync-history`,
      );
      return response || [];
    } catch (error) {
      console.error('Error getting sync history:', error);
      return [];
    }
  },
};

export default mapDistanceApi;
