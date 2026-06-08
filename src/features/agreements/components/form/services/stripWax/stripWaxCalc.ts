// Strip & Wax calculation — ported 1:1 from the web app
// (enviromaster-webapp/src/features/services/kinds/stripWax/compute.ts
//  + components/services/stripWax/stripWaxConfig.ts + stripWaxTypes.ts)

import {
  type FrequencyKey,
  FREQUENCY_MONTHLY_MULTIPLIER,
  FREQUENCY_VISITS_PER_YEAR,
} from '../../../../../../shared/constants/frequency';

export type StripWaxFrequencyKey = FrequencyKey;
export type StripWaxRateCategory = 'redRate' | 'greenRate';
export type StripWaxServiceVariant = 'standardFull' | 'noSealant' | 'wellMaintained';

export const STRIP_WAX_CONFIG = {
  weeksPerMonth: 4.33,
  weeksPerYear: 52,
  minContractMonths: 2,
  maxContractMonths: 36,
  defaultFrequency: 'weekly' as StripWaxFrequencyKey,
  defaultVariant: 'standardFull' as StripWaxServiceVariant,
  variants: {
    standardFull: {label: 'Standard – full strip + sealant', ratePerSqFt: 0.75, minCharge: 550},
    noSealant: {label: 'No sealant – 4th coat free / discount', ratePerSqFt: 0.7, minCharge: 550},
    wellMaintained: {label: 'Well maintained – partial strip', ratePerSqFt: 0.4, minCharge: 400},
  },
  rateCategories: {
    redRate: {multiplier: 1, commissionRate: '20%'},
    greenRate: {multiplier: 1.3, commissionRate: '25%'},
  },
};

// Web strip & wax frequency multipliers: quarterly/biannual/annual bill 0 (they
// are visit-based, handled via annualFrequencies), one-time is 0; the rest match
// the shared monthly table.
const STRIP_WAX_FREQUENCY_MULTIPLIERS: Record<FrequencyKey, number> = {
  ...FREQUENCY_MONTHLY_MULTIPLIER,
  oneTime: 0,
  quarterly: 0,
  biannual: 0,
  annual: 0,
};

export interface BackendStripWaxConfig {
  variants?: {
    standardFull?: {label?: string; ratePerSqFt?: number; minCharge?: number; coatsIncluded?: number; sealantIncluded?: boolean};
    noSealant?: {label?: string; alternateRatePerSqFt?: number; minCharge?: number; includeExtraCoatFourthFree?: boolean};
    wellMaintained?: {label?: string; ratePerSqFt?: number; minCharge?: number; coatsIncluded?: number};
  };
  tripCharges?: {standard?: number; beltway?: number};
  frequencyMetadata?: any;
  minContractMonths?: number;
  maxContractMonths?: number;
  defaultFrequency?: string;
  defaultVariant?: string;
  rateCategories?: {
    redRate?: {multiplier: number; commissionRate: string};
    greenRate?: {multiplier: number; commissionRate: string};
  };
}

export interface StripWaxActiveConfig {
  minContractMonths: number;
  maxContractMonths: number;
  defaultFrequency: string;
  defaultVariant: string;
  variants: Record<string, {label?: string; ratePerSqFt: number; minCharge: number}>;
  rateCategories: {redRate: {multiplier: number; commissionRate?: string}; greenRate: {multiplier: number; commissionRate?: string}};
  tripCharges: {standard: number; beltway: number};
  frequencyMultipliers: Record<string, number>;
  annualFrequencies: Record<string, number>;
  frequencyMetadata?: any;
}

export function buildStripWaxActiveConfig(backendConfig: BackendStripWaxConfig | null): StripWaxActiveConfig {
  const defaults = {
    minContractMonths: STRIP_WAX_CONFIG.minContractMonths,
    maxContractMonths: STRIP_WAX_CONFIG.maxContractMonths,
    defaultFrequency: STRIP_WAX_CONFIG.defaultFrequency,
    defaultVariant: STRIP_WAX_CONFIG.defaultVariant,
    variants: STRIP_WAX_CONFIG.variants,
    rateCategories: STRIP_WAX_CONFIG.rateCategories,
  };

  if (!backendConfig) {
    return {
      ...defaults,
      tripCharges: {standard: 0, beltway: 0},
      frequencyMultipliers: {...STRIP_WAX_FREQUENCY_MULTIPLIERS},
      annualFrequencies: {...FREQUENCY_VISITS_PER_YEAR},
    };
  }

  return {
    minContractMonths: backendConfig.minContractMonths ?? defaults.minContractMonths,
    maxContractMonths: backendConfig.maxContractMonths ?? defaults.maxContractMonths,
    defaultFrequency: backendConfig.defaultFrequency ?? defaults.defaultFrequency,
    defaultVariant: backendConfig.defaultVariant ?? defaults.defaultVariant,
    variants: {
      standardFull: {
        label: backendConfig.variants?.standardFull?.label ?? defaults.variants.standardFull.label,
        ratePerSqFt: backendConfig.variants?.standardFull?.ratePerSqFt ?? defaults.variants.standardFull.ratePerSqFt,
        minCharge: backendConfig.variants?.standardFull?.minCharge ?? defaults.variants.standardFull.minCharge,
      },
      noSealant: {
        label: backendConfig.variants?.noSealant?.label ?? defaults.variants.noSealant.label,
        ratePerSqFt: backendConfig.variants?.noSealant?.alternateRatePerSqFt ?? defaults.variants.noSealant.ratePerSqFt,
        minCharge: backendConfig.variants?.noSealant?.minCharge ?? defaults.variants.noSealant.minCharge,
      },
      wellMaintained: {
        label: backendConfig.variants?.wellMaintained?.label ?? defaults.variants.wellMaintained.label,
        ratePerSqFt: backendConfig.variants?.wellMaintained?.ratePerSqFt ?? defaults.variants.wellMaintained.ratePerSqFt,
        minCharge: backendConfig.variants?.wellMaintained?.minCharge ?? defaults.variants.wellMaintained.minCharge,
      },
    },
    rateCategories: (backendConfig.rateCategories as any) ?? defaults.rateCategories,
    tripCharges: (backendConfig.tripCharges as any) ?? {standard: 0, beltway: 0},
    frequencyMultipliers: {
      ...STRIP_WAX_FREQUENCY_MULTIPLIERS,
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

export interface StripWaxFormState {
  floorAreaSqFt: number;
  ratePerSqFt: number;
  minCharge: number;
  serviceVariant: StripWaxServiceVariant;
  frequency: StripWaxFrequencyKey;
  rateCategory: StripWaxRateCategory;
  contractMonths: number;
  weeksPerMonth: number;
  standardFullRatePerSqFt: number;
  standardFullMinCharge: number;
  noSealantRatePerSqFt: number;
  noSealantMinCharge: number;
  wellMaintainedRatePerSqFt: number;
  wellMaintainedMinCharge: number;
  redRateMultiplier: number;
  greenRateMultiplier: number;
  customPerVisit?: number;
  customMonthly?: number;
  customOngoingMonthly?: number;
  customContractTotal?: number;
  customRatePerSqFt?: number;
  customMinCharge?: number;
  applyMinimum?: boolean;
}

export interface StripWaxCalcResult {
  perVisit: number;
  monthly: number;
  annual: number;
  firstVisit: number;
  ongoingMonthly: number;
  contractTotal: number;
  originalContractTotal: number;
  rawPrice: number;
}

export function getStripWaxVariantConfigFromState(state: StripWaxFormState): {ratePerSqFt: number; minCharge: number} {
  if (state.serviceVariant === 'standardFull') {
    return {ratePerSqFt: state.standardFullRatePerSqFt, minCharge: state.standardFullMinCharge};
  }
  if (state.serviceVariant === 'noSealant') {
    return {ratePerSqFt: state.noSealantRatePerSqFt, minCharge: state.noSealantMinCharge};
  }
  return {ratePerSqFt: state.wellMaintainedRatePerSqFt, minCharge: state.wellMaintainedMinCharge};
}

export function computeStripWaxCalc(
  form: StripWaxFormState,
  activeConfig: StripWaxActiveConfig,
  customFieldsTotal: number = 0,
): StripWaxCalcResult {
  const areaSqFt = Math.max(0, Number(form.floorAreaSqFt) || 0);
  if (areaSqFt === 0) {
    return {
      perVisit: 0,
      monthly: 0,
      annual: 0,
      firstVisit: 0,
      ongoingMonthly: 0,
      contractTotal: 0,
      originalContractTotal: 0,
      rawPrice: 0,
    };
  }

  const rateCfg = {
    multiplier: form.rateCategory === 'greenRate' ? form.greenRateMultiplier : form.redRateMultiplier,
  };

  const monthlyVisits =
    activeConfig.frequencyMultipliers && activeConfig.frequencyMultipliers[form.frequency] !== undefined
      ? activeConfig.frequencyMultipliers[form.frequency]
      : 0;

  const isVisitBasedFrequency =
    form.frequency === 'oneTime' ||
    form.frequency === 'quarterly' ||
    form.frequency === 'biannual' ||
    form.frequency === 'annual' ||
    form.frequency === 'bimonthly' ||
    form.frequency === 'everyFourWeeks';

  const getVariantConfig = (variant: StripWaxServiceVariant) => {
    if (variant === 'standardFull') {
      return {ratePerSqFt: form.standardFullRatePerSqFt, minCharge: form.standardFullMinCharge};
    } else if (variant === 'noSealant') {
      return {ratePerSqFt: form.noSealantRatePerSqFt, minCharge: form.noSealantMinCharge};
    } else {
      return {ratePerSqFt: form.wellMaintainedRatePerSqFt, minCharge: form.wellMaintainedMinCharge};
    }
  };

  const variantCfg = getVariantConfig(form.serviceVariant);
  const ratePerSqFt = form.ratePerSqFt > 0 ? form.ratePerSqFt : variantCfg.ratePerSqFt;
  const minCharge = form.minCharge > 0 ? form.minCharge : variantCfg.minCharge;

  const rawPriceRed = areaSqFt * ratePerSqFt;
  const perVisitRed = form.applyMinimum !== false ? Math.max(rawPriceRed, minCharge) : rawPriceRed;
  const perVisit = perVisitRed * rateCfg.multiplier;
  const firstVisit = perVisit;

  const minMonths = activeConfig.minContractMonths ?? 2;
  const maxMonths = activeConfig.maxContractMonths ?? 36;
  const rawMonths = Number(form.contractMonths) || minMonths;
  const contractMonths = Math.min(Math.max(rawMonths, minMonths), maxMonths);

  let monthlyPrice: number;
  let calculatedContractTotal: number;

  if (form.frequency === 'oneTime') {
    monthlyPrice = perVisit;
    calculatedContractTotal = perVisit;
  } else if (isVisitBasedFrequency) {
    const visitsPerYear =
      activeConfig.annualFrequencies && activeConfig.annualFrequencies[form.frequency] !== undefined
        ? activeConfig.annualFrequencies[form.frequency]
        : 1;
    const totalVisits = (contractMonths / 12) * visitsPerYear;
    monthlyPrice = monthlyVisits * perVisit;
    calculatedContractTotal = totalVisits * perVisit;
  } else {
    monthlyPrice = monthlyVisits * perVisit;
    calculatedContractTotal = monthlyPrice * contractMonths;
  }

  const finalPerVisit = form.customPerVisit ?? perVisit;
  const finalMonthly = form.customMonthly ?? monthlyPrice;
  const finalOngoingMonthly = form.customOngoingMonthly ?? monthlyPrice;
  const calculatedContractTotalBeforeCustomFields = form.customContractTotal ?? calculatedContractTotal;
  const finalContractTotal = calculatedContractTotalBeforeCustomFields + customFieldsTotal;

  const baselineVariantRatePerSqFt =
    activeConfig.variants[form.serviceVariant]?.ratePerSqFt ??
    activeConfig.variants[activeConfig.defaultVariant]?.ratePerSqFt ??
    0;
  const baselineVariantMinCharge =
    activeConfig.variants[form.serviceVariant]?.minCharge ??
    activeConfig.variants[activeConfig.defaultVariant]?.minCharge ??
    0;
  const baselineRawPrice = areaSqFt * baselineVariantRatePerSqFt;
  const baselinePerVisit =
    form.applyMinimum !== false ? Math.max(baselineRawPrice, baselineVariantMinCharge) : baselineRawPrice;

  let originalContractTotal = 0;
  if (form.frequency === 'oneTime') {
    originalContractTotal = baselinePerVisit;
  } else if (isVisitBasedFrequency) {
    const visitsPerYear =
      activeConfig.annualFrequencies && activeConfig.annualFrequencies[form.frequency] !== undefined
        ? activeConfig.annualFrequencies[form.frequency]
        : 1;
    const totalVisits = (contractMonths / 12) * visitsPerYear;
    originalContractTotal = totalVisits * baselinePerVisit;
  } else {
    originalContractTotal = monthlyVisits * baselinePerVisit * contractMonths;
  }

  return {
    perVisit: finalPerVisit,
    monthly: finalMonthly,
    annual: finalContractTotal,
    firstVisit: finalPerVisit,
    ongoingMonthly: finalOngoingMonthly,
    contractTotal: finalContractTotal,
    originalContractTotal,
    rawPrice: rawPriceRed,
  };
}

const num = (v: any, d: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export function buildStripWaxState(
  data: any,
  contractMonths: number,
  activeConfig: StripWaxActiveConfig,
): StripWaxFormState {
  const serviceVariant: StripWaxServiceVariant =
    data?.serviceVariant === 'noSealant' || data?.serviceVariant === 'wellMaintained'
      ? data.serviceVariant
      : 'standardFull';

  const standardFullRatePerSqFt = num(data?.standardFullRatePerSqFt, activeConfig.variants.standardFull.ratePerSqFt);
  const standardFullMinCharge = num(data?.standardFullMinCharge, activeConfig.variants.standardFull.minCharge);
  const noSealantRatePerSqFt = num(data?.noSealantRatePerSqFt, activeConfig.variants.noSealant.ratePerSqFt);
  const noSealantMinCharge = num(data?.noSealantMinCharge, activeConfig.variants.noSealant.minCharge);
  const wellMaintainedRatePerSqFt = num(data?.wellMaintainedRatePerSqFt, activeConfig.variants.wellMaintained.ratePerSqFt);
  const wellMaintainedMinCharge = num(data?.wellMaintainedMinCharge, activeConfig.variants.wellMaintained.minCharge);

  const variantDefault = activeConfig.variants[serviceVariant] ?? activeConfig.variants[activeConfig.defaultVariant];

  return {
    floorAreaSqFt: num(data?.floorAreaSqFt, 0),
    ratePerSqFt: num(data?.ratePerSqFt, variantDefault.ratePerSqFt),
    minCharge: num(data?.minCharge, variantDefault.minCharge),
    serviceVariant,
    frequency: (data?.frequency ?? activeConfig.defaultFrequency) as StripWaxFrequencyKey,
    rateCategory: data?.rateCategory === 'greenRate' ? 'greenRate' : 'redRate',
    contractMonths,
    weeksPerMonth: STRIP_WAX_CONFIG.weeksPerMonth,
    standardFullRatePerSqFt,
    standardFullMinCharge,
    noSealantRatePerSqFt,
    noSealantMinCharge,
    wellMaintainedRatePerSqFt,
    wellMaintainedMinCharge,
    redRateMultiplier: activeConfig.rateCategories.redRate.multiplier,
    greenRateMultiplier: activeConfig.rateCategories.greenRate.multiplier,
    applyMinimum: data?.applyMinimum !== false,
    customPerVisit: data?.customPerVisit,
    customMonthly: data?.customMonthly,
    customOngoingMonthly: data?.customOngoingMonthly,
    customContractTotal: data?.customContractTotal,
    customRatePerSqFt: data?.customRatePerSqFt,
    customMinCharge: data?.customMinCharge,
  };
}
