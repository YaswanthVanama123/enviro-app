// SaniPod calculation — ported 1:1 from the web app
// (enviromaster-webapp/src/features/services/kinds/sanipod/compute.ts
//  + components/services/sanipod/sanipodConfig.ts + sanipodTypes.ts)

import {
  type FrequencyKey,
  FREQUENCY_MONTHLY_MULTIPLIER,
  FREQUENCY_VISITS_PER_YEAR,
} from '../../../../../../shared/constants/frequency';

export type SanipodFrequencyKey = FrequencyKey;
export type SanipodRateCategory = 'redRate' | 'greenRate';
export type SanipodServiceRuleKey = 'perPod8' | 'perPod3Plus40';

// Default config (sanipodConfig.ts). Used as fallback when backend config absent.
export const SANIPOD_CONFIG = {
  weeklyRatePerUnit: 3.0,
  altWeeklyRatePerUnit: 8.0,
  extraBagPrice: 2.0,
  installChargePerUnit: 25.0,
  standaloneExtraWeeklyCharge: 40.0,
  tripChargePerVisit: 0.0,
  defaultFrequency: 'weekly' as SanipodFrequencyKey,
  weeksPerMonth: 4.33,
  weeksPerYear: 52,
  minContractMonths: 2,
  maxContractMonths: 36,
  rateCategories: {
    redRate: {multiplier: 1.0, commissionRate: '20%'},
    greenRate: {multiplier: 1.3, commissionRate: '25%'},
  },
};

// Web sanipod frequency multipliers: quarterly/biannual/annual bill 0 (they are
// visit-based and handled via annualFrequencies), one-time is 0; the rest match
// the shared monthly table.
const SANIPOD_FREQUENCY_MULTIPLIERS: Record<FrequencyKey, number> = {
  ...FREQUENCY_MONTHLY_MULTIPLIER,
  oneTime: 0,
  quarterly: 0,
  biannual: 0,
  annual: 0,
};

export interface BackendSanipodConfig {
  corePricingIncludedWithSaniClean?: {
    weeklyPricePerUnit?: number;
    installPricePerUnit?: number;
    includedWeeklyRefills?: number;
  };
  extraBagPricing?: {pricePerBag?: number; refillPackQuantity?: number | null};
  standalonePricingWithoutSaniClean?: {
    pricePerUnitPerWeek?: number;
    alternatePricePerUnitPerWeek?: number;
    weeklyMinimumPrice?: number;
    useCheapestOption?: boolean;
  };
  tripChargesStandaloneOnly?: {standard?: number; beltway?: number};
  frequencyMetadata?: any;
  minContractMonths?: number;
  maxContractMonths?: number;
  rateCategories?: {
    redRate?: {multiplier: number; commissionRate: string};
    greenRate?: {multiplier: number; commissionRate: string};
  };
}

export interface SanipodActiveConfig {
  weeklyRatePerUnit: number;
  altWeeklyRatePerUnit: number;
  extraBagPrice: number;
  installChargePerUnit: number;
  standaloneExtraWeeklyCharge: number;
  tripChargePerVisit: number;
  tripChargeBeltway?: number;
  useCheapestOption?: boolean;
  minContractMonths: number;
  maxContractMonths: number;
  weeksPerMonth: number;
  weeksPerYear: number;
  rateCategories: typeof SANIPOD_CONFIG.rateCategories;
  frequencyMultipliers: Record<string, number>;
  annualFrequencies: Record<string, number>;
  frequencyMetadata?: any;
}

export function buildSanipodActiveConfig(backendConfig: BackendSanipodConfig | null): SanipodActiveConfig {
  const defaults = {
    weeklyRatePerUnit: SANIPOD_CONFIG.weeklyRatePerUnit,
    altWeeklyRatePerUnit: SANIPOD_CONFIG.altWeeklyRatePerUnit,
    extraBagPrice: SANIPOD_CONFIG.extraBagPrice,
    installChargePerUnit: SANIPOD_CONFIG.installChargePerUnit,
    standaloneExtraWeeklyCharge: SANIPOD_CONFIG.standaloneExtraWeeklyCharge,
    tripChargePerVisit: SANIPOD_CONFIG.tripChargePerVisit,
    minContractMonths: SANIPOD_CONFIG.minContractMonths,
    maxContractMonths: SANIPOD_CONFIG.maxContractMonths,
    weeksPerMonth: SANIPOD_CONFIG.weeksPerMonth,
    weeksPerYear: SANIPOD_CONFIG.weeksPerYear,
    rateCategories: SANIPOD_CONFIG.rateCategories,
  };

  if (!backendConfig) {
    return {
      ...defaults,
      frequencyMultipliers: {...SANIPOD_FREQUENCY_MULTIPLIERS},
      annualFrequencies: {...FREQUENCY_VISITS_PER_YEAR},
    };
  }

  return {
    weeklyRatePerUnit: backendConfig.corePricingIncludedWithSaniClean?.weeklyPricePerUnit ?? defaults.weeklyRatePerUnit,
    installChargePerUnit: backendConfig.corePricingIncludedWithSaniClean?.installPricePerUnit ?? defaults.installChargePerUnit,
    altWeeklyRatePerUnit: backendConfig.standalonePricingWithoutSaniClean?.pricePerUnitPerWeek ?? defaults.altWeeklyRatePerUnit,
    standaloneExtraWeeklyCharge: backendConfig.standalonePricingWithoutSaniClean?.weeklyMinimumPrice ?? defaults.standaloneExtraWeeklyCharge,
    useCheapestOption: backendConfig.standalonePricingWithoutSaniClean?.useCheapestOption ?? true,
    extraBagPrice: backendConfig.extraBagPricing?.pricePerBag ?? defaults.extraBagPrice,
    tripChargePerVisit: backendConfig.tripChargesStandaloneOnly?.standard ?? defaults.tripChargePerVisit,
    tripChargeBeltway: backendConfig.tripChargesStandaloneOnly?.beltway ?? defaults.tripChargePerVisit,
    minContractMonths: backendConfig.minContractMonths ?? defaults.minContractMonths,
    maxContractMonths: backendConfig.maxContractMonths ?? defaults.maxContractMonths,
    weeksPerMonth: defaults.weeksPerMonth,
    weeksPerYear: defaults.weeksPerYear,
    rateCategories: (backendConfig.rateCategories as any) ?? defaults.rateCategories,
    frequencyMultipliers: {
      ...SANIPOD_FREQUENCY_MULTIPLIERS,
      weekly: backendConfig.frequencyMetadata?.weekly?.monthlyRecurringMultiplier ?? 4.33,
      biweekly: backendConfig.frequencyMetadata?.biweekly?.monthlyRecurringMultiplier ?? 2.165,
    },
    annualFrequencies: {
      ...FREQUENCY_VISITS_PER_YEAR,
      bimonthly: backendConfig.frequencyMetadata?.bimonthly?.cycleMonths ? 12 / backendConfig.frequencyMetadata.bimonthly.cycleMonths : 6,
      quarterly: backendConfig.frequencyMetadata?.quarterly?.cycleMonths ? 12 / backendConfig.frequencyMetadata.quarterly.cycleMonths : 4,
      biannual: backendConfig.frequencyMetadata?.biannual?.cycleMonths ? 12 / backendConfig.frequencyMetadata.biannual.cycleMonths : 2,
      annual: backendConfig.frequencyMetadata?.annual?.cycleMonths ? 12 / backendConfig.frequencyMetadata.annual.cycleMonths : 1,
    },
    frequencyMetadata: backendConfig.frequencyMetadata,
  };
}

export interface SanipodFormState {
  podQuantity: number;
  extraBagsPerWeek: number;
  extraBagsRecurring: boolean;
  frequency: SanipodFrequencyKey;
  weeklyRatePerUnit: number;
  altWeeklyRatePerUnit: number;
  extraBagPrice: number;
  standaloneExtraWeeklyCharge: number;
  includeTrip: boolean;
  tripChargePerVisit: number;
  isNewInstall: boolean;
  installQuantity: number;
  installRatePerPod: number;
  customInstallationFee?: number;
  customPerVisitPrice?: number;
  customMonthlyPrice?: number;
  customAnnualPrice?: number;
  customWeeklyPodRate?: number;
  customPodServiceTotal?: number;
  customExtraBagsTotal?: number;
  rateCategory: SanipodRateCategory;
  contractMonths: number;
  isStandalone: boolean;
  notes?: string;
  serviceRule?: 'auto' | 'perPod8' | 'perPod3Plus40';
}

export interface SanipodCalcResult {
  perVisit: number;
  monthly: number;
  annual: number;
  installCost: number;
  chosenServiceRule: SanipodServiceRuleKey;
  weeklyPodServiceRed: number;
  firstVisit: number;
  ongoingMonthly: number;
  contractTotal: number;
  originalContractTotal: number;
  adjustedPerVisit: number;
  adjustedMonthly: number;
  adjustedAnnual: number;
  adjustedPodServiceTotal: number;
  adjustedBagsTotal: number;
  effectiveRatePerPod: number;
  minimumChargePerVisit: number;
}

export interface SanipodBaselineRates {
  weeklyRatePerUnit: number;
  altWeeklyRatePerUnit: number;
  extraBagPrice: number;
  standaloneExtraWeeklyCharge: number;
  tripChargePerVisit: number;
  installRatePerPod: number;
}

export function computeSanipodCalc(
  form: SanipodFormState,
  activeConfig: SanipodActiveConfig,
  baselineRates: SanipodBaselineRates,
  customFieldsTotal: number = 0,
): SanipodCalcResult {
  const pods = Math.max(0, Number(form.podQuantity) || 0);
  const bags = Math.max(0, Number(form.extraBagsPerWeek) || 0);
  const installQtyRaw = Math.max(0, Number(form.installQuantity) || 0);

  const anyActivity = pods > 0 || bags > 0 || (form.isNewInstall && installQtyRaw > 0);

  if (!anyActivity) {
    return {
      perVisit: 0,
      monthly: 0,
      annual: 0,
      installCost: 0,
      chosenServiceRule: 'perPod8',
      weeklyPodServiceRed: 0,
      firstVisit: 0,
      ongoingMonthly: 0,
      contractTotal: 0,
      originalContractTotal: 0,
      adjustedPerVisit: 0,
      adjustedMonthly: 0,
      adjustedAnnual: 0,
      adjustedPodServiceTotal: 0,
      adjustedBagsTotal: 0,
      effectiveRatePerPod: 0,
      minimumChargePerVisit: 0,
    };
  }

  const rateCfg = activeConfig.rateCategories[form.rateCategory] ?? activeConfig.rateCategories.redRate;
  const tripPerVisit = 0;

  const installRate = form.installRatePerPod > 0 ? form.installRatePerPod : activeConfig.installChargePerUnit;

  const weeklyBagsRed = form.extraBagsRecurring ? bags * form.extraBagPrice : 0;
  const oneTimeBagsCost = form.extraBagsRecurring ? 0 : bags * form.extraBagPrice;

  const weeklyRatePerUnit = Number(form.weeklyRatePerUnit) || 0;
  const standaloneCharge = Number(form.standaloneExtraWeeklyCharge) || 0;
  const customPodRate = form.customWeeklyPodRate !== undefined ? Number(form.customWeeklyPodRate) : undefined;
  const effectiveOptAPerPodRate = (customPodRate ?? Number(form.altWeeklyRatePerUnit)) || 0;
  const weeklyPodOptA_Red =
    form.customPodServiceTotal !== undefined ? form.customPodServiceTotal : pods * effectiveOptAPerPodRate;
  const weeklyPodOptB_Red = pods * weeklyRatePerUnit + (form.isStandalone ? standaloneCharge : 0);

  const weeklyServiceOptA_Red = weeklyPodOptA_Red + weeklyBagsRed;
  const weeklyServiceOptB_Red = weeklyPodOptB_Red + weeklyBagsRed;

  const serviceRuleSelection = form.serviceRule || 'auto';
  const optionATotalBeforeMin = weeklyServiceOptA_Red * rateCfg.multiplier;
  const optionBTotalBeforeMin = weeklyServiceOptB_Red * rateCfg.multiplier;
  const optionATotalWithMin = optionATotalBeforeMin;
  const optionBTotalWithMin = optionBTotalBeforeMin;

  let usingOptA: boolean;
  if (serviceRuleSelection === 'perPod8') {
    usingOptA = true;
  } else if (serviceRuleSelection === 'perPod3Plus40') {
    usingOptA = false;
  } else {
    usingOptA = optionATotalWithMin <= optionBTotalWithMin;
  }

  const weeklyServiceRed = usingOptA ? weeklyServiceOptA_Red : weeklyServiceOptB_Red;
  const weeklyPodServiceRed = usingOptA ? weeklyPodOptA_Red : weeklyPodOptB_Red;
  const effectiveRatePerPod = pods > 0 ? weeklyPodServiceRed / pods : 0;

  const chosenServiceRule: SanipodServiceRuleKey = usingOptA ? 'perPod8' : 'perPod3Plus40';

  const weeklyService = usingOptA ? optionATotalWithMin : optionBTotalWithMin;
  const perVisitService = weeklyService;
  const perVisit = perVisitService + tripPerVisit;

  const installQty = form.isNewInstall ? installQtyRaw : 0;
  const calculatedInstallOnlyCost = installQty * installRate;
  const installOnlyCost =
    form.customInstallationFee !== undefined ? form.customInstallationFee : calculatedInstallOnlyCost;

  const servicePods = Math.max(0, pods - installQty);

  let firstVisitServiceCost = 0;
  if (servicePods > 0) {
    firstVisitServiceCost = servicePods * effectiveRatePerPod * rateCfg.multiplier;
  }
  const firstVisitBagsCost = bags > 0 ? bags * form.extraBagPrice * rateCfg.multiplier : 0;

  const firstVisit = installOnlyCost + firstVisitServiceCost + firstVisitBagsCost;
  const installCost = installOnlyCost;

  const selectedFrequency = form.frequency || 'weekly';
  const monthlyVisits = activeConfig.frequencyMultipliers[selectedFrequency];

  const isVisitBasedFrequency =
    selectedFrequency === 'oneTime' ||
    selectedFrequency === 'quarterly' ||
    selectedFrequency === 'biannual' ||
    selectedFrequency === 'annual' ||
    selectedFrequency === 'bimonthly' ||
    selectedFrequency === 'everyFourWeeks';

  let firstMonth: number;
  if (selectedFrequency === 'oneTime') {
    firstMonth = form.isNewInstall && installQty > 0 ? firstVisit : perVisit + oneTimeBagsCost;
  } else if (isVisitBasedFrequency) {
    firstMonth = firstVisit;
  } else if (selectedFrequency === 'monthly') {
    firstMonth = firstVisit;
  } else {
    firstMonth = firstVisit + Math.max(monthlyVisits - 1, 0) * perVisit;
  }

  const ongoingMonthly = monthlyVisits * perVisit;

  const minMonths = activeConfig.minContractMonths;
  const maxMonths = activeConfig.maxContractMonths;
  const rawMonths = Number(form.contractMonths) || minMonths;
  const contractMonths = Math.min(Math.max(rawMonths, minMonths), maxMonths);

  let contractTotal: number;
  if (selectedFrequency === 'oneTime') {
    contractTotal = form.isNewInstall && installQty > 0 ? firstVisit : perVisit + oneTimeBagsCost;
  } else if (isVisitBasedFrequency) {
    const visitsPerYear = activeConfig.annualFrequencies[selectedFrequency];
    const totalVisits = (contractMonths / 12) * visitsPerYear;
    if (form.isNewInstall && installQty > 0) {
      const serviceVisits = Math.max(totalVisits - 1, 0);
      contractTotal = firstVisit + serviceVisits * perVisit;
    } else {
      contractTotal = totalVisits * perVisit;
    }
  } else {
    if (contractMonths <= 0) {
      contractTotal = 0;
    } else {
      contractTotal = firstMonth + Math.max(contractMonths - 1, 0) * ongoingMonthly;
    }
  }

  const bagLineAmount = bags * form.extraBagPrice;

  const adjustedPodServiceTotal =
    form.customPodServiceTotal !== undefined
      ? form.customPodServiceTotal
      : pods > 0
      ? (form.customWeeklyPodRate !== undefined ? form.customWeeklyPodRate : effectiveRatePerPod) * pods
      : 0;

  const adjustedBagsTotal =
    form.customExtraBagsTotal !== undefined ? form.customExtraBagsTotal : bagLineAmount;

  const adjustedPerVisitBeforeMinimum =
    form.customPerVisitPrice !== undefined
      ? form.customPerVisitPrice
      : (adjustedPodServiceTotal + (form.extraBagsRecurring ? adjustedBagsTotal : 0)) * rateCfg.multiplier;
  const adjustedPerVisit = adjustedPerVisitBeforeMinimum;

  let adjustedFirstVisitServiceCost = 0;
  if (servicePods > 0 && installQty > 0) {
    const effectiveRateForServicePods =
      form.customWeeklyPodRate !== undefined ? form.customWeeklyPodRate : effectiveRatePerPod;
    adjustedFirstVisitServiceCost = servicePods * effectiveRateForServicePods * rateCfg.multiplier;
  }

  const oneTimeBagsCostCalc = form.extraBagsRecurring ? 0 : adjustedBagsTotal;
  const installCostCalc =
    form.customInstallationFee !== undefined ? form.customInstallationFee : installOnlyCost;

  let adjustedFirstVisitTotal: number;
  if (installQty > 0) {
    const adjustedFirstVisitBags = bags > 0 ? adjustedBagsTotal * rateCfg.multiplier : 0;
    adjustedFirstVisitTotal = installCostCalc + adjustedFirstVisitServiceCost + adjustedFirstVisitBags;
  } else {
    adjustedFirstVisitTotal = adjustedPerVisit + oneTimeBagsCostCalc;
  }

  const adjustedMonthly =
    form.customMonthlyPrice !== undefined
      ? form.customMonthlyPrice
      : selectedFrequency === 'oneTime' || isVisitBasedFrequency || selectedFrequency === 'monthly'
      ? adjustedFirstVisitTotal
      : adjustedFirstVisitTotal + Math.max(monthlyVisits - 1, 0) * adjustedPerVisit;

  const ongoingMonthlyCalc = monthlyVisits * adjustedPerVisit;

  let adjustedAnnualBeforeCustomFields: number;
  if (form.customAnnualPrice !== undefined) {
    adjustedAnnualBeforeCustomFields = form.customAnnualPrice;
  } else if (selectedFrequency === 'oneTime') {
    adjustedAnnualBeforeCustomFields = adjustedFirstVisitTotal;
  } else if (isVisitBasedFrequency) {
    const visitsPerYear = activeConfig.annualFrequencies[selectedFrequency];
    const totalVisits = (contractMonths / 12) * visitsPerYear;
    if (form.isNewInstall && installQty > 0) {
      const serviceVisits = Math.max(totalVisits - 1, 0);
      adjustedAnnualBeforeCustomFields = adjustedFirstVisitTotal + serviceVisits * adjustedPerVisit;
    } else {
      adjustedAnnualBeforeCustomFields = totalVisits * adjustedPerVisit;
    }
  } else {
    if (contractMonths <= 0) {
      adjustedAnnualBeforeCustomFields = 0;
    } else {
      adjustedAnnualBeforeCustomFields = adjustedMonthly + Math.max(contractMonths - 1, 0) * ongoingMonthlyCalc;
    }
  }

  const adjustedAnnual = adjustedAnnualBeforeCustomFields + customFieldsTotal;
  const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

  const originalContractTotal = (() => {
    if (pods === 0) {
      return 0;
    }
    const baseWeeklyRate = Number(baselineRates.weeklyRatePerUnit) || activeConfig.weeklyRatePerUnit;
    const baseAltRate = Number(baselineRates.altWeeklyRatePerUnit) || activeConfig.altWeeklyRatePerUnit;
    const baseStandalone =
      Number(baselineRates.standaloneExtraWeeklyCharge) || activeConfig.standaloneExtraWeeklyCharge;
    const baseExtraBagPrice = Number(baselineRates.extraBagPrice) || activeConfig.extraBagPrice;
    const baseInstallRate = Number(baselineRates.installRatePerPod) || activeConfig.installChargePerUnit;
    const baseWeeklyBags = form.extraBagsRecurring ? bags * baseExtraBagPrice : 0;
    const baseOptA = pods * baseAltRate + baseWeeklyBags;
    const baseOptB = pods * baseWeeklyRate + (form.isStandalone ? baseStandalone : 0) + baseWeeklyBags;
    const baseWeeklyService = Math.min(baseOptA, baseOptB);
    const basePerVisit = baseWeeklyService;
    const baseInstall = form.isNewInstall && installQty > 0 ? installQty * baseInstallRate : 0;
    const baseOneTimeBags = form.extraBagsRecurring ? 0 : bags * baseExtraBagPrice;

    let baseFirstVisit: number;
    if (form.isNewInstall && installQty > 0) {
      const baseServicePods = Math.max(0, pods - installQty);
      let baseFirstVisitServiceCost = 0;
      const baseEffectiveRatePerPod = pods > 0 ? (Math.min(baseOptA, baseOptB) - baseWeeklyBags) / pods : 0;
      if (baseServicePods > 0) {
        baseFirstVisitServiceCost = baseServicePods * baseEffectiveRatePerPod;
      }
      const baseFirstVisitBagsCost = bags > 0 ? bags * baseExtraBagPrice : 0;
      baseFirstVisit = baseInstall + baseFirstVisitServiceCost + baseFirstVisitBagsCost + baseOneTimeBags;
    } else {
      baseFirstVisit = basePerVisit + baseOneTimeBags;
    }

    let baseContractTotal: number;
    if (selectedFrequency === 'oneTime') {
      baseContractTotal = baseFirstVisit;
    } else if (isVisitBasedFrequency) {
      const visitsPerYear = activeConfig.annualFrequencies[selectedFrequency];
      const totalVisits = (contractMonths / 12) * visitsPerYear;
      if (form.isNewInstall && installQty > 0) {
        baseContractTotal = baseFirstVisit + Math.max(totalVisits - 1, 0) * basePerVisit;
      } else {
        baseContractTotal = totalVisits * basePerVisit;
      }
    } else if (contractMonths <= 0) {
      baseContractTotal = 0;
    } else {
      const baseOngoing = monthlyVisits * basePerVisit;
      const baseFirstMonth =
        selectedFrequency === 'monthly'
          ? baseFirstVisit
          : baseFirstVisit + Math.max(monthlyVisits - 1, 0) * basePerVisit;
      baseContractTotal = baseFirstMonth + Math.max(contractMonths - 1, 0) * baseOngoing;
    }

    return Math.round(baseContractTotal * 100) / 100 + customFieldsTotal;
  })();

  return {
    perVisit,
    monthly: firstMonth,
    annual: contractTotalWithCustomFields,
    installCost,
    chosenServiceRule,
    weeklyPodServiceRed,
    firstVisit,
    ongoingMonthly: ongoingMonthlyCalc,
    contractTotal: contractTotalWithCustomFields,
    adjustedPerVisit,
    adjustedMonthly,
    adjustedAnnual,
    adjustedPodServiceTotal,
    adjustedBagsTotal,
    effectiveRatePerPod,
    minimumChargePerVisit: form.isStandalone ? form.standaloneExtraWeeklyCharge : 0,
    originalContractTotal,
  };
}

const num = (v: any, d: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export function buildSanipodState(
  data: any,
  contractMonths: number,
  activeConfig: SanipodActiveConfig,
): SanipodFormState {
  return {
    podQuantity: num(data?.podQuantity, 0),
    extraBagsPerWeek: num(data?.extraBagsPerWeek, 0),
    extraBagsRecurring: data?.extraBagsRecurring !== false,
    frequency: (data?.frequency ?? SANIPOD_CONFIG.defaultFrequency) as SanipodFrequencyKey,
    weeklyRatePerUnit: num(data?.weeklyRatePerUnit, activeConfig.weeklyRatePerUnit),
    altWeeklyRatePerUnit: num(data?.altWeeklyRatePerUnit, activeConfig.altWeeklyRatePerUnit),
    extraBagPrice: num(data?.extraBagPrice, activeConfig.extraBagPrice),
    standaloneExtraWeeklyCharge: num(data?.standaloneExtraWeeklyCharge, activeConfig.standaloneExtraWeeklyCharge),
    includeTrip: data?.includeTrip === true,
    tripChargePerVisit: num(data?.tripChargePerVisit, activeConfig.tripChargePerVisit),
    isNewInstall: data?.isNewInstall === true,
    installQuantity: num(data?.installQuantity, 0),
    installRatePerPod: num(data?.installRatePerPod, activeConfig.installChargePerUnit),
    rateCategory: data?.rateCategory === 'greenRate' ? 'greenRate' : 'redRate',
    contractMonths,
    isStandalone: data?.isStandalone !== false,
    serviceRule: data?.serviceRule ?? 'auto',
    notes: data?.notes,
    customInstallationFee: data?.customInstallationFee,
    customPerVisitPrice: data?.customPerVisitPrice,
    customMonthlyPrice: data?.customMonthlyPrice,
    customAnnualPrice: data?.customAnnualPrice,
    customWeeklyPodRate: data?.customWeeklyPodRate,
    customPodServiceTotal: data?.customPodServiceTotal,
    customExtraBagsTotal: data?.customExtraBagsTotal,
  };
}

export function sanipodBaselineRates(activeConfig: SanipodActiveConfig): SanipodBaselineRates {
  return {
    weeklyRatePerUnit: activeConfig.weeklyRatePerUnit,
    altWeeklyRatePerUnit: activeConfig.altWeeklyRatePerUnit,
    extraBagPrice: activeConfig.extraBagPrice,
    standaloneExtraWeeklyCharge: activeConfig.standaloneExtraWeeklyCharge,
    tripChargePerVisit: activeConfig.tripChargePerVisit,
    installRatePerPod: activeConfig.installChargePerUnit,
  };
}
