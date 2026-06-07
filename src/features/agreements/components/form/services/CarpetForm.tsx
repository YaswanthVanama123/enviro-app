import React, {useCallback} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {
  ServiceCard,
  DropdownRow,
  FormDivider,
  NumberRow,
  ToggleRow,
  DollarRow,
} from './ServiceBase';
import {Spacing} from '../../../../../theme/spacing';
import {FontSize} from '../../../../../theme/typography';
import {
  buildCarpetBaseConfig,
  computeCarpetCalc,
  clampCarpetFrequency,
  carpetFrequencyLabels,
  carpetFrequencyList,
  type BackendCarpetConfig,
  type CarpetFormState,
} from './carpetCalc';

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
}

const CARPET_FREQ_OPTIONS = carpetFrequencyList.map(value => ({
  value,
  label: carpetFrequencyLabels[value],
}));

// Editing any of these base inputs clears the manual total overrides (matches web).
const RESET_OVERRIDE_FIELDS = [
  'areaSqFt',
  'useExactSqft',
  'frequency',
  'includeInstall',
  'isDirtyInstall',
];

export function CarpetForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const backendConfig: BackendCarpetConfig | null =
    (pricingConfig?.config as BackendCarpetConfig) ?? null;
  const baseConfig = buildCarpetBaseConfig(backendConfig);

  const freq = clampCarpetFrequency(data?.frequency ?? 'monthly');
  const areaSqFt = data?.areaSqFt ?? 0;
  const firstUnitRate = data?.firstUnitRate ?? baseConfig.firstUnitRate;
  const additionalUnitRate = data?.additionalUnitRate ?? baseConfig.additionalUnitRate;
  const perVisitMinimum = data?.perVisitMinimum ?? baseConfig.perVisitMinimum;
  const applyMinimum = data?.applyMinimum !== false;
  const useExactSqft = data?.useExactSqft !== false;
  const includeInstall = data?.includeInstall === true;
  const isDirtyInstall = data?.isDirtyInstall !== false;
  const installMultiplierDirty = data?.installMultiplierDirty ?? baseConfig.installMultipliers.dirty;
  const installMultiplierClean = data?.installMultiplierClean ?? baseConfig.installMultipliers.clean;

  const formState: CarpetFormState = {
    frequency: freq,
    areaSqFt,
    useExactSqft,
    contractMonths,
    includeInstall,
    isDirtyInstall,
    applyMinimum,
    firstUnitRate,
    additionalUnitRate,
    perVisitMinimum,
    installMultiplierDirty,
    installMultiplierClean,
    customPerVisitPrice: data?.customPerVisitPrice,
    customInstallationFee: data?.customInstallationFee,
    customMonthlyRecurring: data?.customMonthlyRecurring,
    customFirstMonthPrice: data?.customFirstMonthPrice,
    customContractTotal: data?.customContractTotal,
  };

  const calc = computeCarpetCalc(formState, baseConfig, backendConfig, 0);

  const update = useCallback(
    (fields: Record<string, any>) => {
      const clearOverrides = RESET_OVERRIDE_FIELDS.some(k => k in fields);
      const merged = {...data, ...fields};
      if (clearOverrides) {
        merged.customPerVisitPrice = undefined;
        merged.customInstallationFee = undefined;
        merged.customMonthlyRecurring = undefined;
        merged.customFirstMonthPrice = undefined;
        merged.customContractTotal = undefined;
      }

      const next: CarpetFormState = {
        frequency: clampCarpetFrequency(merged.frequency ?? 'monthly'),
        areaSqFt: merged.areaSqFt ?? 0,
        useExactSqft: merged.useExactSqft !== false,
        contractMonths,
        includeInstall: merged.includeInstall === true,
        isDirtyInstall: merged.isDirtyInstall !== false,
        applyMinimum: merged.applyMinimum !== false,
        firstUnitRate: merged.firstUnitRate ?? baseConfig.firstUnitRate,
        additionalUnitRate: merged.additionalUnitRate ?? baseConfig.additionalUnitRate,
        perVisitMinimum: merged.perVisitMinimum ?? baseConfig.perVisitMinimum,
        installMultiplierDirty: merged.installMultiplierDirty ?? baseConfig.installMultipliers.dirty,
        installMultiplierClean: merged.installMultiplierClean ?? baseConfig.installMultipliers.clean,
        customPerVisitPrice: merged.customPerVisitPrice,
        customInstallationFee: merged.customInstallationFee,
        customMonthlyRecurring: merged.customMonthlyRecurring,
        customFirstMonthPrice: merged.customFirstMonthPrice,
        customContractTotal: merged.customContractTotal,
      };
      const nextCalc = computeCarpetCalc(next, baseConfig, backendConfig, 0);
      onChange({
        ...merged,
        serviceId: 'carpetclean',
        displayName: 'Carpet Cleaning',
        ...next,
        isActive: next.areaSqFt > 0,
        perVisit: nextCalc.perVisitCharge,
        perVisitBase: nextCalc.perVisitBase,
        installOneTime: nextCalc.installOneTime,
        firstMonthTotal: nextCalc.firstMonthTotal,
        monthlyRecurring: nextCalc.monthlyTotal,
        contractTotal: nextCalc.contractTotal,
        originalContractTotal: nextCalc.originalContractTotal,
      });
    },
    [data, contractMonths, baseConfig, backendConfig, onChange],
  );

  const isOneTime = freq === 'oneTime';
  const isVisitBased = calc.isVisitBasedFrequency;
  const showMonthlyRecurring =
    freq === 'weekly' || freq === 'biweekly' || freq === 'monthly' || freq === 'twicePerMonth';
  const isGreenline = areaSqFt > 0 && calc.contractTotal > calc.originalContractTotal * 1.3;

  return (
    <ServiceCard
      serviceId="carpetclean"
      displayName="Carpet Cleaning"
      icon="grid-outline"
      iconColor="#92400e"
      iconBg="#fef3c7"
      onRemove={onRemove}
      notes={data?.notes ?? ''}
      onNotesChange={v => update({notes: v})}>
      <DropdownRow
        label="Frequency"
        value={freq}
        options={CARPET_FREQ_OPTIONS}
        onChange={v => update({frequency: v})}
      />

      <NumberRow
        label={`First ${baseConfig.unitSqFt} sq ft Rate`}
        value={firstUnitRate}
        onChange={v => update({firstUnitRate: v})}
        prefix="$"
        decimals={2}
      />
      <NumberRow
        label="Additional Rate"
        value={additionalUnitRate}
        onChange={v => update({additionalUnitRate: v})}
        prefix="$"
        decimals={2}
      />
      <NumberRow
        label="Minimum Charge"
        value={perVisitMinimum}
        onChange={v => update({perVisitMinimum: v})}
        prefix="$"
        decimals={2}
      />
      <ToggleRow
        label="Apply Minimum"
        value={applyMinimum}
        onChange={v => update({applyMinimum: v})}
      />

      <NumberRow
        label="Carpet Area"
        value={areaSqFt}
        onChange={v => update({areaSqFt: v})}
        suffix="sq ft"
        decimals={0}
      />

      <ToggleRow
        label="Exact sq ft calculation"
        value={useExactSqft}
        onChange={v => update({useExactSqft: v})}
        subtitle={
          useExactSqft
            ? `Excess × $${(additionalUnitRate / baseConfig.unitSqFt).toFixed(2)}/sq ft`
            : `Excess in ${baseConfig.unitSqFt} sq ft blocks × $${additionalUnitRate}`
        }
      />

      <ToggleRow
        label="Include Install"
        value={includeInstall}
        onChange={v => update({includeInstall: v})}
      />
      {includeInstall && (
        <>
          <ToggleRow
            label="Dirty"
            value={isDirtyInstall}
            onChange={v => update({isDirtyInstall: v})}
          />
          <NumberRow
            label="Install Multiplier"
            value={isDirtyInstall ? installMultiplierDirty : installMultiplierClean}
            onChange={v =>
              update(
                isDirtyInstall
                  ? {installMultiplierDirty: v}
                  : {installMultiplierClean: v},
              )
            }
            suffix="× monthly base"
            decimals={2}
          />
        </>
      )}

      {includeInstall && calc.installOneTime > 0 && (
        <DollarRow label="Installation Total" value={calc.installOneTime} />
      )}

      <FormDivider />

      <DollarRow
        label={isVisitBased ? 'Recurring Visit Total' : 'Per Visit Total'}
        value={calc.perVisitCharge}
      />

      {areaSqFt > 0 && (
        <View style={styles.tierRow}>
          <Text style={[styles.tierText, isGreenline ? styles.tierGreen : styles.tierRed]}>
            {isGreenline ? '🟢 Greenline Pricing' : '🔴 Redline Pricing'}
          </Text>
        </View>
      )}

      {isOneTime && (
        <DollarRow label="Total Price" value={calc.contractTotal} highlight />
      )}

      {!isOneTime && (
        <DollarRow
          label={isVisitBased ? 'First Visit Total' : 'First Month Total'}
          value={calc.firstMonthTotal}
        />
      )}

      {showMonthlyRecurring && (
        <DollarRow label="Recurring Month Total" value={calc.monthlyTotal} />
      )}

      {!isOneTime && (
        <DollarRow
          label={`Contract Total (${contractMonths} mo)`}
          value={calc.contractTotal}
          highlight
        />
      )}
    </ServiceCard>
  );
}

const styles = StyleSheet.create({
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
