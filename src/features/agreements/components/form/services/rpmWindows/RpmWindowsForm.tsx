import React, {useCallback} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {
  ServiceCard,
  DropdownRow,
  FormDivider,
  NumberRow,
  ToggleRow,
  DollarRow,
  CalcRow,
} from '../base/ServiceBase';
import {Spacing} from '../../../../../../theme/spacing';
import {FontSize} from '../../../../../../theme/typography';
import {
  computeRpmWindowsCalc,
  getBackendBaseRates,
  getEffectiveFrequencyKey,
  getFrequencyMultiplier,
  mapFrequency,
  type BackendRpmConfig,
  type RpmFrequencyKey,
  type RpmRateCategory,
  type RpmWindowsFormState,
} from './rpmWindowsCalc';
import {FREQUENCY_OPTIONS} from '../../../../../../shared/constants/frequency';

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
}

const RPM_FREQ_OPTIONS = FREQUENCY_OPTIONS;
const RATE_CATEGORY_OPTIONS = [
  {value: 'redRate', label: 'Red Rate'},
  {value: 'greenRate', label: 'Green Rate'},
];

const RESET_OVERRIDE_FIELDS = [
  'smallQty',
  'mediumQty',
  'largeQty',
  'baseSmall',
  'baseMedium',
  'baseLarge',
  'frequency',
  'selectedRateCategory',
  'isFirstTimeInstall',
  'installMultiplierFirstTime',
  'installMultiplierClean',
];

export function RpmWindowsForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const backendConfig: BackendRpmConfig | null = (pricingConfig?.config as BackendRpmConfig) ?? null;
  const backendBase = getBackendBaseRates(backendConfig);

  const freq: RpmFrequencyKey = mapFrequency(data?.frequency ?? 'weekly');
  const freqMult = getFrequencyMultiplier(getEffectiveFrequencyKey(freq), backendConfig);

  const smallQty = data?.smallQty ?? 0;
  const mediumQty = data?.mediumQty ?? 0;
  const largeQty = data?.largeQty ?? 0;
  const selectedRateCategory: RpmRateCategory =
    data?.selectedRateCategory === 'greenRate' ? 'greenRate' : 'redRate';
  const isFirstTimeInstall = data?.isFirstTimeInstall === true;
  const applyMinimum = data?.applyMinimum !== false;
  const installMultiplierFirstTime = data?.installMultiplierFirstTime ?? (backendConfig?.installPricing?.installationMultiplier ?? 3);
  const installMultiplierClean = data?.installMultiplierClean ?? (backendConfig?.installPricing?.cleanInstallationMultiplier ?? 1);

  const baseSmall = data?.baseSmall ?? backendBase.small;
  const baseMedium = data?.baseMedium ?? backendBase.medium;
  const baseLarge = data?.baseLarge ?? backendBase.large;
  const baseTrip = data?.baseTrip ?? backendBase.trip;

  const effSmall = baseSmall * freqMult;
  const effMedium = baseMedium * freqMult;
  const effLarge = baseLarge * freqMult;
  const effTrip = baseTrip * freqMult;

  const buildState = (): RpmWindowsFormState => ({
    smallQty,
    mediumQty,
    largeQty,
    smallWindowRate: effSmall,
    mediumWindowRate: effMedium,
    largeWindowRate: effLarge,
    tripCharge: effTrip,
    isFirstTimeInstall,
    selectedRateCategory,
    installMultiplierFirstTime,
    installMultiplierClean,
    extraCharges: data?.extraCharges ?? [],
    contractMonths,
    frequency: freq,
    applyMinimum,
    customInstallationFee: data?.customInstallationFee,
    customPerVisitPrice: data?.customPerVisitPrice,
    customMonthlyRecurring: data?.customMonthlyRecurring,
    customContractTotal: data?.customContractTotal,
  });

  const calc = computeRpmWindowsCalc(buildState(), {small: baseSmall, medium: baseMedium, large: baseLarge, trip: baseTrip}, backendConfig, 0);

  const update = useCallback(
    (fields: Record<string, any>) => {
      const merged = {...data, ...fields};
      const clearOverrides = RESET_OVERRIDE_FIELDS.some(k => k in fields);
      if (clearOverrides) {
        merged.customInstallationFee = undefined;
        merged.customPerVisitPrice = undefined;
        merged.customMonthlyRecurring = undefined;
        merged.customContractTotal = undefined;
      }

      const nFreq = mapFrequency(merged.frequency ?? 'weekly');
      const nFreqMult = getFrequencyMultiplier(getEffectiveFrequencyKey(nFreq), backendConfig);
      const nBaseSmall = merged.baseSmall ?? backendBase.small;
      const nBaseMedium = merged.baseMedium ?? backendBase.medium;
      const nBaseLarge = merged.baseLarge ?? backendBase.large;
      const nBaseTrip = merged.baseTrip ?? backendBase.trip;

      const next: RpmWindowsFormState = {
        smallQty: merged.smallQty ?? 0,
        mediumQty: merged.mediumQty ?? 0,
        largeQty: merged.largeQty ?? 0,
        smallWindowRate: nBaseSmall * nFreqMult,
        mediumWindowRate: nBaseMedium * nFreqMult,
        largeWindowRate: nBaseLarge * nFreqMult,
        tripCharge: nBaseTrip * nFreqMult,
        isFirstTimeInstall: merged.isFirstTimeInstall === true,
        selectedRateCategory: merged.selectedRateCategory === 'greenRate' ? 'greenRate' : 'redRate',
        installMultiplierFirstTime:
          merged.installMultiplierFirstTime ?? (backendConfig?.installPricing?.installationMultiplier ?? 3),
        installMultiplierClean:
          merged.installMultiplierClean ?? (backendConfig?.installPricing?.cleanInstallationMultiplier ?? 1),
        extraCharges: merged.extraCharges ?? [],
        contractMonths,
        frequency: nFreq,
        applyMinimum: merged.applyMinimum !== false,
        customInstallationFee: merged.customInstallationFee,
        customPerVisitPrice: merged.customPerVisitPrice,
        customMonthlyRecurring: merged.customMonthlyRecurring,
        customContractTotal: merged.customContractTotal,
      };
      const c = computeRpmWindowsCalc(next, {small: nBaseSmall, medium: nBaseMedium, large: nBaseLarge, trip: nBaseTrip}, backendConfig, 0);
      onChange({
        ...merged,
        serviceId: 'rpmWindows',
        displayName: 'RPM Windows',
        smallQty: next.smallQty,
        mediumQty: next.mediumQty,
        largeQty: next.largeQty,
        baseSmall: nBaseSmall,
        baseMedium: nBaseMedium,
        baseLarge: nBaseLarge,
        baseTrip: nBaseTrip,
        smallWindowRate: next.smallWindowRate,
        mediumWindowRate: next.mediumWindowRate,
        largeWindowRate: next.largeWindowRate,
        frequency: nFreq,
        selectedRateCategory: next.selectedRateCategory,
        isFirstTimeInstall: next.isFirstTimeInstall,
        installMultiplierFirstTime: next.installMultiplierFirstTime,
        installMultiplierClean: next.installMultiplierClean,
        applyMinimum: next.applyMinimum,
        isActive: next.smallQty > 0 || next.mediumQty > 0 || next.largeQty > 0,
        perVisit: c.recurringPerVisitRated,
        installOneTime: c.installOneTime,
        firstVisitTotalRated: c.firstVisitTotalRated,
        firstMonthPrice: c.firstMonthBillRated,
        monthlyRecurring: c.monthlyBillRated,
        contractTotal: c.contractTotalRated,
        originalContractTotal: c.originalContractTotal,
        minimumChargePerVisit: c.minimumChargePerVisit,
      });
    },
    [data, contractMonths, backendConfig, backendBase],
  );

  const isOneTime = freq === 'oneTime';
  const monthlyGroup = freq === 'weekly' || freq === 'biweekly' || freq === 'monthly' || freq === 'twicePerMonth';
  const isVisitBased = !monthlyGroup;
  const hasWindows = smallQty > 0 || mediumQty > 0 || largeQty > 0;
  const isGreenline = hasWindows && calc.contractTotalRated > calc.originalContractTotal * 1.3;

  return (
    <ServiceCard
      serviceId="rpmWindows"
      displayName="RPM Windows"
      icon="albums-outline"
      iconColor="#0369a1"
      iconBg="#e0f2fe"
      onRemove={onRemove}
      notes={data?.notes ?? ''}
      onNotesChange={v => update({notes: v})}>
      <DropdownRow label="Frequency" value={freq} options={RPM_FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <DropdownRow
        label="Rate Category"
        value={selectedRateCategory}
        options={RATE_CATEGORY_OPTIONS}
        onChange={v => update({selectedRateCategory: v})}
      />
      <ToggleRow
        label="First Time (Install)"
        value={isFirstTimeInstall}
        onChange={v => update({isFirstTimeInstall: v})}
        subtitle={isFirstTimeInstall ? 'Dirty/first-time install fee applies' : 'Ongoing / clean'}
      />
      {isFirstTimeInstall && (
        <NumberRow
          label="Install Multiplier"
          value={installMultiplierFirstTime}
          onChange={v => update({installMultiplierFirstTime: v})}
          suffix="× per-visit"
          decimals={2}
        />
      )}
      <FormDivider />

      <CalcRow
        label="Small Windows"
        qty={smallQty}
        onQtyChange={v => update({smallQty: v})}
        rate={effSmall}
        onRateChange={v => update({baseSmall: freqMult ? v / freqMult : v})}
        total={smallQty * effSmall}
      />
      <CalcRow
        label="Medium Windows"
        qty={mediumQty}
        onQtyChange={v => update({mediumQty: v})}
        rate={effMedium}
        onRateChange={v => update({baseMedium: freqMult ? v / freqMult : v})}
        total={mediumQty * effMedium}
      />
      <CalcRow
        label="Large Windows"
        qty={largeQty}
        onQtyChange={v => update({largeQty: v})}
        rate={effLarge}
        onRateChange={v => update({baseLarge: freqMult ? v / freqMult : v})}
        total={largeQty * effLarge}
      />

      <ToggleRow
        label="Apply Minimum"
        value={applyMinimum}
        onChange={v => update({applyMinimum: v})}
        subtitle={`Minimum $${calc.minimumChargePerVisit.toFixed(2)} per visit`}
      />

      {hasWindows && (
        <>
          <FormDivider />
          {isFirstTimeInstall && calc.firstVisitTotalRated > 0 && (
            <DollarRow label="Installation + First Visit" value={calc.firstVisitTotalRated} />
          )}

          <DollarRow
            label={isVisitBased ? 'Recurring Visit Total' : 'Per Visit Total'}
            value={calc.recurringPerVisitRated}
          />

          <View style={styles.tierRow}>
            <Text style={[styles.tierText, isGreenline ? styles.tierGreen : styles.tierRed]}>
              {isGreenline ? '🟢 Greenline Pricing' : '🔴 Redline Pricing'}
            </Text>
          </View>

          {monthlyGroup && (
            <>
              <DollarRow label="First Month Total" value={calc.firstMonthBillRated} />
              <DollarRow label="Monthly Recurring" value={calc.monthlyBillRated} />
            </>
          )}

          {isOneTime ? (
            <DollarRow label="Total Price" value={calc.contractTotalRated} highlight />
          ) : (
            <DollarRow
              label={`Contract Total (${contractMonths} mo)`}
              value={calc.contractTotalRated}
              highlight
            />
          )}
        </>
      )}
    </ServiceCard>
  );
}

const styles = StyleSheet.create({
  tierRow: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, alignItems: 'flex-end'},
  tierText: {fontSize: FontSize.sm, fontWeight: '700'},
  tierGreen: {color: '#16a34a'},
  tierRed: {color: '#dc2626'},
});
