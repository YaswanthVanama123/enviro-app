// SaniClean calculation — ported 1:1 from the web app
// (enviromaster-webapp/src/features/services/kinds/saniclean/compute.ts
//  + components/services/saniclean/sanicleanConfig.ts + sanicleanTypes.ts)

import {
  type FrequencyKey,
  FREQUENCY_MONTHLY_MULTIPLIER,
  isMonthlyModeFrequency,
  visitsInContract as sharedVisitsInContract,
} from '../../../../../../shared/constants/frequency';

export type SanicleanLocation = 'insideBeltway' | 'outsideBeltway';
export type SanicleanSoapType = 'standard' | 'luxury';
export type SanicleanPricingMode = 'all_inclusive' | 'per_item_charge';
export type SanicleanRateTier = 'redRate' | 'greenRate';
export type SanicleanFrequency = FrequencyKey;
export type SanicleanCalculationMode = 'monthly' | 'perVisit';

export function getCalculationMode(frequency: SanicleanFrequency): SanicleanCalculationMode {
  return isMonthlyModeFrequency(frequency) ? 'monthly' : 'perVisit';
}

// Web saniclean fallback (compute.ts) deviates from the shared table only for
// one-time (bills 0) and annual (rounded to 0.083); everything else is shared.
const SANICLEAN_MONTHLY_MULTIPLIER: Record<FrequencyKey, number> = {
  ...FREQUENCY_MONTHLY_MULTIPLIER,
  oneTime: 0,
  annual: 0.083,
};

export const SANICLEAN_CONFIG = {
  allInclusivePackage: {
    weeklyRatePerFixture: 20,
    soapUpgrade: {
      luxuryUpgradePerDispenser: 5,
      excessUsageCharges: {standardSoap: 13, luxurySoap: 30},
    },
    paperCredit: {creditPerFixturePerWeek: 5},
    microfiberMopping: {pricePerBathroom: 10},
  },
  perItemCharge: {
    insideBeltway: {ratePerFixture: 7, weeklyMinimum: 40, tripCharge: 8, parkingFee: 7},
    outsideBeltway: {ratePerFixture: 6, weeklyMinimum: 0, tripCharge: 8},
    smallFacility: {fixtureThreshold: 5, minimumWeekly: 50},
    facilityComponents: {
      urinals: {components: {urinalScreen: 4, urinalMat: 4}},
      maleToilets: {components: {toiletClips: 1, seatCoverDispenser: 1}},
      femaleToilets: {components: {sanipodService: 4}},
    },
    warrantyFees: {perDispenserPerWeek: 1},
  },
  billingConversions: {weekly: {monthlyMultiplier: 4.33, annualMultiplier: 50}},
  rateTiers: {
    redRate: {multiplier: 1.0},
    greenRate: {multiplier: 1.0},
  },
};

export interface BackendSanicleanConfig {
  includedItems?: {electrostaticSprayIncluded: boolean; includedWeeklyRefillsDefault: number};
  warrantyFees?: {
    airFreshenerDispenserWarrantyFeePerWeek?: number;
    soapDispenserWarrantyFeePerWeek?: number;
  };
  smallBathroomMinimums?: {minimumFixturesThreshold?: number; minimumPriceUnderThreshold?: number};
  allInclusivePricing?: {
    pricePerFixture?: number;
    includeAllAddOns?: boolean;
    waiveTripCharge?: boolean;
    waiveWarrantyFees?: boolean;
    autoAllInclusiveMinFixtures?: number;
  };
  soapUpgrades?: {
    standardToLuxuryPerDispenserPerWeek?: number;
    excessUsageCharges?: {standardSoapPerGallon?: number; luxurySoapPerGallon?: number};
  };
  paperCredit?: {creditPerFixturePerWeek?: number};
  standardALaCartePricing?: {
    insideBeltway?: {
      pricePerFixture?: number;
      minimumPrice?: number;
      tripCharge?: number;
      parkingFeeAddOn?: number;
    };
    outsideBeltway?: {pricePerFixture?: number; tripCharge?: number};
  };
  monthlyAddOnSupplyPricing?: {
    urinalMatMonthlyPrice?: number;
    urinalScreenMonthlyPrice?: string | number;
    toiletClipMonthlyPrice?: number;
    toiletSeatCoverDispenserMonthlyPrice?: string | number;
    sanipodMonthlyPricePerPod?: number;
  };
  microfiberMoppingIncludedWithSaniClean?: {
    pricePerBathroom?: number;
    hugeBathroomSqFtUnit?: number;
    hugeBathroomRate?: number;
  };
  tripChargesNonAllInclusiveOnly?: {standard?: number; beltway?: number};
  minimumChargePerVisit?: number;
  frequencyMetadata?: any;
  minContractMonths?: number;
  maxContractMonths?: number;
}

export interface SanicleanFormState {
  serviceId: 'saniclean';
  pricingMode: SanicleanPricingMode;
  sinks: number;
  urinals: number;
  maleToilets: number;
  femaleToilets: number;
  fixtureCount: number;
  location: SanicleanLocation;
  needsParking: boolean;
  soapType: SanicleanSoapType;
  luxuryUpgradeQty?: number;
  excessSoapGallonsPerWeek: number;
  addMicrofiberMopping: boolean;
  microfiberBathrooms: number;
  estimatedPaperSpendPerWeek: number;
  warrantyDispensers: number;
  addTripCharge: boolean;
  addUrinalComponents: boolean;
  urinalScreensQty: number;
  urinalMatsQty: number;
  addMaleToiletComponents: boolean;
  toiletClipsQty: number;
  seatCoverDispensersQty: number;
  addFemaleToiletComponents: boolean;
  sanipodsQty: number;
  contractMonths: number;
  rateTier: SanicleanRateTier;
  mainServiceFrequency: SanicleanFrequency;
  facilityComponentsFrequency: SanicleanFrequency;
  calculationMode?: SanicleanCalculationMode;
  notes: string;
  includedItems?: string[] | null;
  allInclusiveWeeklyRatePerFixture: number;
  luxuryUpgradePerDispenser: number;
  excessStandardSoapRate: number;
  excessLuxurySoapRate: number;
  paperCreditPerFixture: number;
  microfiberMoppingPerBathroom: number;
  insideBeltwayRatePerFixture: number;
  insideBeltwayMinimum: number;
  insideBeltwayTripCharge: number;
  insideBeltwayParkingFee: number;
  outsideBeltwayRatePerFixture: number;
  outsideBeltwayTripCharge: number;
  smallFacilityThreshold: number;
  smallFacilityMinimum: number;
  urinalScreenMonthly: number;
  urinalMatMonthly: number;
  toiletClipsMonthly: number;
  seatCoverDispenserMonthly: number;
  sanipodServiceMonthly: number;
  warrantyFeePerDispenserPerWeek: number;
  weeklyToMonthlyMultiplier: number;
  weeklyToAnnualMultiplier: number;
  redRateMultiplier: number;
  greenRateMultiplier: number;
  customBaseService?: number;
  customTripCharge?: number;
  customFacilityComponents?: number;
  customSoapUpgrade?: number;
  customExcessSoap?: number;
  customMicrofiberMopping?: number;
  customWarrantyFees?: number;
  customPaperOverage?: number;
  customWeeklyTotal?: number;
  customMonthlyTotal?: number;
  customContractTotal?: number;
  facilityComponentsMonthly?: number;
  applyMinimum?: boolean;
}

export interface SanicleanQuoteResult {
  serviceId: 'saniclean';
  displayName: string;
  pricingMode: SanicleanPricingMode;
  weeklyTotal: number;
  monthlyTotal: number;
  contractTotal: number;
  originalContractTotal?: number;
  oneTimeTotal?: number;
  baseServiceMonthly: number;
  facilityComponentsMonthly: number;
  breakdown: {
    baseService: number;
    tripCharge: number;
    facilityComponents: number;
    soapUpgrade: number;
    excessSoap: number;
    microfiberMopping: number;
    warrantyFees: number;
    paperOverage: number;
  };
  dispenserCounts: {soapDispensers: number; airFresheners: number; totalDispensers: number};
  componentCounts: {
    urinalScreens: number;
    urinalMats: number;
    toiletClips: number;
    seatCoverDispensers: number;
    sanipods: number;
  };
  included: string[];
  excluded: string[];
  appliedRules: string[];
  minimumChargePerWeek: number;
}

interface SanicleanDualFrequencyResult {
  calculationMode: SanicleanCalculationMode;
  mainServiceTotal: number;
  facilityComponentsTotal: number;
  combinedTotal: number;
  monthlyTotal?: number;
  perVisitTotal?: number;
  contractTotal: number;
  visitsInContract?: number;
}

const resolveLuxuryUpgradeQty = (form: SanicleanFormState): number => {
  const sinkCount = Number.isFinite(form.sinks) ? form.sinks : 0;
  const overrideQty = Number.isFinite(form.luxuryUpgradeQty as number)
    ? (form.luxuryUpgradeQty as number)
    : sinkCount;
  return Math.max(0, overrideQty);
};

const getFrequencyMultiplier = (frequency: string, backendConfig?: any): number => {
  if (backendConfig?.frequencyMetadata?.[frequency]) {
    const metadata = backendConfig.frequencyMetadata[frequency];
    if (typeof metadata.monthlyRecurringMultiplier === 'number') {
      return metadata.monthlyRecurringMultiplier;
    }
    if (typeof metadata.cycleMonths === 'number') {
      if (metadata.cycleMonths === 0) {
        return 1.0;
      }
      return 1 / metadata.cycleMonths;
    }
  }
  return SANICLEAN_MONTHLY_MULTIPLIER[frequency as FrequencyKey] ?? 4.33;
};

const getDualFrequencyMultiplier = (
  frequency: SanicleanFrequency,
  mode: SanicleanCalculationMode,
  backendConfig?: any,
): number => {
  if (mode === 'monthly') {
    return getFrequencyMultiplier(frequency, backendConfig);
  }
  return 1.0;
};

const calculateVisitsInContract = (
  frequency: SanicleanFrequency,
  contractMonths: number,
  backendConfig?: any,
): number => {
  if (frequency === 'oneTime') {
    return 1;
  }
  if (backendConfig?.frequencyMetadata?.[frequency]?.visitsPerYear) {
    return Math.round((backendConfig.frequencyMetadata[frequency].visitsPerYear * contractMonths) / 12);
  }
  if (backendConfig?.frequencyMetadata?.[frequency]?.cycleMonths) {
    const cycleMonths = backendConfig.frequencyMetadata[frequency].cycleMonths;
    const visitsPerYear = cycleMonths > 0 ? 12 / cycleMonths : 12;
    return Math.round((visitsPerYear * contractMonths) / 12);
  }
  return sharedVisitsInContract(frequency, contractMonths);
};

const calculateDualFrequency = (
  mainServiceFrequency: SanicleanFrequency,
  facilityComponentsFrequency: SanicleanFrequency,
  mainServiceBasePrice: number,
  facilityComponentsBasePrice: number,
  contractMonths: number,
  backendConfig?: any,
): SanicleanDualFrequencyResult => {
  const calculationMode = getCalculationMode(mainServiceFrequency);
  const facilityMultiplier =
    mainServiceFrequency === 'oneTime'
      ? 1
      : getFrequencyMultiplier(facilityComponentsFrequency, backendConfig);
  const facilityComponentsMonthly = facilityComponentsBasePrice * facilityMultiplier;
  const facilityContractTotal =
    mainServiceFrequency === 'oneTime'
      ? facilityComponentsMonthly
      : facilityComponentsMonthly * contractMonths;

  if (calculationMode === 'monthly') {
    const mainServiceMultiplier = getDualFrequencyMultiplier(mainServiceFrequency, 'monthly', backendConfig);
    const mainServiceMonthly = mainServiceBasePrice * mainServiceMultiplier;
    const monthlyTotal = mainServiceMonthly + facilityComponentsMonthly;
    let contractTotal: number;
    if (mainServiceFrequency === 'everyFourWeeks') {
      const totalVisits = Math.round(contractMonths * 1.0833);
      contractTotal = mainServiceBasePrice * totalVisits + facilityComponentsMonthly * totalVisits;
    } else {
      contractTotal = mainServiceMonthly * contractMonths + facilityContractTotal;
    }
    return {
      calculationMode,
      mainServiceTotal: mainServiceMonthly,
      facilityComponentsTotal: facilityComponentsMonthly,
      combinedTotal: monthlyTotal,
      monthlyTotal,
      contractTotal,
    };
  }

  const mainServicePerVisit = mainServiceBasePrice;
  const visitsInContract = calculateVisitsInContract(mainServiceFrequency, contractMonths, backendConfig);
  const mainServiceContractTotal = mainServicePerVisit * visitsInContract;
  const contractTotal = mainServiceContractTotal + facilityContractTotal;
  return {
    calculationMode,
    mainServiceTotal: mainServicePerVisit,
    facilityComponentsTotal: facilityComponentsMonthly,
    combinedTotal: mainServicePerVisit,
    perVisitTotal: mainServicePerVisit,
    monthlyTotal: facilityComponentsMonthly,
    contractTotal,
    visitsInContract,
  };
};

export function recomputeFixtureCount(state: SanicleanFormState): SanicleanFormState {
  const total =
    Math.max(0, state.sinks ?? 0) +
    Math.max(0, state.urinals ?? 0) +
    Math.max(0, state.maleToilets ?? 0) +
    Math.max(0, state.femaleToilets ?? 0);
  return {...state, fixtureCount: total};
}

function emptyQuote(pricingMode: SanicleanPricingMode): SanicleanQuoteResult {
  return {
    serviceId: 'saniclean',
    displayName: 'SaniClean',
    pricingMode,
    weeklyTotal: 0,
    monthlyTotal: 0,
    contractTotal: 0,
    baseServiceMonthly: 0,
    facilityComponentsMonthly: 0,
    breakdown: {
      baseService: 0,
      tripCharge: 0,
      facilityComponents: 0,
      soapUpgrade: 0,
      excessSoap: 0,
      microfiberMopping: 0,
      warrantyFees: 0,
      paperOverage: 0,
    },
    dispenserCounts: {soapDispensers: 0, airFresheners: 0, totalDispensers: 0},
    componentCounts: {urinalScreens: 0, urinalMats: 0, toiletClips: 0, seatCoverDispensers: 0, sanipods: 0},
    included: [],
    excluded: [],
    appliedRules: ['Service is inactive - no fixtures entered'],
    minimumChargePerWeek: 0,
  };
}

export function calculateAllInclusive(form: SanicleanFormState, config: any): SanicleanQuoteResult {
  const fixtureCount = form.fixtureCount;
  if (fixtureCount === 0) {
    return emptyQuote('all_inclusive');
  }

  const rateTierMultiplier = form.rateTier === 'greenRate' ? form.greenRateMultiplier : form.redRateMultiplier;
  const baseServiceCalc = fixtureCount * form.allInclusiveWeeklyRatePerFixture * rateTierMultiplier;
  const baseService = form.customBaseService ?? baseServiceCalc;
  const luxuryUpgradeQty = resolveLuxuryUpgradeQty(form);
  const soapUpgradeCalc = form.soapType === 'luxury' ? luxuryUpgradeQty * form.luxuryUpgradePerDispenser : 0;
  const soapUpgrade = form.customSoapUpgrade ?? soapUpgradeCalc;
  const excessSoapCalc =
    form.excessSoapGallonsPerWeek > 0
      ? form.excessSoapGallonsPerWeek *
        (form.soapType === 'luxury' ? form.excessLuxurySoapRate : form.excessStandardSoapRate)
      : 0;
  const excessSoap = form.customExcessSoap ?? excessSoapCalc;
  const microfiberMopping = form.customMicrofiberMopping ?? 0;
  const paperCredit = fixtureCount * form.paperCreditPerFixture;
  const paperOverageCalc = Math.max(0, form.estimatedPaperSpendPerWeek - paperCredit);
  const paperOverage = form.customPaperOverage ?? paperOverageCalc;
  const tripCharge = form.customTripCharge ?? 0;
  const warrantyFees = form.customWarrantyFees ?? 0;
  const facilityComponents = form.customFacilityComponents ?? 0;

  const mainServiceTotal =
    baseService + soapUpgrade + excessSoap + microfiberMopping + warrantyFees + paperOverage + tripCharge;
  const facilityComponentsTotal = facilityComponents;

  const dualFreqResult = calculateDualFrequency(
    form.mainServiceFrequency,
    form.facilityComponentsFrequency,
    mainServiceTotal,
    facilityComponentsTotal,
    form.contractMonths,
    config,
  );

  const calculationMode = getCalculationMode(form.mainServiceFrequency);
  const weeklyTotal = calculationMode === 'monthly' ? mainServiceTotal : dualFreqResult.combinedTotal;
  const monthlyTotal = dualFreqResult.monthlyTotal ?? dualFreqResult.combinedTotal;
  const contractTotal = dualFreqResult.contractTotal;

  const soapDispensers = form.sinks;
  const airFresheners = Math.ceil(form.sinks / 2);
  const totalDispensers = soapDispensers + airFresheners;

  return {
    serviceId: 'saniclean',
    displayName: 'SaniClean - All Inclusive Package',
    pricingMode: 'all_inclusive',
    weeklyTotal,
    monthlyTotal,
    contractTotal,
    baseServiceMonthly: dualFreqResult.mainServiceTotal,
    facilityComponentsMonthly: dualFreqResult.facilityComponentsTotal,
    breakdown: {
      baseService,
      tripCharge,
      facilityComponents,
      soapUpgrade,
      excessSoap,
      microfiberMopping,
      warrantyFees,
      paperOverage,
    },
    dispenserCounts: {soapDispensers, airFresheners, totalDispensers},
    componentCounts: {
      urinalScreens: form.urinals,
      urinalMats: form.urinals,
      toiletClips: form.maleToilets,
      seatCoverDispensers: form.maleToilets,
      sanipods: form.femaleToilets,
    },
    included: form.includedItems ?? [
      'SaniClean service',
      'SaniPod service',
      'Urinal mats',
      'Paper dispensers & reasonable usage',
      'Microfiber mopping',
      'Monthly SaniScrub',
      'Electrostatic spray (free)',
      'Air freshener service (no warranty fee)',
      'Soap service (no warranty fee)',
      'Fragrance Bar',
      `Paper credit: $${paperCredit.toFixed(2)}/week`,
    ],
    excluded: ['Trip charges (waived)', 'Warranty fees (waived)'],
    appliedRules: [],
    minimumChargePerWeek: 0,
  };
}

export function calculatePerItemCharge(form: SanicleanFormState, config: any): SanicleanQuoteResult {
  const fixtureCount = form.fixtureCount;
  if (fixtureCount === 0) {
    return emptyQuote('per_item_charge');
  }

  const rateTierMultiplier = form.rateTier === 'greenRate' ? form.greenRateMultiplier : form.redRateMultiplier;
  const isInsideBeltway = form.location === 'insideBeltway';
  const fixtureRate = isInsideBeltway ? form.insideBeltwayRatePerFixture : form.outsideBeltwayRatePerFixture;
  const regionMinimum = isInsideBeltway ? form.insideBeltwayMinimum : 0;

  let baseServiceCalc = fixtureCount * fixtureRate * rateTierMultiplier;
  const isSmallFacility = fixtureCount <= form.smallFacilityThreshold;
  let tripChargeCalc = 0;

  if (isSmallFacility) {
    baseServiceCalc =
      form.applyMinimum !== false ? Math.max(baseServiceCalc, form.smallFacilityMinimum) : baseServiceCalc;
    tripChargeCalc = 0;
  } else {
    baseServiceCalc = Math.max(baseServiceCalc, regionMinimum);
    if (form.addTripCharge) {
      tripChargeCalc = isInsideBeltway ? form.insideBeltwayTripCharge : form.outsideBeltwayTripCharge;
      if (isInsideBeltway && form.needsParking) {
        tripChargeCalc += form.insideBeltwayParkingFee;
      }
    } else {
      tripChargeCalc = 0;
    }
  }

  const baseService = form.customBaseService ?? baseServiceCalc;
  const tripCharge = form.customTripCharge ?? tripChargeCalc;

  let facilityComponentsCalc = 0;
  if (form.addUrinalComponents) {
    facilityComponentsCalc +=
      form.urinalScreensQty * form.urinalScreenMonthly + form.urinalMatsQty * form.urinalMatMonthly;
  }
  if (form.addMaleToiletComponents) {
    facilityComponentsCalc +=
      form.toiletClipsQty * form.toiletClipsMonthly +
      form.seatCoverDispensersQty * form.seatCoverDispenserMonthly;
  }
  if (form.addFemaleToiletComponents) {
    facilityComponentsCalc += form.sanipodsQty * form.sanipodServiceMonthly;
  }
  const facilityComponents = form.customFacilityComponents ?? facilityComponentsCalc;

  const luxuryUpgradeQty = resolveLuxuryUpgradeQty(form);
  const soapUpgradeCalc = form.soapType === 'luxury' ? luxuryUpgradeQty * form.luxuryUpgradePerDispenser : 0;
  const soapUpgrade = form.customSoapUpgrade ?? soapUpgradeCalc;
  const excessSoap = form.customExcessSoap ?? 0;
  const microfiberMoppingCalc = form.addMicrofiberMopping
    ? form.microfiberBathrooms * form.microfiberMoppingPerBathroom
    : 0;
  const microfiberMopping = form.customMicrofiberMopping ?? microfiberMoppingCalc;

  const soapDispensers = form.sinks;
  const airFresheners = Math.ceil(form.sinks / 2);
  const totalDispensers = soapDispensers + airFresheners;
  const warrantyFeesCalc =
    form.warrantyDispensers > 0 ? form.warrantyDispensers * form.warrantyFeePerDispenserPerWeek : 0;
  const warrantyFees = form.customWarrantyFees ?? warrantyFeesCalc;
  const paperOverage = form.customPaperOverage ?? 0;

  const mainServiceTotal =
    baseService + tripCharge + soapUpgrade + excessSoap + microfiberMopping + warrantyFees + paperOverage;
  const facilityComponentsTotal = facilityComponents;

  const dualFreqResult = calculateDualFrequency(
    form.mainServiceFrequency,
    form.facilityComponentsFrequency,
    mainServiceTotal,
    facilityComponentsTotal,
    form.contractMonths,
    config,
  );

  const calculationMode = getCalculationMode(form.mainServiceFrequency);
  const weeklyTotal = calculationMode === 'monthly' ? mainServiceTotal : dualFreqResult.combinedTotal;
  const monthlyTotal = dualFreqResult.monthlyTotal ?? dualFreqResult.combinedTotal;
  const contractTotal = dualFreqResult.contractTotal;

  const minimumChargePerWeek = isSmallFacility ? form.smallFacilityMinimum : regionMinimum;

  return {
    serviceId: 'saniclean',
    displayName: 'SaniClean - Per Item Charge',
    pricingMode: 'per_item_charge',
    weeklyTotal,
    monthlyTotal,
    contractTotal,
    baseServiceMonthly: dualFreqResult.mainServiceTotal,
    facilityComponentsMonthly: dualFreqResult.facilityComponentsTotal,
    breakdown: {
      baseService,
      tripCharge,
      facilityComponents: dualFreqResult.facilityComponentsTotal,
      soapUpgrade,
      excessSoap,
      microfiberMopping,
      warrantyFees,
      paperOverage,
    },
    dispenserCounts: {soapDispensers, airFresheners, totalDispensers},
    componentCounts: {
      urinalScreens: form.urinals,
      urinalMats: form.urinals,
      toiletClips: form.maleToilets,
      seatCoverDispensers: form.maleToilets,
      sanipods: form.femaleToilets,
    },
    included: form.includedItems ?? [
      'SaniClean service',
      'Electrostatic spray (free)',
      'Air freshener service (free)',
      'Soap service (free)',
    ],
    excluded: [
      'SaniPod service ($4/month each)',
      'Urinal components ($8/month per urinal)',
      'Toilet components ($2/month per male toilet)',
      'Warranty fees ($1/dispenser/week)',
      'Microfiber mopping (optional add-on)',
    ],
    appliedRules: [],
    minimumChargePerWeek,
  };
}

export function computeSanicleanQuote(
  form: SanicleanFormState,
  backendConfig: BackendSanicleanConfig | null,
  customFieldsTotal: number = 0,
): SanicleanQuoteResult {
  const config: any = backendConfig || SANICLEAN_CONFIG;
  const legacyFreq = (form as any).frequency as SanicleanFrequency | undefined;

  const recomputedFixtureCount =
    Math.max(0, form.sinks ?? 0) +
    Math.max(0, form.urinals ?? 0) +
    Math.max(0, form.maleToilets ?? 0) +
    Math.max(0, form.femaleToilets ?? 0);

  const mappedForm: SanicleanFormState = {
    ...form,
    fixtureCount: recomputedFixtureCount,
    mainServiceFrequency: form.mainServiceFrequency || legacyFreq || 'weekly',
    facilityComponentsFrequency:
      form.facilityComponentsFrequency || form.mainServiceFrequency || legacyFreq || 'weekly',
  };

  const baseQuote: SanicleanQuoteResult =
    mappedForm.pricingMode === 'all_inclusive'
      ? calculateAllInclusive(mappedForm, config)
      : calculatePerItemCharge(mappedForm, config);

  const effectiveWeeklyTotal = mappedForm.customWeeklyTotal ?? baseQuote.weeklyTotal;
  const effectiveMonthlyTotal = mappedForm.customMonthlyTotal ?? baseQuote.monthlyTotal;
  const contractTotalBeforeCustomFields = mappedForm.customContractTotal ?? baseQuote.contractTotal;
  const effectiveContractTotal = contractTotalBeforeCustomFields + customFieldsTotal;

  const baselineFixtureRateInside =
    config.standardALaCartePricing?.insideBeltway?.pricePerFixture ??
    SANICLEAN_CONFIG.perItemCharge.insideBeltway.ratePerFixture;
  const baselineFixtureRateOutside =
    config.standardALaCartePricing?.outsideBeltway?.pricePerFixture ??
    SANICLEAN_CONFIG.perItemCharge.outsideBeltway.ratePerFixture;
  const baselineAllInclusiveRate =
    config.allInclusivePricing?.pricePerFixture ?? SANICLEAN_CONFIG.allInclusivePackage.weeklyRatePerFixture;

  const baselineForm: SanicleanFormState = {
    ...mappedForm,
    insideBeltwayRatePerFixture: baselineFixtureRateInside,
    outsideBeltwayRatePerFixture: baselineFixtureRateOutside,
    allInclusiveWeeklyRatePerFixture: baselineAllInclusiveRate,
    insideBeltwayMinimum:
      config.standardALaCartePricing?.insideBeltway?.minimumPrice ??
      SANICLEAN_CONFIG.perItemCharge.insideBeltway.weeklyMinimum,
    insideBeltwayTripCharge:
      config.standardALaCartePricing?.insideBeltway?.tripCharge ??
      SANICLEAN_CONFIG.perItemCharge.insideBeltway.tripCharge,
    insideBeltwayParkingFee:
      config.standardALaCartePricing?.insideBeltway?.parkingFeeAddOn ??
      SANICLEAN_CONFIG.perItemCharge.insideBeltway.parkingFee,
    outsideBeltwayTripCharge:
      config.standardALaCartePricing?.outsideBeltway?.tripCharge ??
      SANICLEAN_CONFIG.perItemCharge.outsideBeltway.tripCharge,
    smallFacilityThreshold:
      config.smallBathroomMinimums?.minimumFixturesThreshold ??
      SANICLEAN_CONFIG.perItemCharge.smallFacility.fixtureThreshold,
    smallFacilityMinimum:
      config.smallBathroomMinimums?.minimumPriceUnderThreshold ??
      SANICLEAN_CONFIG.perItemCharge.smallFacility.minimumWeekly,
    luxuryUpgradePerDispenser:
      config.soapUpgrades?.standardToLuxuryPerDispenserPerWeek ??
      SANICLEAN_CONFIG.allInclusivePackage.soapUpgrade.luxuryUpgradePerDispenser,
    excessStandardSoapRate:
      config.soapUpgrades?.excessUsageCharges?.standardSoapPerGallon ??
      SANICLEAN_CONFIG.allInclusivePackage.soapUpgrade.excessUsageCharges.standardSoap,
    excessLuxurySoapRate:
      config.soapUpgrades?.excessUsageCharges?.luxurySoapPerGallon ??
      SANICLEAN_CONFIG.allInclusivePackage.soapUpgrade.excessUsageCharges.luxurySoap,
    paperCreditPerFixture:
      config.paperCredit?.creditPerFixturePerWeek ??
      SANICLEAN_CONFIG.allInclusivePackage.paperCredit.creditPerFixturePerWeek,
    microfiberMoppingPerBathroom:
      config.microfiberMoppingIncludedWithSaniClean?.pricePerBathroom ??
      SANICLEAN_CONFIG.allInclusivePackage.microfiberMopping.pricePerBathroom,
    warrantyFeePerDispenserPerWeek:
      config.warrantyFees?.soapDispenserWarrantyFeePerWeek ??
      SANICLEAN_CONFIG.perItemCharge.warrantyFees.perDispenserPerWeek,
    urinalScreenMonthly:
      typeof config.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === 'number'
        ? config.monthlyAddOnSupplyPricing.urinalScreenMonthlyPrice
        : config.monthlyAddOnSupplyPricing?.urinalScreenMonthlyPrice === 'included'
        ? config.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice ??
          SANICLEAN_CONFIG.perItemCharge.facilityComponents.urinals.components.urinalMat
        : SANICLEAN_CONFIG.perItemCharge.facilityComponents.urinals.components.urinalScreen,
    urinalMatMonthly:
      config.monthlyAddOnSupplyPricing?.urinalMatMonthlyPrice ??
      SANICLEAN_CONFIG.perItemCharge.facilityComponents.urinals.components.urinalMat,
    toiletClipsMonthly:
      config.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice ??
      SANICLEAN_CONFIG.perItemCharge.facilityComponents.maleToilets.components.toiletClips,
    seatCoverDispenserMonthly:
      typeof config.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === 'number'
        ? config.monthlyAddOnSupplyPricing.toiletSeatCoverDispenserMonthlyPrice
        : config.monthlyAddOnSupplyPricing?.toiletSeatCoverDispenserMonthlyPrice === 'included'
        ? config.monthlyAddOnSupplyPricing?.toiletClipMonthlyPrice ??
          SANICLEAN_CONFIG.perItemCharge.facilityComponents.maleToilets.components.toiletClips
        : SANICLEAN_CONFIG.perItemCharge.facilityComponents.maleToilets.components.seatCoverDispenser,
    sanipodServiceMonthly:
      config.monthlyAddOnSupplyPricing?.sanipodMonthlyPricePerPod ??
      SANICLEAN_CONFIG.perItemCharge.facilityComponents.femaleToilets.components.sanipodService,
    redRateMultiplier: SANICLEAN_CONFIG.rateTiers.redRate.multiplier,
    greenRateMultiplier: SANICLEAN_CONFIG.rateTiers.greenRate.multiplier,
    customBaseService: undefined,
    customTripCharge: undefined,
    customWeeklyTotal: undefined,
    customMonthlyTotal: undefined,
    customContractTotal: undefined,
  };

  const baselineQuote: SanicleanQuoteResult =
    baselineForm.pricingMode === 'all_inclusive'
      ? calculateAllInclusive(baselineForm, config)
      : calculatePerItemCharge(baselineForm, config);

  const originalContractTotal = baselineQuote.contractTotal + customFieldsTotal;

  return {
    ...baseQuote,
    weeklyTotal: effectiveWeeklyTotal,
    monthlyTotal: effectiveMonthlyTotal,
    contractTotal: effectiveContractTotal,
    originalContractTotal,
  };
}

const num = (v: any, d: number): number => {
  if (typeof v === 'number' && isFinite(v)) {
    return v;
  }
  if (typeof v === 'string' && v !== 'included') {
    const n = parseFloat(v);
    if (isFinite(n)) {
      return n;
    }
  }
  return d;
};

function resolveMonthlyAddOn(raw: string | number | undefined, included: number, fallback: number): number {
  if (typeof raw === 'number') {
    return raw;
  }
  if (raw === 'included') {
    return included;
  }
  return num(raw, fallback);
}

export function buildSanicleanState(
  data: any,
  contractMonths: number,
  cfg: BackendSanicleanConfig | null,
): SanicleanFormState {
  const c: any = cfg ?? {};
  const cfgInside = c.standardALaCartePricing?.insideBeltway ?? {};
  const cfgOutside = c.standardALaCartePricing?.outsideBeltway ?? {};
  const cfgMonthly = c.monthlyAddOnSupplyPricing ?? {};

  const urinalMatMonthly = num(data?.urinalMatMonthly ?? cfgMonthly.urinalMatMonthlyPrice, 4);
  const toiletClipsMonthly = num(data?.toiletClipsMonthly ?? cfgMonthly.toiletClipMonthlyPrice, 1);

  const state: SanicleanFormState = {
    serviceId: 'saniclean',
    pricingMode: data?.pricingMode === 'all_inclusive' ? 'all_inclusive' : 'per_item_charge',
    sinks: num(data?.sinks, 0),
    urinals: num(data?.urinals, 0),
    maleToilets: num(data?.maleToilets, 0),
    femaleToilets: num(data?.femaleToilets, 0),
    fixtureCount: 0,
    location: data?.location === 'outsideBeltway' ? 'outsideBeltway' : 'insideBeltway',
    needsParking: data?.needsParking === true,
    soapType: data?.soapType === 'luxury' ? 'luxury' : 'standard',
    luxuryUpgradeQty: data?.luxuryUpgradeQty,
    excessSoapGallonsPerWeek: num(data?.excessSoapGallonsPerWeek, 0),
    addMicrofiberMopping: data?.addMicrofiberMopping === true,
    microfiberBathrooms: num(data?.microfiberBathrooms, 0),
    estimatedPaperSpendPerWeek: num(data?.estimatedPaperSpendPerWeek, 0),
    warrantyDispensers: num(data?.warrantyDispensers, 0),
    addTripCharge: data?.addTripCharge === true,
    addUrinalComponents: data?.addUrinalComponents === true,
    urinalScreensQty: num(data?.urinalScreensQty, 0),
    urinalMatsQty: num(data?.urinalMatsQty, 0),
    addMaleToiletComponents: data?.addMaleToiletComponents === true,
    toiletClipsQty: num(data?.toiletClipsQty, 0),
    seatCoverDispensersQty: num(data?.seatCoverDispensersQty, 0),
    addFemaleToiletComponents: data?.addFemaleToiletComponents === true,
    sanipodsQty: num(data?.sanipodsQty, 0),
    contractMonths,
    rateTier: data?.rateTier === 'greenRate' ? 'greenRate' : 'redRate',
    mainServiceFrequency: (data?.mainServiceFrequency ?? data?.frequency ?? 'weekly') as SanicleanFrequency,
    facilityComponentsFrequency: (data?.facilityComponentsFrequency ??
      data?.mainServiceFrequency ??
      data?.frequency ??
      'weekly') as SanicleanFrequency,
    notes: data?.notes ?? '',
    includedItems: data?.includedItems,
    allInclusiveWeeklyRatePerFixture: num(
      data?.allInclusiveWeeklyRatePerFixture ?? c.allInclusivePricing?.pricePerFixture,
      20,
    ),
    luxuryUpgradePerDispenser: num(
      data?.luxuryUpgradePerDispenser ?? c.soapUpgrades?.standardToLuxuryPerDispenserPerWeek,
      5,
    ),
    excessStandardSoapRate: num(
      data?.excessStandardSoapRate ?? c.soapUpgrades?.excessUsageCharges?.standardSoapPerGallon,
      13,
    ),
    excessLuxurySoapRate: num(
      data?.excessLuxurySoapRate ?? c.soapUpgrades?.excessUsageCharges?.luxurySoapPerGallon,
      30,
    ),
    paperCreditPerFixture: num(data?.paperCreditPerFixture ?? c.paperCredit?.creditPerFixturePerWeek, 5),
    microfiberMoppingPerBathroom: num(
      data?.microfiberMoppingPerBathroom ?? c.microfiberMoppingIncludedWithSaniClean?.pricePerBathroom,
      10,
    ),
    insideBeltwayRatePerFixture: num(
      data?.insideBeltwayRatePerFixture ?? cfgInside.pricePerFixture,
      7,
    ),
    insideBeltwayMinimum: num(data?.insideBeltwayMinimum ?? cfgInside.minimumPrice, 40),
    insideBeltwayTripCharge: num(data?.insideBeltwayTripCharge ?? cfgInside.tripCharge, 8),
    insideBeltwayParkingFee: num(data?.insideBeltwayParkingFee ?? cfgInside.parkingFeeAddOn, 7),
    outsideBeltwayRatePerFixture: num(
      data?.outsideBeltwayRatePerFixture ?? cfgOutside.pricePerFixture,
      6,
    ),
    outsideBeltwayTripCharge: num(data?.outsideBeltwayTripCharge ?? cfgOutside.tripCharge, 8),
    smallFacilityThreshold: num(
      data?.smallFacilityThreshold ?? c.smallBathroomMinimums?.minimumFixturesThreshold,
      5,
    ),
    smallFacilityMinimum: num(
      data?.smallFacilityMinimum ?? c.smallBathroomMinimums?.minimumPriceUnderThreshold,
      50,
    ),
    urinalScreenMonthly: resolveMonthlyAddOn(
      data?.urinalScreenMonthly ?? cfgMonthly.urinalScreenMonthlyPrice,
      urinalMatMonthly,
      4,
    ),
    urinalMatMonthly,
    toiletClipsMonthly,
    seatCoverDispenserMonthly: resolveMonthlyAddOn(
      data?.seatCoverDispenserMonthly ?? cfgMonthly.toiletSeatCoverDispenserMonthlyPrice,
      toiletClipsMonthly,
      1,
    ),
    sanipodServiceMonthly: num(data?.sanipodServiceMonthly ?? cfgMonthly.sanipodMonthlyPricePerPod, 4),
    warrantyFeePerDispenserPerWeek: num(
      data?.warrantyFeePerDispenserPerWeek ?? c.warrantyFees?.soapDispenserWarrantyFeePerWeek,
      1,
    ),
    weeklyToMonthlyMultiplier: num(
      data?.weeklyToMonthlyMultiplier ?? c.frequencyMetadata?.weekly?.monthlyRecurringMultiplier,
      4.33,
    ),
    weeklyToAnnualMultiplier: num(data?.weeklyToAnnualMultiplier, 50),
    redRateMultiplier: SANICLEAN_CONFIG.rateTiers.redRate.multiplier,
    greenRateMultiplier: SANICLEAN_CONFIG.rateTiers.greenRate.multiplier,
    customBaseService: data?.customBaseService,
    customTripCharge: data?.customTripCharge,
    customFacilityComponents: data?.customFacilityComponents,
    customSoapUpgrade: data?.customSoapUpgrade,
    customExcessSoap: data?.customExcessSoap,
    customMicrofiberMopping: data?.customMicrofiberMopping,
    customWarrantyFees: data?.customWarrantyFees,
    customPaperOverage: data?.customPaperOverage,
    customWeeklyTotal: data?.customWeeklyTotal,
    customMonthlyTotal: data?.customMonthlyTotal,
    customContractTotal: data?.customContractTotal,
    applyMinimum: data?.applyMinimum !== false,
  };

  return recomputeFixtureCount(state);
}
