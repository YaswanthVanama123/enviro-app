import {apiClient} from '../client';
import {API_BASE_URL} from '../../../config';
import {
  getWeekRange,
  getMonthRange,
  getYearRange,
} from '../../../shared/utils/date.utils';

export interface StatusCounts {
  done: number;
  pending: number;
  saved: number;
  drafts: number;
  total: number;
}

export interface TimeSeriesPoint {
  period: string;
  done: number;
  pending: number;
  saved: number;
  drafts: number;
}

export interface DocumentStatusCountsResult {
  success: boolean;
  counts: StatusCounts;
  timeSeries?: TimeSeriesPoint[];
  _metadata?: any;
}

export {getWeekRange, getMonthRange, getYearRange};

export const pdfApi = {
  async getDocumentStatusCounts(options: {
    startDate?: string | null;
    endDate?: string | null;
    groupBy?: string;
  } = {}): Promise<DocumentStatusCountsResult> {
    const params = new URLSearchParams();
    if (options.startDate) {params.append('startDate', options.startDate);}
    if (options.endDate) {params.append('endDate', options.endDate);}
    if (options.groupBy) {params.append('groupBy', options.groupBy);}

    const res = await apiClient.get<DocumentStatusCountsResult>(
      `/api/pdf/document-status-counts?${params.toString()}`,
    );

    if (res.error || !res.data) {
      throw new Error(res.error || 'Failed to fetch status counts');
    }
    return res.data;
  },

  getPricingCatalogExportUrl(): string {
    const token = apiClient.getToken();
    const base = API_BASE_URL.replace(/\/+$/, '');
    const tokenParam = token ? `?token=${encodeURIComponent(token)}` : '';
    return `${base}/api/pdf/pricing-catalog/export${tokenParam}`;
  },

  async exportPricingCatalogPdf(): Promise<void> {
    const url = this.getPricingCatalogExportUrl();
    // The endpoint streams the PDF as an attachment and authenticates via the
    // `?token=` query param, so just open it — the browser handles the download.
    // (Don't pre-fetch: that would render the PDF twice and can trip the busy guard.)
    const {Linking} = await import('react-native');
    const canOpen = await Linking.canOpenURL(url).catch(() => false);
    if (!canOpen) {
      throw new Error('Unable to open the export link on this device.');
    }
    await Linking.openURL(url);
  },

  async saveAccountTypeCache(
    agreementId: string,
    accountTypeCache: Record<number, any>,
  ): Promise<{success: boolean; error?: string}> {
    try {
      const response = await apiClient.patch<{success: boolean}>(
        `/api/pdf/customer-headers/${agreementId}/account-type-cache`,
        {accountTypeCache},
      );
      return {success: response?.success ?? true};
    } catch (error) {
      console.error('[PDF-API] Error saving account type cache:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save cache',
      };
    }
  },
};
