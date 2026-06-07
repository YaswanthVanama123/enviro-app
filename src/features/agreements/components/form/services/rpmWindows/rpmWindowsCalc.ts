// RPM Windows calculation — ported 1:1 from the web app
// (enviromaster-webapp/src/features/services/kinds/rpmWindows/compute.ts
//  + components/services/rpmWindows/rpmWindowsConfig.ts)

export type RpmFrequencyKey =
  | 'oneTime'
  | 'weekly'
  | 'biweekly'
  | 'twicePerMonth'
  | 'monthly'
  | 'everyFourWeeks'
  | 'bimonthly'
  | 'quarterly'
  | 'biannual'
  | 'annual';

export type RpmRateCategory = 'redRate' | 'greenRate';

export const rpmWindowPricingConfig = {
  smallWindowRate: 1.5,
  mediumWindowRate: 3.0,
  largeWindowRate: 7.0,
  tripCharge: 0,
  installMultiplierFirstTime: 3,
  installMultiplierClean: 1,
  frequencyMultipliers: {
    oneTime: 1.0,
    weekly: 1.0,
    biweekly: 1.25,
    twicePerMonth: 1.2,
    monthly: 1.25,
    everyFourWeeks: 1.25,
    bimonthly: 1.5,
    quarterly: 2.0,
    biannual: 2.5,
    annual: 3.0,
    quarterlyFirstTime: 3.0,
  } as Record<string, number>,
  monthlyConversions: {
    weekly: 4.33,
    actualWeeksPerMonth: 4.33,
    actualWeeksPerYear: 52,
  },
  rateCategories: {
    redRate: {multiplier: 1.0, commissionRate: 'standard'},
    greenRate: {multiplier: 1.3, commissionRate: '3% above standard (up to 12%)'},
  } as Record<RpmRateCategory, {multiplier: number; commissionRate: string}>,
};

export interface BackendRpmConfig {
  windowPricingBothSidesIncluded?: {smallWindowPrice: number; mediumWindowPrice: number; largeWindowPrice: number};
  installPricing?: {installationMultiplier: number; cleanInstallationMultiplier: number};
  minimumChargePerVisit?: number;
  tripCharges?: {standard: number; beltway: number};
  frequencyPriceMultipliers?: {
    biweeklyPriceMultiplier: number;
    monthlyPriceMultiplier: number;
    quarterlyPriceMultiplierAfterFirstTime: number;
    quarterlyFirstTimeMultiplier: number;
  };
  frequencyMetadata?: any;
  minContractMonths?: number;
  maxContractMonths?: number;
}

export interface RpmBaseWeeklyRates {
  small: number;
  medium: number;
  large: number;
  trip: number;
}

export interface RpmExtraChargeLine {
  amount: number;
}

export interface RpmWindowsFormState {
  smallQty: number;
  mediumQty: number;
  largeQty: number;
  smallWindowRate: number;
  mediumWindowRate: number;
  largeWindowRate: number;
  tripCharge: number;
  isFirstTimeInstall: boolean;
  selectedRateCategory: RpmRateCategory;
  installMultiplierFirstTime: number;
  installMultiplierClean: number;
  extraCharges: RpmExtraChargeLine[];
  contractMonths: number;
  frequency: RpmFrequencyKey;
  applyMinimum?: boolean;
  customInstallationFee?: number;
  customPerVisitPrice?: number;
  customMonthlyRecurring?: number;
  customContractTotal?: number;
}

export interface RpmCalcResult {
  effSmall: number;
  effMedium: number;
  effLarge: number;
  effTrip: number;
  recurringPerVisitRated: number;
  installOneTime: number;
  firstVisitTotalRated: number;
  standardMonthlyBillRated: number;
  firstMonthBillRated: number;
  monthlyBillRated: number;
  contractTotalRated: number;
  minimumChargePerVisit: number;
  originalContractTotal: number;
}

export function mapFrequency(v: string): RpmFrequencyKey {
  if (
    v === 'oneTime' ||
    v === 'weekly' ||
    v === 'biweekly' ||
    v === 'twicePerMonth' ||
    v === 'monthly' ||
    v === 'everyFourWeeks' ||
    v === 'bimonthly' ||
    v === 'quarterly' ||
    v === 'biannual' ||
    v === 'annual'
  ) {
    return v;
  }
  return 'weekly';
}

export function getEffectiveFrequencyKey(freqKey: RpmFrequencyKey): RpmFrequencyKey {
  if (freqKey === 'twicePerMonth' || freqKey === 'bimonthly' || freqKey === 'everyFourWeeks') {
    return 'monthly';
  }
  if (freqKey === 'biannual' || freqKey === 'annual') {
    return 'quarterly';
  }
  return freqKey;
}

export function getFrequencyMultiplier(
  effectiveFreqKey: RpmFrequencyKey,
  backendConfig: BackendRpmConfig | null,
): number {
  const cfg = rpmWindowPricingConfig;
  if (backendConfig?.frequencyPriceMultipliers) {
    if (effectiveFreqKey === 'weekly') {
      return 1;
    }
    if (effectiveFreqKey === 'biweekly' && backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier) {
      return backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier;
    }
    if (effectiveFreqKey === 'monthly' && backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier) {
      return backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier;
    }
    if (
      effectiveFreqKey === 'quarterly' &&
      backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime
    ) {
      return backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime;
    }
  }
  return (cfg.frequencyMultipliers as any)[effectiveFreqKey] || 1;
}

export function getBackendBaseRates(backendConfig: BackendRpmConfig | null): RpmBaseWeeklyRates {
  const cfg = rpmWindowPricingConfig;
  return {
    small: backendConfig?.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate,
    medium: backendConfig?.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate,
    large: backendConfig?.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate,
    trip: backendConfig?.tripCharges?.standard ?? cfg.tripCharge,
  };
}

function getCycleMonths(frequency: string, backendConfig: any): number {
  const cycleMonths = backendConfig?.frequencyMetadata?.[frequency]?.cycleMonths;
  if (frequency === 'monthly') {
    return cycleMonths === 0 ? 1 : cycleMonths ?? 1;
  }
  if (typeof cycleMonths === 'number' && cycleMonths > 0) {
    return cycleMonths;
  }
  const fallbackCycles: Record<string, number> = {bimonthly: 2, quarterly: 3, biannual: 6, annual: 12};
  return fallbackCycles[frequency] ?? 1;
}

export function computeRpmWindowsCalc(
  form: RpmWindowsFormState,
  baseWeeklyRates: RpmBaseWeeklyRates,
  backendConfig: BackendRpmConfig | null,
  customFieldsTotal: number = 0,
): RpmCalcResult {
  const cfg = rpmWindowPricingConfig;
  const activeConfig = {
    installMultiplierFirstTime:
      backendConfig?.installPricing?.installationMultiplier ?? cfg.installMultiplierFirstTime,
    installMultiplierClean:
      backendConfig?.installPricing?.cleanInstallationMultiplier ?? cfg.installMultiplierClean,
    minimumChargePerVisit: backendConfig?.minimumChargePerVisit ?? 0,
    monthlyConversions: {
      actualWeeksPerMonth:
        backendConfig?.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ??
        cfg.monthlyConversions.actualWeeksPerMonth,
    },
    rateCategories: cfg.rateCategories,
  };

  const freqKey = mapFrequency(form.frequency);
  let effectiveFreqKey = freqKey;
  if (freqKey === 'twicePerMonth' || freqKey === 'bimonthly' || freqKey === 'everyFourWeeks') {
    effectiveFreqKey = 'monthly';
  } else if (freqKey === 'biannual' || freqKey === 'annual') {
    effectiveFreqKey = 'quarterly';
  }

  let freqMult = 1;
  if (backendConfig?.frequencyPriceMultipliers) {
    if (effectiveFreqKey === 'weekly') {
      freqMult = 1;
    } else if (effectiveFreqKey === 'biweekly' && backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier) {
      freqMult = backendConfig.frequencyPriceMultipliers.biweeklyPriceMultiplier;
    } else if (effectiveFreqKey === 'monthly' && backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier) {
      freqMult = backendConfig.frequencyPriceMultipliers.monthlyPriceMultiplier;
    } else if (
      effectiveFreqKey === 'quarterly' &&
      backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime
    ) {
      freqMult = backendConfig.frequencyPriceMultipliers.quarterlyPriceMultiplierAfterFirstTime;
    } else {
      freqMult = (cfg.frequencyMultipliers as any)[effectiveFreqKey] || 1;
    }
  } else {
    freqMult = (cfg.frequencyMultipliers as any)[effectiveFreqKey] || 1;
  }

  const weeklySmall = baseWeeklyRates.small;
  const weeklyMedium = baseWeeklyRates.medium;
  const weeklyLarge = baseWeeklyRates.large;

  const weeklyWindows =
    form.smallQty * weeklySmall + form.mediumQty * weeklyMedium + form.largeQty * weeklyLarge;
  const hasWindows = weeklyWindows > 0;

  const effSmall = form.smallWindowRate;
  const effMedium = form.mediumWindowRate;
  const effLarge = form.largeWindowRate;
  const effTrip = form.tripCharge;

  const perVisitWindows =
    form.smallQty * effSmall + form.mediumQty * effMedium + form.largeQty * effLarge;
  const perVisitService = hasWindows ? perVisitWindows : 0;

  const extrasTotal = form.extraCharges.reduce((s, l) => s + (l.amount || 0), 0);
  const recurringPerVisitBase = perVisitService + extrasTotal;

  const rateCfg = activeConfig.rateCategories[form.selectedRateCategory] ?? activeConfig.rateCategories.redRate;
  const recurringPerVisitRated = recurringPerVisitBase * (rateCfg?.multiplier ?? 1);

  const installMultiplier = form.isFirstTimeInstall
    ? form.installMultiplierFirstTime ?? activeConfig.installMultiplierFirstTime
    : form.installMultiplierClean ?? activeConfig.installMultiplierClean;

  const minimumChargePerVisit =
    backendConfig?.minimumChargePerVisit ?? activeConfig.minimumChargePerVisit ?? 50;
  const weeklyWindowsWithMinimum = hasWindows
    ? form.applyMinimum !== false
      ? Math.max(weeklyWindows, minimumChargePerVisit)
      : weeklyWindows
    : 0;

  const installOneTimeBase =
    form.isFirstTimeInstall && hasWindows ? weeklyWindowsWithMinimum * installMultiplier : 0;
  const installOneTime = installOneTimeBase * (rateCfg?.multiplier ?? 1);

  const effectiveInstallation = form.customInstallationFee ?? installOneTime;
  const effectivePerVisit = form.customPerVisitPrice ?? recurringPerVisitRated;

  const firstVisitTotalRated = effectiveInstallation;

  let monthlyVisits = 0;
  const weeksPerMonth = activeConfig.monthlyConversions.actualWeeksPerMonth ?? 4.33;
  if (freqKey === 'oneTime') {
    monthlyVisits = 0;
  } else if (freqKey === 'weekly') {
    monthlyVisits = backendConfig?.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? weeksPerMonth;
  } else if (freqKey === 'biweekly') {
    monthlyVisits = backendConfig?.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier ?? weeksPerMonth / 2;
  } else if (freqKey === 'twicePerMonth') {
    monthlyVisits = 2;
  } else if (freqKey === 'monthly') {
    monthlyVisits = 1;
  } else if (freqKey === 'everyFourWeeks') {
    monthlyVisits = 1.0833;
  } else if (freqKey === 'bimonthly') {
    monthlyVisits = 0.5;
  } else {
    monthlyVisits = 0;
  }

  let standardMonthlyBillRated = effectivePerVisit * monthlyVisits;
  if (freqKey === 'twicePerMonth') {
    standardMonthlyBillRated = effectivePerVisit * 1;
  }

  const isVisitBasedFrequency =
    freqKey === 'oneTime' ||
    freqKey === 'quarterly' ||
    freqKey === 'biannual' ||
    freqKey === 'annual' ||
    freqKey === 'bimonthly' ||
    freqKey === 'everyFourWeeks';
  const effectiveServiceVisitsFirstMonth = isVisitBasedFrequency ? 0 : monthlyVisits > 1 ? monthlyVisits - 1 : 0;

  const contractMonths = Math.max(form.contractMonths ?? 0, 0);

  const recurringPerVisitWithMinimum = hasWindows
    ? form.applyMinimum !== false
      ? Math.max(effectivePerVisit, minimumChargePerVisit)
      : effectivePerVisit
    : 0;

  const standardMonthlyBillWithMinimum = recurringPerVisitWithMinimum * monthlyVisits;
  let displayMonthlyBillWithMinimum = standardMonthlyBillWithMinimum;
  if (isVisitBasedFrequency) {
    if (freqKey === 'quarterly' || freqKey === 'biannual' || freqKey === 'annual' || freqKey === 'bimonthly') {
      const cycleMonths = getCycleMonths(freqKey, backendConfig);
      displayMonthlyBillWithMinimum = recurringPerVisitWithMinimum / cycleMonths;
    }
  }

  let firstMonthBillWithMinimum = 0;
  if (form.isFirstTimeInstall) {
    if (isVisitBasedFrequency) {
      firstMonthBillWithMinimum = effectiveInstallation;
    } else {
      firstMonthBillWithMinimum = effectiveInstallation + recurringPerVisitWithMinimum * effectiveServiceVisitsFirstMonth;
    }
  } else {
    firstMonthBillWithMinimum = recurringPerVisitWithMinimum * monthlyVisits;
  }

  let contractTotalWithMinimum = 0;
  if (contractMonths > 0) {
    if (freqKey === 'oneTime') {
      contractTotalWithMinimum = form.isFirstTimeInstall ? effectiveInstallation : recurringPerVisitWithMinimum;
    } else if (freqKey === 'everyFourWeeks') {
      const totalVisits = Math.round(contractMonths * 1.0833);
      contractTotalWithMinimum =
        (form.isFirstTimeInstall ? effectiveInstallation : 0) +
        recurringPerVisitWithMinimum * (totalVisits - (form.isFirstTimeInstall ? 1 : 0));
    } else if (isVisitBasedFrequency) {
      const cycleMonths = getCycleMonths(freqKey, backendConfig);
      const totalVisits = Math.max(Math.floor(contractMonths / cycleMonths), 1);
      contractTotalWithMinimum =
        (form.isFirstTimeInstall ? effectiveInstallation : 0) +
        recurringPerVisitWithMinimum * (totalVisits - (form.isFirstTimeInstall ? 1 : 0));
    } else {
      if (form.isFirstTimeInstall && firstMonthBillWithMinimum !== standardMonthlyBillWithMinimum) {
        const remainingMonths = Math.max(contractMonths - 1, 0);
        contractTotalWithMinimum = firstMonthBillWithMinimum + standardMonthlyBillWithMinimum * remainingMonths;
      } else {
        contractTotalWithMinimum = standardMonthlyBillWithMinimum * contractMonths;
      }
    }
  }

  const finalFirstMonth = firstMonthBillWithMinimum;
  const finalMonthlyRecurring = form.customMonthlyRecurring ?? standardMonthlyBillWithMinimum;

  let finalContractTotal = contractTotalWithMinimum;
  if (contractMonths > 0 && !isVisitBasedFrequency) {
    if (form.isFirstTimeInstall && finalFirstMonth !== finalMonthlyRecurring) {
      const remainingMonths = Math.max(contractMonths - 1, 0);
      finalContractTotal = finalFirstMonth + finalMonthlyRecurring * remainingMonths;
    } else {
      finalContractTotal = finalMonthlyRecurring * contractMonths;
    }
  }

  const contractTotalBeforeCustomFields = form.customContractTotal ?? finalContractTotal;
  const contractTotalWithCustomFields = contractTotalBeforeCustomFields + customFieldsTotal;

  // Baseline (original) for Greenline/Redline
  const pricingTableSmall = backendConfig?.windowPricingBothSidesIncluded?.smallWindowPrice ?? cfg.smallWindowRate;
  const pricingTableMedium = backendConfig?.windowPricingBothSidesIncluded?.mediumWindowPrice ?? cfg.mediumWindowRate;
  const pricingTableLarge = backendConfig?.windowPricingBothSidesIncluded?.largeWindowPrice ?? cfg.largeWindowRate;

  const baselineSmallRate = pricingTableSmall * freqMult;
  const baselineMediumRate = pricingTableMedium * freqMult;
  const baselineLargeRate = pricingTableLarge * freqMult;

  const originalPerVisitWindows = hasWindows
    ? form.smallQty * baselineSmallRate + form.mediumQty * baselineMediumRate + form.largeQty * baselineLargeRate
    : 0;
  const originalPerVisitRated = originalPerVisitWindows * (rateCfg?.multiplier ?? 1);
  const originalPerVisitWithMinimum = hasWindows
    ? form.applyMinimum !== false
      ? Math.max(originalPerVisitRated, minimumChargePerVisit)
      : originalPerVisitRated
    : 0;
  const originalStandardMonthlyBill = originalPerVisitWithMinimum * monthlyVisits;

  const baselineWeeklyWindows =
    form.smallQty * pricingTableSmall + form.mediumQty * pricingTableMedium + form.largeQty * pricingTableLarge;
  const baselineInstallMultiplier = form.isFirstTimeInstall
    ? activeConfig.installMultiplierFirstTime
    : activeConfig.installMultiplierClean;
  const baselineInstallOneTime =
    form.isFirstTimeInstall && hasWindows
      ? Math.max(baselineWeeklyWindows, minimumChargePerVisit) * baselineInstallMultiplier * (rateCfg?.multiplier ?? 1)
      : 0;

  let originalContractTotal = 0;
  if (contractMonths > 0 && hasWindows) {
    if (freqKey === 'oneTime') {
      originalContractTotal = form.isFirstTimeInstall ? baselineInstallOneTime : originalPerVisitWithMinimum;
    } else if (freqKey === 'everyFourWeeks') {
      const totalVisits = Math.round(contractMonths * 1.0833);
      if (form.isFirstTimeInstall && baselineInstallOneTime > 0) {
        const serviceVisits = Math.max(totalVisits - 1, 0);
        originalContractTotal = baselineInstallOneTime + serviceVisits * originalPerVisitWithMinimum;
      } else {
        originalContractTotal = totalVisits * originalPerVisitWithMinimum;
      }
    } else if (isVisitBasedFrequency) {
      const cycleMonths = getCycleMonths(freqKey, backendConfig);
      const totalVisits = Math.max(Math.floor(contractMonths / cycleMonths), 1);
      if (form.isFirstTimeInstall && baselineInstallOneTime > 0) {
        const serviceVisits = Math.max(totalVisits - 1, 0);
        originalContractTotal = baselineInstallOneTime + serviceVisits * originalPerVisitWithMinimum;
      } else {
        originalContractTotal = totalVisits * originalPerVisitWithMinimum;
      }
    } else {
      if (form.isFirstTimeInstall && baselineInstallOneTime > 0) {
        const effectiveServiceVisitsFirst = monthlyVisits > 1 ? monthlyVisits - 1 : 0;
        const baselineFirstMonth = baselineInstallOneTime + originalPerVisitWithMinimum * effectiveServiceVisitsFirst;
        const remainingMonths = Math.max(contractMonths - 1, 0);
        originalContractTotal = baselineFirstMonth + originalStandardMonthlyBill * remainingMonths;
      } else {
        originalContractTotal = originalStandardMonthlyBill * contractMonths;
      }
    }
  }

  return {
    effSmall,
    effMedium,
    effLarge,
    effTrip,
    recurringPerVisitRated: form.customPerVisitPrice ?? recurringPerVisitWithMinimum,
    installOneTime: effectiveInstallation,
    firstVisitTotalRated,
    standardMonthlyBillRated: finalMonthlyRecurring,
    firstMonthBillRated: finalFirstMonth,
    monthlyBillRated: form.customMonthlyRecurring ?? displayMonthlyBillWithMinimum,
    contractTotalRated: contractTotalWithCustomFields,
    minimumChargePerVisit,
    originalContractTotal,
  };
}
