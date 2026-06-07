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
import {
  computeMicrofiberMopping,
  convertFrequencyMetadataToBillingConversions,
  mapMicrofiberFrequency,
  microfiberFrequencyLabels,
  microfiberFrequencyList,
  microfiberMoppingPricingConfig as cfg,
  type BackendMicrofiberConfig,
  type MicrofiberMoppingFormState,
  type MicrofiberFrequencyKey,
} from './microfiberMoppingCalc';

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
}

const MF_FREQ_OPTIONS = microfiberFrequencyList.map(value => ({
  value,
  label: microfiberFrequencyLabels[value],
}));

// Editing any of these clears the manual total overrides (matches web).
const RESET_OVERRIDE_FIELDS = [
  'bathroomCount',
  'hugeBathroomSqFt',
  'extraAreaSqFt',
  'standaloneSqFt',
  'chemicalGallons',
  'customIncludedBathroomRate',
  'customHugeBathroomRatePerSqFt',
  'customExtraAreaRatePerUnit',
  'customStandaloneRatePerUnit',
  'customDailyChemicalPerGallon',
  'frequency',
  'useExactExtraAreaSqft',
  'useExactStandaloneSqft',
  'isAllInclusive',
  'hasExistingSaniService',
];

export function MicrofiberMoppingForm({
  data,
  onChange,
  contractMonths,
  onRemove,
  pricingConfig,
}: Props) {
  const backendConfig: BackendMicrofiberConfig | null = pricingConfig?.config
    ? convertFrequencyMetadataToBillingConversions(pricingConfig.config)
    : null;

  const freq: MicrofiberFrequencyKey = mapMicrofiberFrequency(data?.frequency ?? 'weekly');
  const hasExistingSaniService = data?.hasExistingSaniService !== false;
  const isAllInclusive = data?.isAllInclusive === true;
  const bathroomCount = data?.bathroomCount ?? 0;
  const hugeBathroomSqFt = data?.hugeBathroomSqFt ?? 0;
  const extraAreaSqFt = data?.extraAreaSqFt ?? 0;
  const standaloneSqFt = data?.standaloneSqFt ?? 0;
  const useExactExtraAreaSqft = data?.useExactExtraAreaSqft !== false;
  const useExactStandaloneSqft = data?.useExactStandaloneSqft !== false;
  const applyMinimum = data?.applyMinimum !== false;

  const includedBathroomRate =
    data?.includedBathroomRate ??
    backendConfig?.includedBathroomRate ??
    cfg.includedBathroomRate;
  const hugeBathroomRatePerSqFt =
    data?.hugeBathroomRatePerSqFt ??
    backendConfig?.hugeBathroomPricing?.ratePerSqFt ??
    cfg.hugeBathroomPricing.ratePerSqFt;
  const extraAreaRatePerUnit =
    data?.extraAreaRatePerUnit ??
    backendConfig?.extraAreaPricing?.extraAreaRatePerUnit ??
    cfg.extraAreaPricing.extraAreaRatePerUnit;
  const standaloneRatePerUnit =
    data?.standaloneRatePerUnit ??
    backendConfig?.standalonePricing?.standaloneRatePerUnit ??
    cfg.standalonePricing.standaloneRatePerUnit;
  const dailyChemicalPerGallon =
    data?.dailyChemicalPerGallon ?? cfg.chemicalProducts.dailyChemicalPerGallon;

  const buildState = (over: Record<string, any> = {}): MicrofiberMoppingFormState => ({
    frequency: freq,
    contractTermMonths: contractMonths,
    hasExistingSaniService,
    bathroomCount,
    isHugeBathroom: hugeBathroomSqFt > 0,
    hugeBathroomSqFt,
    extraAreaSqFt,
    useExactExtraAreaSqft,
    standaloneSqFt,
    useExactStandaloneSqft,
    chemicalGallons: data?.chemicalGallons ?? 0,
    isAllInclusive,
    includedBathroomRate,
    hugeBathroomRatePerSqFt,
    extraAreaRatePerUnit,
    standaloneRatePerUnit,
    dailyChemicalPerGallon,
    applyMinimum,
    customIncludedBathroomRate: data?.customIncludedBathroomRate,
    customHugeBathroomRatePerSqFt: data?.customHugeBathroomRatePerSqFt,
    customExtraAreaRatePerUnit: data?.customExtraAreaRatePerUnit,
    customStandaloneRatePerUnit: data?.customStandaloneRatePerUnit,
    customStandardBathroomTotal: data?.customStandardBathroomTotal,
    customHugeBathroomTotal: data?.customHugeBathroomTotal,
    customExtraAreaTotal: data?.customExtraAreaTotal,
    customStandaloneTotal: data?.customStandaloneTotal,
    customPerVisitPrice: data?.customPerVisitPrice,
    customMonthlyRecurring: data?.customMonthlyRecurring,
    customFirstMonthPrice: data?.customFirstMonthPrice,
    customContractTotal: data?.customContractTotal,
    ...over,
  });

  const {calc} = computeMicrofiberMopping(buildState(), backendConfig, 0);

  const update = useCallback(
    (fields: Record<string, any>) => {
      const merged = {...data, ...fields};

      // Entering huge-bathroom sq ft zeroes standard bathrooms (matches web).
      if ('hugeBathroomSqFt' in fields) {
        const sq = Number(fields.hugeBathroomSqFt) || 0;
        merged.isHugeBathroom = sq > 0;
        if (sq > 0) {
          merged.bathroomCount = 0;
        }
      }

      const clearOverrides = RESET_OVERRIDE_FIELDS.some(k => k in fields);
      if (clearOverrides) {
        merged.customStandardBathroomTotal = undefined;
        merged.customHugeBathroomTotal = undefined;
        merged.customExtraAreaTotal = undefined;
        merged.customStandaloneTotal = undefined;
        merged.customChemicalTotal = undefined;
        merged.customPerVisitPrice = undefined;
        merged.customMonthlyRecurring = undefined;
        merged.customFirstMonthPrice = undefined;
        merged.customContractTotal = undefined;
      }

      const next = buildStateFrom(merged, backendConfig, contractMonths);
      const {calc: nextCalc} = computeMicrofiberMopping(next, backendConfig, 0);
      onChange({
        ...merged,
        serviceId: 'microfiberMopping',
        displayName: 'Microfiber Mopping',
        ...next,
        isActive:
          next.bathroomCount > 0 ||
          next.hugeBathroomSqFt > 0 ||
          next.extraAreaSqFt > 0 ||
          next.standaloneSqFt > 0 ||
          next.chemicalGallons > 0,
        perVisitBase: nextCalc.perVisitPrice,
        perVisit: nextCalc.perVisitPrice,
        minimumChargePerVisit: nextCalc.minimumChargePerVisit,
        monthlyRecurring: nextCalc.monthlyRecurring,
        firstMonthPrice: nextCalc.firstMonthPrice,
        contractTotal: nextCalc.contractTotal,
        originalContractTotal: nextCalc.originalContractTotal,
      });
    },
    [data, contractMonths, backendConfig, onChange],
  );

  const isOneTime = freq === 'oneTime';
  const isVisitBased =
    isOneTime ||
    freq === 'quarterly' ||
    freq === 'biannual' ||
    freq === 'annual' ||
    freq === 'bimonthly' ||
    freq === 'everyFourWeeks';
  const hasService =
    bathroomCount > 0 || hugeBathroomSqFt > 0 || extraAreaSqFt > 0 || standaloneSqFt > 0;
  const isGreenline = hasService && calc.contractTotal > calc.originalContractTotal * 1.3;

  const showStandardBathrooms = !isAllInclusive && hasExistingSaniService && hugeBathroomSqFt === 0;
  const showHugeBathroom = !isAllInclusive && hasExistingSaniService;
  const showAreas = !isAllInclusive;

  return (
    <ServiceCard
      serviceId="microfiberMopping"
      displayName="Microfiber Mopping"
      icon="brush-outline"
      iconColor="#2563eb"
      iconBg="#dbeafe"
      onRemove={onRemove}
      notes={data?.notes ?? ''}
      onNotesChange={v => update({notes: v})}>
      <ToggleRow
        label="Combined with Sani program?"
        value={hasExistingSaniService}
        onChange={v => update({hasExistingSaniService: v})}
        subtitle="Bathrooms already on Sani"
      />
      <ToggleRow
        label="All-inclusive package?"
        value={isAllInclusive}
        onChange={v => update({isAllInclusive: v})}
        subtitle="Microfiber included (no separate pricing)"
      />
      <DropdownRow
        label="Frequency"
        value={freq}
        options={MF_FREQ_OPTIONS}
        onChange={v => update({frequency: v})}
      />
      <FormDivider />

      {showStandardBathrooms && (
        <>
          <CalcRow
            label="Standard Bathrooms"
            qty={bathroomCount}
            onQtyChange={v => update({bathroomCount: v})}
            rate={data?.customIncludedBathroomRate ?? includedBathroomRate}
            onRateChange={v => update({customIncludedBathroomRate: v})}
            total={calc.standardBathroomPrice}
          />
        </>
      )}

      {showHugeBathroom && (
        <CalcRow
          label="Huge Bathroom (sq ft)"
          qty={hugeBathroomSqFt}
          onQtyChange={v => update({hugeBathroomSqFt: v})}
          rate={data?.customHugeBathroomRatePerSqFt ?? hugeBathroomRatePerSqFt}
          onRateChange={v => update({customHugeBathroomRatePerSqFt: v})}
          total={calc.hugeBathroomPrice}
        />
      )}

      {showAreas && (
        <>
          <CalcRow
            label="Extra Non-Bathroom (sq ft)"
            qty={extraAreaSqFt}
            onQtyChange={v => update({extraAreaSqFt: v})}
            rate={data?.customExtraAreaRatePerUnit ?? extraAreaRatePerUnit}
            onRateChange={v => update({customExtraAreaRatePerUnit: v})}
            total={calc.extraAreaPrice}
          />
          <ToggleRow
            label="Exact SqFt (extra area)"
            value={useExactExtraAreaSqft}
            onChange={v => update({useExactExtraAreaSqft: v})}
          />

          <CalcRow
            label="Standalone Mopping (sq ft)"
            qty={standaloneSqFt}
            onQtyChange={v => update({standaloneSqFt: v})}
            rate={data?.customStandaloneRatePerUnit ?? standaloneRatePerUnit}
            onRateChange={v => update({customStandaloneRatePerUnit: v})}
            total={calc.standaloneServicePrice}
          />
          <ToggleRow
            label="Exact SqFt (standalone)"
            value={useExactStandaloneSqft}
            onChange={v => update({useExactStandaloneSqft: v})}
          />
        </>
      )}

      <ToggleRow
        label="Apply Minimum"
        value={applyMinimum}
        onChange={v => update({applyMinimum: v})}
        subtitle={`Minimum $${calc.minimumChargePerVisit.toFixed(2)} per visit`}
      />

      {hasService && (
        <>
          <FormDivider />
          <DollarRow label="Per-Visit Service Total" value={calc.perVisitPrice} />

          <View style={styles.tierRow}>
            <Text style={[styles.tierText, isGreenline ? styles.tierGreen : styles.tierRed]}>
              {isGreenline ? '🟢 Greenline Pricing' : '🔴 Redline Pricing'}
            </Text>
          </View>

          {!isVisitBased && (
            <>
              <DollarRow label="Monthly Recurring" value={calc.monthlyRecurring} />
              <DollarRow label="First Month Total" value={calc.firstMonthPrice} />
            </>
          )}

          {isVisitBased && (
            <DollarRow
              label={isOneTime ? 'Total Price' : 'First Visit Total'}
              value={calc.firstMonthPrice}
            />
          )}

          {isVisitBased && !isOneTime && (
            <DollarRow label="Recurring Visit Total" value={calc.perVisitPrice} />
          )}

          {!isOneTime && (
            <DollarRow
              label={`Contract Total (${contractMonths} mo)`}
              value={calc.contractTotal}
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
  backendConfig: BackendMicrofiberConfig | null,
  contractMonths: number,
): MicrofiberMoppingFormState {
  const hugeSqFt = merged.hugeBathroomSqFt ?? 0;
  return {
    frequency: mapMicrofiberFrequency(merged.frequency ?? 'weekly'),
    contractTermMonths: contractMonths,
    hasExistingSaniService: merged.hasExistingSaniService !== false,
    bathroomCount: merged.bathroomCount ?? 0,
    isHugeBathroom: hugeSqFt > 0,
    hugeBathroomSqFt: hugeSqFt,
    extraAreaSqFt: merged.extraAreaSqFt ?? 0,
    useExactExtraAreaSqft: merged.useExactExtraAreaSqft !== false,
    standaloneSqFt: merged.standaloneSqFt ?? 0,
    useExactStandaloneSqft: merged.useExactStandaloneSqft !== false,
    chemicalGallons: merged.chemicalGallons ?? 0,
    isAllInclusive: merged.isAllInclusive === true,
    includedBathroomRate:
      merged.includedBathroomRate ??
      backendConfig?.includedBathroomRate ??
      cfg.includedBathroomRate,
    hugeBathroomRatePerSqFt:
      merged.hugeBathroomRatePerSqFt ??
      backendConfig?.hugeBathroomPricing?.ratePerSqFt ??
      cfg.hugeBathroomPricing.ratePerSqFt,
    extraAreaRatePerUnit:
      merged.extraAreaRatePerUnit ??
      backendConfig?.extraAreaPricing?.extraAreaRatePerUnit ??
      cfg.extraAreaPricing.extraAreaRatePerUnit,
    standaloneRatePerUnit:
      merged.standaloneRatePerUnit ??
      backendConfig?.standalonePricing?.standaloneRatePerUnit ??
      cfg.standalonePricing.standaloneRatePerUnit,
    dailyChemicalPerGallon:
      merged.dailyChemicalPerGallon ?? cfg.chemicalProducts.dailyChemicalPerGallon,
    applyMinimum: merged.applyMinimum !== false,
    customIncludedBathroomRate: merged.customIncludedBathroomRate,
    customHugeBathroomRatePerSqFt: merged.customHugeBathroomRatePerSqFt,
    customExtraAreaRatePerUnit: merged.customExtraAreaRatePerUnit,
    customStandaloneRatePerUnit: merged.customStandaloneRatePerUnit,
    customDailyChemicalPerGallon: merged.customDailyChemicalPerGallon,
    customStandardBathroomTotal: merged.customStandardBathroomTotal,
    customHugeBathroomTotal: merged.customHugeBathroomTotal,
    customExtraAreaTotal: merged.customExtraAreaTotal,
    customStandaloneTotal: merged.customStandaloneTotal,
    customChemicalTotal: merged.customChemicalTotal,
    customPerVisitPrice: merged.customPerVisitPrice,
    customMonthlyRecurring: merged.customMonthlyRecurring,
    customFirstMonthPrice: merged.customFirstMonthPrice,
    customContractTotal: merged.customContractTotal,
  };
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
