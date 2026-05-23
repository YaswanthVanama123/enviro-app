/**
 * Account Type Detection API for Mobile
 */

import {apiClient} from '../client';
import type {
  AccountTypeDetectionInput,
  AccountTypeDetectionResponse,
  ThresholdsResponse,
} from '../../../features/admin/types/accountType.types';

const BASE_PATH = '/api/account-type';
const MAP_DISTANCE_PATH = '/api/map-distance';

// Server-side detection response (from map-distance API)
export interface ServerAccountTypeDetectionResult {
  success: boolean;
  accountType: 'Anchor' | 'Bread5' | 'Bread15' | 'Pit';
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

export const accountTypeApi = {
  /**
   * Get account type detection thresholds and rules
   */
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

  /**
   * Detect account type for a single location (client-side calculation)
   */
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

  /**
   * Detect account type using server-side distance data
   * Uses the mapped RouteStar customer and stored map distance records
   *
   * @param biginCompanyId - The Bigin company ID (Zoho ID string)
   * @param perVisitRevenue - Optional per-visit revenue for revenue-based detection
   * @param isGreenline - Whether this is a Greenline customer
   */
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
};

export default accountTypeApi;
