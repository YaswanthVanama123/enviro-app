import {useMemo} from 'react';
import {
  AccountType,
  ServiceFrequency,
  ACCOUNT_TYPE_REVENUE_RULES,
  FREQUENCY_VISITS_PER_YEAR,
} from '../../admin/types/commission.types';
import {
  AccountTypeCache,
  AccountTypeCacheEntry,
  getFrequencyNumber,
  BACKEND_TO_FREQUENCY,
} from './useAccountTypeDetection';

// Helper to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

// Helper to map backend frequency number to ServiceFrequency
export function backendFrequencyToServiceFrequency(
  freqNum: number,
): ServiceFrequency {
  const mapping: Record<number, ServiceFrequency> = {
    1: 'weekly',
    2: 'biweekly',
    3: 'monthly',
    4: 'quarterly',
    0: 'one-time',
  };
  return mapping[freqNum] || 'monthly';
}

// Get visits per year for a frequency
export function getVisitsPerYear(frequency: ServiceFrequency): number {
  return FREQUENCY_VISITS_PER_YEAR[frequency] || 1;
}

// Calculate commissionable revenue after account type deductions
export function calculateCommissionableRevenue(
  perVisitRevenue: number,
  accountType: AccountType,
): {
  commissionableRevenue: number;
  revenueDeduction: number;
  anchorBonus: number;
} {
  const rule = ACCOUNT_TYPE_REVENUE_RULES[accountType];

  // Apply revenue deduction
  const revenueDeduction = Math.min(perVisitRevenue, rule.revenueDeduction);
  let commissionableRevenue = Math.max(
    0,
    perVisitRevenue - rule.revenueDeduction,
  );

  // Calculate Anchor bonus (150% on revenue above $200)
  let anchorBonus = 0;
  if (accountType === 'Anchor' && perVisitRevenue > rule.anchorBonusThreshold) {
    const bonusPortion = perVisitRevenue - rule.anchorBonusThreshold;
    anchorBonus = bonusPortion * (rule.anchorBonusMultiplier - 1); // Extra 50%
    commissionableRevenue =
      rule.anchorBonusThreshold + bonusPortion * rule.anchorBonusMultiplier;
  }

  return {
    commissionableRevenue,
    revenueDeduction,
    anchorBonus,
  };
}

export interface ServiceCommissionResult {
  // Account type info
  accountType: AccountType | null;
  accountTypeLabel: string;
  confidence: 'high' | 'low' | null;
  reason: string | null;
  drivingTimeMinutes: number | null;
  nearestDestination: string | null;
  usedFallback: boolean;

  // Revenue breakdown
  perVisitRevenue: number;
  revenueDeduction: number;
  commissionableRevenue: number;
  anchorBonus: number;

  // Commission amounts
  commissionRate: number;
  perVisitCommission: number;
  annualCommission: number;

  // Frequency info
  frequencyNumber: number | null;
  frequencyLabel: string;
  visitsPerYear: number;

  // Formatted values for display
  formatted: {
    perVisitRevenue: string;
    revenueDeduction: string;
    commissionableRevenue: string;
    perVisitCommission: string;
    annualCommission: string;
  };

  // Status flags
  isDetected: boolean;
  isOneTime: boolean;
}

export interface UseServiceCommissionOptions {
  serviceData: any;
  accountTypeCache: AccountTypeCache;
  commissionRate?: number; // Default 6%
}

export function useServiceCommission({
  serviceData,
  accountTypeCache,
  commissionRate = 6,
}: UseServiceCommissionOptions): ServiceCommissionResult {
  return useMemo(() => {
    // Default result for inactive or one-time services
    const defaultResult: ServiceCommissionResult = {
      accountType: null,
      accountTypeLabel: 'Unknown',
      confidence: null,
      reason: null,
      drivingTimeMinutes: null,
      nearestDestination: null,
      usedFallback: false,

      perVisitRevenue: 0,
      revenueDeduction: 0,
      commissionableRevenue: 0,
      anchorBonus: 0,

      commissionRate,
      perVisitCommission: 0,
      annualCommission: 0,

      frequencyNumber: null,
      frequencyLabel: 'Unknown',
      visitsPerYear: 0,

      formatted: {
        perVisitRevenue: '$0.00',
        revenueDeduction: '$0.00',
        commissionableRevenue: '$0.00',
        perVisitCommission: '$0.00',
        annualCommission: '$0.00',
      },

      isDetected: false,
      isOneTime: false,
    };

    if (!serviceData?.isActive) {
      return defaultResult;
    }

    // Get frequency number
    const freqNum = getFrequencyNumber(serviceData);
    const isOneTime = freqNum === 0;

    // Get per-visit revenue
    const perVisitRevenue =
      serviceData.perVisit ??
      serviceData.totals?.perVisit?.amount ??
      serviceData.perVisitCharge ??
      serviceData.calc?.perVisit ??
      0;

    // If one-time service, return basic info without account type detection
    if (isOneTime || freqNum === null) {
      const oneTimePrice =
        serviceData.totalPrice ??
        serviceData.totals?.totalPrice?.amount ??
        perVisitRevenue;

      return {
        ...defaultResult,
        perVisitRevenue: oneTimePrice,
        frequencyNumber: 0,
        frequencyLabel: 'One-Time',
        isOneTime: true,
        formatted: {
          ...defaultResult.formatted,
          perVisitRevenue: formatCurrency(oneTimePrice),
        },
      };
    }

    // Look up account type from cache
    const cacheEntry = accountTypeCache[freqNum] as
      | AccountTypeCacheEntry
      | undefined;
    const accountType = cacheEntry?.accountType || null;
    const frequencyLabel = BACKEND_TO_FREQUENCY[freqNum] || 'Unknown';
    const serviceFrequency = backendFrequencyToServiceFrequency(freqNum);
    const visitsPerYear = getVisitsPerYear(serviceFrequency);

    // If no account type detected, return partial info
    if (!accountType) {
      return {
        ...defaultResult,
        perVisitRevenue,
        frequencyNumber: freqNum,
        frequencyLabel,
        visitsPerYear,
        formatted: {
          ...defaultResult.formatted,
          perVisitRevenue: formatCurrency(perVisitRevenue),
        },
      };
    }

    // Calculate commissionable revenue using V2 rules
    const {commissionableRevenue, revenueDeduction, anchorBonus} =
      calculateCommissionableRevenue(perVisitRevenue, accountType);

    // Calculate commission
    const perVisitCommission = commissionableRevenue * (commissionRate / 100);
    const annualCommission = perVisitCommission * visitsPerYear;

    return {
      accountType,
      accountTypeLabel: accountType,
      confidence: cacheEntry?.confidence || null,
      reason: cacheEntry?.reason || null,
      drivingTimeMinutes: cacheEntry?.drivingTimeMinutes || null,
      nearestDestination: cacheEntry?.nearestDestination || null,
      usedFallback: cacheEntry?.usedFallback || false,

      perVisitRevenue,
      revenueDeduction,
      commissionableRevenue,
      anchorBonus,

      commissionRate,
      perVisitCommission,
      annualCommission,

      frequencyNumber: freqNum,
      frequencyLabel,
      visitsPerYear,

      formatted: {
        perVisitRevenue: formatCurrency(perVisitRevenue),
        revenueDeduction: formatCurrency(revenueDeduction),
        commissionableRevenue: formatCurrency(commissionableRevenue),
        perVisitCommission: formatCurrency(perVisitCommission),
        annualCommission: formatCurrency(annualCommission),
      },

      isDetected: true,
      isOneTime: false,
    };
  }, [serviceData, commissionRate, accountTypeCache]);
}

// Hook to calculate combined commission for all services
export interface GlobalCommissionResult {
  // Totals
  totalPerVisitCommission: number;
  totalAnnualCommission: number;
  totalPerVisitRevenue: number;
  totalCommissionableRevenue: number;

  // Service breakdown
  services: Array<{
    serviceName: string;
    accountType: AccountType | null;
    perVisitCommission: number;
    annualCommission: number;
  }>;

  // Formatted values
  formatted: {
    totalPerVisitCommission: string;
    totalAnnualCommission: string;
    totalPerVisitRevenue: string;
    totalCommissionableRevenue: string;
  };

  // Status
  hasDetectedServices: boolean;
  serviceCount: number;
}

export interface UseGlobalCommissionOptions {
  services: Record<string, any>;
  accountTypeCache: AccountTypeCache;
  commissionRate?: number;
}

export function useGlobalCommission({
  services,
  accountTypeCache,
  commissionRate = 6,
}: UseGlobalCommissionOptions): GlobalCommissionResult {
  return useMemo(() => {
    let totalPerVisitCommission = 0;
    let totalAnnualCommission = 0;
    let totalPerVisitRevenue = 0;
    let totalCommissionableRevenue = 0;

    const servicesList: GlobalCommissionResult['services'] = [];

    Object.entries(services).forEach(
      ([serviceName, serviceData]: [string, any]) => {
        if (!serviceData?.isActive) return;

        const freqNum = getFrequencyNumber(serviceData);
        if (freqNum === null || freqNum === 0) return; // Skip one-time services

        const perVisitRevenue =
          serviceData.perVisit ??
          serviceData.totals?.perVisit?.amount ??
          serviceData.perVisitCharge ??
          serviceData.calc?.perVisit ??
          0;

        if (perVisitRevenue <= 0) return;

        const cacheEntry = accountTypeCache[freqNum] as
          | AccountTypeCacheEntry
          | undefined;
        const accountType = cacheEntry?.accountType || null;

        let commissionableRevenue = perVisitRevenue;
        if (accountType) {
          const result = calculateCommissionableRevenue(
            perVisitRevenue,
            accountType,
          );
          commissionableRevenue = result.commissionableRevenue;
        }

        const serviceFrequency = backendFrequencyToServiceFrequency(freqNum);
        const visitsPerYear = getVisitsPerYear(serviceFrequency);

        const perVisitCommission =
          commissionableRevenue * (commissionRate / 100);
        const annualCommission = perVisitCommission * visitsPerYear;

        totalPerVisitCommission += perVisitCommission;
        totalAnnualCommission += annualCommission;
        totalPerVisitRevenue += perVisitRevenue;
        totalCommissionableRevenue += commissionableRevenue;

        servicesList.push({
          serviceName,
          accountType,
          perVisitCommission,
          annualCommission,
        });
      },
    );

    return {
      totalPerVisitCommission,
      totalAnnualCommission,
      totalPerVisitRevenue,
      totalCommissionableRevenue,

      services: servicesList,

      formatted: {
        totalPerVisitCommission: formatCurrency(totalPerVisitCommission),
        totalAnnualCommission: formatCurrency(totalAnnualCommission),
        totalPerVisitRevenue: formatCurrency(totalPerVisitRevenue),
        totalCommissionableRevenue: formatCurrency(totalCommissionableRevenue),
      },

      hasDetectedServices: servicesList.some(s => s.accountType !== null),
      serviceCount: servicesList.length,
    };
  }, [services, accountTypeCache, commissionRate]);
}

export default useServiceCommission;
