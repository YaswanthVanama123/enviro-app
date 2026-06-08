import React, {useCallback} from 'react';
import {View, Text, StyleSheet} from 'react-native';
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
import {Colors} from '../../../../../../theme/colors';
import {Spacing} from '../../../../../../theme/spacing';
import {FontSize} from '../../../../../../theme/typography';
import {
  buildSanipodActiveConfig,
  buildSanipodState,
  computeSanipodCalc,
  sanipodBaselineRates,
  type BackendSanipodConfig,
} from './sanipodCalc';
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
  'podQuantity',
  'extraBagsPerWeek',
  'extraBagsRecurring',
  'frequency',
  'weeklyRatePerUnit',
  'altWeeklyRatePerUnit',
  'extraBagPrice',
  'standaloneExtraWeeklyCharge',
  'isStandalone',
  'isNewInstall',
  'installQuantity',
  'installRatePerPod',
  'rateCategory',
  'serviceRule',
];

const money = (n: number) => `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;

export function SanipodForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const backendConfig: BackendSanipodConfig | null = (pricingConfig?.config as BackendSanipodConfig) ?? null;
  const activeConfig = buildSanipodActiveConfig(backendConfig);
  const baseline = sanipodBaselineRates(activeConfig);

  const state = buildSanipodState(data, contractMonths, activeConfig);
  const calc = computeSanipodCalc(state, activeConfig, baseline, 0);

  const freq = state.frequency;
  const pods = state.podQuantity;
  const isOneTime = freq === 'oneTime';
  const isVisitBased =
    isOneTime ||
    freq === 'quarterly' ||
    freq === 'biannual' ||
    freq === 'annual' ||
    freq === 'bimonthly' ||
    freq === 'everyFourWeeks';
  const monthlyGroup = !isVisitBased;
  const recurringLabel =
    freq === 'bimonthly' || freq === 'quarterly' || freq === 'biannual' || freq === 'annual' || freq === 'everyFourWeeks'
      ? 'Recurring Visit Total'
      : 'Per Visit Service';

  const hasService = pods > 0 || state.extraBagsPerWeek > 0 || (state.isNewInstall && state.installQuantity > 0);
  const isGreenline = !isOneTime && pods > 0 && calc.contractTotal > calc.originalContractTotal * 1.3;

  const effectiveRuleLabel =
    calc.chosenServiceRule === 'perPod8'
      ? money(state.altWeeklyRatePerUnit)
      : `${money(state.weeklyRatePerUnit)} + ${money(state.standaloneExtraWeeklyCharge)}`;
  const ruleLabel = state.isStandalone ? effectiveRuleLabel : `${money(state.altWeeklyRatePerUnit)} (always)`;
  const bagUnitLabel = state.extraBagsRecurring ? '$/bag/wk' : '$/bag one-time';

  const update = useCallback(
    (fields: Record<string, any>) => {
      trackServiceChanges('sanipod', fields, state, {quantity: state.podQuantity, frequency: state.frequency});
      const merged = {...data, ...fields};
      const clearOverrides = RESET_OVERRIDE_FIELDS.some(k => k in fields);
      if (clearOverrides) {
        merged.customInstallationFee = undefined;
        merged.customPerVisitPrice = undefined;
        merged.customMonthlyPrice = undefined;
        merged.customAnnualPrice = undefined;
        merged.customWeeklyPodRate = undefined;
        merged.customPodServiceTotal = undefined;
        merged.customExtraBagsTotal = undefined;
      }

      const nextState = buildSanipodState(merged, contractMonths, activeConfig);
      const nextCalc = computeSanipodCalc(nextState, activeConfig, baseline, 0);
      onChange({
        serviceId: 'sanipod',
        displayName: 'SaniPod',
        ...merged,
        frequency: nextState.frequency,
        contractMonths,
        isActive: nextState.podQuantity > 0,
        perVisit: nextCalc.perVisit,
        monthlyRecurring: nextCalc.ongoingMonthly,
        firstVisit: nextCalc.firstVisit,
        firstMonthPrice: nextCalc.monthly,
        installCost: nextCalc.installCost,
        contractTotal: nextCalc.contractTotal,
        originalContractTotal: nextCalc.originalContractTotal,
      });
    },
    [data, contractMonths, activeConfig, baseline, onChange],
  );

  return (
    <ServiceCard
      serviceId="sanipod"
      displayName="SaniPod (Standalone Only)"
      icon="cube-outline"
      iconColor="#7c3aed"
      iconBg="#ede9fe"
      onRemove={onRemove}
      notes={data?.notes ?? ''}
      onNotesChange={v => update({notes: v})}>
      <DropdownRow label="Frequency" value={freq} options={FREQUENCY_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />

      <NumberRow
        label="Package Base Rate ($/pod/wk)"
        value={state.weeklyRatePerUnit}
        onChange={v => update({weeklyRatePerUnit: v})}
        prefix="$"
        decimals={2}
      />
      <NumberRow
        label="Alternative Flat Rate ($/pod/wk)"
        value={state.altWeeklyRatePerUnit}
        onChange={v => update({altWeeklyRatePerUnit: v})}
        prefix="$"
        decimals={2}
      />
      <NumberRow
        label="Standalone Base Weekly Charge"
        value={state.standaloneExtraWeeklyCharge}
        onChange={v => update({standaloneExtraWeeklyCharge: v})}
        prefix="$"
        decimals={2}
      />
      <ToggleRow
        label="Standalone (no SaniClean)"
        value={state.isStandalone}
        onChange={v => update({isStandalone: v})}
        subtitle="Adds the standalone base weekly charge"
      />
      <FormDivider />

      <CalcRow
        label="SaniPods"
        qty={pods}
        onQtyChange={v => update({podQuantity: v})}
        rate={calc.effectiveRatePerPod}
        onRateChange={() => {}}
        rateReadOnly
        total={calc.adjustedPodServiceTotal}
      />
      {pods > 0 && (
        <View style={styles.ruleRow}>
          <Text style={styles.ruleText}>using {ruleLabel}/wk</Text>
        </View>
      )}

      <CalcRow
        label="Extra Bags"
        qty={state.extraBagsPerWeek}
        onQtyChange={v => update({extraBagsPerWeek: v})}
        rate={state.extraBagPrice}
        onRateChange={v => update({extraBagPrice: v})}
        total={calc.adjustedBagsTotal}
      />
      <ToggleRow
        label="Bags Recurring"
        value={state.extraBagsRecurring}
        onChange={v => update({extraBagsRecurring: v})}
        subtitle={bagUnitLabel}
      />
      <FormDivider />

      <ToggleRow
        label="New Install?"
        value={state.isNewInstall}
        onChange={v => update({isNewInstall: v})}
        subtitle="One-time installation charge"
      />
      {state.isNewInstall && (
        <>
          <CalcRow
            label="Install Pods"
            qty={state.installQuantity}
            onQtyChange={v => update({installQuantity: v})}
            rate={state.installRatePerPod}
            onRateChange={v => update({installRatePerPod: v})}
            total={state.installQuantity * state.installRatePerPod}
          />
          <DollarRow label="Installation Total" value={calc.installCost} />
        </>
      )}

      {hasService && (
        <>
          <FormDivider />

          {monthlyGroup && <DollarRow label="First Visit Total" value={calc.firstVisit} />}
          {isVisitBased && !isOneTime && <DollarRow label="First Visit Total" value={calc.adjustedMonthly} />}

          {!isOneTime && <DollarRow label={recurringLabel} value={calc.adjustedPerVisit} />}

          {monthlyGroup && <DollarRow label="First Month Total" value={calc.adjustedMonthly} />}
          {monthlyGroup && <DollarRow label="Monthly Recurring" value={calc.ongoingMonthly} />}

          {isOneTime ? (
            <DollarRow label="Total Price" value={calc.contractTotal} highlight />
          ) : (
            <DollarRow label={`Contract Total (${contractMonths} mo)`} value={calc.adjustedAnnual} highlight />
          )}

          {!isOneTime && pods > 0 && (
            <View style={styles.badgeRow}>
              <View style={[styles.badge, isGreenline ? styles.greenBadge : styles.redBadge]}>
                <Text style={[styles.badgeText, isGreenline ? styles.greenText : styles.redText]}>
                  {isGreenline ? '🟢 Greenline Pricing' : '🔴 Redline Pricing'}
                </Text>
              </View>
            </View>
          )}
        </>
      )}
    </ServiceCard>
  );
}

const styles = StyleSheet.create({
  ruleRow: {paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm},
  ruleText: {fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600'},
  badgeRow: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm},
  badge: {alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6},
  greenBadge: {backgroundColor: '#e8f5e9'},
  redBadge: {backgroundColor: '#ffebee'},
  badgeText: {fontSize: 13, fontWeight: '600'},
  greenText: {color: '#388e3c'},
  redText: {color: '#d32f2f'},
});
