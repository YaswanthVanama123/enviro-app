import {apiClient} from '../client';
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
  period: string;   // 'YYYY-MM-DD' | 'YYYY-WW' | 'YYYY-MM'
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

// Re-export date helpers so consumers can import from one place if needed
export {getWeekRange, getMonthRange, getYearRange};

// ─── pdfApi ───────────────────────────────────────────────────────────────────
export const pdfApi = {
  /**
   * Get document status counts + time-series for the Home screen chart.
   * Mirrors: pdfApi.getDocumentStatusCounts() in the webapp.
   */
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
};
