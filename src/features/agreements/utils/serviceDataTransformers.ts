// Service edit-format → flat form-state transformers.
// Ported from the web app (components/services/common/dataTransformers.ts).
// The backend `/edit-format` endpoint returns each service in a "structured"
// display shape (e.g. {service:{qty,rate}, frequency:{frequencyKey}, totals:{...}}).
// The RN service forms read FLAT fields (podQuantity, floorAreaSqFt, frequency:string…),
// so when editing we must convert each saved service before handing it to the form.

import {FREQUENCY_KEYS, FREQUENCY_LABELS, type FrequencyKey} from '../../../shared/constants/frequency';

function normalizeStructuredValue(rawValue: any): any {
  if (rawValue === undefined || rawValue === null) {
    return undefined;
  }
  if (Array.isArray(rawValue)) {
    return rawValue;
  }
  if (typeof rawValue !== 'object') {
    return rawValue;
  }
  if ('value' in rawValue) {
    return normalizeStructuredValue(rawValue.value);
  }
  if ('amount' in rawValue) {
    return normalizeStructuredValue(rawValue.amount);
  }
  if ('qty' in rawValue) {
    return normalizeStructuredValue(rawValue.qty);
  }
  return rawValue;
}

function normalizeFrequencyCandidate(value: any): string {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'object') {
    const nested =
      value.frequencyKey ?? value.value ?? value.label ?? value.name ?? value.frequency ?? '';
    if (nested !== value) {
      return normalizeFrequencyCandidate(nested);
    }
    return '';
  }
  return String(value);
}

function sanitizeFrequencyText(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/ /g, ' ')
    .replace(/×/g, 'x')
    .replace(/[–—]/g, '-')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ');
}

const KNOWN_FREQUENCY_KEYS = new Set<string>(FREQUENCY_KEYS.map(k => k.toLowerCase()));

function detectFrequencyText(cleaned: string): FrequencyKey | undefined {
  if (!cleaned) {
    return undefined;
  }
  const collapsed = cleaned.replace(/[\s-]+/g, '');
  if (collapsed.includes('onetim') || cleaned.includes('one time') || cleaned.includes('1 time')) {
    return 'oneTime';
  }
  if (/^weekly$/.test(collapsed) || (cleaned.includes('weekly') && !cleaned.includes('biweekly'))) {
    return 'weekly';
  }
  if (cleaned.includes('biweekly') || collapsed.includes('biweekly')) {
    return 'biweekly';
  }
  if (
    cleaned.includes('twice per month') ||
    cleaned.includes('2 per month') ||
    cleaned.includes('2x month') ||
    collapsed.includes('twicepermonth') ||
    collapsed.includes('2permonth')
  ) {
    return 'twicePerMonth';
  }
  if (collapsed.includes('every4weeks') || collapsed.includes('everyfourweeks') || cleaned.includes('every 4 weeks') || cleaned.includes('every four weeks')) {
    return 'everyFourWeeks';
  }
  if (cleaned.includes('monthly') && !cleaned.includes('twice per')) {
    return 'monthly';
  }
  if (collapsed.includes('bimonth') || /every\s*2\s*months?|\b2\s*months?\b/.test(cleaned)) {
    return 'bimonthly';
  }
  if (cleaned.includes('quarterly') || cleaned.includes('quarter')) {
    return 'quarterly';
  }
  if (cleaned.includes('biannual') || cleaned.includes('semiannual')) {
    return 'biannual';
  }
  if (cleaned.includes('annual') || cleaned.includes('yearly')) {
    return 'annual';
  }
  return undefined;
}

export function resolveFrequencyKey(candidate: any): FrequencyKey | undefined {
  const raw = normalizeFrequencyCandidate(candidate);
  if (!raw) {
    return undefined;
  }
  const normalized = sanitizeFrequencyText(raw);
  const collapsed = normalized.replace(/[\s-]+/g, '');
  // Direct camelCase key match (e.g. "everyFourWeeks")
  const directKey = FREQUENCY_KEYS.find(k => k.toLowerCase() === collapsed);
  if (directKey) {
    return directKey;
  }
  if (KNOWN_FREQUENCY_KEYS.has(normalized)) {
    return FREQUENCY_KEYS.find(k => k.toLowerCase() === normalized);
  }
  return detectFrequencyText(normalized);
}

function resolveFrequencyFromSources(sources: any[], fallback: FrequencyKey = 'weekly'): FrequencyKey {
  for (const candidate of sources) {
    const freq = resolveFrequencyKey(candidate);
    if (freq) {
      return freq;
    }
  }
  return fallback;
}

function copyIfDefined(target: any, src: any, fields: string[]) {
  for (const f of fields) {
    const v = normalizeStructuredValue(src[f]);
    if (v !== undefined) {
      target[f] = v;
    }
  }
}

function copyRawIfDefined(target: any, src: any, fields: string[]) {
  for (const f of fields) {
    if (src[f] !== undefined && src[f] !== null) {
      target[f] = src[f];
    }
  }
}

function contractMonthsFrom(src: any): number | undefined {
  if (src.contractMonths !== undefined) {
    return src.contractMonths;
  }
  if (src.totals?.contract?.months !== undefined) {
    return src.totals.contract.months;
  }
  return undefined;
}

// ---- per-service transformers -------------------------------------------------

function transformSanipod(s: any): any {
  const out: any = {notes: s.notes ?? ''};
  copyIfDefined(out, s, [
    'weeklyRatePerUnit',
    'altWeeklyRatePerUnit',
    'extraBagPrice',
    'standaloneExtraWeeklyCharge',
    'tripChargePerVisit',
    'installRatePerPod',
  ]);
  if (s.service) {
    out.podQuantity = s.service.qty ?? 0;
  }
  if (s.extraBags) {
    out.extraBagsPerWeek = s.extraBags.qty ?? 0;
    out.extraBagsRecurring = s.extraBags.recurring !== false;
    if (s.extraBags.rate != null) {
      out.extraBagPrice = s.extraBags.rate;
    }
  }
  out.frequency = resolveFrequencyFromSources([
    s.frequency?.frequencyKey,
    s.frequency?.value,
    s.frequency?.label,
    s.frequency,
    s.frequencyDisplay?.frequencyKey,
    s.frequencyDisplay?.value,
  ]);
  if (s.installation) {
    out.isNewInstall = true;
    out.installQuantity = s.installation.qty ?? 0;
    if (s.installation.rate != null) {
      out.installRatePerPod = s.installation.rate;
    }
  }
  if (s.isStandalone !== undefined) {
    out.isStandalone = s.isStandalone;
  }
  if (s.serviceRule !== undefined) {
    out.serviceRule = s.serviceRule;
  }
  copyRawIfDefined(out, s, [
    'podQuantity',
    'extraBagsPerWeek',
    'customInstallationFee',
    'customPerVisitPrice',
    'customMonthlyPrice',
    'customAnnualPrice',
    'customWeeklyPodRate',
    'customPodServiceTotal',
    'customExtraBagsTotal',
  ]);
  const cm = contractMonthsFrom(s);
  if (cm !== undefined) {
    out.contractMonths = cm;
  }
  return out;
}

function transformStripWax(s: any): any {
  const out: any = {notes: s.notes ?? ''};
  copyRawIfDefined(out, s, ['ratePerSqFt', 'minCharge', 'serviceVariant', 'rateCategory']);
  out.frequency = resolveFrequencyFromSources([
    s.frequency,
    s.frequency?.frequencyKey,
    s.frequency?.value,
    s.frequencyDisplay?.value,
  ]);
  if (s.service) {
    out.floorAreaSqFt = s.service.qty ?? 0;
    if (s.service.rate !== undefined && out.ratePerSqFt === undefined) {
      out.ratePerSqFt = s.service.rate;
    }
  }
  copyRawIfDefined(out, s, ['floorAreaSqFt', 'applyMinimum']);
  const cm = contractMonthsFrom(s);
  if (cm !== undefined) {
    out.contractMonths = cm;
  }
  return out;
}

function transformCarpet(s: any): any {
  const out: any = {notes: s.notes ?? ''};
  out.frequency = resolveFrequencyFromSources([
    s.frequency?.frequencyKey,
    s.frequency?.value,
    s.frequency,
  ]);
  if (s.location) {
    out.location = (s.location.value ?? s.location)?.toString().includes('Inside') ? 'insideBeltway' : 'outsideBeltway';
  }
  copyRawIfDefined(out, s, [
    'firstUnitRate',
    'additionalUnitRate',
    'perVisitMinimum',
    'installMultiplierDirty',
    'installMultiplierClean',
    'unitSqFt',
    'useExactSqft',
    'areaSqFt',
  ]);
  if (s.service) {
    if (out.areaSqFt === undefined) {
      out.areaSqFt = s.service.qty ?? 0;
    }
    if (out.firstUnitRate === undefined && s.service.rate !== undefined) {
      out.firstUnitRate = s.service.rate;
    }
  }
  if (s.installation) {
    out.includeInstall = true;
    out.isDirtyInstall = s.installation.isDirty || false;
    if (s.installation.multiplier != null) {
      if (out.isDirtyInstall) {
        out.installMultiplierDirty = s.installation.multiplier;
      } else {
        out.installMultiplierClean = s.installation.multiplier;
      }
    }
    if (s.installation.total != null && s.installation.isCustom === true) {
      out.customInstallationFee = s.installation.total;
    }
  }
  if (s.totals?.contract) {
    out.contractMonths = s.totals.contract.months || 12;
    if (s.totals.contract.isCustom === true) {
      out.customContractTotal = s.totals.contract.amount;
    }
  }
  const cm = contractMonthsFrom(s);
  if (cm !== undefined && out.contractMonths === undefined) {
    out.contractMonths = cm;
  }
  return out;
}

function transformElectrostatic(s: any): any {
  const out: any = {notes: s.notes ?? ''};
  copyRawIfDefined(out, s, [
    'ratePerRoom',
    'ratePerThousandSqFt',
    'tripChargePerVisit',
    'pricingMethod',
    'roomCount',
    'squareFeet',
    'useExactCalculation',
    'isCombinedWithSaniClean',
  ]);
  out.frequency = resolveFrequencyFromSources([s.frequency, s.frequencyDisplay?.value], 'weekly');
  if (out.pricingMethod === undefined) {
    if (s.pricingMethodDisplay?.value) {
      out.pricingMethod = s.pricingMethodDisplay.value.includes('Room') ? 'byRoom' : 'bySqFt';
    } else if (s.pricingMethod?.value) {
      out.pricingMethod = s.pricingMethod.value.includes('Room') ? 'byRoom' : 'bySqFt';
    }
  }
  if (s.service) {
    if (out.pricingMethod === 'byRoom' || out.pricingMethod === undefined) {
      if (out.roomCount === undefined) {
        out.roomCount = s.service.qty ?? 0;
      }
      if (out.ratePerRoom === undefined && s.service.rate != null) {
        out.ratePerRoom = s.service.rate;
      }
    } else {
      if (out.squareFeet === undefined) {
        out.squareFeet = s.service.qty ?? 0;
      }
      if (out.ratePerThousandSqFt === undefined && s.service.rate != null) {
        out.ratePerThousandSqFt = s.service.rate;
      }
    }
  }
  if (out.isCombinedWithSaniClean === undefined && s.combinedService) {
    out.isCombinedWithSaniClean = s.combinedService.value?.includes('Sani-Clean');
  }
  const cm = contractMonthsFrom(s);
  if (cm !== undefined) {
    out.contractMonths = cm;
  }
  return out;
}

function transformMicrofiber(s: any): any {
  const out: any = {notes: s.notes ?? ''};
  copyRawIfDefined(out, s, [
    'includedBathroomRate',
    'hugeBathroomRatePerSqFt',
    'extraAreaRatePerUnit',
    'standaloneRatePerUnit',
    'dailyChemicalPerGallon',
    'bathroomCount',
    'hugeBathroomSqFt',
    'extraAreaSqFt',
    'standaloneSqFt',
    'chemicalGallons',
    'hasExistingSaniService',
    'isAllInclusive',
    'isHugeBathroom',
    'useExactExtraAreaSqft',
    'useExactStandaloneSqft',
  ]);
  out.frequency = resolveFrequencyFromSources([
    s.frequency?.frequencyKey,
    s.frequency?.value,
    s.frequency,
    s.frequencyDisplay?.value,
  ]);
  if (Array.isArray(s.serviceBreakdown)) {
    s.serviceBreakdown.forEach((item: any) => {
      if (item.label === 'Bathrooms' && out.bathroomCount === undefined) {
        out.bathroomCount = item.qty || 0;
      } else if (item.label === 'Huge Bathrooms' && out.hugeBathroomSqFt === undefined) {
        out.hugeBathroomSqFt = item.qty || 0;
      } else if (item.label === 'Extra Area' && out.extraAreaSqFt === undefined) {
        out.extraAreaSqFt = item.qty || 0;
      } else if (item.label === 'Standalone Service' && out.standaloneSqFt === undefined) {
        out.standaloneSqFt = item.qty || 0;
      } else if (item.label === 'Chemical Supply' && out.chemicalGallons === undefined) {
        out.chemicalGallons = item.qty || 0;
      }
    });
  }
  const cm = contractMonthsFrom(s);
  if (cm !== undefined) {
    out.contractMonths = cm;
  }
  return out;
}

function transformFoamingDrain(s: any): any {
  const out: any = {notes: s.notes ?? ''};
  out.frequency = resolveFrequencyFromSources([
    s.frequency,
    s.frequency?.frequencyKey,
    s.frequency?.value,
    s.serviceFrequency,
  ]);
  if (typeof s.installFrequency === 'string') {
    out.installFrequency = s.installFrequency;
  } else if (s.installFrequency && typeof s.installFrequency === 'object') {
    const v = s.installFrequency.value || s.installFrequency.frequencyKey;
    if (typeof v === 'string') {
      out.installFrequency = v.toLowerCase();
    }
  }
  copyRawIfDefined(out, s, [
    'location',
    'facilityCondition',
    'standardDrainRate',
    'altBaseCharge',
    'altExtraPerDrain',
    'volumeWeeklyRate',
    'volumeBimonthlyRate',
    'greaseWeeklyRate',
    'greaseInstallRate',
    'greenWeeklyRate',
    'greenInstallRate',
    'plumbingAddonRate',
    'filthyMultiplier',
    'standardDrainCount',
    'installDrainCount',
    'greaseTrapCount',
    'greenDrainCount',
    'plumbingDrainCount',
    'filthyDrainCount',
    'useSmallAltPricingWeekly',
    'useBigAccountTenWeekly',
    'isAllInclusive',
    'chargeGreaseTrapInstall',
    'needsPlumbing',
  ]);
  const cm = contractMonthsFrom(s);
  if (cm !== undefined) {
    out.contractMonths = cm;
  }
  return out;
}

function transformRpmWindows(s: any): any {
  const out: any = {notes: s.notes ?? ''};
  copyRawIfDefined(out, s, [
    'smallWindowRate',
    'mediumWindowRate',
    'largeWindowRate',
    'tripCharge',
    'installMultiplierFirstTime',
    'installMultiplierClean',
    'customInstallationFee',
    'customPerVisitPrice',
    'customMonthlyRecurring',
    'customContractTotal',
    'baseSmall',
    'baseMedium',
    'baseLarge',
    'baseTrip',
    'smallQty',
    'mediumQty',
    'largeQty',
    'isFirstTimeInstall',
    'selectedRateCategory',
    'applyMinimum',
  ]);
  if (Array.isArray(s.windows)) {
    s.windows.forEach((w: any) => {
      if (w.label === 'Small Windows') {
        out.smallQty = w.qty || 0;
      } else if (w.label === 'Medium Windows') {
        out.mediumQty = w.qty || 0;
      } else if (w.label === 'Large Windows') {
        out.largeQty = w.qty || 0;
      }
    });
  }
  const freqField = s.frequency || s.serviceFrequency;
  if (freqField) {
    const k = resolveFrequencyKey(freqField);
    if (k) {
      out.frequency = k;
    }
  }
  if (s.rateCategory) {
    out.selectedRateCategory = (s.rateCategory.value ?? s.rateCategory)?.toString().includes('Green') ? 'greenRate' : 'redRate';
  }
  if (s.installType) {
    out.isFirstTimeInstall = (s.installType.value ?? '').toString().includes('First Time');
  }
  const cm = contractMonthsFrom(s);
  if (cm !== undefined) {
    out.contractMonths = cm;
  }
  return out;
}

function transformGreaseTrap(s: any): any {
  const out: any = {notes: s.notes ?? ''};
  out.frequency = resolveFrequencyFromSources([s.frequency, s.frequency?.value]);
  if (s.service) {
    out.numberOfTraps = s.service.qty ?? 0;
    if (s.service.rate != null) {
      out.perTrapWeeklyRate = s.service.rate;
    }
  }
  copyRawIfDefined(out, s, ['numberOfTraps', 'perTrapWeeklyRate']);
  const cm = contractMonthsFrom(s);
  if (cm !== undefined) {
    out.contractMonths = cm;
  }
  return out;
}

function transformSaniscrub(s: any): any {
  const out: any = {notes: s.notes ?? ''};
  copyRawIfDefined(out, s, [
    'fixtureCount',
    'nonBathroomSqFt',
    'useExactNonBathroomSqft',
    'hasSaniClean',
    'includeInstall',
    'isDirtyInstall',
    'contractMonths',
    'fixtureRateMonthly',
    'fixtureRateBimonthly',
    'fixtureRateQuarterly',
    'minimumMonthly',
    'minimumBimonthly',
    'nonBathroomFirstUnitRate',
    'nonBathroomAdditionalUnitRate',
    'installMultiplierDirty',
    'installMultiplierClean',
    'twoTimesPerMonthDiscount',
  ]);
  out.frequency = resolveFrequencyFromSources([
    s.frequency,
    s.frequencyKey,
    s.frequencyLabel,
    s.frequencyValue,
  ]);
  if (s.location) {
    out.location = (s.location.value ?? s.location)?.toString().includes('Inside') ? 'insideBeltway' : 'outsideBeltway';
  }
  if (s.restroomFixtures && out.fixtureCount === undefined) {
    out.fixtureCount = s.restroomFixtures.qty ?? 0;
  }
  if (s.nonBathroomArea && out.nonBathroomSqFt === undefined) {
    out.nonBathroomSqFt = s.nonBathroomArea.qty ?? 0;
  }

  // The RN SaniscrubForm binds to its own flat keys (qty/nonBathSqFt/rate/isDirty/
  // useExactSqFt/nonBathFirstRate/nonBathAdditionalRate/minimumChargePerVisit).
  // Map the web app's keys onto them so a web-created agreement prefills on mobile.
  const fixtures = s.qty ?? out.fixtureCount ?? s.restroomFixtures?.qty;
  if (fixtures !== undefined) {
    out.qty = Number(fixtures) || 0;
  }
  const nonBath = s.nonBathSqFt ?? out.nonBathroomSqFt ?? s.nonBathroomArea?.qty;
  if (nonBath !== undefined) {
    out.nonBathSqFt = Number(nonBath) || 0;
  }
  const fixtureRate =
    s.rate ??
    (typeof s.restroomFixtures?.rate === 'number' ? s.restroomFixtures.rate : undefined) ??
    out.fixtureRateMonthly;
  if (fixtureRate !== undefined && Number.isFinite(Number(fixtureRate))) {
    out.rate = Number(fixtureRate);
  }
  const minPerVisit = s.minimumChargePerVisit ?? out.minimumMonthly;
  if (minPerVisit !== undefined) {
    out.minimumChargePerVisit = Number(minPerVisit) || 0;
  }
  const isDirty = s.isDirty ?? out.isDirtyInstall;
  if (isDirty !== undefined) {
    out.isDirty = !!isDirty;
  }
  const useExact = s.useExactSqFt ?? out.useExactNonBathroomSqft;
  if (useExact !== undefined) {
    out.useExactSqFt = !!useExact;
  }
  const nbFirst = s.nonBathFirstRate ?? out.nonBathroomFirstUnitRate;
  if (nbFirst !== undefined) {
    out.nonBathFirstRate = Number(nbFirst) || 0;
  }
  const nbAdd = s.nonBathAdditionalRate ?? out.nonBathroomAdditionalUnitRate;
  if (nbAdd !== undefined) {
    out.nonBathAdditionalRate = Number(nbAdd) || 0;
  }

  const cm = contractMonthsFrom(s);
  if (cm !== undefined) {
    out.contractMonths = cm;
  }
  return out;
}

function transformSaniclean(s: any): any {
  const out: any = {notes: s.notes ?? ''};

  if (s.pricingMode) {
    const v = s.pricingMode.value ?? s.pricingMode;
    if (typeof v === 'string') {
      out.pricingMode = v.includes('All Inclusive') ? 'all_inclusive' : 'per_item_charge';
    }
  }
  if (s.location) {
    const v = s.location.value ?? s.location;
    if (typeof v === 'string') {
      out.location = v.includes('Inside') ? 'insideBeltway' : v.includes('Outside') ? 'outsideBeltway' : v;
    }
  }
  if (s.mainServiceFrequency !== undefined) {
    out.mainServiceFrequency = resolveFrequencyKey(s.mainServiceFrequency) ?? s.mainServiceFrequency;
  }
  const facFreq = normalizeStructuredValue(s.facilityComponentsFrequency);
  if (facFreq !== undefined) {
    out.facilityComponentsFrequency = resolveFrequencyKey(facFreq) ?? facFreq;
  }
  if (s.frequency !== undefined) {
    out.frequency = resolveFrequencyKey(s.frequency) ?? out.frequency;
    out.mainServiceFrequency = out.mainServiceFrequency ?? out.frequency;
  }
  copyIfDefined(out, s, [
    'rateTier',
    'allInclusiveWeeklyRatePerFixture',
    'luxuryUpgradePerDispenser',
    'excessStandardSoapRate',
    'excessLuxurySoapRate',
    'paperCreditPerFixture',
    'microfiberMoppingPerBathroom',
    'insideBeltwayRatePerFixture',
    'insideBeltwayMinimum',
    'insideBeltwayTripCharge',
    'insideBeltwayParkingFee',
    'outsideBeltwayRatePerFixture',
    'outsideBeltwayTripCharge',
    'smallFacilityThreshold',
    'smallFacilityMinimum',
    'urinalScreenMonthly',
    'urinalMatMonthly',
    'toiletClipsMonthly',
    'seatCoverDispenserMonthly',
    'sanipodServiceMonthly',
    'warrantyFeePerDispenserPerWeek',
    'addUrinalComponents',
    'urinalScreensQty',
    'urinalMatsQty',
    'addMaleToiletComponents',
    'toiletClipsQty',
    'seatCoverDispensersQty',
    'addFemaleToiletComponents',
    'sanipodsQty',
    'warrantyDispensers',
    'addMicrofiberMopping',
    'microfiberBathrooms',
    'excessSoapGallonsPerWeek',
    'estimatedPaperSpendPerWeek',
    'needsParking',
    'addTripCharge',
    'luxuryUpgradeQty',
  ]);
  if (Array.isArray(s.fixtureBreakdown)) {
    s.fixtureBreakdown.forEach((f: any) => {
      if (f.label === 'Sinks') {
        out.sinks = f.qty || 0;
      } else if (f.label === 'Urinals') {
        out.urinals = f.qty || 0;
      } else if (f.label === 'Male Toilets') {
        out.maleToilets = f.qty || 0;
      } else if (f.label === 'Female Toilets') {
        out.femaleToilets = f.qty || 0;
      }
    });
  }
  copyRawIfDefined(out, s, ['sinks', 'urinals', 'maleToilets', 'femaleToilets', 'soapType']);
  if (s.soapType) {
    const v = normalizeStructuredValue(s.soapType);
    out.soapType = typeof v === 'string' && v.toLowerCase().includes('luxury') ? 'luxury' : 'standard';
  }
  if (s.includedItems !== undefined) {
    out.includedItems = s.includedItems;
  }
  const cm = contractMonthsFrom(s);
  if (cm !== undefined) {
    out.contractMonths = cm;
  }
  return out;
}

const REFRESH_AREA_KEYS = ['dumpster', 'patio', 'walkway', 'foh', 'boh', 'other'];

function transformRefreshPowerScrub(s: any): any {
  const out: any = {notes: s.notes ?? ''};
  copyRawIfDefined(out, s, ['hourlyRate', 'minimumVisit', 'applyMinimum', 'frequency', 'contractMonths']);
  if (out.frequency) {
    out.frequency = resolveFrequencyKey(out.frequency) ?? out.frequency;
  }
  // Saved RN/edit-format keeps each area as a nested object under its key.
  for (const key of REFRESH_AREA_KEYS) {
    if (s[key] && typeof s[key] === 'object') {
      out[key] = {...s[key]};
    }
  }
  const cm = contractMonthsFrom(s);
  if (cm !== undefined) {
    out.contractMonths = cm;
  }
  return out;
}

function transformJanitorial(s: any): any {
  if (s._restoreData) {
    return {
      frequency: s._restoreData.frequency || 'weekly',
      visitsPerWeek: s._restoreData.visitsPerWeek || 1,
      placeType: s._restoreData.placeType || 'office',
      sqFt: s._restoreData.sqFt || 0,
      costPerHour: s._restoreData.costPerHour,
      laborTaxPct: s._restoreData.laborTaxPct,
      grossProfitPct: s._restoreData.grossProfitPct,
      supplies: s._restoreData.supplies,
      contractMonths: s._restoreData.contractMonths || 12,
      notes: s._restoreData.notes || '',
    };
  }
  const out: any = {notes: s.notes ?? ''};
  if (s.frequency) {
    out.frequency = s.frequency.frequencyKey ?? resolveFrequencyKey(s.frequency) ?? 'weekly';
  }
  if (s.visitsPerWeek) {
    out.visitsPerWeek = parseInt(normalizeStructuredValue(s.visitsPerWeek), 10) || 1;
  }
  if (s.placeType) {
    out.placeType = s.placeType.placeTypeKey ?? normalizeStructuredValue(s.placeType);
  }
  if (s.sqFt) {
    out.sqFt = parseInt(normalizeStructuredValue(s.sqFt), 10) || 0;
  }
  const cm = contractMonthsFrom(s);
  if (cm !== undefined) {
    out.contractMonths = cm;
  }
  return out;
}

const TRANSFORMERS: Record<string, (s: any) => any> = {
  sanipod: transformSanipod,
  stripwax: transformStripWax,
  stripWax: transformStripWax,
  carpetclean: transformCarpet,
  carpetCleaning: transformCarpet,
  electrostaticSpray: transformElectrostatic,
  microfiberMopping: transformMicrofiber,
  foamingDrain: transformFoamingDrain,
  rpmWindows: transformRpmWindows,
  greaseTrap: transformGreaseTrap,
  saniscrub: transformSaniscrub,
  saniclean: transformSaniclean,
  refreshPowerScrub: transformRefreshPowerScrub,
  pureJanitorial: transformJanitorial,
  janitorial: transformJanitorial,
};

// Returns the raw service merged with its flat-transformed fields. The transform
// output wins for converted keys; any flat fields the raw object already had
// survive (so RN-saved agreements pass through unharmed).
export function normalizeEditService(serviceId: string, raw: any): any {
  if (!raw || typeof raw !== 'object') {
    return raw;
  }
  const transform = TRANSFORMERS[serviceId];
  if (!transform) {
    return raw;
  }
  try {
    const flat = transform(raw);
    if (!flat) {
      return raw;
    }
    const merged: any = {...raw};
    for (const k of Object.keys(flat)) {
      if (flat[k] !== undefined) {
        merged[k] = flat[k];
      }
    }
    return merged;
  } catch (err) {
    if (__DEV__) {
      console.warn(`[normalizeEditService] failed for ${serviceId}:`, err);
    }
    return raw;
  }
}

export function normalizeEditServices(services: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const id of Object.keys(services)) {
    out[id] = normalizeEditService(id, services[id]);
  }
  return out;
}

export const FREQUENCY_LABEL_BY_KEY = FREQUENCY_LABELS;
