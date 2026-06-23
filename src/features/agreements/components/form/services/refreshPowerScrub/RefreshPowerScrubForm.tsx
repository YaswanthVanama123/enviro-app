import React, {useCallback} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  ServiceCard,
  DropdownRow,
  FormDivider,
  NumberRow,
  ToggleRow,
  DollarRow,
  CalcRow,
} from '../base/ServiceBase';
import {Colors} from '../../../../../../theme/colors';
import {Spacing, Radius} from '../../../../../../theme/spacing';
import {FontSize} from '../../../../../../theme/typography';
import {FREQUENCY_OPTIONS} from '../../../../../../shared/constants/frequency';
import {
  computeRefreshPowerScrub,
  createDefaultArea,
  AREA_KEYS,
  FALLBACK_DEFAULT_MIN,
  FALLBACK_FOH_RATE,
  FALLBACK_KITCHEN_LARGE,
  FALLBACK_KITCHEN_SMALL_MED,
  FALLBACK_PATIO_STANDALONE,
  FALLBACK_PATIO_UPSELL,
  type BackendRefreshPowerScrubConfig,
  type RefreshAreaCalcState,
  type RefreshAreaKey,
  type RefreshPowerScrubFormState,
  type RefreshPricingType,
} from './refreshPowerScrubCalc';

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
}

const RPS_FREQ_OPTIONS = FREQUENCY_OPTIONS;

const PRICING_TYPE_OPTIONS = [
  {value: 'preset', label: 'Preset Package'},
  {value: 'perWorker', label: 'Per Worker'},
  {value: 'perHour', label: 'Per Hour'},
  {value: 'squareFeet', label: 'Square Feet'},
  {value: 'custom', label: 'Custom Amount'},
];

const VISIBLE_AREAS: {key: RefreshAreaKey; label: string}[] = [
  {key: 'dumpster', label: 'Dumpster Area'},
  {key: 'patio', label: 'Patio'},
  {key: 'foh', label: 'Front of House (FOH)'},
  {key: 'boh', label: 'Back of House (BOH)'},
];

function presetDefaultRate(area: RefreshAreaKey, cfg?: BackendRefreshPowerScrubConfig | null): number {
  switch (area) {
    case 'dumpster':
      return cfg?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN;
    case 'patio':
      return cfg?.areaSpecificPricing?.patio?.standalone ?? FALLBACK_PATIO_STANDALONE;
    case 'foh':
      return cfg?.areaSpecificPricing?.frontOfHouse ?? FALLBACK_FOH_RATE;
    default:
      return 0;
  }
}

function readArea(data: any, key: RefreshAreaKey, cfg?: BackendRefreshPowerScrubConfig | null): RefreshAreaCalcState {
  const base = createDefaultArea(cfg);
  const stored = data?.[key];
  return stored ? {...base, ...stored} : base;
}

function buildFormState(
  data: any,
  contractMonths: number,
  cfg: BackendRefreshPowerScrubConfig | null,
): RefreshPowerScrubFormState {
  return {
    hourlyRate: data?.hourlyRate ?? 0,
    minimumVisit: data?.minimumVisit ?? (cfg?.coreRates?.minimumVisit ?? FALLBACK_DEFAULT_MIN),
    applyMinimum: data?.applyMinimum !== false,
    frequency: data?.frequency ?? 'monthly',
    contractMonths,
    dumpster: readArea(data, 'dumpster', cfg),
    patio: readArea(data, 'patio', cfg),
    walkway: readArea(data, 'walkway', cfg),
    foh: readArea(data, 'foh', cfg),
    boh: readArea(data, 'boh', cfg),
    other: readArea(data, 'other', cfg),
  };
}

function isOneTime(label?: string): boolean {
  return (label ?? '').toLowerCase() === 'onetime';
}

interface AreaSectionProps {
  area: RefreshAreaKey;
  label: string;
  state: RefreshAreaCalcState;
  cfg: BackendRefreshPowerScrubConfig | null;
  globalFreq: string;
  areaTotal: number;
  areaMonthly: number;
  areaContract: number;
  contractMonths: number;
  onPatch: (patch: Partial<RefreshAreaCalcState>) => void;
}

function AreaSection({
  area,
  label,
  state,
  cfg,
  globalFreq,
  areaTotal,
  areaMonthly,
  areaContract,
  contractMonths,
  onPatch,
}: AreaSectionProps) {
  const {enabled, pricingType} = state;
  const effFreq = state.frequencyLabel || globalFreq;
  const presetRate = state.presetRate ?? presetDefaultRate(area, cfg);
  const smRate = state.smallMediumRate ?? (cfg?.areaSpecificPricing?.kitchen?.smallMedium ?? FALLBACK_KITCHEN_SMALL_MED);
  const lgRate = state.largeRate ?? (cfg?.areaSpecificPricing?.kitchen?.large ?? FALLBACK_KITCHEN_LARGE);
  const addonRate = state.patioAddonRate ?? (cfg?.areaSpecificPricing?.patio?.upsell ?? FALLBACK_PATIO_UPSELL);
  const visitBased =
    effFreq === 'oneTime' ||
    effFreq === 'quarterly' ||
    effFreq === 'biannual' ||
    effFreq === 'annual' ||
    effFreq === 'bimonthly' ||
    effFreq === 'everyFourWeeks';

  return (
    <View style={styles.areaBlock}>
      <View style={styles.areaHeader}>
        <Text style={styles.areaTitle}>{label}</Text>
        <TouchableOpacity
          style={[styles.toggle, enabled && styles.toggleOn]}
          onPress={() => onPatch({enabled: !enabled})}>
          <Text style={[styles.toggleText, enabled && styles.toggleTextOn]}>{enabled ? 'ON' : 'OFF'}</Text>
        </TouchableOpacity>
      </View>

      {enabled && (
        <View style={styles.areaBody}>
          <DropdownRow
            label="Pricing Type"
            value={pricingType}
            options={PRICING_TYPE_OPTIONS}
            onChange={v => onPatch({pricingType: v as RefreshPricingType})}
          />

          {pricingType === 'preset' && area === 'boh' && (
            <>
              <CalcRow
                label="Small/Medium Kitchen"
                qty={state.smallMediumQuantity}
                onQtyChange={v => onPatch({smallMediumQuantity: v})}
                rate={smRate}
                onRateChange={v => onPatch({smallMediumRate: v})}
                total={
                  state.smallMediumCustomAmount > 0
                    ? state.smallMediumCustomAmount
                    : (state.smallMediumQuantity || 0) * smRate
                }
              />
              <CalcRow
                label="Large Kitchen"
                qty={state.largeQuantity}
                onQtyChange={v => onPatch({largeQuantity: v})}
                rate={lgRate}
                onRateChange={v => onPatch({largeRate: v})}
                total={
                  state.largeCustomAmount > 0 ? state.largeCustomAmount : (state.largeQuantity || 0) * lgRate
                }
              />
            </>
          )}

          {pricingType === 'preset' && area !== 'boh' && (
            <>
              <CalcRow
                label="Package"
                qty={state.presetQuantity || 1}
                onQtyChange={v => onPatch({presetQuantity: v})}
                rate={presetRate}
                onRateChange={v => onPatch({presetRate: v})}
                total={(state.presetQuantity && state.presetQuantity > 0 ? state.presetQuantity : 1) * presetRate}
              />
              {area === 'patio' && (
                <>
                  <ToggleRow
                    label="Include Patio Add-on"
                    value={state.includePatioAddon}
                    onChange={v => onPatch({includePatioAddon: v})}
                  />
                  {state.includePatioAddon && (
                    <NumberRow
                      label="Patio Add-on Rate"
                      value={addonRate}
                      onChange={v => onPatch({patioAddonRate: v})}
                      prefix="$"
                      decimals={2}
                    />
                  )}
                </>
              )}
            </>
          )}

          {pricingType === 'perWorker' && (
            <>
              <NumberRow
                label="Workers"
                value={state.workers}
                onChange={v => onPatch({workers: v})}
                suffix="workers"
                decimals={0}
              />
              <NumberRow
                label="Rate per Worker"
                value={state.workerRate}
                onChange={v => onPatch({workerRate: v})}
                prefix="$"
                decimals={2}
              />
            </>
          )}

          {pricingType === 'perHour' && (
            <>
              <NumberRow
                label="Hours"
                value={state.hours}
                onChange={v => onPatch({hours: v})}
                suffix="hrs"
                decimals={2}
              />
              <NumberRow
                label="Rate per Hour"
                value={state.hourlyRate}
                onChange={v => onPatch({hourlyRate: v})}
                prefix="$"
                decimals={2}
              />
            </>
          )}

          {pricingType === 'squareFeet' && (
            <>
              <NumberRow
                label="Fixed Fee"
                value={state.sqFtFixedFee}
                onChange={v => onPatch({sqFtFixedFee: v})}
                prefix="$"
                decimals={2}
              />
              <CalcRow
                label="Inside (sq ft)"
                qty={state.insideSqFt}
                onQtyChange={v => onPatch({insideSqFt: v})}
                rate={state.insideRate}
                onRateChange={v => onPatch({insideRate: v})}
                total={(state.insideSqFt || 0) * state.insideRate}
              />
              <CalcRow
                label="Outside (sq ft)"
                qty={state.outsideSqFt}
                onQtyChange={v => onPatch({outsideSqFt: v})}
                rate={state.outsideRate}
                onRateChange={v => onPatch({outsideRate: v})}
                total={(state.outsideSqFt || 0) * state.outsideRate}
              />
            </>
          )}

          {pricingType === 'custom' && (
            <NumberRow
              label="Custom Amount"
              value={state.customAmount}
              onChange={v => onPatch({customAmount: v})}
              prefix="$"
              decimals={2}
            />
          )}

          <DropdownRow
            label="Frequency"
            value={effFreq}
            options={RPS_FREQ_OPTIONS}
            onChange={v => onPatch({frequencyLabel: v})}
          />

          <DollarRow label="Area Total (per visit)" value={areaTotal} />
          {!visitBased && <DollarRow label="Monthly Recurring" value={areaMonthly} />}
          {!isOneTime(effFreq) && (
            <DollarRow label={`Contract (${contractMonths} mo)`} value={areaContract} />
          )}
        </View>
      )}
    </View>
  );
}

export function RefreshPowerScrubForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg: BackendRefreshPowerScrubConfig | null =
    (pricingConfig?.config as BackendRefreshPowerScrubConfig) ?? null;

  const form = buildFormState(data, contractMonths, cfg);
  const calc = computeRefreshPowerScrub(form, cfg, 0);

  const oneTimeForArea = (key: RefreshAreaKey) => isOneTime(form[key].frequencyLabel || form.frequency);

  const perVisitTotal = AREA_KEYS.reduce((s, a) => s + calc.areaTotals[a], 0);
  const contractTotal = AREA_KEYS.reduce(
    (s, a) => s + (oneTimeForArea(a) ? calc.areaTotals[a] : calc.areaContractTotals[a]),
    0,
  );
  const originalContractTotal = AREA_KEYS.reduce(
    (s, a) => s + (oneTimeForArea(a) ? calc.baselineAreaTotals[a] : calc.baselineAreaContractTotals[a]),
    0,
  );

  const applyMinimum = form.applyMinimum !== false;
  const hasService = AREA_KEYS.some(a => form[a].enabled && calc.areaTotals[a] > 0);
  const isGreenline = hasService && contractTotal > originalContractTotal * 1.3;

  const pushChange = useCallback(
    (nextForm: RefreshPowerScrubFormState, extra: Record<string, any>) => {
      const c = computeRefreshPowerScrub(nextForm, cfg, 0);
      const oneTimeArea = (key: RefreshAreaKey) => isOneTime(nextForm[key].frequencyLabel || nextForm.frequency);
      const pv = AREA_KEYS.reduce((s, a) => s + c.areaTotals[a], 0);
      const ct = AREA_KEYS.reduce(
        (s, a) => s + (oneTimeArea(a) ? c.areaTotals[a] : c.areaContractTotals[a]),
        0,
      );
      const oct = AREA_KEYS.reduce(
        (s, a) => s + (oneTimeArea(a) ? c.baselineAreaTotals[a] : c.baselineAreaContractTotals[a]),
        0,
      );
      const areas = AREA_KEYS.filter(a => nextForm[a].enabled && c.areaTotals[a] > 0).map(a => ({
        key: a,
        isActive: true,
        frequency: nextForm[a].frequencyLabel || nextForm.frequency,
        perVisit: c.areaTotals[a],
        contractTotal: oneTimeArea(a) ? c.areaTotals[a] : c.areaContractTotals[a],
        originalContractTotal: oneTimeArea(a) ? c.baselineAreaTotals[a] : c.baselineAreaContractTotals[a],
      }));
      onChange({
        serviceId: 'refreshPowerScrub',
        displayName: 'Refresh Power Scrub',
        ...data,
        ...extra,
        hourlyRate: nextForm.hourlyRate,
        minimumVisit: nextForm.minimumVisit,
        applyMinimum: nextForm.applyMinimum,
        frequency: nextForm.frequency,
        contractMonths,
        dumpster: nextForm.dumpster,
        patio: nextForm.patio,
        walkway: nextForm.walkway,
        foh: nextForm.foh,
        boh: nextForm.boh,
        other: nextForm.other,
        isActive: AREA_KEYS.some(a => nextForm[a].enabled && c.areaTotals[a] > 0),
        perVisit: pv,
        monthlyRecurring: c.monthlyRecurring,
        contractTotal: ct,
        originalContractTotal: oct,
        areas,
      });
    },
    [data, cfg, contractMonths, onChange],
  );

  const updateForm = useCallback(
    (patch: Partial<RefreshPowerScrubFormState>) => {
      pushChange({...form, ...patch}, {});
    },
    [form, pushChange],
  );

  const updateArea = useCallback(
    (key: RefreshAreaKey, patch: Partial<RefreshAreaCalcState>) => {
      pushChange({...form, [key]: {...form[key], ...patch}}, {});
    },
    [form, pushChange],
  );

  return (
    <ServiceCard
      serviceId="refreshPowerScrub"
      displayName="Refresh Power Scrub"
      icon="water-outline"
      iconColor="#0891b2"
      iconBg="#cffafe"
      onRemove={onRemove}
      notes={data?.notes ?? ''}
      onNotesChange={v => pushChange(form, {notes: v})}>
      <DropdownRow
        label="Default Frequency"
        value={form.frequency}
        options={RPS_FREQ_OPTIONS}
        onChange={v => updateForm({frequency: v})}
      />
      <ToggleRow
        label="Apply Minimum"
        value={applyMinimum}
        onChange={v => updateForm({applyMinimum: v})}
        subtitle={`Minimum $${form.minimumVisit.toFixed(2)} per visit`}
      />

      {VISIBLE_AREAS.map(({key, label}, idx) => (
        <View key={key}>
          {idx > 0 && <FormDivider />}
          <AreaSection
            area={key}
            label={label}
            state={form[key]}
            cfg={cfg}
            globalFreq={form.frequency}
            areaTotal={calc.areaTotals[key]}
            areaMonthly={calc.areaMonthlyTotals[key]}
            areaContract={calc.areaContractTotals[key]}
            contractMonths={contractMonths}
            onPatch={patch => updateArea(key, patch)}
          />
        </View>
      ))}

      {hasService && (
        <>
          <FormDivider />
          <DollarRow label="Total per Visit" value={perVisitTotal} />

          <View style={styles.tierRow}>
            <Text style={[styles.tierText, isGreenline ? styles.tierGreen : styles.tierRed]}>
              <Ionicons
                name="ellipse"
                size={14}
                color={isGreenline ? '#16a34a' : '#dc2626'}
              />
              {isGreenline ? ' Greenline Pricing' : ' Redline Pricing'}
            </Text>
          </View>

          <DollarRow label={`Contract Total (${contractMonths} mo)`} value={contractTotal} highlight />
        </>
      )}
    </ServiceCard>
  );
}

const styles = StyleSheet.create({
  areaBlock: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  areaTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  toggle: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  toggleOn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  toggleTextOn: {
    color: '#fff',
  },
  areaBody: {
    marginTop: Spacing.xs,
  },
  tierRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    alignItems: 'flex-end',
  },
  tierText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  tierGreen: {color: '#16a34a'},
  tierRed: {color: '#dc2626'},
});
