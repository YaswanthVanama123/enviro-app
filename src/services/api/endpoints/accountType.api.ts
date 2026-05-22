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
   * Detect account type for a single location
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
};

export default accountTypeApi;
