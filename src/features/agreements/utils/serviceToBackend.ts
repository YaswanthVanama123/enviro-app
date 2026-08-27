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
  return {isDisplay: true, orderNo: 1, label: 'Frequency', type: 'text', value: label, frequencyKey: k};
}

const n = (v: any) => (Number.isFinite(Number(v)) ? Number(v) : 0);

const round2 = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

const VISIT_FREQUENCIES = new Set([
  'bimonthly',
  'quarterly',
  'biannual',
  'annual',
  'everyFourWeeks',
]);

function freqKeyOf(data: any): string {
  const f = data.frequency ?? data.mainServiceFrequency ?? data.serviceFrequency;
  if (typeof f === 'string') {
    return f;
  }
  return f?.frequencyKey ?? f?.value ?? 'weekly';
}

function dollar(orderNo: number, label: string, amount: number, extra?: any) {
  return {isDisplay: true, orderNo, label, type: 'dollar', amount: round2(amount), ...extra};
}

function buildTotals(out: any, data: any, perVisitLabel = 'Per Visit Total') {
  const key = freqKeyOf(data);
  const months = n(data.contractMonths) || undefined;
  const contractTotal = n(data.contractTotal);
  const perVisit = n(data.perVisit);
  const monthlyRecurring = n(data.monthlyRecurring);
  const firstMonth = n(
    data.firstMonthPrice ?? data.firstMonthTotal ?? data.firstMonth ?? monthlyRecurring,
  );
  const firstVisit = n(
    data.firstVisit ?? data.firstVisitPrice ?? data.firstVisitTotalRated ?? perVisit,
  );

  const totals: any = {...(out.totals ?? {})};

  if (key === 'oneTime') {
    totals.totalPrice = dollar(30, 'Total Price', contractTotal);
    out.totals = totals;
    return;
  }

  if (VISIT_FREQUENCIES.has(key)) {
    if (key === 'everyFourWeeks') {
      totals.firstVisit = dollar(31, 'First Visit Total', firstVisit);
    }
    totals.recurringVisit = dollar(32, 'Recurring Visit Total', perVisit, {gap: 'normal'});
  } else {
    totals.perVisit = dollar(30, perVisitLabel, perVisit);
    totals.firstMonth = dollar(31, 'First Month Total', firstMonth);
    totals.monthlyRecurring = dollar(32, 'Monthly Recurring', monthlyRecurring, {gap: 'normal'});
  }

  totals.contract = {
    isDisplay: true,
    orderNo: 37,
    label: 'Contract Total',
    type: 'dollar',
    amount: round2(contractTotal),
    ...(months ? {months} : {}),
  };
  out.totals = totals;
}

function sanipod(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);
  out.service = {isDisplay: true, orderNo: 10, label: 'SaniPods', type: 'calc', qty: n(d.podQuantity), rate: n(d.perVisit) / (n(d.podQuantity) || 1), total: n(d.perVisit)};
  if (n(d.extraBagsPerWeek) > 0) {
    out.extraBags = {
      isDisplay: true,
      orderNo: 11,
      label: d.extraBagsRecurring !== false ? 'Extra Bags (Weekly)' : 'Extra Bags (One-time)',
      type: 'calc',
      qty: n(d.extraBagsPerWeek),
      rate: n(d.extraBagPrice),
      total: round2(n(d.extraBagsPerWeek) * n(d.extraBagPrice)),
      recurring: d.extraBagsRecurring !== false,
    };
  }
  if (d.isNewInstall && n(d.installQuantity) > 0) {
    out.installation = {isDisplay: true, orderNo: 12, label: 'Installation', type: 'calc', qty: n(d.installQuantity), rate: n(d.installRatePerPod), total: n(d.installCost)};
  }
  buildTotals(out, d);
  return out;
}

function stripWax(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);
  out.service = {isDisplay: true, orderNo: 10, label: 'Floor Area', type: 'calc', qty: n(d.floorAreaSqFt), rate: n(d.ratePerSqFt), total: n(d.perVisit), unit: 'sq ft'};
  buildTotals(out, d);
  return out;
}

function carpet(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);
  out.service = {isDisplay: true, orderNo: 10, label: 'Floor Area', type: 'calc', qty: n(d.areaSqFt), rate: n(d.firstUnitRate), total: n(d.perVisit), unit: 'sq ft'};
  buildTotals(out, d);
  return out;
}

function electrostatic(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);
  const byRoom = d.pricingMethod !== 'bySqFt';
  out.service = {
    isDisplay: true,
    orderNo: 10,
    label: byRoom ? 'Rooms' : 'Square Feet',
    type: 'calc',
    qty: byRoom ? n(d.roomCount) : n(d.squareFeet),
    rate: byRoom ? n(d.ratePerRoom) : n(d.ratePerThousandSqFt),
    total: n(d.perVisit),
  };
  buildTotals(out, d);
  return out;
}

function greaseTrap(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);
  out.service = {isDisplay: true, orderNo: 10, label: 'Grease Traps', type: 'calc', qty: n(d.numberOfTraps), rate: n(d.perTrapWeeklyRate), total: n(d.perVisit)};
  buildTotals(out, d);
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
      isDisplay: true,
      orderNo: 10,
      label: 'Restroom Fixtures',
      type: 'calc',
      qty: fixtures,
      rate: fixtureRate,
      total: round2(fixtures * fixtureRate),
    };
  }
  if (nonBath > 0) {
    out.nonBathroomArea = {isDisplay: true, orderNo: 11, label: 'Non-Bathroom Area', type: 'calc', qty: nonBath, unit: 'sq ft'};
  }
  buildTotals(out, d);
  return out;
}

function saniclean(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.mainServiceFrequency ?? d.frequency);
  const isAllInclusive = d.pricingMode === 'all_inclusive';
  const isOutside = d.location === 'outsideBeltway';
  const fixtureRate = isAllInclusive
    ? n(d.allInclusiveWeeklyRatePerFixture)
    : isOutside
    ? n(d.outsideBeltwayRatePerFixture)
    : n(d.insideBeltwayRatePerFixture);
  out.pricingMode = {
    isDisplay: true,
    orderNo: 2,
    label: 'Pricing Mode',
    type: 'text',
    value: isAllInclusive ? 'All Inclusive' : 'Per Item Charge',
  };
  out.location = {
    isDisplay: true,
    orderNo: 3,
    label: 'Location',
    type: 'text',
    value: isOutside ? 'Outside Beltway' : 'Inside Beltway',
  };
  out.fixtureBreakdown = [
    {label: 'Sinks', qty: n(d.sinks)},
    {label: 'Urinals', qty: n(d.urinals)},
    {label: 'Male Toilets', qty: n(d.maleToilets)},
    {label: 'Female Toilets', qty: n(d.femaleToilets)},
  ]
    .filter(row => row.qty > 0)
    .map((row, i) => ({
      ...row,
      isDisplay: true,
      orderNo: 10 + i,
      type: 'calc',
      rate: fixtureRate,
      total: round2(row.qty * fixtureRate),
    }));

  // Facility components / add-ons reach the PDF as pdfExtras rows, matching the
  // web app's labels and ordering. Quantity alone decides whether a row prints —
  // a $0 rate is a comped item, not an empty one.
  const luxuryQty = Number.isFinite(Number(d.luxuryUpgradeQty))
    ? n(d.luxuryUpgradeQty)
    : n(d.sinks);
  const extraRows: Array<[string, number, number, number]> = [
    ['Urinal Screens', n(d.addUrinalComponents ? d.urinalScreensQty : 0), n(d.urinalScreenMonthly), 13],
    ['Urinal Mats', n(d.addUrinalComponents ? d.urinalMatsQty : 0), n(d.urinalMatMonthly), 14],
    ['Toilet Clips', n(d.addMaleToiletComponents ? d.toiletClipsQty : 0), n(d.toiletClipsMonthly), 15],
    ['Seat Cover Dispensers', n(d.addMaleToiletComponents ? d.seatCoverDispensersQty : 0), n(d.seatCoverDispenserMonthly), 16],
    ['SaniPods', n(d.addFemaleToiletComponents ? d.sanipodsQty : 0), n(d.sanipodServiceMonthly), 17],
    ['Warranty', n(d.warrantyDispensers), n(d.warrantyFeePerDispenserPerWeek), 18],
    ['Microfiber Mopping', n(d.addMicrofiberMopping ? d.microfiberBathrooms : 0), n(d.microfiberMoppingPerBathroom), 19],
    ['Luxury Upgrade', d.soapType === 'luxury' ? luxuryQty : 0, n(d.luxuryUpgradePerDispenser), 21],
  ];

  const money = (v: number) => `$${round2(v).toFixed(2)}`;
  const extras = extraRows
    .filter(([, qty]) => qty > 0)
    .map(([label, qty, rate, orderNo]) => ({
      label,
      type: 'atCharge',
      v1: qty,
      v2: `${money(rate)}/mo`,
      v3: money(qty * rate),
      isDisplay: true,
      orderNo,
    }));

  if (extras.length > 0) {
    out.pdfExtras = [...(Array.isArray(d.pdfExtras) ? d.pdfExtras : []), ...extras];
  }

  buildTotals(out, d, 'Weekly Service Total');
  return out;
}

function microfiber(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);
  const bathroomRate = n(d.customIncludedBathroomRate ?? d.includedBathroomRate);
  const hugeRate = n(d.customHugeBathroomRatePerSqFt ?? d.hugeBathroomRatePerSqFt);
  const extraRate = n(d.customExtraAreaRatePerUnit ?? d.extraAreaRatePerUnit);
  const standaloneRate = n(d.customStandaloneRatePerUnit ?? d.standaloneRatePerUnit);
  const chemicalRate = n(d.customDailyChemicalPerGallon ?? d.dailyChemicalPerGallon);
  out.serviceBreakdown = [
    {label: 'Bathrooms', qty: n(d.bathroomCount), rate: bathroomRate},
    {label: 'Huge Bathrooms', qty: n(d.hugeBathroomSqFt), rate: hugeRate, unit: 'sq ft'},
    {label: 'Extra Area', qty: n(d.extraAreaSqFt), rate: extraRate, unit: 'sq ft'},
    {label: 'Standalone Service', qty: n(d.standaloneSqFt), rate: standaloneRate, unit: 'sq ft'},
    {label: 'Chemical Supply', qty: n(d.chemicalGallons), rate: chemicalRate, unit: 'gallons'},
  ]
    .filter(row => row.qty > 0)
    .map((row, i) => ({
      ...row,
      isDisplay: true,
      orderNo: 10 + i,
      type: 'calc',
      total: round2(row.qty * row.rate),
    }));
  buildTotals(out, d);
  return out;
}

function rpmWindows(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);
  out.windows = [
    {label: 'Small Windows', qty: n(d.smallQty), rate: n(d.smallWindowRate)},
    {label: 'Medium Windows', qty: n(d.mediumQty), rate: n(d.mediumWindowRate)},
    {label: 'Large Windows', qty: n(d.largeQty), rate: n(d.largeWindowRate)},
  ]
    .filter(row => row.qty > 0)
    .map((row, i) => ({
      ...row,
      isDisplay: true,
      orderNo: 10 + i,
      type: 'calc',
      total: round2(row.qty * row.rate),
    }));
  if (d.selectedRateCategory) {
    out.rateCategory = {
      isDisplay: true,
      orderNo: 2,
      label: 'Rate Category',
      type: 'text',
      value: d.selectedRateCategory === 'greenRate' ? 'Green Rate' : 'Red Rate',
    };
  }
  buildTotals(out, d);
  return out;
}

function foamingDrain(d: any): any {
  const out: any = {...d};
  out.frequency = freqObj(d.frequency);
  out.drainBreakdown = [
    {label: 'Standard Drains', qty: n(d.standardDrainCount), rate: n(d.standardDrainRate)},
    {label: 'Grease Trap Drains', qty: n(d.greaseTrapCount), rate: n(d.greaseWeeklyRate)},
    {label: 'Green Drains', qty: n(d.greenDrainCount), rate: n(d.greenWeeklyRate)},
  ]
    .filter(row => row.qty > 0)
    .map((row, i) => ({
      ...row,
      isDisplay: true,
      orderNo: 10 + i,
      total: round2(row.qty * row.rate),
    }));
  if (n(d.installation) > 0) {
    out.installationFee = {
      isDisplay: true,
      orderNo: 20,
      label: 'Installation Total',
      type: 'dollar',
      amount: round2(n(d.installation)),
    };
  }
  buildTotals(out, d);
  return out;
}

function refreshPowerScrub(d: any): any {
  // Already stored with flat area objects + hourlyRate/minimumVisit/frequency.
  const out: any = {...d};
  const months = n(d.contractMonths) || undefined;
  if (months) {
    out.totals = {...(out.totals ?? {}), contract: {...(out.totals?.contract ?? {}), months}};
  }
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
