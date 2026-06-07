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
} from './ServiceBase';
import {Spacing} from '../../../../../theme/spacing';
import {FontSize} from '../../../../../theme/typography';
import {Colors} from '../../../../../theme/colors';
import {
  buildFoamingDrainActiveConfig,
  computeFoamingDrainQuote,
  foamingDrainFrequencyLabels,
  foamingDrainFrequencyList,
  type BackendFoamingDrainConfig,
  type FoamingDrainFormState,
  type FoamingDrainFrequency,
} from './foamingDrainCalc';

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
}

const FD_FREQ_OPTIONS = foamingDrainFrequencyList.map(value => ({
  value,
  label: foamingDrainFrequencyLabels[value],
}));
const CONDITION_OPTIONS = [
  {value: 'normal', label: 'Normal'},
  {value: 'filthy', label: 'Filthy (3× install)'},
];
const INSTALL_FREQ_OPTIONS = [
  {value: 'weekly', label: 'Weekly'},
  {value: 'bimonthly', label: 'Bimonthly'},
];

const RESET_OVERRIDE_FIELDS = [
  'standardDrainCount',
  'installDrainCount',
  'filthyDrainCount',
  'greaseTrapCount',
  'greenDrainCount',
  'plumbingDrainCount',
  'frequency',
  'installFrequency',
  'facilityCondition',
  'useSmallAltPricingWeekly',
  'useBigAccountTenWeekly',
  'isAllInclusive',
  'chargeGreaseTrapInstall',
  'needsPlumbing',
];

export function FoamingDrainForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const backendConfig: BackendFoamingDrainConfig | null =
    (pricingConfig?.config as BackendFoamingDrainConfig) ?? null;
  const activeConfig = buildFoamingDrainActiveConfig(backendConfig);

  const num = (v: any, d: number) => (v === undefined || v === null ? d : v);

  const freq: FoamingDrainFrequency = (data?.frequency ?? 'weekly') as FoamingDrainFrequency;
  const standardDrainCount = data?.standardDrainCount ?? 0;
  const installDrainCount = data?.installDrainCount ?? 0;
  const greaseTrapCount = data?.greaseTrapCount ?? 0;
  const greenDrainCount = data?.greenDrainCount ?? 0;
  const plumbingDrainCount = data?.plumbingDrainCount ?? 0;
  const needsPlumbing = data?.needsPlumbing === true;
  const facilityCondition: 'normal' | 'filthy' =
    data?.facilityCondition === 'filthy' ? 'filthy' : 'normal';
  const installFrequency: 'weekly' | 'bimonthly' =
    data?.installFrequency === 'bimonthly' ? 'bimonthly' : 'weekly';
  const useSmallAltPricingWeekly = data?.useSmallAltPricingWeekly === true;
  const useBigAccountTenWeekly = data?.useBigAccountTenWeekly === true;
  const isAllInclusive = data?.isAllInclusive === true;
  const chargeGreaseTrapInstall = data?.chargeGreaseTrapInstall !== false;
  const applyMinimum = data?.applyMinimum !== false;

  const standardDrainRate = num(data?.standardDrainRate, activeConfig.standardDrainRate);
  const altBaseCharge = num(data?.altBaseCharge, activeConfig.altBaseCharge);
  const altExtraPerDrain = num(data?.altExtraPerDrain, activeConfig.altExtraPerDrain);
  const volumeWeeklyRate = num(data?.volumeWeeklyRate, activeConfig.volumePricing.weeklyRatePerDrain);
  const volumeBimonthlyRate = num(data?.volumeBimonthlyRate, activeConfig.volumePricing.bimonthlyRatePerDrain);
  const greaseWeeklyRate = num(data?.greaseWeeklyRate, activeConfig.grease.weeklyRatePerTrap);
  const greaseInstallRate = num(data?.greaseInstallRate, activeConfig.grease.installPerTrap);
  const greenWeeklyRate = num(data?.greenWeeklyRate, activeConfig.green.weeklyRatePerDrain);
  const greenInstallRate = num(data?.greenInstallRate, activeConfig.green.installPerDrain);
  const plumbingAddonRate = num(data?.plumbingAddonRate, activeConfig.plumbing.weeklyAddonPerDrain);
  const filthyMultiplier = num(data?.filthyMultiplier, activeConfig.installationRules.filthyMultiplier);

  const buildState = (over: Record<string, any> = {}): FoamingDrainFormState => ({
    standardDrainCount,
    installDrainCount,
    filthyDrainCount: data?.filthyDrainCount ?? 0,
    greaseTrapCount,
    greenDrainCount,
    plumbingDrainCount,
    needsPlumbing,
    frequency: freq,
    installFrequency,
    facilityCondition,
    location: data?.location ?? 'standard',
    useSmallAltPricingWeekly,
    useBigAccountTenWeekly,
    isAllInclusive,
    chargeGreaseTrapInstall,
    contractMonths,
    applyMinimum,
    standardDrainRate,
    altBaseCharge,
    altExtraPerDrain,
    volumeWeeklyRate,
    volumeBimonthlyRate,
    greaseWeeklyRate,
    greaseInstallRate,
    greenWeeklyRate,
    greenInstallRate,
    plumbingAddonRate,
    filthyMultiplier,
    ...over,
  });

  const quote = computeFoamingDrainQuote(buildState(), activeConfig, backendConfig, 0);
  const breakdown = quote.breakdown;

  const minimumDrains = activeConfig.volumePricing.minimumDrains;
  const isWeekly = freq === 'weekly';
  const isVolume = standardDrainCount >= minimumDrains;
  const canUseSmallAlt = isWeekly && standardDrainCount > 0 && !isVolume;
  const canUseBigAlt = isVolume;
  const isInstallLevelUi = isVolume && !useBigAccountTenWeekly && !isAllInclusive;

  const update = useCallback(
    (fields: Record<string, any>) => {
      const merged = {...data, ...fields};

      // Switching off weekly / volume disables small-alt (matches web).
      if ('frequency' in fields && fields.frequency !== 'weekly') {
        merged.useSmallAltPricingWeekly = false;
      }
      if ('useSmallAltPricingWeekly' in fields && fields.useSmallAltPricingWeekly) {
        merged.useBigAccountTenWeekly = false;
      }
      if ('useBigAccountTenWeekly' in fields && fields.useBigAccountTenWeekly) {
        merged.useSmallAltPricingWeekly = false;
      }
      if ('needsPlumbing' in fields && !fields.needsPlumbing) {
        merged.plumbingDrainCount = 0;
      }

      const clearOverrides = RESET_OVERRIDE_FIELDS.some(k => k in fields);
      if (clearOverrides) {
        merged.customWeeklyService = undefined;
        merged.customMonthlyRecurring = undefined;
        merged.customFirstMonthPrice = undefined;
        merged.customContractTotal = undefined;
        merged.customInstallationTotal = undefined;
      }

      const next = buildStateFrom(merged, activeConfig, contractMonths);
      const q = computeFoamingDrainQuote(next, activeConfig, backendConfig, 0);
      onChange({
        ...merged,
        serviceId: 'foamingDrain',
        displayName: 'Foaming Drain',
        ...next,
        isActive: next.standardDrainCount > 0 || next.greaseTrapCount > 0 || next.greenDrainCount > 0,
        perVisitBase: q.weeklyService,
        perVisit: q.weeklyTotal,
        minimumChargePerVisit: q.minimumChargePerVisit,
        monthlyRecurring: q.monthlyRecurring,
        firstMonthPrice: q.firstMonthPrice,
        firstVisitPrice: q.firstVisitPrice,
        installation: q.installation,
        contractTotal: q.annualRecurring,
        originalContractTotal: q.originalContractTotal,
      });
    },
    [data, contractMonths, activeConfig, backendConfig, onChange],
  );

  const isOneTime = freq === 'oneTime';
  const monthlyGroup = freq === 'weekly' || freq === 'biweekly' || freq === 'twicePerMonth' || freq === 'monthly';
  const recurringVisitLabel =
    freq === 'bimonthly' ||
    freq === 'quarterly' ||
    freq === 'biannual' ||
    freq === 'annual' ||
    freq === 'everyFourWeeks';
  const hasService = standardDrainCount > 0 || greaseTrapCount > 0 || greenDrainCount > 0;
  const isGreenline = hasService && quote.annualRecurring > quote.originalContractTotal * 1.3;

  const pricingLabel = breakdown.usedBigAccountAlt
    ? `Volume – $${volumeWeeklyRate}/wk per drain, install waived`
    : breakdown.volumePricingApplied
    ? `Volume (${minimumDrains}+ drains, $${volumeWeeklyRate}/$${volumeBimonthlyRate} install-drain)`
    : breakdown.usedSmallAlt
    ? `Alternative ($${altBaseCharge} + $${altExtraPerDrain}/drain)`
    : `Standard ($${standardDrainRate}/drain)`;

  return (
    <ServiceCard
      serviceId="foamingDrain"
      displayName="Foaming Drain"
      icon="flask-outline"
      iconColor="#10b981"
      iconBg="#d1fae5"
      onRemove={onRemove}
      notes={data?.notes ?? ''}
      onNotesChange={v => update({notes: v})}>
      <DropdownRow
        label="Service Frequency"
        value={freq}
        options={FD_FREQ_OPTIONS}
        onChange={v => update({frequency: v})}
      />
      <FormDivider />

      <CalcRow
        label="Standard Drains"
        qty={standardDrainCount}
        onQtyChange={v => update({standardDrainCount: v})}
        rate={standardDrainRate}
        onRateChange={v => update({standardDrainRate: v})}
        rateReadOnly={breakdown.usedSmallAlt}
        total={breakdown.weeklyStandardDrains}
      />
      <View style={styles.modelRow}>
        <Text style={styles.modelText}>{pricingLabel}</Text>
      </View>

      {canUseSmallAlt ? (
        <ToggleRow
          label={`Small-job alt (< ${minimumDrains} drains)`}
          value={useSmallAltPricingWeekly}
          onChange={v => update({useSmallAltPricingWeekly: v})}
        />
      ) : (
        <ToggleRow
          label={`Small-job alt (< ${minimumDrains} drains)`}
          value={false}
          onChange={() => {}}
          disabled
          subtitle="Weekly, under volume minimum only"
        />
      )}
      {useSmallAltPricingWeekly && canUseSmallAlt && (
        <>
          <NumberRow
            label="Alt Base Charge"
            value={altBaseCharge}
            onChange={v => update({altBaseCharge: v})}
            prefix="$"
            decimals={2}
          />
          <NumberRow
            label="Alt Extra Per Drain"
            value={altExtraPerDrain}
            onChange={v => update({altExtraPerDrain: v})}
            prefix="$"
            decimals={2}
          />
        </>
      )}

      <ToggleRow
        label={`Big account (${minimumDrains}+ drains, install waived)`}
        value={useBigAccountTenWeekly && canUseBigAlt}
        onChange={v => update({useBigAccountTenWeekly: v})}
        disabled={!canUseBigAlt}
        subtitle={canUseBigAlt ? undefined : `${minimumDrains}+ standard drains only`}
      />

      <ToggleRow
        label="Charge Grease Trap Install"
        value={chargeGreaseTrapInstall}
        onChange={v => update({chargeGreaseTrapInstall: v})}
        subtitle="One-time install fee for grease traps"
      />
      {chargeGreaseTrapInstall && (
        <NumberRow
          label="Grease Install Rate (per trap)"
          value={greaseInstallRate}
          onChange={v => update({greaseInstallRate: v})}
          prefix="$"
          decimals={2}
        />
      )}

      {isInstallLevelUi && (
        <>
          <DropdownRow
            label="Install Frequency"
            value={installFrequency}
            options={INSTALL_FREQ_OPTIONS}
            onChange={v => update({installFrequency: v})}
          />
          <CalcRow
            label="Install Drains (10+)"
            qty={installDrainCount}
            onQtyChange={v => update({installDrainCount: v})}
            rate={installFrequency === 'bimonthly' ? volumeBimonthlyRate : volumeWeeklyRate}
            onRateChange={v =>
              update(installFrequency === 'bimonthly' ? {volumeBimonthlyRate: v} : {volumeWeeklyRate: v})
            }
            total={breakdown.weeklyInstallDrains}
          />
        </>
      )}

      <CalcRow
        label="Grease Traps"
        qty={greaseTrapCount}
        onQtyChange={v => update({greaseTrapCount: v})}
        rate={greaseWeeklyRate}
        onRateChange={v => update({greaseWeeklyRate: v})}
        total={breakdown.weeklyGreaseTraps}
      />

      <CalcRow
        label="Green Drains"
        qty={greenDrainCount}
        onQtyChange={v => update({greenDrainCount: v})}
        rate={greenWeeklyRate}
        onRateChange={v => update({greenWeeklyRate: v})}
        total={breakdown.weeklyGreenDrains}
      />

      <ToggleRow
        label="Extra Plumbing"
        value={needsPlumbing}
        onChange={v => update({needsPlumbing: v})}
      />
      {needsPlumbing && (
        <CalcRow
          label="Plumbing Drains"
          qty={plumbingDrainCount}
          onQtyChange={v => update({plumbingDrainCount: v})}
          rate={plumbingAddonRate}
          onRateChange={v => update({plumbingAddonRate: v})}
          total={breakdown.weeklyPlumbing}
        />
      )}

      <FormDivider />
      <DropdownRow
        label="Facility Condition"
        value={facilityCondition}
        options={CONDITION_OPTIONS}
        onChange={v => update({facilityCondition: v})}
      />
      {facilityCondition === 'filthy' && (
        <NumberRow
          label="Filthy Multiplier"
          value={filthyMultiplier}
          onChange={v => update({filthyMultiplier: v})}
          suffix="× weekly"
          decimals={2}
        />
      )}

      <ToggleRow
        label="Apply Minimum"
        value={applyMinimum}
        onChange={v => update({applyMinimum: v})}
        subtitle={`Minimum $${quote.minimumChargePerVisit.toFixed(2)} per visit`}
      />

      {hasService && (
        <>
          <FormDivider />
          {quote.installation > 0 && (
            <DollarRow label="Installation Total" value={quote.installation} />
          )}
          {!isOneTime && <DollarRow label="First Visit Total" value={quote.firstVisitPrice} />}

          <DollarRow
            label={recurringVisitLabel ? 'Recurring Visit Total' : 'Per Visit Total'}
            value={quote.weeklyTotal}
          />

          <View style={styles.tierRow}>
            <Text style={[styles.tierText, isGreenline ? styles.tierGreen : styles.tierRed]}>
              {isGreenline ? '🟢 Greenline Pricing' : '🔴 Redline Pricing'}
            </Text>
          </View>

          {isOneTime && <DollarRow label="Total Price" value={quote.annualRecurring} highlight />}

          {monthlyGroup && (
            <>
              <DollarRow label="First Month Total" value={quote.firstMonthPrice} />
              <DollarRow label="Monthly Recurring" value={quote.monthlyRecurring} />
            </>
          )}

          {!isOneTime && (
            <DollarRow
              label={`Contract Total (${contractMonths} mo)`}
              value={quote.annualRecurring}
              highlight
            />
          )}
        </>
      )}
    </ServiceCard>
  );
}

function buildStateFrom(
  merged: any,
  activeConfig: ReturnType<typeof buildFoamingDrainActiveConfig>,
  contractMonths: number,
): FoamingDrainFormState {
  const num = (v: any, d: number) => (v === undefined || v === null ? d : v);
  return {
    standardDrainCount: merged.standardDrainCount ?? 0,
    installDrainCount: merged.installDrainCount ?? 0,
    filthyDrainCount: merged.filthyDrainCount ?? 0,
    greaseTrapCount: merged.greaseTrapCount ?? 0,
    greenDrainCount: merged.greenDrainCount ?? 0,
    plumbingDrainCount: merged.plumbingDrainCount ?? 0,
    needsPlumbing: merged.needsPlumbing === true,
    frequency: (merged.frequency ?? 'weekly') as FoamingDrainFrequency,
    installFrequency: merged.installFrequency === 'bimonthly' ? 'bimonthly' : 'weekly',
    facilityCondition: merged.facilityCondition === 'filthy' ? 'filthy' : 'normal',
    location: merged.location ?? 'standard',
    useSmallAltPricingWeekly: merged.useSmallAltPricingWeekly === true,
    useBigAccountTenWeekly: merged.useBigAccountTenWeekly === true,
    isAllInclusive: merged.isAllInclusive === true,
    chargeGreaseTrapInstall: merged.chargeGreaseTrapInstall !== false,
    contractMonths,
    applyMinimum: merged.applyMinimum !== false,
    standardDrainRate: num(merged.standardDrainRate, activeConfig.standardDrainRate),
    altBaseCharge: num(merged.altBaseCharge, activeConfig.altBaseCharge),
    altExtraPerDrain: num(merged.altExtraPerDrain, activeConfig.altExtraPerDrain),
    volumeWeeklyRate: num(merged.volumeWeeklyRate, activeConfig.volumePricing.weeklyRatePerDrain),
    volumeBimonthlyRate: num(merged.volumeBimonthlyRate, activeConfig.volumePricing.bimonthlyRatePerDrain),
    greaseWeeklyRate: num(merged.greaseWeeklyRate, activeConfig.grease.weeklyRatePerTrap),
    greaseInstallRate: num(merged.greaseInstallRate, activeConfig.grease.installPerTrap),
    greenWeeklyRate: num(merged.greenWeeklyRate, activeConfig.green.weeklyRatePerDrain),
    greenInstallRate: num(merged.greenInstallRate, activeConfig.green.installPerDrain),
    plumbingAddonRate: num(merged.plumbingAddonRate, activeConfig.plumbing.weeklyAddonPerDrain),
    filthyMultiplier: num(merged.filthyMultiplier, activeConfig.installationRules.filthyMultiplier),
    notes: merged.notes,
    customWeeklyService: merged.customWeeklyService,
    customMonthlyRecurring: merged.customMonthlyRecurring,
    customFirstMonthPrice: merged.customFirstMonthPrice,
    customContractTotal: merged.customContractTotal,
    customInstallationTotal: merged.customInstallationTotal,
  };
}

const styles = StyleSheet.create({
  modelRow: {paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm},
  modelText: {fontSize: FontSize.xs, color: Colors.primary, fontWeight: '600'},
  tierRow: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, alignItems: 'flex-end'},
  tierText: {fontSize: FontSize.sm, fontWeight: '700'},
  tierGreen: {color: '#16a34a'},
  tierRed: {color: '#dc2626'},
});
