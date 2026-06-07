// Electrostatic Spray calculation — ported 1:1 from the web app
// (enviromaster-webapp/src/features/services/kinds/electrostaticSpray/compute.ts
//  + components/services/electrostaticSpray/electrostaticSprayConfig.ts)

export type ElectrostaticSprayFrequency =
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

export const electrostaticSprayPricingConfig = {
  ratePerRoom: 20,
  ratePerThousandSqFt: 50,
  sqFtUnit: 1000,
  tripCharges: {insideBeltway: 10, outsideBeltway: 0, standard: 0},
  billingConversions: {
    oneTime: {monthlyMultiplier: 0, annualMultiplier: 1},
    weekly: {monthlyMultiplier: 4.33, annualMultiplier: 52},
    biweekly: {monthlyMultiplier: 2.165, annualMultiplier: 26},
    twicePerMonth: {monthlyMultiplier: 2, annualMultiplier: 24},
    monthly: {monthlyMultiplier: 1, annualMultiplier: 12},
    everyFourWeeks: {monthlyMultiplier: 1.0833, annualMultiplier: 13},
    bimonthly: {monthlyMultiplier: 0.5, annualMultiplier: 6},
    quarterly: {monthlyMultiplier: 0, annualMultiplier: 4},
    biannual: {monthlyMultiplier: 0, annualMultiplier: 2},
    annual: {monthlyMultiplier: 0, annualMultiplier: 1},
    actualWeeksPerMonth: 4.33,
  } as any,
  minContractMonths: 2,
  maxContractMonths: 36,
  defaultFrequency: 'weekly' as ElectrostaticSprayFrequency,
};

export const electrostaticFrequencyLabels: Record<ElectrostaticSprayFrequency, string> = {
  oneTime: 'One Time',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly (every 2 weeks)',
  twicePerMonth: '2× / Month',
  monthly: 'Monthly',
  everyFourWeeks: 'Every 4 Weeks',
  bimonthly: 'Bi-Monthly (every 2 months)',
  quarterly: 'Quarterly',
  biannual: 'Bi-Annual',
  annual: 'Annual',
};

export const electrostaticFrequencyList: ElectrostaticSprayFrequency[] = [
  'oneTime',
  'weekly',
  'biweekly',
  'twicePerMonth',
  'monthly',
  'everyFourWeeks',
  'bimonthly',
  'quarterly',
  'biannual',
  'annual',
];

export interface BackendElectrostaticSprayConfig {
  standardSprayPricing?: {
    sprayRatePerRoom: number;
    sqFtUnit: number;
    sprayRatePerSqFtUnit: number;
    minimumPriceOptional: number;
  };
  tripCharges?: {standard: number; beltway?: number};
  minimumChargePerVisit?: number;
  frequencyMetadata?: {
    weekly?: {monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number};
    biweekly?: {monthlyRecurringMultiplier: number; firstMonthExtraMultiplier: number};
    monthly?: {cycleMonths: number};
    bimonthly?: {cycleMonths: number};
    quarterly?: {cycleMonths: number};
    biannual?: {cycleMonths: number};
    annual?: {cycleMonths: number};
  };
  minContractMonths?: number;
  maxContractMonths?: number;
}

export interface ElectrostaticActiveConfig {
  standardSprayPricing: {
    sprayRatePerRoom: number;
    sqFtUnit: number;
    sprayRatePerSqFtUnit: number;
    minimumPriceOptional: number;
  };
  tripCharges: {standard: number; beltway?: number};
  minimumChargePerVisit: number;
  minContractMonths: number;
  maxContractMonths: number;
  billingConversions: any;
}

export interface ElectrostaticSprayFormState {
  pricingMethod: 'byRoom' | 'bySqFt';
  roomCount: number;
  squareFeet: number;
  useExactCalculation: boolean;
  frequency: ElectrostaticSprayFrequency;
  isCombinedWithSaniClean: boolean;
  contractMonths: number;
  ratePerRoom: number;
  ratePerThousandSqFt: number;
  tripChargePerVisit: number;
  applyMinimum?: boolean;
  customRatePerRoom?: number;
  customRatePerThousandSqFt?: number;
  customTripChargePerVisit?: number;
  customServiceCharge?: number;
  customPerVisitPrice?: number;
  customMonthlyRecurring?: number;
  customContractTotal?: number;
  customFirstMonthTotal?: number;
}

export interface ElectrostaticSprayCalcResult {
  serviceCharge: number;
  tripCharge: number;
  perVisit: number;
  monthlyRecurring: number;
  contractTotal: number;
  originalContractTotal: number;
  effectiveRate: number;
  pricingMethodUsed: 'byRoom' | 'bySqFt';
  isVisitBasedFrequency: boolean;
  monthsPerVisit: number;
  minimumChargePerVisit: number;
}

function transformBackendFrequencyMeta(
  backendMeta: BackendElectrostaticSprayConfig['frequencyMetadata'] | undefined,
) {
  const cfg = electrostaticSprayPricingConfig;
  if (!backendMeta) {
    return cfg.billingConversions;
  }
  const transformedBilling: any = {...cfg.billingConversions};
  if (backendMeta.weekly) {
    transformedBilling.weekly = {
      monthlyMultiplier: backendMeta.weekly.monthlyRecurringMultiplier,
      annualMultiplier: backendMeta.weekly.monthlyRecurringMultiplier * 12,
    };
  }
  if (backendMeta.biweekly) {
    transformedBilling.biweekly = {
      monthlyMultiplier: backendMeta.biweekly.monthlyRecurringMultiplier,
      annualMultiplier: backendMeta.biweekly.monthlyRecurringMultiplier * 12,
    };
  }
  const cycleBased = ['monthly', 'bimonthly', 'quarterly', 'biannual', 'annual'] as const;
  for (const freq of cycleBased) {
    const data = backendMeta[freq];
    if (data?.cycleMonths) {
      transformedBilling[freq] = {
        monthlyMultiplier: 1 / data.cycleMonths,
        annualMultiplier: 12 / data.cycleMonths,
      };
    }
  }
  return transformedBilling;
}

export function buildElectrostaticActiveConfig(
  backendConfig: BackendElectrostaticSprayConfig | null,
): ElectrostaticActiveConfig {
  const cfg = electrostaticSprayPricingConfig;
  return {
    standardSprayPricing: backendConfig?.standardSprayPricing ?? {
      sprayRatePerRoom: cfg.ratePerRoom,
      sqFtUnit: cfg.sqFtUnit,
      sprayRatePerSqFtUnit: cfg.ratePerThousandSqFt,
      minimumPriceOptional: 0,
    },
    tripCharges: backendConfig?.tripCharges ?? cfg.tripCharges,
    minimumChargePerVisit: backendConfig?.minimumChargePerVisit ?? 0,
    minContractMonths: backendConfig?.minContractMonths ?? cfg.minContractMonths,
    maxContractMonths: backendConfig?.maxContractMonths ?? cfg.maxContractMonths,
    billingConversions: transformBackendFrequencyMeta(backendConfig?.frequencyMetadata),
  };
}

export function computeElectrostaticSprayCalc(
  form: ElectrostaticSprayFormState,
  activeConfig: ElectrostaticActiveConfig,
  customFieldsTotal: number = 0,
): ElectrostaticSprayCalcResult {
  let calculatedServiceCharge = 0;
  let effectiveRate = 0;
  const pricingMethodUsed = form.pricingMethod;

  const effectiveRatePerRoom = form.customRatePerRoom ?? form.ratePerRoom;
  const effectiveRatePerThousandSqFt =
    form.customRatePerThousandSqFt ?? form.ratePerThousandSqFt;

  if (form.pricingMethod === 'byRoom') {
    calculatedServiceCharge = form.roomCount * effectiveRatePerRoom;
    effectiveRate = effectiveRatePerRoom;
  } else {
    let calculateForSqFt = form.squareFeet;
    if (!form.useExactCalculation) {
      const minTier = activeConfig.standardSprayPricing.sqFtUnit;
      if (calculateForSqFt <= minTier) {
        calculateForSqFt = minTier;
      } else {
        calculateForSqFt =
          Math.ceil(calculateForSqFt / activeConfig.standardSprayPricing.sqFtUnit) *
          activeConfig.standardSprayPricing.sqFtUnit;
      }
    }
    const units = calculateForSqFt / activeConfig.standardSprayPricing.sqFtUnit;
    calculatedServiceCharge = units * effectiveRatePerThousandSqFt;
    effectiveRate = effectiveRatePerThousandSqFt;
  }

  const hasService =
    (form.pricingMethod === 'byRoom' && form.roomCount > 0) ||
    (form.pricingMethod === 'bySqFt' && form.squareFeet > 0);

  if (activeConfig.minimumChargePerVisit > 0 && hasService) {
    calculatedServiceCharge =
      form.applyMinimum !== false
        ? Math.max(calculatedServiceCharge, activeConfig.minimumChargePerVisit)
        : calculatedServiceCharge;
  } else if (!hasService) {
    calculatedServiceCharge = 0;
  }

  const serviceCharge = form.customServiceCharge ?? calculatedServiceCharge;

  const effectiveTripChargePerVisit =
    form.customTripChargePerVisit ?? form.tripChargePerVisit;
  const tripCharge = form.isCombinedWithSaniClean ? 0 : effectiveTripChargePerVisit;

  const perVisit = form.customPerVisitPrice ?? serviceCharge + tripCharge;

  const freqConfig = activeConfig.billingConversions[form.frequency];
  const monthlyMultiplier = freqConfig?.monthlyMultiplier ?? 0;
  const annualMultiplier = freqConfig?.annualMultiplier ?? 0;

  const isVisitBasedFrequency =
    form.frequency === 'oneTime' ||
    form.frequency === 'quarterly' ||
    form.frequency === 'biannual' ||
    form.frequency === 'annual' ||
    form.frequency === 'bimonthly' ||
    form.frequency === 'everyFourWeeks';

  const monthsPerVisit =
    form.frequency === 'oneTime'
      ? 0
      : form.frequency === 'bimonthly'
      ? 2
      : form.frequency === 'quarterly'
      ? 3
      : form.frequency === 'biannual'
      ? 6
      : form.frequency === 'annual'
      ? 12
      : 1;

  const monthlyRecurring = form.customMonthlyRecurring ?? perVisit * monthlyMultiplier;

  let contractTotal: number;
  if (form.frequency === 'oneTime') {
    contractTotal = form.customContractTotal ?? perVisit;
  } else if (isVisitBasedFrequency) {
    const visitsPerYear = annualMultiplier;
    const totalVisits = (form.contractMonths / 12) * visitsPerYear;
    contractTotal = form.customContractTotal ?? totalVisits * perVisit;
  } else {
    contractTotal = form.customContractTotal ?? monthlyRecurring * form.contractMonths;
  }

  const contractTotalWithCustomFields = contractTotal + customFieldsTotal;

  let originalContractTotal = 0;
  if (hasService) {
    const baselineRatePerRoom = activeConfig.standardSprayPricing.sprayRatePerRoom;
    const baselineRatePerSqFtUnit = activeConfig.standardSprayPricing.sprayRatePerSqFtUnit;
    let baselineServiceCharge = 0;
    if (form.pricingMethod === 'byRoom') {
      baselineServiceCharge = form.roomCount * baselineRatePerRoom;
    } else {
      let calcSqFt = form.squareFeet;
      if (!form.useExactCalculation) {
        const minTier = activeConfig.standardSprayPricing.sqFtUnit;
        calcSqFt = calcSqFt <= minTier ? minTier : Math.ceil(calcSqFt / minTier) * minTier;
      }
      const units = calcSqFt / activeConfig.standardSprayPricing.sqFtUnit;
      baselineServiceCharge = units * baselineRatePerSqFtUnit;
    }
    if (activeConfig.minimumChargePerVisit > 0) {
      baselineServiceCharge =
        form.applyMinimum !== false
          ? Math.max(baselineServiceCharge, activeConfig.minimumChargePerVisit)
          : baselineServiceCharge;
    }
    const baselinePerVisit = baselineServiceCharge + tripCharge;
    const baselineMonthlyRecurring = baselinePerVisit * monthlyMultiplier;
    if (form.frequency === 'oneTime') {
      originalContractTotal = baselinePerVisit;
    } else if (isVisitBasedFrequency) {
      const visitsPerYear = annualMultiplier;
      const totalVisits = (form.contractMonths / 12) * visitsPerYear;
      originalContractTotal = totalVisits * baselinePerVisit;
    } else {
      originalContractTotal = baselineMonthlyRecurring * form.contractMonths;
    }
  }

  return {
    serviceCharge,
    tripCharge,
    perVisit,
    monthlyRecurring,
    contractTotal: contractTotalWithCustomFields,
    originalContractTotal,
    effectiveRate,
    pricingMethodUsed,
    isVisitBasedFrequency,
    monthsPerVisit,
    minimumChargePerVisit: activeConfig.minimumChargePerVisit,
  };
}
