import {apiClient} from './apiClient';

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

// ─── Helper: format Date → 'YYYY-MM-DD' (no timezone shift) ──────────────────
function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ─── Date range calculators (mirrors webapp Home.tsx exactly) ─────────────────
export function getWeekRange(): {startDate: string; endDate: string; groupBy: string} {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - daysToMonday);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return {
    startDate: formatDate(startOfWeek),
    endDate: formatDate(endOfWeek),
    groupBy: 'day',
  };
}

export function getMonthRange(): {startDate: string; endDate: string; groupBy: string} {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return {
    startDate: formatDate(startOfMonth),
    endDate: formatDate(endOfMonth),
    groupBy: 'week',
  };
}

export function getYearRange(): {startDate: string; endDate: string; groupBy: string} {
  const today = new Date();
  const startOfYear = new Date(today.getFullYear(), 0, 1);
  const endOfYear = new Date(today.getFullYear(), 11, 31);
  return {
    startDate: formatDate(startOfYear),
    endDate: formatDate(endOfYear),
    groupBy: 'month',
  };
}

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
