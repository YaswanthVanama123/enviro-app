

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
  totalRecords: number;
  customersWithData: number;
  activeCustomers?: number;
  customersMissingData?: number;
  lastSyncAt: string | null;
  lastSyncRecords: number;
  storageSizeBytes: number;
  storageSizeFormatted: string;
  avgBytesPerRecord: number;
}

export interface MapDistanceSyncJob {
  _id: string;
  jobType: 'full_sync' | 'single_fetch' | 'update_sync';
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
  success?: boolean;
  isRunning: boolean;
  isInterrupted: boolean;
  isPaused: boolean;
  job: MapDistanceSyncJob | null;
}

const BASE_PATH = '/api/map-distance';

export const mapDistanceApi = {
  async getCustomers(search?: string): Promise<RouteStarCustomerOption[]> {
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const response = await apiClient.get<{
        success: boolean;
        data: RouteStarCustomerOption[];
        total: number;
      }>(`${BASE_PATH}/customers${query}`);
      const body = response.data as any;
      return body?.success ? body.data : [];
    } catch (error) {
      console.error('Error fetching RouteStar customers:', error);
      return [];
    }
  },

  async fetchDistance(
    customerName: string,
  ): Promise<{success: boolean; error?: string; jobId?: string}> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        error?: string;
        jobId?: string;
      }>(`${BASE_PATH}/fetch`, {customerName});
      return (
        (response.data as any) ?? {
          success: false,
          error: response.error || 'No response',
        }
      );
    } catch (error) {
      console.error('Error fetching distance:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async getSyncStatus(): Promise<SyncStatusResponse> {
    try {
      const response = await apiClient.get<SyncStatusResponse>(
        `${BASE_PATH}/sync/status`,
      );
      return (
        (response.data as any) ?? {
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

  async getStats(): Promise<MapDistanceStats | null> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        stats: MapDistanceStats;
      }>(`${BASE_PATH}/stats`);
      const body = response.data as any;
      return body?.stats ?? null;
    } catch (error) {
      console.error('Error getting stats:', error);
      return null;
    }
  },

  async startSync(): Promise<{success: boolean; error?: string}> {
    try {
      const response = await apiClient.post<{success: boolean; error?: string}>(
        `${BASE_PATH}/sync/start`,
        {},
      );
      const body = response.data as any;
      return body?.success
        ? {success: true}
        : {success: false, error: body?.error || response.error || 'Failed to start sync'};
    } catch (error) {
      console.error('Error starting sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async startUpdateSync(): Promise<{
    success: boolean;
    error?: string;
    totalCustomers?: number;
    refreshedCustomers?: number;
    backfilledCustomers?: number;
  }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        error?: string;
        totalCustomers?: number;
        refreshedCustomers?: number;
        backfilledCustomers?: number;
      }>(`${BASE_PATH}/sync/update`, {});
      const body = response.data as any;
      return body?.success
        ? {
            success: true,
            totalCustomers: body.totalCustomers,
            refreshedCustomers: body.refreshedCustomers,
            backfilledCustomers: body.backfilledCustomers,
          }
        : {
            success: false,
            error: body?.error || response.error || 'Failed to start update sync',
          };
    } catch (error) {
      console.error('Error starting update sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async startMissingSync(): Promise<{
    success: boolean;
    error?: string;
    totalCustomers?: number;
  }> {
    try {
      const response = await apiClient.post<{
        success: boolean;
        error?: string;
        totalCustomers?: number;
      }>(`${BASE_PATH}/sync/missing`, {});
      const body = response.data as any;
      return body?.success
        ? {success: true, totalCustomers: body.totalCustomers}
        : {
            success: false,
            error: body?.error || response.error || 'Failed to start new-customer sync',
          };
    } catch (error) {
      console.error('Error starting new-customer sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async cancelSync(): Promise<{success: boolean; error?: string}> {
    try {
      const response = await apiClient.post<{success: boolean; error?: string}>(
        `${BASE_PATH}/sync/cancel`,
        {},
      );
      const body = response.data as any;
      return {success: body?.success ?? false, error: body?.error};
    } catch (error) {
      console.error('Error cancelling sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async pauseSync(): Promise<{success: boolean; error?: string}> {
    try {
      const response = await apiClient.post<{success: boolean; error?: string}>(
        `${BASE_PATH}/sync/pause`,
        {},
      );
      const body = response.data as any;
      return {success: body?.success ?? false, error: body?.error};
    } catch (error) {
      console.error('Error pausing sync:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  },

  async getSyncHistory(): Promise<MapDistanceSyncJob[]> {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: MapDistanceSyncJob[];
      }>(`${BASE_PATH}/sync/history`);
      const body = response.data as any;
      return body?.data ?? [];
    } catch (error) {
      console.error('Error getting sync history:', error);
      return [];
    }
  },
};

export default mapDistanceApi;
