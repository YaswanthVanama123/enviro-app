// Service flat-form-state → backend "structured" shape transformers.
// The inverse of serviceDataTransformers.ts. The web app reads each service's
// quantities from structured containers (service:{qty}, frequency:{frequencyKey},
// windows[], fixtureBreakdown[], …). The RN forms emit flat fields, so on SAVE we
// wrap them into the same structure the web app produces — while ALSO keeping the
// flat fields — so an agreement saved on mobile re-edits on mobile AND opens on web.

import {FREQUENCY_LABELS, type FrequencyKey} from '../../../shared/constants/frequency';

function freqObj(key: any) {
  const k = typeof key === 'string' ? key : key?.frequencyKey ?? key?.value ?? 'weekly';
  const label = FREQUENCY_LABELS[k as FrequencyKey] ?? String(k);
  return {isDisplay: true, label: 'Frequency', type: 'text', value: label, frequencyKey: k};
}

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

function withContractMonths(out: any, data: any) {
  const months = n(data.contractMonths) || undefined;
  if (months) {
    out.totals = {...(out.totals ?? {}), contract: {...(out.totals?.contract ?? {}), months}};
  }
}

function sanipod(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);
  out.service = {label: 'SaniPods', type: 'calc', qty: n(d.podQuantity), rate: n(d.perVisit) / (n(d.podQuantity) || 1), total: n(d.perVisit)};
  if (n(d.extraBagsPerWeek) > 0) {
    out.extraBags = {qty: n(d.extraBagsPerWeek), rate: n(d.extraBagPrice), recurring: d.extraBagsRecurring !== false};
  }
  if (d.isNewInstall && n(d.installQuantity) > 0) {
    out.installation = {qty: n(d.installQuantity), rate: n(d.installRatePerPod), total: n(d.installCost)};
  }
  withContractMonths(out, d);
  return out;
}

function stripWax(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);
  out.service = {label: 'Floor Area', type: 'calc', qty: n(d.floorAreaSqFt), rate: n(d.ratePerSqFt), total: n(d.perVisit), unit: 'sq ft'};
  withContractMonths(out, d);
  return out;
}

function carpet(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);
  out.service = {label: 'Floor Area', type: 'calc', qty: n(d.areaSqFt), rate: n(d.firstUnitRate), total: n(d.perVisit), unit: 'sq ft'};
  withContractMonths(out, d);
  return out;
}

function electrostatic(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);
  const byRoom = d.pricingMethod !== 'bySqFt';
  out.service = {
    label: byRoom ? 'Rooms' : 'Square Feet',
    type: 'calc',
    qty: byRoom ? n(d.roomCount) : n(d.squareFeet),
    rate: byRoom ? n(d.ratePerRoom) : n(d.ratePerThousandSqFt),
    total: n(d.perVisit),
  };
  withContractMonths(out, d);
  return out;
}

function greaseTrap(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);
  out.service = {label: 'Grease Traps', type: 'calc', qty: n(d.numberOfTraps), rate: n(d.perTrapWeeklyRate), total: n(d.perVisit)};
  withContractMonths(out, d);
  return out;
}

function saniscrub(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);

  // The RN form uses qty/nonBathSqFt/rate/isDirty/useExactSqFt; the web app reads
  // fixtureCount/nonBathroomSqFt + structured restroomFixtures/nonBathroomArea.
  // Emit BOTH so an agreement round-trips on mobile AND opens correctly on web.
  const fixtures = n(d.fixtureCount ?? d.qty);
  const nonBath = n(d.nonBathroomSqFt ?? d.nonBathSqFt);
  const fixtureRate = n(d.rate ?? d.fixtureRateMonthly);

  out.fixtureCount = fixtures;
  out.nonBathroomSqFt = nonBath;
  out.isDirtyInstall = !!(d.isDirtyInstall ?? d.isDirty);
  out.useExactNonBathroomSqft = !!(d.useExactNonBathroomSqft ?? d.useExactSqFt);
  out.nonBathroomFirstUnitRate = n(d.nonBathroomFirstUnitRate ?? d.nonBathFirstRate);
  out.nonBathroomAdditionalUnitRate = n(d.nonBathroomAdditionalUnitRate ?? d.nonBathAdditionalRate);

  if (fixtures > 0) {
    out.restroomFixtures = {
      label: 'Restroom Fixtures',
      type: 'calc',
      qty: fixtures,
      rate: fixtureRate,
      total: fixtures * fixtureRate,
    };
  }
  if (nonBath > 0) {
    out.nonBathroomArea = {label: 'Non-Bathroom Area', type: 'calc', qty: nonBath, unit: 'sq ft'};
  }
  withContractMonths(out, d);
  return out;
}

function saniclean(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.mainServiceFrequency ?? d.frequency);
  out.fixtureBreakdown = [
    {label: 'Sinks', qty: n(d.sinks)},
    {label: 'Urinals', qty: n(d.urinals)},
    {label: 'Male Toilets', qty: n(d.maleToilets)},
    {label: 'Female Toilets', qty: n(d.femaleToilets)},
  ];
  withContractMonths(out, d);
  return out;
}

function microfiber(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);
  out.serviceBreakdown = [
    {label: 'Bathrooms', qty: n(d.bathroomCount)},
    {label: 'Huge Bathrooms', qty: n(d.hugeBathroomSqFt)},
    {label: 'Extra Area', qty: n(d.extraAreaSqFt)},
    {label: 'Standalone Service', qty: n(d.standaloneSqFt)},
    {label: 'Chemical Supply', qty: n(d.chemicalGallons)},
  ];
  withContractMonths(out, d);
  return out;
}

function rpmWindows(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);
  out.windows = [
    {label: 'Small Windows', qty: n(d.smallQty), rate: n(d.smallWindowRate)},
    {label: 'Medium Windows', qty: n(d.mediumQty), rate: n(d.mediumWindowRate)},
    {label: 'Large Windows', qty: n(d.largeQty), rate: n(d.largeWindowRate)},
  ];
  if (d.selectedRateCategory) {
    out.rateCategory = {value: d.selectedRateCategory === 'greenRate' ? 'Green Rate' : 'Red Rate'};
  }
  withContractMonths(out, d);
  return out;
}

function foamingDrain(d: any): any {
  // Web reads foaming drain entirely from flat fields — just add a frequency object.
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);
  withContractMonths(out, d);
  return out;
}

function refreshPowerScrub(d: any): any {
  // Already stored with flat area objects + hourlyRate/minimumVisit/frequency.
  const out: any = {...d};
  withContractMonths(out, d);
  return out;
}

function janitorial(d: any): any {
  // Janitorial round-trips via _restoreData (already emitted by the form).
  return {...d};
}

const FORWARD: Record<string, (d: any) => any> = {
  sanipod,
  stripwax: stripWax,
  stripWax,
  carpetclean: carpet,
  carpetCleaning: carpet,
  electrostaticSpray: electrostatic,
  greaseTrap,
  saniscrub,
  saniclean,
  microfiberMopping: microfiber,
  rpmWindows,
  foamingDrain,
  refreshPowerScrub,
  pureJanitorial: janitorial,
  janitorial,
};

export function serviceToBackendFormat(serviceId: string, data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }
  const fwd = FORWARD[serviceId];
  if (!fwd) {
    return data;
  }
  try {
    return fwd(data);
  } catch {
    return data;
  }
}
