import {useState, useCallback, useEffect, useRef} from 'react';
import {
  accountTypeApi,
  AccountType,
  FrequencyDetectionResult,
  BatchFrequencyDetectionResult,
} from '../../../services/api/endpoints/accountType.api';
import {pdfApi} from '../../../services/api/endpoints/pdf.api';

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

export interface AccountTypeCache {
  [frequencyKey: number]: AccountTypeCacheEntry;
}

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
  
  'bi-weekly': 2,
  'bi-monthly': 14,
  'semi-annual': 5,
  'one-time': 0,
  '1time': 0,
  everyfourweeks: 3,
  'every four weeks': 3,
};

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

export function normalizeFrequencyKey(value: any): string | null {
  if (value === undefined || value === null) return null;

  const raw =
    typeof value === 'object'
      ? value.frequencyKey ??
        value.value ??
        value.label ??
        value.name ??
        value.frequency ??
        ''
      : value;

  const text = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  return text || null;
}

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
  
  agreementId?: string | null;
  
  initialCache?: AccountTypeCache | null;
  
  initialCacheLoadedFromSaved?: boolean;
}

export interface UseAccountTypeDetectionResult {
  
  accountTypeCache: AccountTypeCache;

  detectAccountTypes: () => Promise<void>;

  getAccountTypeForService: (serviceData: any) => AccountType | null;

  getCacheEntryForService: (serviceData: any) => AccountTypeCacheEntry | null;

  getAccountTypeForFrequency: (frequencyKey: number) => AccountTypeCacheEntry | null;

  isDetecting: boolean;

  error: string | null;

  isCompanyMapped: boolean;

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
  
  const [accountTypeCache, setAccountTypeCache] = useState<AccountTypeCache>(
    initialCache ?? {},
  );
  const [isDetecting, setIsDetecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cacheLoadedFromSavedRef = useRef(initialCacheLoadedFromSaved);

  const prevBiginCompanyIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (initialCache && Object.keys(initialCache).length > 0) {
      setAccountTypeCache(initialCache);
      cacheLoadedFromSavedRef.current = true;
      console.log('[ACCOUNT-TYPE-MOBILE] Initialized cache from saved data, keys:', Object.keys(initialCache));
    }
  }, [initialCache]);

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

  const getUniqueFrequencies = useCallback((): number[] => {
    const frequencies = new Set<number>();

    Object.values(services).forEach((serviceData: any) => {
      if (serviceData?.isActive) {
        const freqNum = getFrequencyNumber(serviceData);
        
        if (freqNum !== null && freqNum !== 0) {
          frequencies.add(freqNum);
        }
      }
    });

    return Array.from(frequencies);
  }, [services]);

  const getMissingFrequencies = useCallback((): number[] => {
    const allFrequencies = getUniqueFrequencies();
    return allFrequencies.filter(freq => !accountTypeCache[freq]);
  }, [getUniqueFrequencies, accountTypeCache]);

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

      let updatedCache: AccountTypeCache = {...accountTypeCache};

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

  useEffect(() => {
    if (!autoDetect || !biginCompanyId || isDetecting) {
      return;
    }

    const missingFrequencies = getMissingFrequencies();

    if (cacheLoadedFromSavedRef.current && missingFrequencies.length === 0) {
      console.log('[ACCOUNT-TYPE-MOBILE] Using saved cache, skipping detection');
      return;
    }

    if (missingFrequencies.length > 0) {
      console.log('[ACCOUNT-TYPE-MOBILE] Auto-detecting for missing frequencies:', missingFrequencies);
      detectAccountTypes();
    }
  }, [autoDetect, biginCompanyId, getMissingFrequencies, isDetecting, detectAccountTypes]);

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

  const getCacheEntryForService = useCallback(
    (serviceData: any): AccountTypeCacheEntry | null => {
      if (!serviceData?.isActive) return null;

      const freqNum = getFrequencyNumber(serviceData);
      if (freqNum === null || freqNum === 0) return null;

      return accountTypeCache[freqNum] || null;
    },
    [accountTypeCache],
  );

  const getAccountTypeForFrequency = useCallback(
    (frequencyKey: number): AccountTypeCacheEntry | null => {
      return accountTypeCache[frequencyKey] || null;
    },
    [accountTypeCache],
  );

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
