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
    let status = 200;
    try {
      const res = await fetch(url, {method: 'GET'});
      status = res.status;
      if (!res.ok) {
        if (res.status === 429) {
          const body = await res.json().catch(() => ({}));
          const err = new Error(body.error || 'A PDF export is already in progress. Please wait and try again.');
          (err as any).code = 'PUPPETEER_BUSY';
          throw err;
        }
        throw new Error(`Export failed: ${res.status}`);
      }
    } catch (err: any) {
      if (err.code === 'PUPPETEER_BUSY') {throw err;}
      if (status !== 200) {throw err;}
      throw err;
    }
    await import('react-native').then(({Linking}) => Linking.openURL(url));
  },
};
