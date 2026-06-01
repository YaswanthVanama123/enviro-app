import {useEffect, useMemo, useState} from 'react';
import {
  AccountType,
  ServiceFrequency,
  ACCOUNT_TYPE_REVENUE_RULES,
  FREQUENCY_VISITS_PER_YEAR,
  resolveCommissionRules,
  getPricingTierFromList,
  type ResolvedCommissionRules,
} from '../../admin/types/commission.types';
import {commissionApi} from '../../../services/api/endpoints/commission.api';
import {
  AccountTypeCache,
  AccountTypeCacheEntry,
  getFrequencyNumber,
  BACKEND_TO_FREQUENCY,
} from './useAccountTypeDetection';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

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

export function getVisitsPerYear(frequency: ServiceFrequency): number {
  return FREQUENCY_VISITS_PER_YEAR[frequency] || 1;
}

export function calculateCommissionableRevenue(
  perVisitRevenue: number,
  accountType: AccountType,
): {
  commissionableRevenue: number;
  revenueDeduction: number;
  anchorBonus: number;
} {
  const rule = ACCOUNT_TYPE_REVENUE_RULES[accountType];

  const revenueDeduction = Math.min(perVisitRevenue, rule.revenueDeduction);
  let commissionableRevenue = Math.max(
    0,
    perVisitRevenue - rule.revenueDeduction,
  );

  let anchorBonus = 0;
  if (accountType === 'Anchor' && perVisitRevenue > rule.anchorBonusThreshold) {
    const bonusPortion = perVisitRevenue - rule.anchorBonusThreshold;
    anchorBonus = bonusPortion * (rule.anchorBonusMultiplier - 1); 
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
  
  accountType: AccountType | null;
  accountTypeLabel: string;
  confidence: 'high' | 'low' | null;
  reason: string | null;
  drivingTimeMinutes: number | null;
  nearestDestination: string | null;
  usedFallback: boolean;

  perVisitRevenue: number;
  revenueDeduction: number;
  commissionableRevenue: number;
  anchorBonus: number;

  commissionRate: number;
  perVisitCommission: number;
  annualCommission: number;

  frequencyNumber: number | null;
  frequencyLabel: string;
  visitsPerYear: number;

  formatted: {
    perVisitRevenue: string;
    revenueDeduction: string;
    commissionableRevenue: string;
    perVisitCommission: string;
    annualCommission: string;
  };

  isDetected: boolean;
  isOneTime: boolean;
}

export interface UseServiceCommissionOptions {
  serviceData: any;
  accountTypeCache: AccountTypeCache;
  commissionRate?: number; 
}

export function useServiceCommission({
  serviceData,
  accountTypeCache,
  commissionRate = 6,
}: UseServiceCommissionOptions): ServiceCommissionResult {
  return useMemo(() => {
    
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

    const freqNum = getFrequencyNumber(serviceData);
    const isOneTime = freqNum === 0;

    const perVisitRevenue =
      serviceData.perVisit ??
      serviceData.totals?.perVisit?.amount ??
      serviceData.perVisitCharge ??
      serviceData.calc?.perVisit ??
      0;

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

    const cacheEntry = accountTypeCache[freqNum] as
      | AccountTypeCacheEntry
      | undefined;
    const accountType = cacheEntry?.accountType || null;
    const frequencyLabel = BACKEND_TO_FREQUENCY[freqNum] || 'Unknown';
    const serviceFrequency = backendFrequencyToServiceFrequency(freqNum);
    const visitsPerYear = getVisitsPerYear(serviceFrequency);

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

    const {commissionableRevenue, revenueDeduction, anchorBonus} =
      calculateCommissionableRevenue(perVisitRevenue, accountType);

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

export interface GlobalCommissionResult {
  
  totalPerVisitCommission: number;
  totalAnnualCommission: number;
  totalPerVisitRevenue: number;
  totalCommissionableRevenue: number;

  services: Array<{
    serviceName: string;
    accountType: AccountType | null;
    perVisitCommission: number;
    annualCommission: number;
  }>;

  formatted: {
    totalPerVisitCommission: string;
    totalAnnualCommission: string;
    totalPerVisitRevenue: string;
    totalCommissionableRevenue: string;
  };

  hasDetectedServices: boolean;
  serviceCount: number;
}

export interface UseGlobalCommissionOptions {
  services: Record<string, any>;
  accountTypeCache: AccountTypeCache;
  commissionRate?: number;
  contractMonths?: number;
}

export function useGlobalCommission({
  services,
  accountTypeCache,
  commissionRate = 6,
  contractMonths = 12,
}: UseGlobalCommissionOptions): GlobalCommissionResult {
  
  const [activeRules, setActiveRules] = useState<ResolvedCommissionRules>(() =>
    resolveCommissionRules(null),
  );

  useEffect(() => {
    let cancelled = false;
    commissionApi
      .getActiveRules()
      .then(loaded => {
        if (cancelled || !loaded) return;
        setActiveRules(resolveCommissionRules(loaded));
      })
      .catch(err => {
        console.error('[RULES] useGlobalCommission failed to load active rules:', err);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {

    const rules = activeRules;

    const agreementTerm =
      contractMonths >= 36 ? '3-year' :
      contractMonths >= 12 ? '1-year' : 'MTM-with-install';
    const agreementMultiplier = rules.agreementMultipliers[agreementTerm];
    const effectiveCommissionRate = commissionRate * (agreementMultiplier / 100);

    const visitsPerYearOf = (freqStr: string): number => {
      const v = rules.frequencyVisitsPerYear;
      const norm = (freqStr || 'monthly').toLowerCase().replace(/-/g, '');
      if (norm === 'weekly') return v.weekly;
      if (norm === 'biweekly') return v.biweekly;
      if (norm === 'monthly') return v.monthly;
      if (norm === 'quarterly') return v.quarterly;
      if (norm === 'onetime') return v['one-time'];
      return v.monthly;
    };

    type Row = {
      serviceName: string;
      freqNum: number;
      freqStr: ServiceFrequency;
      annualCurrent: number;
      annualOriginal: number;
      accountType: AccountType | null;
    };
    const rows: Row[] = [];

    Object.entries(services).forEach(
      ([serviceName, serviceData]: [string, any]) => {
        if (!serviceData?.isActive) return;
        const freqNum = getFrequencyNumber(serviceData);
        if (freqNum === null || freqNum === 0) return;

        const serviceCurrent =
          (typeof serviceData.contractTotal === 'number' && serviceData.contractTotal) ||
          serviceData.totals?.contract?.amount ||
          serviceData.totals?.annual?.amount ||
          0;
        const serviceOriginal =
          (typeof serviceData.originalContractTotal === 'number' && serviceData.originalContractTotal) ||
          serviceCurrent;
        if (serviceCurrent <= 0) return;

        const annualCurrent =
          contractMonths > 0 ? (serviceCurrent / contractMonths) * 12 : serviceCurrent;
        const annualOriginal =
          contractMonths > 0 ? (serviceOriginal / contractMonths) * 12 : serviceOriginal;

        const cacheEntry = accountTypeCache[freqNum] as
          | AccountTypeCacheEntry
          | undefined;
        const accountType = cacheEntry?.accountType || null;
        const freqStr = backendFrequencyToServiceFrequency(freqNum);

        rows.push({serviceName, freqNum, freqStr, annualCurrent, annualOriginal, accountType});
      },
    );

    type Group = {
      freqStr: ServiceFrequency;
      rows: Row[];
      annualCurrent: number;
      annualOriginal: number;
      accountType: AccountType | null;
      commissionableAnnual: number;
      groupCommission: number;
    };
    const groups = new Map<string, Group>();

    rows.forEach(r => {
      if (!groups.has(r.freqStr)) {
        groups.set(r.freqStr, {
          freqStr: r.freqStr,
          rows: [],
          annualCurrent: 0,
          annualOriginal: 0,
          accountType: r.accountType,
          commissionableAnnual: 0,
          groupCommission: 0,
        });
      }
      const g = groups.get(r.freqStr)!;
      g.rows.push(r);
      g.annualCurrent += r.annualCurrent;
      g.annualOriginal += r.annualOriginal;
      if (!g.accountType && r.accountType) g.accountType = r.accountType;
    });

    let totalPerVisitCommission = 0;
    let totalAnnualCommission = 0;
    let totalPerVisitRevenue = 0;
    let totalCommissionableRevenue = 0;
    const servicesList: GlobalCommissionResult['services'] = [];

    

    let agreementCurrentAnnual = 0;
    let agreementOriginalAnnual = 0;
    rows.forEach(r => {
      agreementCurrentAnnual += r.annualCurrent;
      agreementOriginalAnnual += r.annualOriginal;
    });
    const agreementTier = getPricingTierFromList(
      agreementCurrentAnnual,
      agreementOriginalAnnual,
      rules.pricingTiers,
    );
    const pricingMultiplier = agreementTier.quotaMultiplier;
    const isGreenline = agreementTier.label === 'Greenline (130%+)';

    groups.forEach(g => {
      const adjustedAnnual = g.annualCurrent * pricingMultiplier;

      const visits = visitsPerYearOf(g.freqStr);
      const pitZoneAnnual = rules.pitPerVisitThreshold * visits;
      const anchorZoneAnnual = (isGreenline ? rules.anchorMinGreenline : rules.anchorPerVisitThreshold) * visits;
      const pen = rules.perVisitPenalties;
      const bread5Annual = pen.Bread5 * visits;
      const bread15Annual = pen.Bread15 * visits;
      const pitAnnual = pen.Pit * visits;
      const isNewLocation = true; 

      let commissionableAnnual = adjustedAnnual;
      switch (g.accountType) {
        case 'Anchor': {
          const pitPart = Math.min(adjustedAnnual, pitZoneAnnual);
          const stdPart = Math.min(
            Math.max(0, adjustedAnnual - pitZoneAnnual),
            anchorZoneAnnual - pitZoneAnnual,
          );
          const anchorPart = Math.max(0, adjustedAnnual - anchorZoneAnnual);
          commissionableAnnual = isNewLocation
            ? Math.max(0, stdPart) + anchorPart * rules.anchorBonusMultiplier
            : Math.min(adjustedAnnual, anchorZoneAnnual) + anchorPart * rules.anchorBonusMultiplier;
          
          void pitPart;
          break;
        }
        case 'Bread5':
          commissionableAnnual = Math.max(
            0,
            adjustedAnnual - (isNewLocation ? bread5Annual : 0),
          );
          break;
        case 'Bread15':
          commissionableAnnual = Math.max(
            0,
            adjustedAnnual - (isNewLocation ? bread15Annual : 0),
          );
          break;
        case 'Pit':
          commissionableAnnual = Math.max(
            0,
            adjustedAnnual - (isNewLocation || adjustedAnnual <= pitAnnual ? pitAnnual : 0),
          );
          break;
        default:
          commissionableAnnual = adjustedAnnual;
      }

      g.commissionableAnnual = commissionableAnnual;
      g.groupCommission = commissionableAnnual * (effectiveCommissionRate / 100);

      const groupVisits = visits;
      const groupPerVisit = groupVisits > 0 ? g.groupCommission / groupVisits : 0;

      g.rows.forEach(row => {
        const share = g.annualCurrent > 0 ? row.annualCurrent / g.annualCurrent : 0;
        const rowAnnualCommission = g.groupCommission * share;
        const rowCommissionable = commissionableAnnual * share;
        const rowPerVisit = groupPerVisit * share * groupVisits / Math.max(1, groupVisits);

        totalAnnualCommission += rowAnnualCommission;
        totalPerVisitCommission += rowPerVisit;
        totalPerVisitRevenue += row.annualCurrent;       
        totalCommissionableRevenue += rowCommissionable;

        servicesList.push({
          serviceName: row.serviceName,
          accountType: row.accountType,
          perVisitCommission: rowPerVisit,
          annualCommission: rowAnnualCommission,
        });
      });
    });

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
  }, [services, accountTypeCache, commissionRate, contractMonths, activeRules]);
}

export default useServiceCommission;
