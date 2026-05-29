/**
 * QuotaContext - Provides quota level state for commission calculations
 *
 * Quota levels determine the base commission rate:
 * - Below Quota: 3%
 * - Above Quota: 6%
 * - Double Quota: 9%
 */

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

// Quota level type
export type QuotaLevel = 'below' | 'above' | 'double';

// Quota data interface
export interface QuotaLevelData {
  quotaLevel: QuotaLevel;
  quotaPercentage: number;
  quotaTarget: number;
  actualSales: number;
  commissionRate: number;
  salesPersonId: string;
  salesPersonName: string;
}

// Quota level display info
export interface QuotaLevelDisplayInfo {
  label: string;
  color: string;
  bgColor: string;
  rate: number;
}

// Quota context value interface
interface QuotaContextValue {
  // Current quota level
  quotaLevel: QuotaLevel;
  quotaLevelData: QuotaLevelData | null;

  // Derived commission rate based on quota level
  baseCommissionRate: number;

  // Display info
  quotaDisplayInfo: QuotaLevelDisplayInfo;

  // Loading and error states
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshQuotaLevel: () => Promise<void>;
  setQuotaLevel: (level: QuotaLevel) => void;
}

// Map quota level to commission rate
const QUOTA_COMMISSION_RATES: Record<QuotaLevel, number> = {
  below: 3,
  above: 6,
  double: 9,
};

// Quota level labels
const QUOTA_LEVEL_LABELS: Record<QuotaLevel, string> = {
  below: 'Below Quota',
  above: 'Above Quota',
  double: 'Double Quota',
};

// Default context value
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

// Create context
const QuotaContext = createContext<QuotaContextValue>(defaultContextValue);

// Provider props
interface QuotaProviderProps {
  children: ReactNode;
}

// Provider component
export function QuotaProvider({children}: QuotaProviderProps) {
  const {user, isAuthenticated} = useAuth();

  const [quotaLevel, setQuotaLevelState] = useState<QuotaLevel>('above');
  const [quotaLevelData, setQuotaLevelData] = useState<QuotaLevelData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate commission rate based on quota level
  const baseCommissionRate = QUOTA_COMMISSION_RATES[quotaLevel];

  // Get display info for current quota level
  const quotaDisplayInfo: QuotaLevelDisplayInfo = {
    label: QUOTA_LEVEL_LABELS[quotaLevel],
    color: getQuotaLevelColor(quotaLevel),
    bgColor: getQuotaLevelBgColor(quotaLevel),
    rate: baseCommissionRate,
  };

  // Fetch quota level from API
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
      // Keep default "above" level on error
    } finally {
      setIsLoading(false);
    }
  }, [user?.username, user?.fullName]);

  // Fetch quota level on mount and when user changes
  useEffect(() => {
    if (isAuthenticated && user?.username) {
      fetchQuotaLevel();
    }
  }, [isAuthenticated, user?.username, fetchQuotaLevel]);

  // Manual setter for quota level
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

// Hook to use quota context
export function useQuotaContext(): QuotaContextValue {
  const context = useContext(QuotaContext);
  if (!context) {
    console.warn('useQuotaContext must be used within a QuotaProvider');
    return defaultContextValue;
  }
  return context;
}

// Hook for just getting commission rate (convenience)
export function useCommissionRate(): number {
  const {baseCommissionRate} = useQuotaContext();
  return baseCommissionRate;
}

export default QuotaContext;
