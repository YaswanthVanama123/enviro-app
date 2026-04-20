import {useState, useCallback, useEffect, useRef} from 'react';
import {
  agreementsApi,
  SavedFileGroup,
  FileType,
  GetSavedFilesOptions,
} from '../../../services/api/endpoints/agreements.api';

export interface UseTrashResult {
  agreements: SavedFileGroup[];
  loading: boolean;
  refreshing: boolean;
  apiError: string | null;
  total: number;
  hasMore: boolean;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  refresh: () => void;
  loadMore: () => void;
  restoreAgreement: (id: string) => Promise<boolean>;
  restoreFile: (fileId: string, agreementId: string, fileType: FileType) => Promise<boolean>;
  permanentlyDeleteAgreement: (id: string) => Promise<boolean>;
  permanentlyDeleteFile: (fileId: string, agreementId: string, fileType: FileType) => Promise<boolean>;
}

const PAGE_SIZE = 20;

export function useTrash(): UseTrashResult {
  const [agreements, setAgreements] = useState<SavedFileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQueryState] = useState('');

  const searchRef = useRef('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(
    async (opts: {
      pageNum: number;
      search: string;
      append: boolean;
      isRefresh: boolean;
    }) => {
      const {pageNum, search, append, isRefresh} = opts;

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
        isDeleted: true,
        isTrashView: true,
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
        const items = result.groups ?? [];
        setAgreements(prev => (append ? [...prev, ...items] : items));
        setTotal(result.total ?? items.length);
        const totalPages = Math.ceil((result.total ?? items.length) / PAGE_SIZE);
        setHasMore((result.page ?? 1) < totalPages);
      } else {
        if (!append) {
          setAgreements([]);
        }
        setApiError('Could not load trash. Check your connection.');
      }
    },
    [],
  );

  useEffect(() => {
    fetchData({pageNum: 1, search: '', append: false, isRefresh: false});
  }, []);

  const setSearchQuery = useCallback(
    (q: string) => {
      setSearchQueryState(q);
      searchRef.current = q;
      if (searchTimer.current) {clearTimeout(searchTimer.current);}
      searchTimer.current = setTimeout(() => {
        setPage(1);
        fetchData({pageNum: 1, search: q, append: false, isRefresh: false});
      }, 400);
    },
    [fetchData],
  );

  const refresh = useCallback(() => {
    setPage(1);
    fetchData({
      pageNum: 1,
      search: searchRef.current,
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
      append: true,
      isRefresh: false,
    });
  }, [hasMore, loading, refreshing, page, fetchData]);

  const restoreAgreement = useCallback(async (id: string): Promise<boolean> => {
    const ok = await agreementsApi.restoreAgreement(id);
    if (ok) {
      setAgreements(prev => prev.filter(a => a.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
    }
    return ok;
  }, []);

  const restoreFile = useCallback(
    async (fileId: string, agreementId: string, fileType: FileType): Promise<boolean> => {
      const ok = await agreementsApi.restoreFile(fileId, fileType);
      if (ok) {
        setAgreements(prev =>
          prev.reduce<SavedFileGroup[]>((acc, a) => {
            if (a.id !== agreementId) {
              acc.push(a);
              return acc;
            }
            const files = a.files.filter(f => f.id !== fileId);
            if (files.length > 0) {
              acc.push({...a, files, fileCount: files.length});
            } else {
              setTotal(t => Math.max(0, t - 1));
            }
            return acc;
          }, []),
        );
      }
      return ok;
    },
    [],
  );

  const permanentlyDeleteAgreement = useCallback(async (id: string): Promise<boolean> => {
    const ok = await agreementsApi.permanentlyDeleteAgreement(id);
    if (ok) {
      setAgreements(prev => prev.filter(a => a.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
    }
    return ok;
  }, []);

  const permanentlyDeleteFile = useCallback(
    async (fileId: string, agreementId: string, fileType: FileType): Promise<boolean> => {
      const ok = await agreementsApi.permanentlyDeleteFile(fileId, fileType);
      if (ok) {
        setAgreements(prev =>
          prev.reduce<SavedFileGroup[]>((acc, a) => {
            if (a.id !== agreementId) {
              acc.push(a);
              return acc;
            }
            const files = a.files.filter(f => f.id !== fileId);
            if (files.length > 0) {
              acc.push({...a, files, fileCount: files.length});
            } else {
              setTotal(t => Math.max(0, t - 1));
            }
            return acc;
          }, []),
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
    setSearchQuery,
    refresh,
    loadMore,
    restoreAgreement,
    restoreFile,
    permanentlyDeleteAgreement,
    permanentlyDeleteFile,
  };
}
