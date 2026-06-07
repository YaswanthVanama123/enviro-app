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
  const useExactSqft = data?.useExactSqft === true;
  const includeInstall = data?.includeInstall === true;
  const isDirtyInstall = data?.isDirtyInstall !== false;
  const installMultiplierDirty = data?.installMultiplierDirty ?? baseConfig.installMultipliers.dirty;
  const installMultiplierClean = data?.installMultiplierClean ?? baseConfig.installMultipliers.clean;

  const buildFormState = (overrides: Record<string, any> = {}): CarpetFormState => ({
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
    ...overrides,
  });

  const calc = computeCarpetCalc(buildFormState(), baseConfig, backendConfig, 0);

  const update = useCallback(
    (fields: Record<string, any>) => {
      const next: CarpetFormState = {
        frequency: clampCarpetFrequency(fields.frequency ?? freq),
        areaSqFt: fields.areaSqFt ?? areaSqFt,
        useExactSqft: fields.useExactSqft ?? useExactSqft,
        contractMonths,
        includeInstall: fields.includeInstall ?? includeInstall,
        isDirtyInstall: fields.isDirtyInstall ?? isDirtyInstall,
        applyMinimum:
          fields.applyMinimum !== undefined ? fields.applyMinimum : applyMinimum,
        firstUnitRate: fields.firstUnitRate ?? firstUnitRate,
        additionalUnitRate: fields.additionalUnitRate ?? additionalUnitRate,
        perVisitMinimum: fields.perVisitMinimum ?? perVisitMinimum,
        installMultiplierDirty: fields.installMultiplierDirty ?? installMultiplierDirty,
        installMultiplierClean: fields.installMultiplierClean ?? installMultiplierClean,
      };
      const nextCalc = computeCarpetCalc(next, baseConfig, backendConfig, 0);
      onChange({
        serviceId: 'carpetclean',
        displayName: 'Carpet Cleaning',
        ...data,
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
    [
      data,
      freq,
      areaSqFt,
      useExactSqft,
      includeInstall,
      isDirtyInstall,
      applyMinimum,
      firstUnitRate,
      additionalUnitRate,
      perVisitMinimum,
      installMultiplierDirty,
      installMultiplierClean,
      contractMonths,
      baseConfig,
      backendConfig,
      onChange,
    ],
  );

  const isOneTime = freq === 'oneTime';
  const isVisitBased = calc.isVisitBasedFrequency;
  const showMonthlyRecurring =
    freq === 'weekly' || freq === 'biweekly' || freq === 'monthly' || freq === 'twicePerMonth';
  const isGreenline =
    areaSqFt > 0 && calc.contractTotal > calc.originalContractTotal * 1.3;

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
      <FormDivider />

      <NumberRow
        label={`First ${baseConfig.unitSqFt} sq ft Rate`}
        value={firstUnitRate}
        onChange={v => update({firstUnitRate: v})}
        prefix="$"
        decimals={2}
      />
      <NumberRow
        label="Additional Rate (per block)"
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
        subtitle="Use minimum charge when calculated cost is lower"
      />

      <FormDivider />
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

      <FormDivider />
      <ToggleRow
        label="Include Install"
        value={includeInstall}
        onChange={v => update({includeInstall: v})}
      />
      {includeInstall && (
        <>
          <ToggleRow
            label="Dirty Install"
            value={isDirtyInstall}
            onChange={v => update({isDirtyInstall: v})}
            subtitle={isDirtyInstall ? 'Dirty multiplier' : 'Clean multiplier'}
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
            suffix="× base"
            decimals={2}
          />
        </>
      )}

      <View style={styles.totals}>
        <View style={styles.totalsHeader}>
          <Text style={styles.totalsHeaderText}>Pricing Summary</Text>
        </View>

        <DollarRow
          label={isVisitBased ? 'Recurring Visit Total' : 'Per Visit Total'}
          value={calc.perVisitCharge}
        />

        {includeInstall && calc.installOneTime > 0 && (
          <DollarRow label="Installation Total" value={calc.installOneTime} />
        )}

        {isOneTime ? (
          <DollarRow label="Total Price" value={calc.contractTotal} highlight />
        ) : (
          <>
            <DollarRow
              label={isVisitBased ? 'First Visit Total' : 'First Month Total'}
              value={calc.firstMonthTotal}
            />
            {showMonthlyRecurring && (
              <DollarRow label="Monthly Recurring" value={calc.monthlyTotal} />
            )}
            <FormDivider />
            <DollarRow
              label={`Contract Total (${contractMonths} mo)`}
              value={calc.contractTotal}
              highlight
            />
          </>
        )}

        {areaSqFt > 0 && (
          <View style={styles.tierRow}>
            <Text style={[styles.tierText, isGreenline ? styles.tierGreen : styles.tierRed]}>
              {isGreenline ? '🟢 Greenline Pricing' : '🔴 Redline Pricing'}
            </Text>
          </View>
        )}
      </View>
    </ServiceCard>
  );
}

const styles = StyleSheet.create({
  totals: {
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  totalsHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: '#f8fafc',
  },
  totalsHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
