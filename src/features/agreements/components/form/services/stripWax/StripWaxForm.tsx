import React, {useCallback} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  ServiceCard,
  DropdownRow,
  FormDivider,
  NumberRow,
  ToggleRow,
  CalcRow,
  DollarRow,
} from '../base/ServiceBase';
import {FREQUENCY_OPTIONS} from '../../../../../../shared/constants/frequency';
import {Spacing} from '../../../../../../theme/spacing';
import {FontSize} from '../../../../../../theme/typography';
import {
  buildStripWaxActiveConfig,
  buildStripWaxState,
  computeStripWaxCalc,
  type BackendStripWaxConfig,
  type StripWaxServiceVariant,
} from './stripWaxCalc';
import {trackServiceChanges} from '../../../../utils/fileLogger';

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
}

// Editing any of these base inputs clears the manual total overrides (matches web).
const RESET_OVERRIDE_FIELDS = [
  'floorAreaSqFt',
  'ratePerSqFt',
  'minCharge',
  'serviceVariant',
  'frequency',
  'rateCategory',
  'applyMinimum',
];

export function StripWaxForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const backendConfig: BackendStripWaxConfig | null = (pricingConfig?.config as BackendStripWaxConfig) ?? null;
  const activeConfig = buildStripWaxActiveConfig(backendConfig);

  const state = buildStripWaxState(data, contractMonths, activeConfig);
  const calc = computeStripWaxCalc(state, activeConfig, 0);

  const freq = state.frequency;
  const area = state.floorAreaSqFt;
  const isOneTime = freq === 'oneTime';
  const isVisitBased =
    isOneTime ||
    freq === 'quarterly' ||
    freq === 'biannual' ||
    freq === 'annual' ||
    freq === 'bimonthly' ||
    freq === 'everyFourWeeks';
  const monthlyGroup = !isVisitBased;
  const recurringVisitGroup =
    freq === 'bimonthly' || freq === 'quarterly' || freq === 'biannual' || freq === 'annual' || freq === 'everyFourWeeks';

  const hasService = area > 0;
  const isGreenline = hasService && calc.contractTotal > calc.originalContractTotal * 1.3;

  const variantOptions = (Object.keys(activeConfig.variants) as StripWaxServiceVariant[]).map(k => ({
    value: k,
    label: activeConfig.variants[k].label ?? k,
  }));

  const update = useCallback(
    (fields: Record<string, any>) => {
      trackServiceChanges('stripwax', fields, state, {quantity: state.floorAreaSqFt, frequency: state.frequency});
      const merged = {...data, ...fields};

      // Switching variant pulls in that variant's rate + minimum (matches web).
      if ('serviceVariant' in fields) {
        const vd = activeConfig.variants[fields.serviceVariant] ?? activeConfig.variants[activeConfig.defaultVariant];
        merged.ratePerSqFt = vd.ratePerSqFt;
        merged.minCharge = vd.minCharge;
      }

      const clearOverrides = RESET_OVERRIDE_FIELDS.some(k => k in fields);
      if (clearOverrides) {
        merged.customPerVisit = undefined;
        merged.customMonthly = undefined;
        merged.customOngoingMonthly = undefined;
        merged.customContractTotal = undefined;
      }

      const nextState = buildStripWaxState(merged, contractMonths, activeConfig);
      const nextCalc = computeStripWaxCalc(nextState, activeConfig, 0);
      onChange({
        serviceId: 'stripwax',
        displayName: 'Strip & Wax',
        ...merged,
        frequency: nextState.frequency,
        serviceVariant: nextState.serviceVariant,
        ratePerSqFt: nextState.ratePerSqFt,
        minCharge: nextState.minCharge,
        contractMonths,
        isActive: nextState.floorAreaSqFt > 0,
        perVisit: nextCalc.perVisit,
        monthlyRecurring: nextCalc.ongoingMonthly,
        contractTotal: nextCalc.contractTotal,
        originalContractTotal: nextCalc.originalContractTotal,
      });
    },
    [data, contractMonths, activeConfig, onChange],
  );

  return (
    <ServiceCard
      serviceId="stripwax"
      displayName="Strip & Wax Floor"
      icon="sparkles-outline"
      iconColor="#ea580c"
      iconBg="#ffedd5"
      onRemove={onRemove}
      notes={data?.notes ?? ''}
      onNotesChange={v => update({notes: v})}>
      <DropdownRow label="Frequency" value={freq} options={FREQUENCY_OPTIONS} onChange={v => update({frequency: v})} />
      <DropdownRow
        label="Service Type"
        value={state.serviceVariant}
        options={variantOptions}
        onChange={v => update({serviceVariant: v})}
      />
      <FormDivider />

      <CalcRow
        label="Floor Area (sq ft)"
        qty={area}
        onQtyChange={v => update({floorAreaSqFt: v})}
        rate={state.ratePerSqFt}
        onRateChange={v => update({ratePerSqFt: v})}
        total={calc.perVisit}
      />
      <View style={styles.noteRow}>
        <Text style={styles.noteText}>
          Direct: area × ${state.ratePerSqFt.toFixed(2)}/sq ft, min ${state.minCharge.toFixed(2)}
        </Text>
      </View>

      <NumberRow
        label="Minimum Charge"
        value={state.minCharge}
        onChange={v => update({minCharge: v})}
        prefix="$"
        decimals={2}
      />
      <ToggleRow
        label="Apply Minimum"
        value={state.applyMinimum !== false}
        onChange={v => update({applyMinimum: v})}
        subtitle="Use minimum charge when area cost is lower"
      />

      {hasService && (
        <>
          <FormDivider />
          <DollarRow label="Per Visit Total" value={calc.perVisit} />

          <View style={styles.badgeRow}>
            <View style={[styles.badge, isGreenline ? styles.greenBadge : styles.redBadge]}>
              <Text style={[styles.badgeText, isGreenline ? styles.greenText : styles.redText]}>
                <Ionicons
                  name="ellipse"
                  size={14}
                  color={isGreenline ? '#388e3c' : '#d32f2f'}
                />
                {isGreenline ? ' Greenline Pricing' : ' Redline Pricing'}
              </Text>
            </View>
          </View>

          {recurringVisitGroup && <DollarRow label="Recurring Visit Total" value={calc.perVisit} />}

          {monthlyGroup && (
            <>
              <DollarRow label="First Month Total" value={calc.monthly} />
              <DollarRow label="Monthly Recurring" value={calc.ongoingMonthly} />
            </>
          )}

          {isOneTime ? (
            <DollarRow label="Total Price" value={calc.contractTotal} highlight />
          ) : (
            <DollarRow label={`Contract Total (${contractMonths} mo)`} value={calc.contractTotal} highlight />
          )}
        </>
      )}
    </ServiceCard>
  );
}

const styles = StyleSheet.create({
  noteRow: {paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm},
  noteText: {fontSize: FontSize.xs, color: '#9ca3af'},
  badgeRow: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm},
  badge: {alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6},
  greenBadge: {backgroundColor: '#e8f5e9'},
  redBadge: {backgroundColor: '#ffebee'},
  badgeText: {fontSize: 13, fontWeight: '600'},
  greenText: {color: '#388e3c'},
  redText: {color: '#d32f2f'},
});
