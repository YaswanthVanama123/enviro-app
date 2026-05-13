import {useState, useCallback, useEffect, useRef} from 'react';
import {
  agreementsApi,
  SavedFileGroup,
  FileType,
  GetSavedFilesOptions,
} from '../../../services/api/endpoints/agreements.api';
import {useAuth} from '../../admin/context/AdminAuthContext';

export interface UseSavedAgreementsResult {
  agreements: SavedFileGroup[];
  loading: boolean;
  refreshing: boolean;
  apiError: string | null;
  total: number;
  hasMore: boolean;
  searchQuery: string;
  activeFilter: string;
  ownershipFilter: 'all' | 'mine';
  setSearchQuery: (q: string) => void;
  setActiveFilter: (f: string) => void;
  setOwnershipFilter: (f: 'all' | 'mine') => void;
  refresh: () => void;
  loadMore: () => void;
  deleteAgreement: (id: string) => Promise<boolean>;
  deleteFile: (fileId: string, agreementId: string, fileType: FileType) => Promise<boolean>;
}

const PAGE_SIZE = 20;

export function useSavedAgreements(): UseSavedAgreementsResult {
  const {user} = useAuth();
  const [agreements, setAgreements] = useState<SavedFileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [searchQuery, setSearchQueryState] = useState('');
  const [activeFilter, setActiveFilterState] = useState('all');
  const [ownershipFilter, setOwnershipFilterState] = useState<'all' | 'mine'>('all');

  const searchRef = useRef('');
  const filterRef = useRef('all');
  const ownershipRef = useRef<'all' | 'mine'>('all');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(
    async (opts: {
      pageNum: number;
      search: string;
      filter: string;
      ownership: 'all' | 'mine';
      append: boolean;
      isRefresh: boolean;
    }) => {
      const {pageNum, search, filter, ownership, append, isRefresh} = opts;

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
        let items = result.groups ?? [];

        // Apply ownership filter client-side
        if (ownership === 'mine' && user?.username) {
          items = items.filter(agreement =>
            agreement.files.some(
              file =>
                file.createdBy === user.username ||
                file.createdBy === user.fullName
            )
          );
        }

        setAgreements(prev => (append ? [...prev, ...items] : items));
        setTotal(ownership === 'mine' ? items.length : (result.total ?? items.length));
        const totalPages = Math.ceil((result.total ?? items.length) / PAGE_SIZE);
        setHasMore((result.page ?? 1) < totalPages);
      } else {
        if (!append) {
          setAgreements([]);
        }
        setApiError('Could not load agreements. Check your connection.');
      }
    },
    [user],
  );

  useEffect(() => {
    fetchData({
      pageNum: 1,
      search: '',
      filter: 'all',
      ownership: 'all',
      append: false,
      isRefresh: false,
    });
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
          ownership: ownershipRef.current,
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
        ownership: ownershipRef.current,
        append: false,
        isRefresh: false,
      });
    },
    [fetchData],
  );

  const setOwnershipFilter = useCallback(
    (f: 'all' | 'mine') => {
      setOwnershipFilterState(f);
      ownershipRef.current = f;
      setPage(1);
      fetchData({
        pageNum: 1,
        search: searchRef.current,
        filter: filterRef.current,
        ownership: f,
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
      ownership: ownershipRef.current,
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
      ownership: ownershipRef.current,
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
    ownershipFilter,
    setSearchQuery,
    setActiveFilter,
    setOwnershipFilter,
    refresh,
    loadMore,
    deleteAgreement,
    deleteFile,
  };
}
