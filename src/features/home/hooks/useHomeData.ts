import {useState, useCallback, useEffect} from 'react';
import {pdfApi} from '../../../services/api/endpoints/pdf.api';
import {
  getWeekRange,
  getMonthRange,
  getYearRange,
} from '../../../shared/utils/date.utils';
import type {StatusCounts, TimeSeriesPoint} from '../../../services/api/endpoints/pdf.api';
import type {ChartBar} from '../components/BarChart';

export type TimeFilter = 'week' | 'month' | 'year';

function buildChartData(
  filter: TimeFilter,
  timeSeries: TimeSeriesPoint[] | null | undefined,
  fallback: StatusCounts,
): ChartBar[] {
  const today = new Date();

  if (timeSeries && timeSeries.length > 0) {
    if (filter === 'week') {
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const startOfWeek = new Date(today);
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startOfWeek.setDate(today.getDate() - daysToMonday);

      const dataMap = new Map(timeSeries.map(item => [item.period, item]));

      return Array.from({length: 7}, (_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        const d = dataMap.get(dateKey);
        return {
          label: dayNames[i],
          done: d?.done || 0,
          pending: d?.pending || 0,
          saved: d?.saved || 0,
          drafts: d?.drafts || 0,
        };
      });
    }

    if (filter === 'month') {
      return timeSeries.map((item, i) => ({
        label: `Week ${i + 1}`,
        done: item.done || 0,
        pending: item.pending || 0,
        saved: item.saved || 0,
        drafts: item.drafts || 0,
      }));
    }

    if (filter === 'year') {
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const currentYear = today.getFullYear();
      const dataMap = new Map<number, TimeSeriesPoint>();

      timeSeries.forEach(item => {
        const [yearStr, monthStr] = item.period.split('-');
        if (parseInt(yearStr, 10) === currentYear) {
          dataMap.set(parseInt(monthStr, 10) - 1, item);
        }
      });

      return Array.from({length: 12}, (_, month) => {
        const d = dataMap.get(month);
        return {
          label: monthNames[month],
          done: d?.done || 0,
          pending: d?.pending || 0,
          saved: d?.saved || 0,
          drafts: d?.drafts || 0,
        };
      });
    }
  }

  if (filter === 'week') {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return dayNames.map((label, i) => ({
      label,
      done: Math.floor(fallback.done / 7) + (i === 0 ? fallback.done % 7 : 0),
      pending: Math.floor(fallback.pending / 7) + (i === 0 ? fallback.pending % 7 : 0),
      saved: Math.floor(fallback.saved / 7) + (i === 0 ? fallback.saved % 7 : 0),
      drafts: Math.floor(fallback.drafts / 7) + (i === 0 ? fallback.drafts % 7 : 0),
    }));
  }

  if (filter === 'month') {
    const currentWeek = Math.ceil(today.getDate() / 7);
    return Array.from({length: 4}, (_, i) => ({
      label: `Week ${i + 1}`,
      done: i + 1 === currentWeek ? fallback.done : 0,
      pending: i + 1 === currentWeek ? fallback.pending : 0,
      saved: i + 1 === currentWeek ? fallback.saved : 0,
      drafts: i + 1 === currentWeek ? fallback.drafts : 0,
    }));
  }

  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const currentMonth = today.getMonth();
  return monthNames.map((label, i) => ({
    label,
    done: i === currentMonth ? fallback.done : 0,
    pending: i === currentMonth ? fallback.pending : 0,
    saved: i === currentMonth ? fallback.saved : 0,
    drafts: i === currentMonth ? fallback.drafts : 0,
  }));
}

const DEFAULT_COUNTS: StatusCounts = {
  done: 0,
  pending: 0,
  saved: 0,
  drafts: 0,
  total: 0,
};

export interface UseHomeDataResult {
  counts: StatusCounts;
  chartData: ChartBar[];
  loading: boolean;
  refreshing: boolean;
  apiError: string | null;
  timeFilter: TimeFilter;
  setTimeFilter: (filter: TimeFilter) => void;
  fetchData: (filter: TimeFilter, isRefresh?: boolean) => Promise<void>;
}

export function useHomeData(): UseHomeDataResult {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [counts, setCounts] = useState<StatusCounts>(DEFAULT_COUNTS);
  const [chartData, setChartData] = useState<ChartBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (filter: TimeFilter, isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setApiError(null);

      try {
        let range: {startDate: string; endDate: string; groupBy: string};
        if (filter === 'week') {range = getWeekRange();}
        else if (filter === 'month') {range = getMonthRange();}
        else {range = getYearRange();}

        const result = await pdfApi.getDocumentStatusCounts(range);

        const safeCounts: StatusCounts = {
          done: result?.counts?.done ?? 0,
          pending: result?.counts?.pending ?? 0,
          saved: result?.counts?.saved ?? 0,
          drafts: result?.counts?.drafts ?? 0,
          total:
            result?.counts?.total ??
            ((result?.counts?.done ?? 0) +
              (result?.counts?.pending ?? 0) +
              (result?.counts?.saved ?? 0) +
              (result?.counts?.drafts ?? 0)),
        };
        setCounts(safeCounts);

        setChartData(buildChartData(filter, result?.timeSeries, safeCounts));
      } catch (err: any) {
        setApiError(err?.message || 'Failed to load data');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchData(timeFilter);
  }, [timeFilter, fetchData]);

  return {
    counts,
    chartData,
    loading,
    refreshing,
    apiError,
    timeFilter,
    setTimeFilter,
    fetchData,
  };
}
