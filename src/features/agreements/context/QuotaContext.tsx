

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {quotaApi} from '../../../services/api/endpoints/quota.api';
import {useAuth} from '../../admin/context/AdminAuthContext';
import {
  QuotaLevelResponse,
  getQuotaCommissionRate,
  getQuotaLevelColor,
  getQuotaLevelBgColor,
} from '../../admin/types/quota.types';

export type QuotaLevel = 'below' | 'above' | 'double';

export interface QuotaLevelData {
  quotaLevel: QuotaLevel;
  quotaPercentage: number;
  quotaTarget: number;
  actualSales: number;
  commissionRate: number;
  salesPersonId: string;
  salesPersonName: string;
}

export interface QuotaLevelDisplayInfo {
  label: string;
  color: string;
  bgColor: string;
  rate: number;
}

interface QuotaContextValue {
  
  quotaLevel: QuotaLevel;
  quotaLevelData: QuotaLevelData | null;

  baseCommissionRate: number;

  quotaDisplayInfo: QuotaLevelDisplayInfo;

  isLoading: boolean;
  error: string | null;

  refreshQuotaLevel: () => Promise<void>;
  setQuotaLevel: (level: QuotaLevel) => void;
}

const QUOTA_COMMISSION_RATES: Record<QuotaLevel, number> = {
  below: 3,
  above: 6,
  double: 9,
};

const QUOTA_LEVEL_LABELS: Record<QuotaLevel, string> = {
  below: 'Below Quota',
  above: 'Above Quota',
  double: 'Double Quota',
};

const defaultContextValue: QuotaContextValue = {
  quotaLevel: 'above',
  quotaLevelData: null,
  baseCommissionRate: 6,
  quotaDisplayInfo: {
    label: 'Above Quota',
    color: getQuotaLevelColor('above'),
    bgColor: getQuotaLevelBgColor('above'),
    rate: 6,
  },
  isLoading: false,
  error: null,
  refreshQuotaLevel: async () => {},
  setQuotaLevel: () => {},
};

const QuotaContext = createContext<QuotaContextValue>(defaultContextValue);

interface QuotaProviderProps {
  children: ReactNode;
}

export function QuotaProvider({children}: QuotaProviderProps) {
  const {user, isAuthenticated} = useAuth();

  const [quotaLevel, setQuotaLevelState] = useState<QuotaLevel>('above');
  const [quotaLevelData, setQuotaLevelData] = useState<QuotaLevelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseCommissionRate = QUOTA_COMMISSION_RATES[quotaLevel];

  const quotaDisplayInfo: QuotaLevelDisplayInfo = {
    label: QUOTA_LEVEL_LABELS[quotaLevel],
    color: getQuotaLevelColor(quotaLevel),
    bgColor: getQuotaLevelBgColor(quotaLevel),
    rate: baseCommissionRate,
  };

  const fetchQuotaLevel = useCallback(async () => {
    if (!user?.username) {
      console.log('[QUOTA] No user logged in, using default quota level');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('[QUOTA] Fetching quota level for user:', user.username);
      const result = await quotaApi.getCurrentLevel(user.username);

      if (result) {
        const level = (result.quotaLevel as QuotaLevel) || 'above';
        console.log(
          '[QUOTA] Quota level fetched:',
          level,
          'Percentage:',
          result.quotaPercentage?.toFixed(1) + '%',
        );

        setQuotaLevelState(level);
        setQuotaLevelData({
          quotaLevel: level,
          quotaPercentage: result.quotaPercentage || 0,
          quotaTarget: result.quotaTarget || 0,
          actualSales: result.actualSales || 0,
          commissionRate: QUOTA_COMMISSION_RATES[level],
          salesPersonId: result.salesPersonId || user.username,
          salesPersonName: result.salesPersonName || user.fullName || user.username,
        });
      }
    } catch (err) {
      console.error('[QUOTA] Failed to fetch quota level:', err);
      setError('Failed to fetch quota level');
      
    } finally {
      setIsLoading(false);
    }
  }, [user?.username, user?.fullName]);

  useEffect(() => {
    if (isAuthenticated && user?.username) {
      fetchQuotaLevel();
    }
  }, [isAuthenticated, user?.username, fetchQuotaLevel]);

  const setQuotaLevel = useCallback((level: QuotaLevel) => {
    setQuotaLevelState(level);
  }, []);

  const value: QuotaContextValue = {
    quotaLevel,
    quotaLevelData,
    baseCommissionRate,
    quotaDisplayInfo,
    isLoading,
    error,
    refreshQuotaLevel: fetchQuotaLevel,
    setQuotaLevel,
  };

  return (
    <QuotaContext.Provider value={value}>{children}</QuotaContext.Provider>
  );
}

export function useQuotaContext(): QuotaContextValue {
  const context = useContext(QuotaContext);
  if (!context) {
    console.warn('useQuotaContext must be used within a QuotaProvider');
    return defaultContextValue;
  }
  return context;
}

export function useCommissionRate(): number {
  const {baseCommissionRate} = useQuotaContext();
  return baseCommissionRate;
}

export default QuotaContext;
