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
  expandServiceAreas,
  BACKEND_TO_FREQUENCY,
} from './useAccountTypeDetection';

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

const FREQ_ORDER_BY_VISITS_ASC = [6, 0, 5, 4, 14, 3, 13, 2, 1];

function findAccountEntry(
  cache: AccountTypeCache,
  freqNum: number,
): AccountTypeCacheEntry | undefined {
  if (cache[freqNum]) return cache[freqNum] as AccountTypeCacheEntry;
  const idx = FREQ_ORDER_BY_VISITS_ASC.indexOf(freqNum);
  if (idx === -1) {
    for (const f of FREQ_ORDER_BY_VISITS_ASC)
      if (cache[f]) return cache[f] as AccountTypeCacheEntry;
    return undefined;
  }
  for (let i = idx + 1; i < FREQ_ORDER_BY_VISITS_ASC.length; i++) {
    if (cache[FREQ_ORDER_BY_VISITS_ASC[i]])
      return cache[FREQ_ORDER_BY_VISITS_ASC[i]] as AccountTypeCacheEntry;
  }
  for (let i = idx - 1; i >= 0; i--) {
    if (cache[FREQ_ORDER_BY_VISITS_ASC[i]])
      return cache[FREQ_ORDER_BY_VISITS_ASC[i]] as AccountTypeCacheEntry;
  }
  return undefined;
}

export interface QuotaTierPortion {
  level: 'below' | 'above' | 'double';
  label: string;
  rate: number;
  quotaCredit: number;
  commission: number;
}

export function computeQuotaTierPortions(
  priorQuotaCredit: number,
  agreementQuotaCredit: number,
  quotaTarget: number,
  rates: {below: number; above: number; double: number},
): QuotaTierPortion[] {
  const bounds = [0, quotaTarget, quotaTarget * 2, Infinity];
  const defs: Array<{level: 'below' | 'above' | 'double'; label: string; rate: number}> = [
    {level: 'below', label: 'Below Quota', rate: rates.below},
    {level: 'above', label: 'Above Quota', rate: rates.above},
    {level: 'double', label: 'Double Quota', rate: rates.double},
  ];
  const lo = Math.max(0, priorQuotaCredit);
  const hi = lo + agreementQuotaCredit;
  return defs.map((d, i) => {
    const from = Math.max(lo, bounds[i]);
    const to = Math.min(hi, bounds[i + 1]);
    const quotaCredit = Math.max(0, to - from);
    return {...d, quotaCredit, commission: quotaCredit * (d.rate / 100)};
  });
}

export function progressiveQuotaCommissionRate(
  priorQuotaCredit: number,
  agreementQuotaCredit: number,
  quotaTarget: number,
  rates: {below: number; above: number; double: number},
  fallbackRate: number,
): number {
  if (agreementQuotaCredit <= 0 || quotaTarget <= 0) return fallbackRate;
  const portions = computeQuotaTierPortions(priorQuotaCredit, agreementQuotaCredit, quotaTarget, rates);
  const commission = portions.reduce((sum, t) => sum + t.commission, 0);
  return (commission / agreementQuotaCredit) * 100;
}

export interface CommissionTier {
  level: 'below' | 'above' | 'double';
  label: string;
  rate: number;
  effectiveRate: number;
  base: number;
  commission: number;
  quotaCredit?: number;
}

export function computeCommissionTiers(
  priorQuotaCredit: number,
  commissionableBase: number,
  quotaTarget: number,
  rates: {below: number; above: number; double: number},
  agreementMultiplier: number,
): CommissionTier[] {
  const bounds = [0, quotaTarget, quotaTarget * 2, Infinity];
  const defs: Array<{level: 'below' | 'above' | 'double'; label: string; rate: number}> = [
    {level: 'below', label: 'Below Quota', rate: rates.below},
    {level: 'above', label: 'Above Quota', rate: rates.above},
    {level: 'double', label: 'Double Quota', rate: rates.double},
  ];
  const mult = agreementMultiplier / 100;
  const lo = Math.max(0, priorQuotaCredit);
  const hi = lo + commissionableBase;
  return defs.map((d, i) => {
    const from = Math.max(lo, bounds[i]);
    const to = Math.min(hi, bounds[i + 1]);
    const base = Math.max(0, to - from);
    const effectiveRate = d.rate * mult;
    return {...d, effectiveRate, base, commission: base * (effectiveRate / 100)};
  });
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
  totalQuotaCredit: number;
  totalFarAnnual: number;
  totalFarAnnualRedline: number;
  totalFarAnnualGreenline: number;
  effectiveCommissionRate: number;
  agreementMultiplier: number;
  agreementTerm: string;

  priorQuotaCredit: number;
  quotaTarget: number;
  quotaTierBreakdown: QuotaTierPortion[];
  commissionTierBreakdown: CommissionTier[];

  services: Array<{
    serviceName: string;
    accountType: AccountType | null;
    perVisitCommission: number;
    annualCommission: number;
    weeklyCommission: number;
    perVisitRevenue: number;
    revenueDeduction: number;
    commissionableRevenue: number;
    anchorBonus: number;
    annualOriginalRevenue: number;
    priceRatio: number;
    pricingTierLabel: string;
    pricingMultiplier: number;
    adjustedAnnualRevenue: number;
    frequencyLabel: string;
    visitsPerYear: number;
    commissionTiers: CommissionTier[];
    farTiers: {
      originalPerVisit: number;
      currentPerVisit: number;
      adjustedPerVisit: number;
      priceRatio: number;
      priorPerVisit: number;
      combinedPerVisit: number;
      pitThreshold: number;
      anchorThreshold: number;
      isGreenline: boolean;
      noCommPerVisit: number;
      normalPerVisit: number;
      anchorPerVisit: number;
      commissionablePerVisit: number;
    } | null;
  }>;

  groups: Array<{
    groupKey: string;
    serviceNames: string[];
    accountType: AccountType | null;
    frequencyLabel: string;
    visitsPerYear: number;
    perVisitRevenue: number;
    revenueDeduction: number;
    commissionableRevenue: number;
    anchorBonus: number;
    annualOriginalRevenue: number;
    priceRatio: number;
    pricingTierLabel: string;
    pricingMultiplier: number;
    perVisitCommission: number;
    weeklyCommission: number;
    annualCommission: number;
    commissionTiers: CommissionTier[];
    farTiers: GlobalCommissionResult['services'][number]['farTiers'];
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
  priorQuotaCredit?: number;
  rulesOverride?: ResolvedCommissionRules | null;
  isNewLocation?: boolean;
  priorFarRedline?: number;
  priorFarGreenline?: number;
}

export function useGlobalCommission({
  services,
  accountTypeCache,
  commissionRate = 6,
  contractMonths = 12,
  priorQuotaCredit = 0,
  rulesOverride = null,
  isNewLocation = true,
  priorFarRedline = 0,
  priorFarGreenline = 0,
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

  // A reopened agreement passes its frozen rules snapshot so later admin rule
  // changes never retroactively alter it; a new agreement uses the live rules.
  const effectiveRules = rulesOverride ?? activeRules;

  return useMemo(
    () =>
      computeGlobalCommission(
        services,
        accountTypeCache,
        contractMonths,
        commissionRate,
        effectiveRules,
        priorQuotaCredit,
        isNewLocation,
        priorFarRedline,
        priorFarGreenline,
      ),
    [services, accountTypeCache, contractMonths, commissionRate, effectiveRules, priorQuotaCredit, isNewLocation, priorFarRedline, priorFarGreenline],
  );
}

export function computeGlobalCommission(
  services: Record<string, any>,
  accountTypeCache: AccountTypeCache,
  contractMonths: number,
  commissionRate: number,
  rules: ResolvedCommissionRules,
  priorQuotaCredit: number = 0,
  isNewLocation: boolean = true,
  priorLocationFarAnnualRedline: number = 0,
  priorLocationFarAnnualGreenline: number = 0,
): GlobalCommissionResult {

    const agreementTerm =
      contractMonths >= 36 ? '3-year' :
      contractMonths >= 12 ? '1-year' : 'MTM-with-install';
    const agreementMultiplier = rules.agreementMultipliers[agreementTerm];

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

    Object.entries(expandServiceAreas(services)).forEach(
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

        const cacheEntry = findAccountEntry(accountTypeCache, freqNum);
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
      revenueDeduction: number;
      anchorBonus: number;
      adjustedAnnual: number;
      pricingMultiplier: number;
      pricingTierLabel: string;
      priceRatio: number;
      commissionTiers: CommissionTier[];
      farTiers: GlobalCommissionResult['services'][number]['farTiers'];
    };
    const groups = new Map<string, Group>();

    rows.forEach(r => {
      const key = `${r.accountType || 'none'}|${r.freqStr}`;
      if (!groups.has(key)) {
        groups.set(key, {
          freqStr: r.freqStr,
          rows: [],
          annualCurrent: 0,
          annualOriginal: 0,
          accountType: r.accountType,
          commissionableAnnual: 0,
          groupCommission: 0,
          revenueDeduction: 0,
          anchorBonus: 0,
          adjustedAnnual: 0,
          pricingMultiplier: 1,
          pricingTierLabel: '',
          priceRatio: 1,
          commissionTiers: [],
          farTiers: null,
        });
      }
      const g = groups.get(key)!;
      g.rows.push(r);
      g.annualCurrent += r.annualCurrent;
      g.annualOriginal += r.annualOriginal;
      if (!g.accountType && r.accountType) g.accountType = r.accountType;
    });

    let totalPerVisitCommission = 0;
    let totalAnnualCommission = 0;
    let totalPerVisitRevenue = 0;
    let totalCommissionableRevenue = 0;
    let totalFarAnnualRedline = 0;
    let totalFarAnnualGreenline = 0;
    const servicesList: GlobalCommissionResult['services'] = [];
    const groupsList: GlobalCommissionResult['groups'] = [];

    let agreementCurrentAnnual = 0;
    let agreementOriginalAnnual = 0;
    rows.forEach(r => {
      agreementCurrentAnnual += r.annualCurrent;
      agreementOriginalAnnual += r.annualOriginal;
    });

    let numFarGroupsRedline = 0;
    let numFarGroupsGreenline = 0;
    groups.forEach(g => {
      const tier = getPricingTierFromList(g.annualCurrent, g.annualOriginal, rules.pricingTiers);
      g.pricingMultiplier = tier.quotaMultiplier;
      g.pricingTierLabel = tier.label;
      g.priceRatio = g.annualOriginal > 0 ? g.annualCurrent / g.annualOriginal : 1;
      if (g.accountType === 'Anchor' || g.accountType === 'Pit') {
        if (tier.label === 'Greenline (130%+)') numFarGroupsGreenline++;
        else numFarGroupsRedline++;
      }
    });

    let totalQuotaCredit = 0;
    groups.forEach(g => {
      totalQuotaCredit += g.annualCurrent * g.pricingMultiplier;
    });

    groups.forEach(g => {
      const isGreenline = g.pricingTierLabel === 'Greenline (130%+)';
      const perFarGroupPrior = !isNewLocation
        ? (isGreenline
            ? (numFarGroupsGreenline > 0 ? priorLocationFarAnnualGreenline / numFarGroupsGreenline : 0)
            : (numFarGroupsRedline > 0 ? priorLocationFarAnnualRedline / numFarGroupsRedline : 0))
        : 0;
      const adjusted = g.annualCurrent * g.pricingMultiplier;

      const visits = visitsPerYearOf(g.freqStr);
      const pitZoneAnnual = rules.pitPerVisitThreshold * visits;
      const anchorZoneAnnual = (isGreenline ? rules.anchorMinGreenline : rules.anchorPerVisitThreshold) * visits;
      const pen = rules.perVisitPenalties;
      const bread5Annual = pen.Bread5 * visits;
      const bread15Annual = pen.Bread15 * visits;
      const visitsF = visits > 0 ? visits : 1;
      g.adjustedAnnual = adjusted;

      let commissionableAnnual = adjusted;
      switch (g.accountType) {
        case 'Anchor':
        case 'Pit': {
          const prior = perFarGroupPrior * visitsF;
          if (isGreenline) totalFarAnnualGreenline += adjusted / visitsF;
          else totalFarAnnualRedline += adjusted / visitsF;
          const comb = adjusted + prior;
          const tieredFar = (v: number) =>
            Math.min(Math.max(0, v - pitZoneAnnual), Math.max(0, anchorZoneAnnual - pitZoneAnnual)) +
            Math.max(0, v - anchorZoneAnnual) * rules.anchorBonusMultiplier;
          const round2 = (x: number) => Math.round(x * 100) / 100;
          const cpv = round2(Math.max(0, tieredFar(comb) - tieredFar(prior)) / visitsF);
          commissionableAnnual = cpv * visitsF;
          g.revenueDeduction = Math.max(0, Math.min(comb, pitZoneAnnual) - Math.min(prior, pitZoneAnnual));
          const anchorOfThis =
            Math.max(0, comb - anchorZoneAnnual) - Math.max(0, prior - anchorZoneAnnual);
          g.anchorBonus = anchorOfThis * (rules.anchorBonusMultiplier - 1);
          const bandNormal = Math.max(0, Math.min(comb, anchorZoneAnnual) - Math.max(prior, pitZoneAnnual));
          g.farTiers = {
            originalPerVisit: round2(g.annualOriginal / visitsF),
            currentPerVisit: round2(g.annualCurrent / visitsF),
            adjustedPerVisit: round2(adjusted / visitsF),
            priceRatio: g.annualOriginal > 0 ? g.annualCurrent / g.annualOriginal : 1,
            priorPerVisit: round2(prior / visitsF),
            combinedPerVisit: round2(comb / visitsF),
            pitThreshold: rules.pitPerVisitThreshold,
            anchorThreshold: isGreenline ? rules.anchorMinGreenline : rules.anchorPerVisitThreshold,
            isGreenline,
            noCommPerVisit: round2(g.revenueDeduction / visitsF),
            normalPerVisit: round2(bandNormal / visitsF),
            anchorPerVisit: round2(anchorOfThis / visitsF),
            commissionablePerVisit: cpv,
          };

          if (g.accountType === 'Pit' && perFarGroupPrior > rules.anchorPerVisitThreshold) {
            g.accountType = 'Anchor';
          }
          break;
        }
        case 'Bread5':
          g.revenueDeduction = bread5Annual;
          commissionableAnnual = Math.max(0, adjusted - bread5Annual);
          break;
        case 'Bread15':
          g.revenueDeduction = bread15Annual;
          commissionableAnnual = Math.max(0, adjusted - bread15Annual);
          break;
        default:
          commissionableAnnual = adjusted;
      }

      g.commissionableAnnual = commissionableAnnual;
    });

    const mult = agreementMultiplier / 100;
    const tierAggBase: Record<'below' | 'above' | 'double', number> = { below: 0, above: 0, double: 0 };
    const tierAggCommission: Record<'below' | 'above' | 'double', number> = { below: 0, above: 0, double: 0 };
    const quotaAggCredit: Record<'below' | 'above' | 'double', number> = { below: 0, above: 0, double: 0 };
    let cumQuotaCredit = priorQuotaCredit;

    groups.forEach(g => {
      const visits = visitsPerYearOf(g.freqStr);

      const groupQuotaCredit = g.annualCurrent * g.pricingMultiplier;

      const groupBaseRate = progressiveQuotaCommissionRate(
        cumQuotaCredit,
        groupQuotaCredit,
        rules.quotaTarget,
        rules.quotaRates,
        commissionRate,
      );
      g.groupCommission = g.commissionableAnnual * ((groupBaseRate * mult) / 100);

      const groupQuotaPortions =
        rules.quotaTarget > 0 && groupQuotaCredit > 0
          ? computeQuotaTierPortions(cumQuotaCredit, groupQuotaCredit, rules.quotaTarget, rules.quotaRates)
          : [];

      const groupCommissionTiers = groupQuotaPortions
        .filter(p => p.quotaCredit > 0)
        .map(p => {
          const share = groupQuotaCredit > 0 ? p.quotaCredit / groupQuotaCredit : 0;
          return {
            level: p.level,
            label: p.label,
            rate: p.rate,
            effectiveRate: p.rate * mult,
            base: g.commissionableAnnual * share,
            commission: g.groupCommission * share,
            quotaCredit: p.quotaCredit,
          };
        });

      groupCommissionTiers.forEach(t => { tierAggBase[t.level] += t.base; tierAggCommission[t.level] += t.commission; });
      groupQuotaPortions.forEach(t => { quotaAggCredit[t.level] += t.quotaCredit; });

      cumQuotaCredit += groupQuotaCredit;

      const groupVisits = visits;

      groupsList.push({
        groupKey: `${g.accountType || 'none'}|${g.freqStr}`,
        serviceNames: g.rows.map(r => r.serviceName),
        accountType: g.accountType,
        frequencyLabel: BACKEND_TO_FREQUENCY[g.rows[0]?.freqNum] || 'Unknown',
        visitsPerYear: groupVisits,
        perVisitRevenue: g.annualCurrent,
        revenueDeduction: g.revenueDeduction,
        commissionableRevenue: g.commissionableAnnual,
        anchorBonus: g.anchorBonus,
        annualOriginalRevenue: g.annualOriginal,
        priceRatio: g.priceRatio,
        pricingTierLabel: g.pricingTierLabel,
        pricingMultiplier: g.pricingMultiplier,
        perVisitCommission: groupVisits > 0 ? g.groupCommission / groupVisits : 0,
        weeklyCommission: g.groupCommission / rules.weeksPerAnnualCommission,
        annualCommission: g.groupCommission,
        commissionTiers: groupCommissionTiers,
        farTiers: g.farTiers,
      });

      g.rows.forEach(row => {
        const share = g.annualCurrent > 0 ? row.annualCurrent / g.annualCurrent : 0;
        const rowAnnualCommission = g.groupCommission * share;
        const rowCommissionable = g.commissionableAnnual * share;
        const rowPerVisit = groupVisits > 0 ? rowAnnualCommission / groupVisits : 0;
        const rowWeekly = rowAnnualCommission / rules.weeksPerAnnualCommission;
        const rowCommissionTiers = groupCommissionTiers.map(t => ({
          ...t,
          base: t.base * share,
          commission: t.commission * share,
          quotaCredit: (t.quotaCredit ?? 0) * share,
        }));

        totalAnnualCommission += rowAnnualCommission;
        totalPerVisitCommission += rowPerVisit;
        totalPerVisitRevenue += row.annualCurrent;
        totalCommissionableRevenue += rowCommissionable;

        servicesList.push({
          serviceName: row.serviceName,
          accountType: row.accountType,
          perVisitCommission: rowPerVisit,
          annualCommission: rowAnnualCommission,
          weeklyCommission: rowWeekly,
          perVisitRevenue: row.annualCurrent,
          revenueDeduction: g.revenueDeduction * share,
          commissionableRevenue: rowCommissionable,
          anchorBonus: g.anchorBonus * share,
          annualOriginalRevenue: row.annualOriginal,
          priceRatio: g.priceRatio,
          pricingTierLabel: g.pricingTierLabel,
          pricingMultiplier: g.pricingMultiplier,
          adjustedAnnualRevenue: row.annualCurrent * g.pricingMultiplier,
          frequencyLabel: BACKEND_TO_FREQUENCY[row.freqNum] || 'Unknown',
          visitsPerYear: groupVisits,
          commissionTiers: rowCommissionTiers,
          farTiers: g.farTiers,
        });
      });
    });

    const tierMeta = [
      { level: 'below' as const, label: 'Below Quota', rate: rules.quotaRates.below },
      { level: 'above' as const, label: 'Above Quota', rate: rules.quotaRates.above },
      { level: 'double' as const, label: 'Double Quota', rate: rules.quotaRates.double },
    ];
    const commissionTierBreakdown: CommissionTier[] = tierMeta.map(m => ({
      level: m.level,
      label: m.label,
      rate: m.rate,
      effectiveRate: m.rate * mult,
      base: tierAggBase[m.level],
      commission: tierAggCommission[m.level],
    }));
    const quotaTierBreakdown: QuotaTierPortion[] = tierMeta.map(m => ({
      level: m.level,
      label: m.label,
      rate: m.rate,
      quotaCredit: quotaAggCredit[m.level],
      commission: quotaAggCredit[m.level] * (m.rate / 100),
    }));
    const effectiveCommissionRate =
      totalCommissionableRevenue > 0 ? (totalAnnualCommission / totalCommissionableRevenue) * 100 : 0;

    return {
      totalPerVisitCommission,
      totalAnnualCommission,
      totalPerVisitRevenue,
      totalCommissionableRevenue,
      totalQuotaCredit,
      totalFarAnnual: totalFarAnnualRedline + totalFarAnnualGreenline,
      totalFarAnnualRedline,
      totalFarAnnualGreenline,
      effectiveCommissionRate,
      agreementMultiplier,
      agreementTerm,

      priorQuotaCredit,
      quotaTarget: rules.quotaTarget,
      quotaTierBreakdown,
      commissionTierBreakdown,

      services: servicesList,
      groups: groupsList,

      formatted: {
        totalPerVisitCommission: formatCurrency(totalPerVisitCommission),
        totalAnnualCommission: formatCurrency(totalAnnualCommission),
        totalPerVisitRevenue: formatCurrency(totalPerVisitRevenue),
        totalCommissionableRevenue: formatCurrency(totalCommissionableRevenue),
      },

      hasDetectedServices: servicesList.some(s => s.accountType !== null),
      serviceCount: servicesList.length,
    };
}

export default useServiceCommission;
