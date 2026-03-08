import React, {useCallback} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {
  ServiceCard, TotalsBlock, calcTotals,
  FREQ_OPTIONS, DropdownRow, FormDivider, NumberRow,
} from './ServiceBase';
import {Colors} from '../../../../../theme/colors';
import {Spacing, Radius} from '../../../../../theme/spacing';
import {FontSize} from '../../../../../theme/typography';

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
}

const PRICING_METHODS = [
  {value: 'perRoom', label: 'Per Room'},
  {value: 'perSqFt', label: 'Per Sq Ft'},
];

export function ElectrostaticSprayForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  const freq                = data?.frequency            ?? 'monthly';
  const pricingMethod       = data?.pricingMethod        ?? 'perRoom';
  const roomCount           = data?.roomCount            ?? 0;
  const squareFeet          = data?.squareFeet           ?? 0;
  const ratePerRoom         = data?.ratePerRoom          ?? cfg.ratePerRoom          ?? 20;
  const ratePerThousandSqFt = data?.ratePerThousandSqFt ?? cfg.ratePerThousandSqFt ?? 50;

  const perVisitBase = pricingMethod === 'perRoom'
    ? roomCount * ratePerRoom
    : (squareFeet / 1000) * ratePerThousandSqFt;

  const totals = calcTotals(perVisitBase, freq, contractMonths);

  const update = useCallback((fields: Record<string, any>) => {
    const pm = fields.pricingMethod       ?? pricingMethod;
    const rc = fields.roomCount           ?? roomCount;
    const sf = fields.squareFeet          ?? squareFeet;
    const rr = fields.ratePerRoom         ?? ratePerRoom;
    const rs = fields.ratePerThousandSqFt ?? ratePerThousandSqFt;
    const nf = fields.frequency           ?? freq;
    const newBase = pm === 'perRoom' ? rc * rr : (sf / 1000) * rs;
    const newTotals = calcTotals(newBase, nf, contractMonths);
    onChange({
      serviceId: 'electrostaticSpray',
      displayName: 'Electrostatic Spray',
      isActive: true,
      contractMonths,
      ...data,
      ...fields,
      frequency: nf,
      perVisit: newTotals.perVisit,
      monthlyRecurring: newTotals.monthlyRecurring,
      contractTotal: newTotals.contractTotal,
    });
  }, [data, freq, pricingMethod, roomCount, squareFeet, ratePerRoom, ratePerThousandSqFt, contractMonths, onChange]);

  return (
    <ServiceCard serviceId="electrostaticSpray" displayName="Electrostatic Spray" icon="flash-outline" iconColor="#dc2626" iconBg="#fee2e2" onRemove={onRemove}>
      <View style={styles.methodRow}>
        <Text style={styles.methodLabel}>Pricing Method</Text>
        <View style={styles.chips}>
          {PRICING_METHODS.map(m => (
            <TouchableOpacity key={m.value} style={[styles.chip, pricingMethod === m.value && styles.chipActive]} onPress={() => update({pricingMethod: m.value})}>
              <Text style={[styles.chipText, pricingMethod === m.value && styles.chipTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />
      {pricingMethod === 'perRoom' ? (
        <>
          <NumberRow label="Room Count" value={roomCount} onChange={v => update({roomCount: v})} suffix="rooms" decimals={0} />
          <NumberRow label="Rate per Room ($)" value={ratePerRoom} onChange={v => update({ratePerRoom: v})} prefix="$" decimals={2} />
        </>
      ) : (
        <>
          <NumberRow label="Area (sq ft)" value={squareFeet} onChange={v => update({squareFeet: v})} suffix="sq ft" decimals={0} />
          <NumberRow label="Rate per 1,000 sq ft ($)" value={ratePerThousandSqFt} onChange={v => update({ratePerThousandSqFt: v})} prefix="$" decimals={2} />
        </>
      )}
      <TotalsBlock frequency={freq} perVisit={totals.perVisit} firstMonth={totals.firstMonth} monthlyRecurring={totals.monthlyRecurring} contractMonths={contractMonths} contractTotal={totals.contractTotal} />
    </ServiceCard>
  );
}

const styles = StyleSheet.create({
  methodRow: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.xs},
  methodLabel: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary},
  chips: {flexDirection: 'row', gap: Spacing.sm},
  chip: {paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface},
  chipActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  chipText: {fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500'},
  chipTextActive: {color: '#fff', fontWeight: '700'},
});
