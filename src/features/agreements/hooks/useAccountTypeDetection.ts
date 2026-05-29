import {useState, useCallback, useEffect, useRef} from 'react';
import {
  accountTypeApi,
  AccountType,
  FrequencyDetectionResult,
  BatchFrequencyDetectionResult,
} from '../../../services/api/endpoints/accountType.api';
import {pdfApi} from '../../../services/api/endpoints/pdf.api';

// Account type cache entry for frequency-based detection
export interface AccountTypeCacheEntry {
  accountType: AccountType;
  confidence: 'high' | 'low';
  reason: string;
  drivingTimeMinutes: number | null;
  nearestDestination: string | null;
  cachedAt: number;
  usedFallback?: boolean;
  fallbackReason?: string;
}

// Cache keyed by frequency number (1=Weekly, 2=Bi-Weekly, etc.)
export interface AccountTypeCache {
  [frequencyKey: number]: AccountTypeCacheEntry;
}

// Frequency key to backend number mapping
export const FREQUENCY_TO_BACKEND: Record<string, number> = {
  weekly: 1,
  biweekly: 2,
  twicepermonth: 13,
  monthly: 3,
  bimonthly: 14,
  quarterly: 4,
  semiannual: 5,
  annual: 6,
  onetime: 0,
  // Additional variations
  'bi-weekly': 2,
  'bi-monthly': 14,
  'semi-annual': 5,
  'one-time': 0,
  '1time': 0,
  everyfourweeks: 3,
  'every four weeks': 3,
};

// Reverse mapping for display
export const BACKEND_TO_FREQUENCY: Record<number, string> = {
  1: 'Weekly',
  2: 'Bi-Weekly',
  3: 'Monthly',
  4: 'Quarterly',
  5: 'Semi-Annual',
  6: 'Annual',
  13: 'Twice per Month',
  14: 'Bi-Monthly',
  0: 'One-Time',
};

// Helper to normalize frequency value from service data
export function normalizeFrequencyKey(value: any): string | null {
  if (value === undefined || value === null) return null;

  // Handle object with various possible keys
  const raw =
    typeof value === 'object'
      ? value.frequencyKey ??
        value.value ??
        value.label ??
        value.name ??
        value.frequency ??
        ''
      : value;

  // Normalize to lowercase without special chars
  const text = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return text || null;
}

// Helper to get backend frequency number from service data
export function getFrequencyNumber(serviceData: any): number | null {
  if (!serviceData) return null;

  const candidates = [
    serviceData.frequency,
    serviceData.frequencyKey,
    serviceData.frequency?.frequencyKey,
    serviceData.frequency?.value,
    serviceData.frequency?.label,
    serviceData.frequencyDisplay?.frequencyKey,
    serviceData.frequencyDisplay?.value,
  ];

  for (const candidate of candidates) {
    const normalized = normalizeFrequencyKey(candidate);
    if (normalized && FREQUENCY_TO_BACKEND[normalized] !== undefined) {
      return FREQUENCY_TO_BACKEND[normalized];
    }
  }

  return null;
}

export interface UseAccountTypeDetectionOptions {
  biginCompanyId: string | null;
  services: Record<string, any>;
  autoDetect?: boolean;
  // Agreement ID for auto-saving cache after detection
  agreementId?: string | null;
  // Initial cache loaded from saved agreement
  initialCache?: AccountTypeCache | null;
  // Whether initial cache was loaded from saved agreement
  initialCacheLoadedFromSaved?: boolean;
}

export interface UseAccountTypeDetectionResult {
  // Account type cache
  accountTypeCache: AccountTypeCache;

  // Detect account types for all active services
  detectAccountTypes: () => Promise<void>;

  // Get account type for a specific service based on its frequency
  getAccountTypeForService: (serviceData: any) => AccountType | null;

  // Get full cache entry for a service
  getCacheEntryForService: (serviceData: any) => AccountTypeCacheEntry | null;

  // Get account type for a specific frequency number
  getAccountTypeForFrequency: (frequencyKey: number) => AccountTypeCacheEntry | null;

  // Check if detection is in progress
  isDetecting: boolean;

  // Any detection error
  error: string | null;

  // Whether the company is mapped for detection
  isCompanyMapped: boolean;

  // Clear the cache
  clearCache: () => void;
}

export function useAccountTypeDetection({
  biginCompanyId,
  services,
  autoDetect = false,
  agreementId = null,
  initialCache = null,
  initialCacheLoadedFromSaved = false,
}: UseAccountTypeDetectionOptions): UseAccountTypeDetectionResult {
  // Initialize cache from saved data if available
  const [accountTypeCache, setAccountTypeCache] = useState<AccountTypeCache>(
    initialCache ?? {},
  );
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track if cache was loaded from saved data (to skip initial detection)
  const cacheLoadedFromSavedRef = useRef(initialCacheLoadedFromSaved);

  // Track previous biginCompanyId to clear cache on change
  const prevBiginCompanyIdRef = useRef<string | null>(null);

  // Update cache if initialCache changes (e.g., when edit data loads)
  useEffect(() => {
    if (initialCache && Object.keys(initialCache).length > 0) {
      setAccountTypeCache(initialCache);
      cacheLoadedFromSavedRef.current = true;
      console.log('[ACCOUNT-TYPE-MOBILE] Initialized cache from saved data, keys:', Object.keys(initialCache));
    }
  }, [initialCache]);

  // Clear cache when company changes
  useEffect(() => {
    if (
      prevBiginCompanyIdRef.current !== null &&
      prevBiginCompanyIdRef.current !== biginCompanyId
    ) {
      setAccountTypeCache({});
      setError(null);
      cacheLoadedFromSavedRef.current = false;
    }
    prevBiginCompanyIdRef.current = biginCompanyId;
  }, [biginCompanyId]);

  // Extract unique frequency numbers from all active services
  const getUniqueFrequencies = useCallback((): number[] => {
    const frequencies = new Set<number>();

    Object.values(services).forEach((serviceData: any) => {
      if (serviceData?.isActive) {
        const freqNum = getFrequencyNumber(serviceData);
        // Skip one-time services (0) - they don't need account type detection
        if (freqNum !== null && freqNum !== 0) {
          frequencies.add(freqNum);
        }
      }
    });

    return Array.from(frequencies);
  }, [services]);

  // Get frequencies that aren't in the cache yet
  const getMissingFrequencies = useCallback((): number[] => {
    const allFrequencies = getUniqueFrequencies();
    return allFrequencies.filter(freq => !accountTypeCache[freq]);
  }, [getUniqueFrequencies, accountTypeCache]);

  // Detect account types for all active services
  const detectAccountTypes = useCallback(async () => {
    if (!biginCompanyId) {
      console.log('[ACCOUNT-TYPE-MOBILE] No biginCompanyId, skipping detection');
      return;
    }

    const missingFrequencies = getMissingFrequencies();

    if (missingFrequencies.length === 0) {
      console.log('[ACCOUNT-TYPE-MOBILE] All frequencies already cached');
      return;
    }

    console.log(
      '[ACCOUNT-TYPE-MOBILE] Detecting for frequencies:',
      missingFrequencies,
    );

    setIsDetecting(true);
    setError(null);

    try {
      const result = await accountTypeApi.detectWithMapboxBatch(
        biginCompanyId,
        missingFrequencies,
      );

      if (!result.success) {
        setError(result.error || 'Failed to detect account types');
        console.error('[ACCOUNT-TYPE-MOBILE] Detection failed:', result.error);
        return;
      }

      // Build updated cache with new results
      let updatedCache: AccountTypeCache = {...accountTypeCache};

      // Process results and update cache
      if (result.results) {
        Object.entries(result.results).forEach(([freqKey, detection]) => {
          const freqNum = parseInt(freqKey, 10);
          const entry: AccountTypeCacheEntry = {
            accountType: detection.accountType,
            confidence: detection.confidence,
            reason: detection.reason,
            drivingTimeMinutes: detection.drivingTimeMinutes,
            nearestDestination: detection.nearestDestination,
            cachedAt: Date.now(),
            usedFallback: detection.usedFallback,
            fallbackReason: detection.fallbackReason,
          };

          updatedCache[freqNum] = entry;

          console.log(
            `[ACCOUNT-TYPE-MOBILE] Cached freq ${freqNum}: ${detection.accountType}`,
          );
        });

        setAccountTypeCache(updatedCache);
      }

      console.log(
        '[ACCOUNT-TYPE-MOBILE] Detection complete, thresholds:',
        result.thresholds,
      );

      // Auto-save to backend if we have an agreementId
      if (agreementId && Object.keys(updatedCache).length > 0) {
        try {
          console.log('[ACCOUNT-TYPE-MOBILE] Auto-saving cache to backend for agreement:', agreementId);
          const saveResult = await pdfApi.saveAccountTypeCache(agreementId, updatedCache);
          if (saveResult.success) {
            console.log('[ACCOUNT-TYPE-MOBILE] Cache saved to backend successfully');
          } else {
            console.error('[ACCOUNT-TYPE-MOBILE] Failed to save cache:', saveResult.error);
          }
        } catch (saveErr) {
          console.error('[ACCOUNT-TYPE-MOBILE] Failed to save cache to backend:', saveErr);
          // Don't fail the detection if save fails - cache is still in memory
        }
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : 'Unknown error during detection';
      setError(errorMsg);
      console.error('[ACCOUNT-TYPE-MOBILE] Detection error:', err);
    } finally {
      setIsDetecting(false);
    }
  }, [biginCompanyId, agreementId, accountTypeCache, getMissingFrequencies]);

  // Auto-detect when services change (if enabled)
  useEffect(() => {
    if (!autoDetect || !biginCompanyId || isDetecting) {
      return;
    }

    const missingFrequencies = getMissingFrequencies();

    // Skip initial detection if cache was loaded from saved data
    if (cacheLoadedFromSavedRef.current && missingFrequencies.length === 0) {
      console.log('[ACCOUNT-TYPE-MOBILE] Using saved cache, skipping detection');
      return;
    }

    // Only detect if there are missing frequencies
    if (missingFrequencies.length > 0) {
      console.log('[ACCOUNT-TYPE-MOBILE] Auto-detecting for missing frequencies:', missingFrequencies);
      detectAccountTypes();
    }
  }, [autoDetect, biginCompanyId, getMissingFrequencies, isDetecting, detectAccountTypes]);

  // Get account type for a specific service
  const getAccountTypeForService = useCallback(
    (serviceData: any): AccountType | null => {
      if (!serviceData?.isActive) return null;

      const freqNum = getFrequencyNumber(serviceData);
      if (freqNum === null || freqNum === 0) return null;

      const cached = accountTypeCache[freqNum];
      return cached?.accountType || null;
    },
    [accountTypeCache],
  );

  // Get full cache entry for a service
  const getCacheEntryForService = useCallback(
    (serviceData: any): AccountTypeCacheEntry | null => {
      if (!serviceData?.isActive) return null;

      const freqNum = getFrequencyNumber(serviceData);
      if (freqNum === null || freqNum === 0) return null;

      return accountTypeCache[freqNum] || null;
    },
    [accountTypeCache],
  );

  // Get account type for a specific frequency number
  const getAccountTypeForFrequency = useCallback(
    (frequencyKey: number): AccountTypeCacheEntry | null => {
      return accountTypeCache[frequencyKey] || null;
    },
    [accountTypeCache],
  );

  // Clear the cache
  const clearCache = useCallback(() => {
    setAccountTypeCache({});
    setError(null);
    cacheLoadedFromSavedRef.current = false;
  }, []);

  return {
    accountTypeCache,
    detectAccountTypes,
    getAccountTypeForService,
    getCacheEntryForService,
    getAccountTypeForFrequency,
    isDetecting,
    error,
    isCompanyMapped: !!biginCompanyId,
    clearCache,
  };
}

export default useAccountTypeDetection;
