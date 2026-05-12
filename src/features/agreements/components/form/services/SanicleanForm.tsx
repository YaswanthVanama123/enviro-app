import React, {useCallback, useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  ServiceCard, TotalsBlock,
  FREQ_OPTIONS, DropdownRow, FormDivider, CalcRow, NumberRow, ToggleRow,
} from './ServiceBase';
import {Colors} from '../../../../../theme/colors';
import {Spacing, Radius} from '../../../../../theme/spacing';
import {FontSize} from '../../../../../theme/typography';

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
}

const DEFAULT_INCLUDED_ITEMS = [
  'SaniClean service',
  'Electrostatic spray (free)',
  'Air freshener service (free)',
  'Soap service (free)',
];

// ── Location options ──
const LOCATION_OPTIONS = [
  {label: 'Inside Beltway', value: 'insideBeltway'},
  {label: 'Outside Beltway', value: 'outsideBeltway'},
];

// ── Pricing mode options ──
const PRICING_MODE_OPTIONS = [
  {label: 'Per Item Charge', value: 'per_item_charge'},
  {label: 'All Inclusive', value: 'all_inclusive'},
];

// ── Soap type options ──
const SOAP_OPTIONS = [
  {label: 'Standard', value: 'standard'},
  {label: 'Luxury', value: 'luxury'},
];

// ── Safe number coercion (backend may return strings or "included") ──
function num(value: any, fallback: number): number {
  if (typeof value === 'number' && isFinite(value)) {return value;}
  if (typeof value === 'string' && value !== 'included') {
    const n = parseFloat(value);
    if (isFinite(n)) {return n;}
  }
  return fallback;
}

// ── Frequency multiplier (matches webapp exactly) ──
function getFreqMult(frequency: string): number {
  const map: Record<string, number> = {
    weekly: 4.33, biweekly: 2.165, twicePerMonth: 2.0, monthly: 1.0,
    everyFourWeeks: 1.0833, bimonthly: 0.5, quarterly: 0.33,
    biannual: 0.17, annual: 0.083,
  };
  return map[frequency] ?? 4.33;
}

// ── Visits in contract (for per-visit frequencies) ──
function calculateVisitsInContract(frequency: string, months: number): number {
  if (frequency === 'oneTime') {return 1;}
  const visitsPerYearMap: Record<string, number> = {
    weekly: 52, biweekly: 26, twicePerMonth: 24, monthly: 12,
    everyFourWeeks: 13, bimonthly: 6, quarterly: 4, biannual: 2, annual: 1,
  };
  const visitsPerYear = visitsPerYearMap[frequency] ?? 12;
  return Math.round((visitsPerYear * months) / 12);
}

// ── Calculation mode (monthly vs per-visit) ──
function getCalculationMode(frequency: string): 'monthly' | 'perVisit' {
  if (['weekly', 'biweekly', 'twicePerMonth', 'monthly', 'everyFourWeeks'].includes(frequency)) {
    return 'monthly';
  }
  return 'perVisit';
}

// ── Dual frequency calculation (matches webapp calculateDualFrequency) ──
function calculateDualFrequency(
  mainFreq: string, facilityFreq: string,
  mainServiceBase: number, facilityComponentsBase: number, months: number,
) {
  const mode = getCalculationMode(mainFreq);

  const facilityMultiplier = mainFreq === 'oneTime' ? 1 : getFreqMult(facilityFreq);
  const facilityComponentsMonthly = facilityComponentsBase * facilityMultiplier;
  const facilityContractTotal = mainFreq === 'oneTime'
    ? facilityComponentsMonthly
    : facilityComponentsMonthly * months;

  if (mode === 'monthly') {
    const mainMultiplier = getFreqMult(mainFreq);
    const mainServiceMonthly = mainServiceBase * mainMultiplier;
    const monthlyTotal = mainServiceMonthly + facilityComponentsMonthly;

    let contractTotal: number;
    if (mainFreq === 'everyFourWeeks') {
      const totalVisits = Math.round(months * 1.0833);
      contractTotal = (mainServiceBase * totalVisits) + (facilityComponentsMonthly * totalVisits);
    } else {
      contractTotal = (mainServiceMonthly * months) + facilityContractTotal;
    }

    return {
      mode, mainServiceMonthly, facilityComponentsMonthly, monthlyTotal, contractTotal,
      perVisit: mainServiceBase,
    };
  } else {
    const mainServicePerVisit = mainServiceBase;
    const visitsInContract = calculateVisitsInContract(mainFreq, months);
    const mainServiceContractTotal = mainServicePerVisit * visitsInContract;
    const contractTotal = mainServiceContractTotal + facilityContractTotal;

    return {
      mode, mainServiceMonthly: 0, facilityComponentsMonthly,
      monthlyTotal: facilityComponentsMonthly, contractTotal,
      perVisit: mainServicePerVisit, visitsInContract,
    };
  }
}

// ── Included Items Editor ──
function IncludedItemsEditor({
  items, isCustomized, onChange, onReset,
}: {
  items: string[];
  isCustomized: boolean;
  onChange: (items: string[]) => void;
  onReset: () => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newText, setNewText] = useState('');

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(items[index]);
    setAddingNew(false);
  };

  const saveEdit = () => {
    if (editingIndex === null) {return;}
    const trimmed = editingText.trim();
    if (!trimmed) {return;}
    const next = [...items];
    next[editingIndex] = trimmed;
    onChange(next);
    setEditingIndex(null);
    setEditingText('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    if (editingIndex === index) {setEditingIndex(null); setEditingText('');}
  };

  const saveNew = () => {
    const trimmed = newText.trim();
    if (!trimmed) {setAddingNew(false); setNewText(''); return;}
    onChange([...items, trimmed]);
    setNewText('');
    setAddingNew(false);
  };

  const cancelNew = () => {setAddingNew(false); setNewText('');};

  return (
    <View style={inc.container}>
      <View style={inc.header}>
        <Ionicons name="checkmark-circle-outline" size={14} color={Colors.primary} />
        <Text style={inc.headerText}>WHAT&apos;S INCLUDED</Text>
        {isCustomized && (
          <TouchableOpacity onPress={onReset} style={inc.resetBtn}>
            <Text style={inc.resetText}>Reset to defaults</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.map((item, index) => (
        <View key={index} style={inc.itemRow}>
          {editingIndex === index ? (
            <View style={inc.editRow}>
              <TextInput
                style={inc.editInput}
                value={editingText}
                onChangeText={setEditingText}
                onSubmitEditing={saveEdit}
                autoFocus
                returnKeyType="done"
                blurOnSubmit={false}
              />
              <TouchableOpacity style={inc.iconBtn} onPress={saveEdit}>
                <Ionicons name="checkmark" size={16} color="#16a34a" />
              </TouchableOpacity>
              <TouchableOpacity style={inc.iconBtn} onPress={cancelEdit}>
                <Ionicons name="close" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={inc.bullet}>•</Text>
              <Text style={inc.itemText} numberOfLines={2}>{item}</Text>
              <TouchableOpacity style={inc.iconBtn} onPress={() => startEdit(index)}>
                <Ionicons name="pencil-outline" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={inc.iconBtn} onPress={() => removeItem(index)}>
                <Ionicons name="trash-outline" size={14} color="#dc2626" />
              </TouchableOpacity>
            </>
          )}
        </View>
      ))}

      {addingNew ? (
        <View style={inc.editRow}>
          <TextInput
            style={inc.editInput}
            value={newText}
            onChangeText={setNewText}
            onSubmitEditing={saveNew}
            placeholder="New item…"
            placeholderTextColor={Colors.textMuted}
            autoFocus
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <TouchableOpacity style={inc.iconBtn} onPress={saveNew}>
            <Ionicons name="checkmark" size={16} color="#16a34a" />
          </TouchableOpacity>
          <TouchableOpacity style={inc.iconBtn} onPress={cancelNew}>
            <Ionicons name="close" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={inc.addBtn} onPress={() => setAddingNew(true)}>
          <Ionicons name="add" size={14} color={Colors.primary} />
          <Text style={inc.addBtnText}>Add item</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════
// MAIN FORM
// ══════════════════════════════════════════════════════════════════
export function SanicleanForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  // ── Core Fixture Fields ──
  const pricingMode           = data?.pricingMode             ?? 'per_item_charge';
  const isAllInclusive        = pricingMode === 'all_inclusive';
  const freq                  = data?.mainServiceFrequency ?? data?.frequency ?? 'weekly';
  const sinks                 = data?.sinks                 ?? 0;
  const urinals               = data?.urinals               ?? 0;
  const maleToilets           = data?.maleToilets           ?? 0;
  const femaleToilets         = data?.femaleToilets         ?? 0;
  const fixtureCount          = sinks + urinals + maleToilets + femaleToilets;

  // ── Location & Parking ──
  const location              = data?.location              ?? 'insideBeltway';
  const needsParking          = data?.needsParking          ?? false;
  const isInsideBeltway       = location === 'insideBeltway';

  // ── Fixture Rates (from config or data override) ──
  const cfgInside  = cfg.standardALaCartePricing?.insideBeltway ?? cfg.geographicPricing?.insideBeltway ?? {};
  const cfgOutside = cfg.standardALaCartePricing?.outsideBeltway ?? cfg.geographicPricing?.outsideBeltway ?? {};
  const insideBeltwayRatePerFixture  = num(data?.insideBeltwayRatePerFixture ?? cfgInside.pricePerFixture ?? cfgInside.ratePerFixture, 7);
  const insideBeltwayMinimum         = num(data?.insideBeltwayMinimum ?? cfgInside.minimumPrice, 40);
  const insideBeltwayTripCharge      = num(data?.insideBeltwayTripCharge ?? cfgInside.tripCharge, 8);
  const insideBeltwayParkingFee      = num(data?.insideBeltwayParkingFee ?? cfgInside.parkingFeeAddOn, 7);
  const outsideBeltwayRatePerFixture = num(data?.outsideBeltwayRatePerFixture ?? cfgOutside.pricePerFixture ?? cfgOutside.ratePerFixture, 6);
  const outsideBeltwayTripCharge     = num(data?.outsideBeltwayTripCharge ?? cfgOutside.tripCharge, 8);

  const fixtureRate = isInsideBeltway ? insideBeltwayRatePerFixture : outsideBeltwayRatePerFixture;

  // ── All-Inclusive Rate ──
  const allInclusiveWeeklyRatePerFixture = num(data?.allInclusiveWeeklyRatePerFixture ?? cfg.allInclusivePricing?.pricePerFixture, 20);

  // ── Small Facility / Minimum ──
  const smallFacilityThreshold = num(data?.smallFacilityThreshold ?? cfg.smallBathroomMinimums?.minimumFixturesThreshold, 5);
  const smallFacilityMinimum   = num(data?.smallFacilityMinimum ?? cfg.smallBathroomMinimums?.minimumPriceUnderThreshold, 50);
  const applyMinimum           = data?.applyMinimum !== false;
  const isSmallFacility        = fixtureCount <= smallFacilityThreshold;

  // ── Trip Charge ──
  const addTripCharge = data?.addTripCharge ?? false;

  // ── Soap ──
  const soapType                    = data?.soapType                    ?? 'standard';
  const luxuryUpgradePerDispenser   = num(data?.luxuryUpgradePerDispenser ?? cfg.soapUpgrades?.standardToLuxuryPerDispenserPerWeek, 5);
  const excessSoapGallonsPerWeek    = num(data?.excessSoapGallonsPerWeek, 0);
  const excessStandardSoapRate      = num(data?.excessStandardSoapRate ?? cfg.soapUpgrades?.excessUsageCharges?.standardSoapPerGallon, 13);
  const excessLuxurySoapRate        = num(data?.excessLuxurySoapRate ?? cfg.soapUpgrades?.excessUsageCharges?.luxurySoapPerGallon, 30);

  // ── Microfiber Mopping ──
  const addMicrofiberMopping        = data?.addMicrofiberMopping        ?? false;
  const microfiberBathrooms         = num(data?.microfiberBathrooms, 0);
  const microfiberMoppingPerBathroom = num(data?.microfiberMoppingPerBathroom ?? cfg.microfiberMoppingIncludedWithSaniClean?.pricePerBathroom, 10);

  // ── Warranty ──
  const warrantyDispensers          = num(data?.warrantyDispensers, 0);
  const warrantyFeePerDispenserPerWeek = num(data?.warrantyFeePerDispenserPerWeek ?? cfg.warrantyFees?.soapDispenserWarrantyFeePerWeek, 1);

  // ── Paper Overage ──
  const estimatedPaperSpendPerWeek  = num(data?.estimatedPaperSpendPerWeek, 0);
  const paperCreditPerFixture       = num(data?.paperCreditPerFixture ?? cfg.paperCredit?.creditPerFixturePerWeek, 5);

  // ── Facility Components ──
  const facilityComponentsFrequency = data?.facilityComponentsFrequency ?? freq;
  const addUrinalComponents         = data?.addUrinalComponents         ?? false;
  const addMaleToiletComponents     = data?.addMaleToiletComponents     ?? false;
  const addFemaleToiletComponents   = data?.addFemaleToiletComponents   ?? false;

  const cfgMonthly = cfg.monthlyAddOnSupplyPricing ?? {};

  // Resolve urinalMat and toiletClip first (they are plain numbers)
  const urinalMatMonthly          = num(data?.urinalMatMonthly ?? cfgMonthly.urinalMatMonthlyPrice, 4);
  const toiletClipsMonthly        = num(data?.toiletClipsMonthly ?? cfgMonthly.toiletClipMonthlyPrice, 1);

  // "included" resolution: when config says "included", use the sibling rate (matches webapp logic)
  const resolveScreenPrice = (): number => {
    if (data?.urinalScreenMonthly != null) return num(data.urinalScreenMonthly, urinalMatMonthly);
    const raw = cfgMonthly.urinalScreenMonthlyPrice;
    if (typeof raw === 'number') return raw;
    if (raw === 'included') return urinalMatMonthly;
    return num(raw, urinalMatMonthly);
  };
  const resolveSeatCoverPrice = (): number => {
    if (data?.seatCoverDispenserMonthly != null) return num(data.seatCoverDispenserMonthly, toiletClipsMonthly);
    const raw = cfgMonthly.toiletSeatCoverDispenserMonthlyPrice;
    if (typeof raw === 'number') return raw;
    if (raw === 'included') return toiletClipsMonthly;
    return num(raw, toiletClipsMonthly);
  };

  const urinalScreensQty          = addUrinalComponents ? (data?.urinalScreensQty ?? 0) : 0;
  const urinalScreenMonthly       = resolveScreenPrice();
  const urinalMatsQty             = addUrinalComponents ? (data?.urinalMatsQty ?? 0) : 0;
  const toiletClipsQty            = addMaleToiletComponents ? (data?.toiletClipsQty ?? 0) : 0;
  const seatCoverDispensersQty    = addMaleToiletComponents ? (data?.seatCoverDispensersQty ?? 0) : 0;
  const seatCoverDispenserMonthly = resolveSeatCoverPrice();
  const sanipodsQty               = addFemaleToiletComponents ? (data?.sanipodsQty ?? 0) : 0;
  const sanipodServiceMonthly     = num(data?.sanipodServiceMonthly ?? cfgMonthly.sanipodMonthlyPricePerPod, 4);

  // ── Included Items ──
  const includedItems: string[] = data?.includedItems ?? DEFAULT_INCLUDED_ITEMS;
  const isCustomized: boolean   = Array.isArray(data?.includedItems);

  // ══════════════════════════════════════════════════════════════
  // CALCULATION (supports both per_item_charge and all_inclusive)
  // ══════════════════════════════════════════════════════════════

  // 4. Soap upgrade (shared between modes)
  const luxuryUpgradeQty = sinks; // soap dispensers = sinks
  const soapUpgrade = soapType === 'luxury' ? luxuryUpgradeQty * luxuryUpgradePerDispenser : 0;

  // 5. Excess soap (shared)
  const excessSoap = excessSoapGallonsPerWeek > 0
    ? excessSoapGallonsPerWeek * (soapType === 'luxury' ? excessLuxurySoapRate : excessStandardSoapRate)
    : 0;

  // 8. Paper overage (shared)
  const paperCredit = fixtureCount * paperCreditPerFixture;
  const paperOverage = Math.max(0, estimatedPaperSpendPerWeek - paperCredit);

  let baseService: number;
  let tripCharge: number;
  let facilityComponentsCalc: number;
  let microfiberMopping: number;
  let warrantyFees: number;
  let mainServiceTotal: number;

  if (isAllInclusive) {
    // All-inclusive: single rate per fixture, no trip/warranty/facility/microfiber
    baseService = fixtureCount * allInclusiveWeeklyRatePerFixture;
    tripCharge = 0;
    facilityComponentsCalc = 0;
    microfiberMopping = 0;
    warrantyFees = 0;
    mainServiceTotal = baseService + soapUpgrade + excessSoap + paperOverage;
  } else {
    // Per-item charge
    // 1. Base service
    let baseServiceCalc = fixtureCount * fixtureRate;
    const regionMinimum = isInsideBeltway ? insideBeltwayMinimum : 0;

    if (isSmallFacility) {
      baseServiceCalc = applyMinimum ? Math.max(baseServiceCalc, smallFacilityMinimum) : baseServiceCalc;
    } else {
      baseServiceCalc = Math.max(baseServiceCalc, regionMinimum);
    }
    baseService = baseServiceCalc;

    // 2. Trip charge
    let tripChargeCalc = 0;
    if (!isSmallFacility && addTripCharge) {
      tripChargeCalc = isInsideBeltway ? insideBeltwayTripCharge : outsideBeltwayTripCharge;
      if (isInsideBeltway && needsParking) {
        tripChargeCalc += insideBeltwayParkingFee;
      }
    }
    tripCharge = tripChargeCalc;

    // 3. Facility components (base — before frequency multiplier)
    facilityComponentsCalc = 0;
    if (addUrinalComponents) {
      facilityComponentsCalc += urinalScreensQty * urinalScreenMonthly + urinalMatsQty * urinalMatMonthly;
    }
    if (addMaleToiletComponents) {
      facilityComponentsCalc += toiletClipsQty * toiletClipsMonthly + seatCoverDispensersQty * seatCoverDispenserMonthly;
    }
    if (addFemaleToiletComponents) {
      facilityComponentsCalc += sanipodsQty * sanipodServiceMonthly;
    }

    // 6. Microfiber mopping
    microfiberMopping = addMicrofiberMopping ? microfiberBathrooms * microfiberMoppingPerBathroom : 0;

    // 7. Warranty fees
    warrantyFees = warrantyDispensers > 0 ? warrantyDispensers * warrantyFeePerDispenserPerWeek : 0;

    // 9. Main service total (per-visit base before frequency)
    mainServiceTotal = baseService + tripCharge + soapUpgrade + excessSoap + microfiberMopping + warrantyFees + paperOverage;
  }

  // 10. Dual frequency calculation
  const dualResult = calculateDualFrequency(
    freq, facilityComponentsFrequency,
    mainServiceTotal, facilityComponentsCalc,
    contractMonths,
  );

  const mode = getCalculationMode(freq);
  const weeklyTotal = mode === 'monthly' ? mainServiceTotal : dualResult.perVisit;
  const monthlyTotal = dualResult.monthlyTotal;
  const contractTotal = dualResult.contractTotal;
  const facilityComponentsMonthly = dualResult.facilityComponentsMonthly;

  // ── Greenline: baseline with admin config rates ──
  let originalContractTotal: number;
  if (isAllInclusive) {
    const origAllIncRate = num(cfg.allInclusivePricing?.pricePerFixture, 20);
    const origMainServiceAI = fixtureCount * origAllIncRate + soapUpgrade + excessSoap + paperOverage;
    const origDualAI = calculateDualFrequency(freq, facilityComponentsFrequency, origMainServiceAI, 0, contractMonths);
    originalContractTotal = origDualAI.contractTotal;
  } else {
    const origFixtureRate = isInsideBeltway
      ? (cfgInside.pricePerFixture ?? cfgInside.ratePerFixture ?? 7)
      : (cfgOutside.pricePerFixture ?? cfgOutside.ratePerFixture ?? 6);
    let origBase = fixtureCount * origFixtureRate;
    const origRegionMin = isInsideBeltway ? (cfgInside.minimumPrice ?? 40) : 0;
    const origSmallMin = cfg.smallBathroomMinimums?.minimumPriceUnderThreshold ?? 50;
    if (isSmallFacility) {
      origBase = applyMinimum ? Math.max(origBase, origSmallMin) : origBase;
    } else {
      origBase = Math.max(origBase, origRegionMin);
    }
    const origMainService = origBase + tripCharge + soapUpgrade + excessSoap + microfiberMopping + warrantyFees + paperOverage;
    const origDual = calculateDualFrequency(freq, facilityComponentsFrequency, origMainService, facilityComponentsCalc, contractMonths);
    originalContractTotal = origDual.contractTotal;
  }
  const isGreenline = contractTotal > originalContractTotal * 1.30;

  // ── Minimum charge display ──
  const minimumChargePerWeek = isSmallFacility ? smallFacilityMinimum : (isInsideBeltway ? insideBeltwayMinimum : 0);

  // ── Update callback ──
  const update = useCallback((fields: Record<string, any>) => {
    // Recompute everything with new field values
    const next = {...data, ...fields};
    const nPricingMode = next.pricingMode ?? pricingMode;
    const nIsAllInclusive = nPricingMode === 'all_inclusive';
    const nFreq = next.mainServiceFrequency ?? next.frequency ?? freq;
    const nSinks = next.sinks ?? sinks;
    const nUrinals = next.urinals ?? urinals;
    const nMale = next.maleToilets ?? maleToilets;
    const nFemale = next.femaleToilets ?? femaleToilets;
    const nFixtures = nSinks + nUrinals + nMale + nFemale;
    const nLoc = next.location ?? location;
    const nInsideBeltway = nLoc === 'insideBeltway';
    const nFixtureRate = nInsideBeltway
      ? (next.insideBeltwayRatePerFixture ?? insideBeltwayRatePerFixture)
      : (next.outsideBeltwayRatePerFixture ?? outsideBeltwayRatePerFixture);
    const nSmallThreshold = next.smallFacilityThreshold ?? smallFacilityThreshold;
    const nSmallMin = next.smallFacilityMinimum ?? smallFacilityMinimum;
    const nApplyMin = (next.applyMinimum !== undefined ? next.applyMinimum : data?.applyMinimum) !== false;
    const nIsSmall = nFixtures <= nSmallThreshold;
    const nRegionMin = nInsideBeltway ? (next.insideBeltwayMinimum ?? insideBeltwayMinimum) : 0;

    const nSoapType = next.soapType ?? soapType;
    const nLuxQty = nSinks;
    const nSoap = nSoapType === 'luxury' ? nLuxQty * (next.luxuryUpgradePerDispenser ?? luxuryUpgradePerDispenser) : 0;
    const nExcessGal = next.excessSoapGallonsPerWeek ?? excessSoapGallonsPerWeek;
    const nExcess = nExcessGal > 0 ? nExcessGal * (nSoapType === 'luxury' ? (next.excessLuxurySoapRate ?? excessLuxurySoapRate) : (next.excessStandardSoapRate ?? excessStandardSoapRate)) : 0;
    const nPaperSpend = next.estimatedPaperSpendPerWeek ?? estimatedPaperSpendPerWeek;
    const nPaperCredit = nFixtures * (next.paperCreditPerFixture ?? paperCreditPerFixture);
    const nPaperOverage = Math.max(0, nPaperSpend - nPaperCredit);

    let nBase: number;
    let nTrip: number;
    let nFacility: number;
    let nMicro: number;
    let nWarranty: number;
    let nMainService: number;

    if (nIsAllInclusive) {
      const nAIRate = next.allInclusiveWeeklyRatePerFixture ?? allInclusiveWeeklyRatePerFixture;
      nBase = nFixtures * nAIRate;
      nTrip = 0;
      nFacility = 0;
      nMicro = 0;
      nWarranty = 0;
      nMainService = nBase + nSoap + nExcess + nPaperOverage;
    } else {
      nBase = nFixtures * nFixtureRate;
      if (nIsSmall) {
        nBase = nApplyMin ? Math.max(nBase, nSmallMin) : nBase;
      } else {
        nBase = Math.max(nBase, nRegionMin);
      }

      const nAddTrip = next.addTripCharge ?? addTripCharge;
      nTrip = 0;
      if (!nIsSmall && nAddTrip) {
        nTrip = nInsideBeltway ? (next.insideBeltwayTripCharge ?? insideBeltwayTripCharge) : (next.outsideBeltwayTripCharge ?? outsideBeltwayTripCharge);
        if (nInsideBeltway && (next.needsParking ?? needsParking)) {
          nTrip += next.insideBeltwayParkingFee ?? insideBeltwayParkingFee;
        }
      }

      // Facility
      const nAddUrinal = next.addUrinalComponents ?? addUrinalComponents;
      const nAddMaleC = next.addMaleToiletComponents ?? addMaleToiletComponents;
      const nAddFemaleC = next.addFemaleToiletComponents ?? addFemaleToiletComponents;
      nFacility = 0;
      if (nAddUrinal) {
        nFacility += (next.urinalScreensQty ?? urinalScreensQty) * (next.urinalScreenMonthly ?? urinalScreenMonthly)
                   + (next.urinalMatsQty ?? urinalMatsQty) * (next.urinalMatMonthly ?? urinalMatMonthly);
      }
      if (nAddMaleC) {
        nFacility += (next.toiletClipsQty ?? toiletClipsQty) * (next.toiletClipsMonthly ?? toiletClipsMonthly)
                   + (next.seatCoverDispensersQty ?? seatCoverDispensersQty) * (next.seatCoverDispenserMonthly ?? seatCoverDispenserMonthly);
      }
      if (nAddFemaleC) {
        nFacility += (next.sanipodsQty ?? sanipodsQty) * (next.sanipodServiceMonthly ?? sanipodServiceMonthly);
      }

      const nAddMicro = next.addMicrofiberMopping ?? addMicrofiberMopping;
      nMicro = nAddMicro ? (next.microfiberBathrooms ?? microfiberBathrooms) * (next.microfiberMoppingPerBathroom ?? microfiberMoppingPerBathroom) : 0;
      const nWarrantyDisp = next.warrantyDispensers ?? warrantyDispensers;
      nWarranty = nWarrantyDisp > 0 ? nWarrantyDisp * (next.warrantyFeePerDispenserPerWeek ?? warrantyFeePerDispenserPerWeek) : 0;

      nMainService = nBase + nTrip + nSoap + nExcess + nMicro + nWarranty + nPaperOverage;
    }

    const nFacFreq = next.facilityComponentsFrequency ?? facilityComponentsFrequency;
    const nDual = calculateDualFrequency(nFreq, nFacFreq, nMainService, nFacility, contractMonths);

    // Baseline for originalContractTotal
    let origContractTotal: number;
    if (nIsAllInclusive) {
      const origAIRate = num(cfg.allInclusivePricing?.pricePerFixture, 20);
      const origMSAI = nFixtures * origAIRate + nSoap + nExcess + nPaperOverage;
      const origDAI = calculateDualFrequency(nFreq, nFacFreq, origMSAI, 0, contractMonths);
      origContractTotal = origDAI.contractTotal;
    } else {
      const origFR = nInsideBeltway
        ? (cfgInside.pricePerFixture ?? cfgInside.ratePerFixture ?? 7)
        : (cfgOutside.pricePerFixture ?? cfgOutside.ratePerFixture ?? 6);
      let origB = nFixtures * origFR;
      const origRM = nInsideBeltway ? (cfgInside.minimumPrice ?? 40) : 0;
      const origSM = cfg.smallBathroomMinimums?.minimumPriceUnderThreshold ?? 50;
      if (nIsSmall) {origB = nApplyMin ? Math.max(origB, origSM) : origB;}
      else {origB = Math.max(origB, origRM);}
      const origMS = origB + nTrip + nSoap + nExcess + nMicro + nWarranty + nPaperOverage;
      const origD = calculateDualFrequency(nFreq, nFacFreq, origMS, nFacility, contractMonths);
      origContractTotal = origD.contractTotal;
    }

    onChange({
      serviceId: 'saniclean',
      displayName: 'Saniclean',
      isActive: nFixtures > 0,
      contractMonths,
      ...data,
      ...fields,
      frequency: nFreq,
      mainServiceFrequency: nFreq,
      fixtureCount: nFixtures,
      applyMinimum: nApplyMin,
      perVisit: nDual.perVisit,
      monthlyRecurring: nDual.monthlyTotal,
      contractTotal: nDual.contractTotal,
      originalContractTotal: origContractTotal,
    });
  }, [data, pricingMode, freq, sinks, urinals, maleToilets, femaleToilets, location, needsParking,
      allInclusiveWeeklyRatePerFixture,
      insideBeltwayRatePerFixture, insideBeltwayMinimum, insideBeltwayTripCharge, insideBeltwayParkingFee,
      outsideBeltwayRatePerFixture, outsideBeltwayTripCharge,
      smallFacilityThreshold, smallFacilityMinimum, applyMinimum, addTripCharge,
      addUrinalComponents, urinalScreensQty, urinalScreenMonthly, urinalMatsQty, urinalMatMonthly,
      addMaleToiletComponents, toiletClipsQty, toiletClipsMonthly, seatCoverDispensersQty, seatCoverDispenserMonthly,
      addFemaleToiletComponents, sanipodsQty, sanipodServiceMonthly,
      soapType, luxuryUpgradePerDispenser, excessSoapGallonsPerWeek, excessStandardSoapRate, excessLuxurySoapRate,
      addMicrofiberMopping, microfiberBathrooms, microfiberMoppingPerBathroom,
      warrantyDispensers, warrantyFeePerDispenserPerWeek,
      estimatedPaperSpendPerWeek, paperCreditPerFixture,
      facilityComponentsFrequency, contractMonths, onChange, cfg, cfgInside, cfgOutside]);

  return (
    <ServiceCard
      serviceId="saniclean"
      displayName="Saniclean"
      icon="shield-checkmark-outline"
      iconColor="#7c3aed"
      iconBg="#ede9fe"
      onRemove={onRemove}
      notes={data?.notes ?? ''}
      onNotesChange={v => update({notes: v})}>

      {/* ── Pricing Mode ── */}
      <DropdownRow label="Pricing Mode" value={pricingMode} options={PRICING_MODE_OPTIONS} onChange={v => update({pricingMode: v})} />
      <FormDivider />

      {/* ── Frequency ── */}
      <DropdownRow label="Service Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({mainServiceFrequency: v, frequency: v})} />
      <FormDivider />

      {/* ── Location (per-item only) ── */}
      {!isAllInclusive && (
        <>
          <DropdownRow label="Location" value={location} options={LOCATION_OPTIONS} onChange={v => update({location: v})} />
          {isInsideBeltway && (
            <ToggleRow label="Needs Parking" value={needsParking} onChange={v => update({needsParking: v})} subtitle="Add parking fee to trip charge" />
          )}
          <FormDivider />
        </>
      )}

      {/* ── Fixtures ── */}
      <CalcRow label="Sinks" qty={sinks} onQtyChange={v => update({sinks: v})} rate={isAllInclusive ? allInclusiveWeeklyRatePerFixture : fixtureRate} onRateChange={v => update(isAllInclusive ? {allInclusiveWeeklyRatePerFixture: v} : (isInsideBeltway ? {insideBeltwayRatePerFixture: v} : {outsideBeltwayRatePerFixture: v}))} total={sinks * (isAllInclusive ? allInclusiveWeeklyRatePerFixture : fixtureRate)} />
      <CalcRow label="Urinals" qty={urinals} onQtyChange={v => update({urinals: v})} rate={isAllInclusive ? allInclusiveWeeklyRatePerFixture : fixtureRate} onRateChange={v => update(isAllInclusive ? {allInclusiveWeeklyRatePerFixture: v} : (isInsideBeltway ? {insideBeltwayRatePerFixture: v} : {outsideBeltwayRatePerFixture: v}))} total={urinals * (isAllInclusive ? allInclusiveWeeklyRatePerFixture : fixtureRate)} />
      <CalcRow label="Male Toilets" qty={maleToilets} onQtyChange={v => update({maleToilets: v})} rate={isAllInclusive ? allInclusiveWeeklyRatePerFixture : fixtureRate} onRateChange={v => update(isAllInclusive ? {allInclusiveWeeklyRatePerFixture: v} : (isInsideBeltway ? {insideBeltwayRatePerFixture: v} : {outsideBeltwayRatePerFixture: v}))} total={maleToilets * (isAllInclusive ? allInclusiveWeeklyRatePerFixture : fixtureRate)} />
      <CalcRow label="Female Toilets" qty={femaleToilets} onQtyChange={v => update({femaleToilets: v})} rate={isAllInclusive ? allInclusiveWeeklyRatePerFixture : fixtureRate} onRateChange={v => update(isAllInclusive ? {allInclusiveWeeklyRatePerFixture: v} : (isInsideBeltway ? {insideBeltwayRatePerFixture: v} : {outsideBeltwayRatePerFixture: v}))} total={femaleToilets * (isAllInclusive ? allInclusiveWeeklyRatePerFixture : fixtureRate)} />

      {/* ── Minimum & Trip (per-item only) ── */}
      {!isAllInclusive && (
        <>
          <NumberRow label="Small Facility Minimum" value={smallFacilityMinimum} onChange={v => update({smallFacilityMinimum: v})} prefix="$" decimals={2} />
          <ToggleRow label="Apply Minimum" value={applyMinimum} onChange={v => update({applyMinimum: v})} subtitle={`≤${smallFacilityThreshold} fixtures uses $${smallFacilityMinimum} minimum`} />
          <ToggleRow label="Add Trip Charge" value={addTripCharge} onChange={v => update({addTripCharge: v})} subtitle={`$${isInsideBeltway ? insideBeltwayTripCharge : outsideBeltwayTripCharge}/visit${needsParking && isInsideBeltway ? ` + $${insideBeltwayParkingFee} parking` : ''}`} />
        </>
      )}
      <FormDivider />

      {/* ── Soap ── */}
      <DropdownRow label="Soap Type" value={soapType} options={SOAP_OPTIONS} onChange={v => update({soapType: v})} />
      {soapType === 'luxury' && (
        <NumberRow label="Luxury Upgrade / Dispenser / Week" value={luxuryUpgradePerDispenser} onChange={v => update({luxuryUpgradePerDispenser: v})} prefix="$" decimals={2} />
      )}
      <NumberRow label="Excess Soap Gallons / Week" value={excessSoapGallonsPerWeek} onChange={v => update({excessSoapGallonsPerWeek: v})} decimals={1} />
      <FormDivider />

      {/* ── Microfiber Mopping (per-item only) ── */}
      {!isAllInclusive && (
        <>
          <ToggleRow label="Add Microfiber Mopping" value={addMicrofiberMopping} onChange={v => update({addMicrofiberMopping: v})} subtitle={`$${microfiberMoppingPerBathroom}/bathroom/week`} />
          {addMicrofiberMopping && (
            <>
              <NumberRow label="Bathrooms" value={microfiberBathrooms} onChange={v => update({microfiberBathrooms: v})} decimals={0} />
              <NumberRow label="Rate / Bathroom / Week" value={microfiberMoppingPerBathroom} onChange={v => update({microfiberMoppingPerBathroom: v})} prefix="$" decimals={2} />
            </>
          )}
          <FormDivider />
        </>
      )}

      {/* ── Warranty (per-item only) ── */}
      {!isAllInclusive && (
        <>
          <NumberRow label="Warranty Dispensers" value={warrantyDispensers} onChange={v => update({warrantyDispensers: v})} decimals={0} />
          {warrantyDispensers > 0 && (
            <NumberRow label="Warranty Fee / Dispenser / Week" value={warrantyFeePerDispenserPerWeek} onChange={v => update({warrantyFeePerDispenserPerWeek: v})} prefix="$" decimals={2} />
          )}
        </>
      )}

      {/* ── Paper Overage ── */}
      <NumberRow label="Estimated Paper Spend / Week" value={estimatedPaperSpendPerWeek} onChange={v => update({estimatedPaperSpendPerWeek: v})} prefix="$" decimals={2} />
      {estimatedPaperSpendPerWeek > 0 && (
        <NumberRow label="Paper Credit / Fixture / Week" value={paperCreditPerFixture} onChange={v => update({paperCreditPerFixture: v})} prefix="$" decimals={2} />
      )}
      <FormDivider />

      {/* ── Facility Components (per-item only) ── */}
      {!isAllInclusive && (urinals > 0 || maleToilets > 0 || femaleToilets > 0) && (
        <>
          <View style={fc.header}>
            <Ionicons name="construct-outline" size={14} color={Colors.textMuted} />
            <Text style={fc.headerText}>FACILITY COMPONENTS</Text>
          </View>
          <DropdownRow label="Facility Frequency" value={facilityComponentsFrequency} options={FREQ_OPTIONS} onChange={v => update({facilityComponentsFrequency: v})} />
        </>
      )}
      {!isAllInclusive && urinals > 0 && (
        <>
          <ToggleRow label="Urinal Components" value={addUrinalComponents} onChange={v => update({addUrinalComponents: v})} subtitle="Include screens & mats" />
          {addUrinalComponents && (
            <>
              <CalcRow label="Urinal Screens" qty={urinalScreensQty} onQtyChange={v => update({urinalScreensQty: v})} rate={urinalScreenMonthly} onRateChange={v => update({urinalScreenMonthly: v})} total={urinalScreensQty * urinalScreenMonthly} />
              <CalcRow label="Urinal Mats" qty={urinalMatsQty} onQtyChange={v => update({urinalMatsQty: v})} rate={urinalMatMonthly} onRateChange={v => update({urinalMatMonthly: v})} total={urinalMatsQty * urinalMatMonthly} />
            </>
          )}
        </>
      )}
      {!isAllInclusive && maleToilets > 0 && (
        <>
          <ToggleRow label="Male Toilet Components" value={addMaleToiletComponents} onChange={v => update({addMaleToiletComponents: v})} subtitle="Include clips & seat covers" />
          {addMaleToiletComponents && (
            <>
              <CalcRow label="Toilet Clips" qty={toiletClipsQty} onQtyChange={v => update({toiletClipsQty: v})} rate={toiletClipsMonthly} onRateChange={v => update({toiletClipsMonthly: v})} total={toiletClipsQty * toiletClipsMonthly} />
              <CalcRow label="Seat Covers" qty={seatCoverDispensersQty} onQtyChange={v => update({seatCoverDispensersQty: v})} rate={seatCoverDispenserMonthly} onRateChange={v => update({seatCoverDispenserMonthly: v})} total={seatCoverDispensersQty * seatCoverDispenserMonthly} />
            </>
          )}
        </>
      )}
      {!isAllInclusive && femaleToilets > 0 && (
        <>
          <ToggleRow label="Female Toilet Components" value={addFemaleToiletComponents} onChange={v => update({addFemaleToiletComponents: v})} subtitle="Include SaniPods" />
          {addFemaleToiletComponents && (
            <CalcRow label="SaniPods" qty={sanipodsQty} onQtyChange={v => update({sanipodsQty: v})} rate={sanipodServiceMonthly} onRateChange={v => update({sanipodServiceMonthly: v})} total={sanipodsQty * sanipodServiceMonthly} />
          )}
        </>
      )}
      {!isAllInclusive && facilityComponentsMonthly > 0 && (
        <View style={fc.totalRow}>
          <Text style={fc.totalLabel}>Facility Monthly Total</Text>
          <Text style={fc.totalValue}>${facilityComponentsMonthly.toFixed(2)}/mo</Text>
        </View>
      )}
      <FormDivider />

      {/* ── Pricing Summary ── */}
      <TotalsBlock
        frequency={freq}
        perVisit={weeklyTotal}
        firstMonth={monthlyTotal}
        monthlyRecurring={monthlyTotal}
        contractMonths={contractMonths}
        contractTotal={contractTotal}
      />

      {/* ── Greenline/Redline Badge ── */}
      {fixtureCount > 0 && (
        <View style={s.badgeRow}>
          <View style={[s.badge, isGreenline ? s.greenBadge : s.redBadge]}>
            <Text style={[s.badgeText, isGreenline ? s.greenText : s.redText]}>
              {isGreenline ? '🟢 Greenline Pricing' : '🔴 Redline Pricing'}
            </Text>
          </View>
        </View>
      )}

      {/* ── Included Items ── */}
      <IncludedItemsEditor
        items={includedItems}
        isCustomized={isCustomized}
        onChange={items => onChange({...data, includedItems: items})}
        onReset={() => {
          const {includedItems: _removed, ...rest} = data ?? {};
          onChange({serviceId: 'saniclean', displayName: 'Saniclean', isActive: true, contractMonths, ...rest});
        }}
      />
    </ServiceCard>
  );
}

// ── Styles ──

const inc = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  headerText: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resetBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  bullet: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    width: 12,
  },
  itemText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  iconBtn: {
    padding: 5,
    borderRadius: Radius.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  addBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
});

const s = StyleSheet.create({
  badgeRow: {paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm},
  badge: {alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6},
  greenBadge: {backgroundColor: '#e8f5e9'},
  redBadge: {backgroundColor: '#ffebee'},
  badgeText: {fontSize: 13, fontWeight: '600'},
  greenText: {color: '#388e3c'},
  redText: {color: '#d32f2f'},
});

const fc = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  headerText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    backgroundColor: '#f0fdf4',
    marginHorizontal: Spacing.md,
    borderRadius: Radius.sm,
  },
  totalLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: '#166534',
  },
  totalValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#166534',
  },
});
