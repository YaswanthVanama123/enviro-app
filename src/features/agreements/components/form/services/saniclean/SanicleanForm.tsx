import React, {useCallback, useState} from 'react';
import {View, Text, TextInput, TouchableOpacity, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  ServiceCard,
  DropdownRow,
  FormDivider,
  CalcRow,
  NumberRow,
  ToggleRow,
  DollarRow,
} from '../base/ServiceBase';
import {FREQUENCY_OPTIONS} from '../../../../../../shared/constants/frequency';
import {Colors} from '../../../../../../theme/colors';
import {Spacing, Radius} from '../../../../../../theme/spacing';
import {FontSize} from '../../../../../../theme/typography';
import {
  buildSanicleanState,
  computeSanicleanQuote,
  getCalculationMode,
  type BackendSanicleanConfig,
} from './sanicleanCalc';

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

const LOCATION_OPTIONS = [
  {label: 'Inside Beltway', value: 'insideBeltway'},
  {label: 'Outside Beltway', value: 'outsideBeltway'},
];

const PRICING_MODE_OPTIONS = [
  {label: 'Per Item Charge', value: 'per_item_charge'},
  {label: 'All Inclusive', value: 'all_inclusive'},
];

const SOAP_OPTIONS = [
  {label: 'Standard', value: 'standard'},
  {label: 'Luxury', value: 'luxury'},
];

// Editing any of these base inputs clears the manual total overrides (matches web).
const RESET_OVERRIDE_FIELDS = [
  'sinks',
  'urinals',
  'maleToilets',
  'femaleToilets',
  'location',
  'needsParking',
  'soapType',
  'excessSoapGallonsPerWeek',
  'addMicrofiberMopping',
  'microfiberBathrooms',
  'estimatedPaperSpendPerWeek',
  'warrantyDispensers',
  'addTripCharge',
  'pricingMode',
  'addUrinalComponents',
  'urinalScreensQty',
  'urinalMatsQty',
  'addMaleToiletComponents',
  'toiletClipsQty',
  'seatCoverDispensersQty',
  'addFemaleToiletComponents',
  'sanipodsQty',
  'rateTier',
  'mainServiceFrequency',
  'frequency',
  'facilityComponentsFrequency',
  'insideBeltwayRatePerFixture',
  'outsideBeltwayRatePerFixture',
  'allInclusiveWeeklyRatePerFixture',
  'insideBeltwayMinimum',
  'insideBeltwayTripCharge',
  'insideBeltwayParkingFee',
  'outsideBeltwayTripCharge',
  'smallFacilityMinimum',
  'urinalScreenMonthly',
  'urinalMatMonthly',
  'toiletClipsMonthly',
  'seatCoverDispenserMonthly',
  'sanipodServiceMonthly',
  'warrantyFeePerDispenserPerWeek',
  'luxuryUpgradePerDispenser',
  'excessStandardSoapRate',
  'excessLuxurySoapRate',
  'paperCreditPerFixture',
  'microfiberMoppingPerBathroom',
];

function IncludedItemsEditor({
  items,
  isCustomized,
  onChange,
  onReset,
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
    if (editingIndex === null) {
      return;
    }
    const trimmed = editingText.trim();
    if (!trimmed) {
      return;
    }
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
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingText('');
    }
  };

  const saveNew = () => {
    const trimmed = newText.trim();
    if (!trimmed) {
      setAddingNew(false);
      setNewText('');
      return;
    }
    onChange([...items, trimmed]);
    setNewText('');
    setAddingNew(false);
  };

  const cancelNew = () => {
    setAddingNew(false);
    setNewText('');
  };

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
              <Text style={inc.itemText} numberOfLines={2}>
                {item}
              </Text>
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

export function SanicleanForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg: BackendSanicleanConfig | null = (pricingConfig?.config as BackendSanicleanConfig) ?? null;

  const state = buildSanicleanState(data, contractMonths, cfg);
  const quote = computeSanicleanQuote(state, cfg, 0);

  const isAllInclusive = state.pricingMode === 'all_inclusive';
  const freq = state.mainServiceFrequency;
  const isInsideBeltway = state.location === 'insideBeltway';
  const fixtureCount = state.fixtureCount;
  const isSmallFacility = fixtureCount <= state.smallFacilityThreshold;
  const fixtureRate = isAllInclusive
    ? state.allInclusiveWeeklyRatePerFixture
    : isInsideBeltway
    ? state.insideBeltwayRatePerFixture
    : state.outsideBeltwayRatePerFixture;

  const mode = getCalculationMode(freq);
  const isOneTime = freq === 'oneTime';
  const isVisitBased = mode === 'perVisit';
  const isGreenline = fixtureCount > 0 && quote.contractTotal > (quote.originalContractTotal ?? 0) * 1.3;

  const includedItems: string[] = data?.includedItems ?? DEFAULT_INCLUDED_ITEMS;
  const isCustomized = Array.isArray(data?.includedItems);

  const update = useCallback(
    (fields: Record<string, any>) => {
      const merged = {...data, ...fields};
      if ('mainServiceFrequency' in fields) {
        merged.frequency = fields.mainServiceFrequency;
      }
      const clearOverrides = RESET_OVERRIDE_FIELDS.some(k => k in fields);
      if (clearOverrides) {
        merged.customBaseService = undefined;
        merged.customTripCharge = undefined;
        merged.customFacilityComponents = undefined;
        merged.customSoapUpgrade = undefined;
        merged.customExcessSoap = undefined;
        merged.customMicrofiberMopping = undefined;
        merged.customWarrantyFees = undefined;
        merged.customPaperOverage = undefined;
        merged.customWeeklyTotal = undefined;
        merged.customMonthlyTotal = undefined;
        merged.customContractTotal = undefined;
      }

      const nextState = buildSanicleanState(merged, contractMonths, cfg);
      const nextQuote = computeSanicleanQuote(nextState, cfg, 0);
      onChange({
        serviceId: 'saniclean',
        displayName: 'SaniClean',
        ...merged,
        frequency: nextState.mainServiceFrequency,
        mainServiceFrequency: nextState.mainServiceFrequency,
        facilityComponentsFrequency: nextState.facilityComponentsFrequency,
        fixtureCount: nextState.fixtureCount,
        isActive: nextState.fixtureCount > 0,
        contractMonths,
        perVisit: nextQuote.weeklyTotal,
        monthlyRecurring: nextQuote.monthlyTotal,
        facilityComponentsMonthly: nextQuote.facilityComponentsMonthly,
        contractTotal: nextQuote.contractTotal,
        originalContractTotal: nextQuote.originalContractTotal,
      });
    },
    [data, contractMonths, cfg, onChange],
  );

  const onFixtureRateChange = (v: number) =>
    update(
      isAllInclusive
        ? {allInclusiveWeeklyRatePerFixture: v}
        : isInsideBeltway
        ? {insideBeltwayRatePerFixture: v}
        : {outsideBeltwayRatePerFixture: v},
    );

  const weeklyLabel = isOneTime ? 'Service Total' : isVisitBased ? 'Per Visit Total' : 'Weekly Service Total';

  return (
    <ServiceCard
      serviceId="saniclean"
      displayName="SaniClean"
      icon="shield-checkmark-outline"
      iconColor="#7c3aed"
      iconBg="#ede9fe"
      onRemove={onRemove}
      notes={data?.notes ?? ''}
      onNotesChange={v => update({notes: v})}>
      <DropdownRow
        label="Pricing Mode"
        value={state.pricingMode}
        options={PRICING_MODE_OPTIONS}
        onChange={v => update({pricingMode: v})}
      />
      <FormDivider />

      <DropdownRow
        label="Service Frequency"
        value={freq}
        options={FREQUENCY_OPTIONS}
        onChange={v => update({mainServiceFrequency: v})}
      />
      <FormDivider />

      {!isAllInclusive && (
        <>
          <DropdownRow
            label="Location"
            value={state.location}
            options={LOCATION_OPTIONS}
            onChange={v => update({location: v})}
          />
          {isInsideBeltway && (
            <ToggleRow
              label="Needs Parking"
              value={state.needsParking}
              onChange={v => update({needsParking: v})}
              subtitle="Add parking fee to trip charge"
            />
          )}
          <FormDivider />
        </>
      )}

      <CalcRow
        label="Sinks"
        qty={state.sinks}
        onQtyChange={v => update({sinks: v})}
        rate={fixtureRate}
        onRateChange={onFixtureRateChange}
        total={state.sinks * fixtureRate}
      />
      <CalcRow
        label="Urinals"
        qty={state.urinals}
        onQtyChange={v => update({urinals: v})}
        rate={fixtureRate}
        onRateChange={onFixtureRateChange}
        total={state.urinals * fixtureRate}
      />
      <CalcRow
        label="Male Toilets"
        qty={state.maleToilets}
        onQtyChange={v => update({maleToilets: v})}
        rate={fixtureRate}
        onRateChange={onFixtureRateChange}
        total={state.maleToilets * fixtureRate}
      />
      <CalcRow
        label="Female Toilets"
        qty={state.femaleToilets}
        onQtyChange={v => update({femaleToilets: v})}
        rate={fixtureRate}
        onRateChange={onFixtureRateChange}
        total={state.femaleToilets * fixtureRate}
      />

      {!isAllInclusive && (
        <>
          <NumberRow
            label="Small Facility Minimum"
            value={state.smallFacilityMinimum}
            onChange={v => update({smallFacilityMinimum: v})}
            prefix="$"
            decimals={2}
          />
          <ToggleRow
            label="Apply Minimum"
            value={state.applyMinimum !== false}
            onChange={v => update({applyMinimum: v})}
            subtitle={`≤${state.smallFacilityThreshold} fixtures uses $${state.smallFacilityMinimum} minimum`}
          />
          <ToggleRow
            label="Add Trip Charge"
            value={state.addTripCharge}
            onChange={v => update({addTripCharge: v})}
            disabled={isSmallFacility}
            subtitle={
              isSmallFacility
                ? 'Small facility — trip charge included in minimum'
                : `$${isInsideBeltway ? state.insideBeltwayTripCharge : state.outsideBeltwayTripCharge}/visit${
                    state.needsParking && isInsideBeltway ? ` + $${state.insideBeltwayParkingFee} parking` : ''
                  }`
            }
          />
        </>
      )}
      <FormDivider />

      <DropdownRow
        label="Soap Type"
        value={state.soapType}
        options={SOAP_OPTIONS}
        onChange={v => update({soapType: v})}
      />
      {state.soapType === 'luxury' && (
        <NumberRow
          label="Luxury Upgrade / Dispenser / Week"
          value={state.luxuryUpgradePerDispenser}
          onChange={v => update({luxuryUpgradePerDispenser: v})}
          prefix="$"
          decimals={2}
        />
      )}
      <NumberRow
        label="Excess Soap Gallons / Week"
        value={state.excessSoapGallonsPerWeek}
        onChange={v => update({excessSoapGallonsPerWeek: v})}
        decimals={1}
      />
      <FormDivider />

      {!isAllInclusive && (
        <>
          <ToggleRow
            label="Add Microfiber Mopping"
            value={state.addMicrofiberMopping}
            onChange={v => update({addMicrofiberMopping: v})}
            subtitle={`$${state.microfiberMoppingPerBathroom}/bathroom/week`}
          />
          {state.addMicrofiberMopping && (
            <>
              <NumberRow
                label="Bathrooms"
                value={state.microfiberBathrooms}
                onChange={v => update({microfiberBathrooms: v})}
                decimals={0}
              />
              <NumberRow
                label="Rate / Bathroom / Week"
                value={state.microfiberMoppingPerBathroom}
                onChange={v => update({microfiberMoppingPerBathroom: v})}
                prefix="$"
                decimals={2}
              />
            </>
          )}
          <FormDivider />
        </>
      )}

      {!isAllInclusive && (
        <>
          <NumberRow
            label="Warranty Dispensers"
            value={state.warrantyDispensers}
            onChange={v => update({warrantyDispensers: v})}
            decimals={0}
          />
          {state.warrantyDispensers > 0 && (
            <NumberRow
              label="Warranty Fee / Dispenser / Week"
              value={state.warrantyFeePerDispenserPerWeek}
              onChange={v => update({warrantyFeePerDispenserPerWeek: v})}
              prefix="$"
              decimals={2}
            />
          )}
        </>
      )}

      <NumberRow
        label="Estimated Paper Spend / Week"
        value={state.estimatedPaperSpendPerWeek}
        onChange={v => update({estimatedPaperSpendPerWeek: v})}
        prefix="$"
        decimals={2}
      />
      {state.estimatedPaperSpendPerWeek > 0 && (
        <NumberRow
          label="Paper Credit / Fixture / Week"
          value={state.paperCreditPerFixture}
          onChange={v => update({paperCreditPerFixture: v})}
          prefix="$"
          decimals={2}
        />
      )}
      <FormDivider />

      {!isAllInclusive && (state.urinals > 0 || state.maleToilets > 0 || state.femaleToilets > 0) && (
        <>
          <View style={fc.header}>
            <Ionicons name="construct-outline" size={14} color={Colors.textMuted} />
            <Text style={fc.headerText}>FACILITY COMPONENTS</Text>
          </View>
          <DropdownRow
            label="Facility Frequency"
            value={state.facilityComponentsFrequency}
            options={FREQUENCY_OPTIONS}
            onChange={v => update({facilityComponentsFrequency: v})}
          />
        </>
      )}
      {!isAllInclusive && state.urinals > 0 && (
        <>
          <ToggleRow
            label="Urinal Components"
            value={state.addUrinalComponents}
            onChange={v => update({addUrinalComponents: v})}
            subtitle="Include screens & mats"
          />
          {state.addUrinalComponents && (
            <>
              <CalcRow
                label="Urinal Screens"
                qty={state.urinalScreensQty}
                onQtyChange={v => update({urinalScreensQty: v})}
                rate={state.urinalScreenMonthly}
                onRateChange={v => update({urinalScreenMonthly: v})}
                total={state.urinalScreensQty * state.urinalScreenMonthly}
              />
              <CalcRow
                label="Urinal Mats"
                qty={state.urinalMatsQty}
                onQtyChange={v => update({urinalMatsQty: v})}
                rate={state.urinalMatMonthly}
                onRateChange={v => update({urinalMatMonthly: v})}
                total={state.urinalMatsQty * state.urinalMatMonthly}
              />
            </>
          )}
        </>
      )}
      {!isAllInclusive && state.maleToilets > 0 && (
        <>
          <ToggleRow
            label="Male Toilet Components"
            value={state.addMaleToiletComponents}
            onChange={v => update({addMaleToiletComponents: v})}
            subtitle="Include clips & seat covers"
          />
          {state.addMaleToiletComponents && (
            <>
              <CalcRow
                label="Toilet Clips"
                qty={state.toiletClipsQty}
                onQtyChange={v => update({toiletClipsQty: v})}
                rate={state.toiletClipsMonthly}
                onRateChange={v => update({toiletClipsMonthly: v})}
                total={state.toiletClipsQty * state.toiletClipsMonthly}
              />
              <CalcRow
                label="Seat Covers"
                qty={state.seatCoverDispensersQty}
                onQtyChange={v => update({seatCoverDispensersQty: v})}
                rate={state.seatCoverDispenserMonthly}
                onRateChange={v => update({seatCoverDispenserMonthly: v})}
                total={state.seatCoverDispensersQty * state.seatCoverDispenserMonthly}
              />
            </>
          )}
        </>
      )}
      {!isAllInclusive && state.femaleToilets > 0 && (
        <>
          <ToggleRow
            label="Female Toilet Components"
            value={state.addFemaleToiletComponents}
            onChange={v => update({addFemaleToiletComponents: v})}
            subtitle="Include SaniPods"
          />
          {state.addFemaleToiletComponents && (
            <CalcRow
              label="SaniPods"
              qty={state.sanipodsQty}
              onQtyChange={v => update({sanipodsQty: v})}
              rate={state.sanipodServiceMonthly}
              onRateChange={v => update({sanipodServiceMonthly: v})}
              total={state.sanipodsQty * state.sanipodServiceMonthly}
            />
          )}
        </>
      )}
      {!isAllInclusive && quote.facilityComponentsMonthly > 0 && (
        <DollarRow label="Facility Monthly Total" value={quote.facilityComponentsMonthly} />
      )}
      <FormDivider />

      {fixtureCount > 0 && (
        <>
          <DollarRow label={weeklyLabel} value={quote.weeklyTotal} />

          <View style={s.badgeRow}>
            <View style={[s.badge, isGreenline ? s.greenBadge : s.redBadge]}>
              <Text style={[s.badgeText, isGreenline ? s.greenText : s.redText]}>
                {isGreenline ? '🟢 Greenline Pricing' : '🔴 Redline Pricing'}
              </Text>
            </View>
          </View>

          {mode === 'monthly' && <DollarRow label="Monthly Recurring" value={quote.monthlyTotal} />}

          {isOneTime ? (
            <DollarRow label="Total Price" value={quote.contractTotal} highlight />
          ) : (
            <DollarRow label={`Contract Total (${contractMonths} mo)`} value={quote.contractTotal} highlight />
          )}
        </>
      )}

      <IncludedItemsEditor
        items={includedItems}
        isCustomized={isCustomized}
        onChange={items => onChange({...data, includedItems: items})}
        onReset={() => {
          const {includedItems: _removed, ...rest} = data ?? {};
          onChange({serviceId: 'saniclean', displayName: 'SaniClean', isActive: true, contractMonths, ...rest});
        }}
      />
    </ServiceCard>
  );
}

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
});
