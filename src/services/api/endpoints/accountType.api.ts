

import {apiClient} from '../client';
import type {
  AccountTypeDetectionInput,
  AccountTypeDetectionResponse,
  ThresholdsResponse,
} from '../../../features/admin/types/accountType.types';

const BASE_PATH = '/api/account-type';
const MAP_DISTANCE_PATH = '/api/map-distance';

export type AccountType = 'Anchor' | 'Bread5' | 'Bread15' | 'Pit';

export interface ServerAccountTypeDetectionResult {
  success: boolean;
  accountType: AccountType;
  confidence: 'high' | 'low';
  reason: string;
  distanceMiles: number | null;
  drivingTimeMinutes: number | null;
  nearestAnchor: string | null;
  customerName?: string;
  thresholds?: {
    anchorMinRevenue: number;
    anchorMinRevenueGreenline: number;
    bread5MaxMiles: number;
    bread15MaxMiles: number;
    milesPerMinute: number;
  };
  error?: string;
}

export interface DestinationResult {
  destination: string;
  address?: string;
  storedDistanceMiles?: number;
  mapboxDistanceMiles?: number;
  drivingTimeMinutes?: number;
  error?: string;
}

export interface MapboxDetectionResult {
  success: boolean;
  biginCompany?: string;
  routeStarCustomer?: string;
  fromAddress?: string;
  destinations?: DestinationResult[];
  accountType?: AccountType;
  shortestDrivingTime?: number | null;
  nearestDestination?: string | null;
  reason?: string;
  error?: string;
  thresholds?: {
    bread5MaxMinutes: number;
    bread15MaxMinutes: number;
  };
}

export interface FrequencyDetectionResult {
  accountType: AccountType;
  confidence: 'high' | 'low';
  reason: string;
  drivingTimeMinutes: number | null;
  nearestDestination: string | null;
  destinations?: DestinationResult[];
  usedFallback?: boolean;
  fallbackReason?: string;
  error?: string;
}

export interface BatchFrequencyDetectionResult {
  success: boolean;
  biginCompany?: string;
  routeStarCustomer?: string;
  fromAddress?: string;
  results?: Record<number, FrequencyDetectionResult>;
  error?: string;
  thresholds?: {
    bread5MaxMinutes: number;
    bread15MaxMinutes: number;
  };
}

export const accountTypeApi = {
  
  async getThresholds(): Promise<ThresholdsResponse | null> {
    try {
      const response = await apiClient.get<ThresholdsResponse>(
        `${BASE_PATH}/thresholds`,
      );
      return response;
    } catch (error) {
      console.error('Error fetching account type thresholds:', error);
      return null;
    }
  },

  async detect(
    input: AccountTypeDetectionInput,
  ): Promise<AccountTypeDetectionResponse | null> {
    try {
      const response = await apiClient.post<AccountTypeDetectionResponse>(
        `${BASE_PATH}/detect`,
        input,
      );
      return response;
    } catch (error) {
      console.error('Error detecting account type:', error);
      return null;
    }
  },

  async detectFromDistance(params: {
    biginCompanyId?: string;
    routeStarCustomerId?: string;
    perVisitRevenue?: number;
    isGreenline?: boolean;
  }): Promise<ServerAccountTypeDetectionResult> {
    try {
      const response = await apiClient.post<ServerAccountTypeDetectionResult>(
        `${MAP_DISTANCE_PATH}/detect-account-type`,
        params,
      );

      if (response) {
        return response;
      }

      return {
        success: false,
        accountType: 'Pit',
        confidence: 'low',
        reason: 'Failed to detect account type',
        distanceMiles: null,
        drivingTimeMinutes: null,
        nearestAnchor: null,
      };
    } catch (error) {
      console.error('Error detecting account type from distance:', error);
      return {
        success: false,
        accountType: 'Pit',
        confidence: 'low',
        reason: error instanceof Error ? error.message : 'Unknown error',
        distanceMiles: null,
        drivingTimeMinutes: null,
        nearestAnchor: null,
      };
    }
  },

  async detectWithMapbox(
    biginCompanyId: string,
    frequency?: number,
  ): Promise<MapboxDetectionResult> {
    try {
      const payload: {biginCompanyId: string; frequency?: number} = {
        biginCompanyId,
      };
      if (frequency !== undefined) {
        payload.frequency = frequency;
      }
      const response = await apiClient.post<MapboxDetectionResult>(
        `${MAP_DISTANCE_PATH}/detect-account-type-mapbox`,
        payload,
      );
      return response || {success: false, error: 'No response data'};
    } catch (error) {
      console.error('Error detecting account type with Mapbox:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to detect account type',
      };
    }
  },

  async detectWithMapboxBatch(
    biginCompanyId: string,
    frequencies: number[],
  ): Promise<BatchFrequencyDetectionResult> {
    try {
      const response = await apiClient.post<BatchFrequencyDetectionResult>(
        `${MAP_DISTANCE_PATH}/detect-account-type-batch`,
        {biginCompanyId, frequencies},
      );
      return response || {success: false, error: 'No response data'};
    } catch (error) {
      console.error('Error detecting batch account types with Mapbox:', error);
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to detect account types',
      };
    }
  },
};

export default accountTypeApi;
