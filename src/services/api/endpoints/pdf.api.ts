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
};
