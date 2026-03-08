import {useState, useCallback, useEffect, useRef} from 'react';
import {
  agreementsApi,
  SavedFileGroup,
  FileType,
  GetSavedFilesOptions,
} from '../../../services/api/endpoints/agreements.api';

// ─── Public interface ─────────────────────────────────────────────────────────

export interface UseSavedAgreementsResult {
  agreements: SavedFileGroup[];
  loading: boolean;
  refreshing: boolean;
  apiError: string | null;
  total: number;
  hasMore: boolean;
  searchQuery: string;
  activeFilter: string;
  setSearchQuery: (q: string) => void;
  setActiveFilter: (f: string) => void;
  refresh: () => void;
  loadMore: () => void;
  deleteAgreement: (id: string) => Promise<boolean>;
  deleteFile: (fileId: string, agreementId: string, fileType: FileType) => Promise<boolean>;
}

const PAGE_SIZE = 20;

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSavedAgreements(): UseSavedAgreementsResult {
  const [agreements, setAgreements] = useState<SavedFileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQueryState] = useState('');
  const [activeFilter, setActiveFilterState] = useState('all');

  // Refs to capture latest values without stale closures
  const searchRef = useRef('');
  const filterRef = useRef('all');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(
    async (opts: {
      pageNum: number;
      search: string;
      filter: string;
      append: boolean;
      isRefresh: boolean;
    }) => {
      const {pageNum, search, filter, append, isRefresh} = opts;

      if (isRefresh) {
        setRefreshing(true);
      } else if (!append) {
        setLoading(true);
      }
      setApiError(null);

      const options: GetSavedFilesOptions = {
        page: pageNum,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: filter !== 'all' ? filter : undefined,
        isDeleted: false,
        includeLogs: true,
        includeDrafts: true,
      };

      const result = await agreementsApi.getGrouped(options);

      if (isRefresh) {
        setRefreshing(false);
      } else if (!append) {
        setLoading(false);
      }

      if (result) {
        // Backend returns flat: { total, page, limit, groups[] }
        const items = result.groups ?? [];
        setAgreements(prev => (append ? [...prev, ...items] : items));
        setTotal(result.total ?? items.length);
        const totalPages = Math.ceil((result.total ?? items.length) / PAGE_SIZE);
        setHasMore((result.page ?? 1) < totalPages);
      } else {
        if (!append) {
          setAgreements([]);
        }
        setApiError('Could not load agreements. Check your connection.');
      }
    },
    [],
  );

  // Initial load
  useEffect(() => {
    fetchData({
      pageNum: 1,
      search: '',
      filter: 'all',
      append: false,
      isRefresh: false,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setSearchQuery = useCallback(
    (q: string) => {
      setSearchQueryState(q);
      searchRef.current = q;
      if (searchTimer.current) {clearTimeout(searchTimer.current);}
      searchTimer.current = setTimeout(() => {
        setPage(1);
        fetchData({
          pageNum: 1,
          search: q,
          filter: filterRef.current,
          append: false,
          isRefresh: false,
        });
      }, 400);
    },
    [fetchData],
  );

  const setActiveFilter = useCallback(
    (f: string) => {
      setActiveFilterState(f);
      filterRef.current = f;
      setPage(1);
      fetchData({
        pageNum: 1,
        search: searchRef.current,
        filter: f,
        append: false,
        isRefresh: false,
      });
    },
    [fetchData],
  );

  const refresh = useCallback(() => {
    setPage(1);
    fetchData({
      pageNum: 1,
      search: searchRef.current,
      filter: filterRef.current,
      append: false,
      isRefresh: true,
    });
  }, [fetchData]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading || refreshing) {return;}
    const nextPage = page + 1;
    setPage(nextPage);
    fetchData({
      pageNum: nextPage,
      search: searchRef.current,
      filter: filterRef.current,
      append: true,
      isRefresh: false,
    });
  }, [hasMore, loading, refreshing, page, fetchData]);

  const deleteAgreement = useCallback(
    async (id: string): Promise<boolean> => {
      const ok = await agreementsApi.deleteAgreement(id);
      if (ok) {
        setAgreements(prev => prev.filter(a => a.id !== id));
        setTotal(prev => Math.max(0, prev - 1));
      }
      return ok;
    },
    [],
  );

  const deleteFile = useCallback(
    async (fileId: string, agreementId: string, fileType: FileType): Promise<boolean> => {
      const ok = await agreementsApi.deleteFile(fileId, fileType);
      if (ok) {
        setAgreements(prev =>
          prev.map(a => {
            if (a.id !== agreementId) {return a;}
            const updatedFiles = a.files.filter(f => f.id !== fileId);
            return {...a, files: updatedFiles, fileCount: updatedFiles.length};
          }),
        );
      }
      return ok;
    },
    [],
  );

  return {
    agreements,
    loading,
    refreshing,
    apiError,
    total,
    hasMore,
    searchQuery,
    activeFilter,
    setSearchQuery,
    setActiveFilter,
    refresh,
    loadMore,
    deleteAgreement,
    deleteFile,
  };
}
