import React, {useCallback} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {
  ServiceCard,
  DropdownRow,
  FormDivider,
  NumberRow,
  ToggleRow,
  DollarRow,
} from '../base/ServiceBase';
import {Spacing} from '../../../../../../theme/spacing';
import {FontSize} from '../../../../../../theme/typography';
import {
  buildElectrostaticActiveConfig,
  computeElectrostaticSprayCalc,
  type BackendElectrostaticSprayConfig,
  type ElectrostaticSprayFormState,
  type ElectrostaticSprayFrequency,
} from './electrostaticSprayCalc';
import {FREQUENCY_OPTIONS} from '../../../../../../shared/constants/frequency';

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
}

const ES_FREQ_OPTIONS = FREQUENCY_OPTIONS;

const PRICING_METHOD_OPTIONS = [
  {value: 'byRoom', label: 'By Room'},
  {value: 'bySqFt', label: 'By Square Feet'},
];

// Editing these base inputs clears the manual overrides (matches web).
const RESET_OVERRIDE_FIELDS = [
  'roomCount',
  'squareFeet',
  'pricingMethod',
  'useExactCalculation',
  'frequency',
  'isCombinedWithSaniClean',
];

export function ElectrostaticSprayForm({
  data,
  onChange,
  contractMonths,
  onRemove,
  pricingConfig,
}: Props) {
  const backendConfig: BackendElectrostaticSprayConfig | null =
    (pricingConfig?.config as BackendElectrostaticSprayConfig) ?? null;
  const activeConfig = buildElectrostaticActiveConfig(backendConfig);

  const freq: ElectrostaticSprayFrequency = (data?.frequency ?? 'weekly') as ElectrostaticSprayFrequency;
  const pricingMethod: 'byRoom' | 'bySqFt' = data?.pricingMethod === 'bySqFt' ? 'bySqFt' : 'byRoom';
  const roomCount = data?.roomCount ?? 0;
  const squareFeet = data?.squareFeet ?? 0;
  const useExactCalculation = data?.useExactCalculation !== false;
  const isCombinedWithSaniClean = data?.isCombinedWithSaniClean === true;
  const applyMinimum = data?.applyMinimum !== false;
  const ratePerRoom = data?.ratePerRoom ?? activeConfig.standardSprayPricing.sprayRatePerRoom;
  const ratePerThousandSqFt =
    data?.ratePerThousandSqFt ?? activeConfig.standardSprayPricing.sprayRatePerSqFtUnit;
  const tripChargePerVisit = data?.tripChargePerVisit ?? activeConfig.tripCharges.standard;

  const buildState = (over: Record<string, any> = {}): ElectrostaticSprayFormState => ({
    pricingMethod,
    roomCount,
    squareFeet,
    useExactCalculation,
    frequency: freq,
    isCombinedWithSaniClean,
    contractMonths,
    ratePerRoom,
    ratePerThousandSqFt,
    tripChargePerVisit,
    applyMinimum,
    customRatePerRoom: data?.customRatePerRoom,
    customRatePerThousandSqFt: data?.customRatePerThousandSqFt,
    customTripChargePerVisit: data?.customTripChargePerVisit,
    customServiceCharge: data?.customServiceCharge,
    customPerVisitPrice: data?.customPerVisitPrice,
    customMonthlyRecurring: data?.customMonthlyRecurring,
    customContractTotal: data?.customContractTotal,
    customFirstMonthTotal: data?.customFirstMonthTotal,
    ...over,
  });

  const calc = computeElectrostaticSprayCalc(buildState(), activeConfig, 0);

  const update = useCallback(
    (fields: Record<string, any>) => {
      const clearOverrides = RESET_OVERRIDE_FIELDS.some(k => k in fields);
      const merged = {...data, ...fields};
      if (clearOverrides) {
        merged.customRatePerRoom = undefined;
        merged.customRatePerThousandSqFt = undefined;
        merged.customTripChargePerVisit = undefined;
        merged.customServiceCharge = undefined;
        merged.customPerVisitPrice = undefined;
        merged.customMonthlyRecurring = undefined;
        merged.customContractTotal = undefined;
        merged.customFirstMonthTotal = undefined;
      }

      const next: ElectrostaticSprayFormState = {
        pricingMethod: merged.pricingMethod === 'bySqFt' ? 'bySqFt' : 'byRoom',
        roomCount: merged.roomCount ?? 0,
        squareFeet: merged.squareFeet ?? 0,
        useExactCalculation: merged.useExactCalculation !== false,
        frequency: (merged.frequency ?? 'weekly') as ElectrostaticSprayFrequency,
        isCombinedWithSaniClean: merged.isCombinedWithSaniClean === true,
        contractMonths,
        ratePerRoom: merged.ratePerRoom ?? activeConfig.standardSprayPricing.sprayRatePerRoom,
        ratePerThousandSqFt:
          merged.ratePerThousandSqFt ?? activeConfig.standardSprayPricing.sprayRatePerSqFtUnit,
        tripChargePerVisit: merged.tripChargePerVisit ?? activeConfig.tripCharges.standard,
        applyMinimum: merged.applyMinimum !== false,
        customRatePerRoom: merged.customRatePerRoom,
        customRatePerThousandSqFt: merged.customRatePerThousandSqFt,
        customTripChargePerVisit: merged.customTripChargePerVisit,
        customServiceCharge: merged.customServiceCharge,
        customPerVisitPrice: merged.customPerVisitPrice,
        customMonthlyRecurring: merged.customMonthlyRecurring,
        customContractTotal: merged.customContractTotal,
        customFirstMonthTotal: merged.customFirstMonthTotal,
      };
      const nextCalc = computeElectrostaticSprayCalc(next, activeConfig, 0);
      onChange({
        ...merged,
        serviceId: 'electrostaticSpray',
        displayName: 'Electrostatic Spray',
        ...next,
        isActive: next.roomCount > 0 || next.squareFeet > 0,
        perVisitBase: nextCalc.serviceCharge,
        serviceCharge: nextCalc.serviceCharge,
        tripCharge: nextCalc.tripCharge,
        perVisit: nextCalc.perVisit,
        monthlyRecurring: nextCalc.monthlyRecurring,
        contractTotal: nextCalc.contractTotal,
        originalContractTotal: nextCalc.originalContractTotal,
        minimumChargePerVisit: nextCalc.minimumChargePerVisit,
      });
    },
    [data, contractMonths, activeConfig, onChange],
  );

  const isOneTime = freq === 'oneTime';
  const isVisitBased = calc.isVisitBasedFrequency;
  const hasService = roomCount > 0 || squareFeet > 0;
  const isGreenline = hasService && calc.contractTotal > calc.originalContractTotal * 1.3;

  return (
    <ServiceCard
      serviceId="electrostaticSpray"
      displayName="Electrostatic Spray"
      icon="flash-outline"
      iconColor="#dc2626"
      iconBg="#fee2e2"
      onRemove={onRemove}
      notes={data?.notes ?? ''}
      onNotesChange={v => update({notes: v})}>
      <ToggleRow
        label="Combined with Sani-Clean"
        value={isCombinedWithSaniClean}
        onChange={v => update({isCombinedWithSaniClean: v})}
        subtitle="Waives the trip charge"
      />
      <DropdownRow
        label="Frequency"
        value={freq}
        options={ES_FREQ_OPTIONS}
        onChange={v => update({frequency: v})}
      />
      <DropdownRow
        label="Pricing Method"
        value={pricingMethod}
        options={PRICING_METHOD_OPTIONS}
        onChange={v => update({pricingMethod: v})}
      />
      <FormDivider />

      {pricingMethod === 'byRoom' ? (
        <>
          <NumberRow
            label="Room Count"
            value={roomCount}
            onChange={v => update({roomCount: v})}
            suffix="rooms"
            decimals={0}
          />
          <NumberRow
            label="Rate per Room"
            value={data?.customRatePerRoom ?? ratePerRoom}
            onChange={v => update({customRatePerRoom: v})}
            prefix="$"
            decimals={2}
          />
        </>
      ) : (
        <>
          <NumberRow
            label="Square Feet"
            value={squareFeet}
            onChange={v => update({squareFeet: v})}
            suffix="sq ft"
            decimals={0}
          />
          <NumberRow
            label={`Rate per ${activeConfig.standardSprayPricing.sqFtUnit} sq ft`}
            value={data?.customRatePerThousandSqFt ?? ratePerThousandSqFt}
            onChange={v => update({customRatePerThousandSqFt: v})}
            prefix="$"
            decimals={2}
          />
          <ToggleRow
            label="Exact square feet calculation"
            value={useExactCalculation}
            onChange={v => update({useExactCalculation: v})}
            subtitle={
              useExactCalculation
                ? 'Calculating for exact square feet entered'
                : `Minimum tier pricing (rounds up to ${activeConfig.standardSprayPricing.sqFtUnit} sq ft tiers)`
            }
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
          <DollarRow label="Service Charge" value={calc.serviceCharge} />

          <FormDivider />

          <DollarRow label="Per Visit Total" value={calc.perVisit} />

          <View style={styles.tierRow}>
            <Text style={[styles.tierText, isGreenline ? styles.tierGreen : styles.tierRed]}>
              {isGreenline ? '🟢 Greenline Pricing' : '🔴 Redline Pricing'}
            </Text>
          </View>

          {!isVisitBased && (
            <DollarRow label="Monthly Recurring" value={calc.monthlyRecurring} />
          )}

          {isVisitBased && !isOneTime && (
            <DollarRow label="Recurring Visit Total" value={calc.perVisit} />
          )}

          {isOneTime && (
            <DollarRow label="Total Price" value={calc.contractTotal} highlight />
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
