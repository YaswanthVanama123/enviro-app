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

const VARIANTS = [
  {value: 'strip',    label: 'Strip Only'},
  {value: 'wax',      label: 'Wax Only'},
  {value: 'stripwax', label: 'Strip & Wax'},
];

export function StripWaxForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  const freq           = data?.frequency      ?? 'monthly';
  const serviceVariant = data?.serviceVariant ?? 'stripwax';
  const floorAreaSqFt  = data?.floorAreaSqFt  ?? 0;
  const ratePerSqFt    = data?.ratePerSqFt    ?? cfg.variants?.standardFull?.ratePerSqFt ?? 0.75;
  const minCharge      = data?.minCharge      ?? cfg.variants?.standardFull?.minCharge   ?? 550;

  const rawCost = floorAreaSqFt * ratePerSqFt;
  const perVisitBase = Math.max(rawCost, minCharge);
  const totals = calcTotals(perVisitBase, freq, contractMonths);

  const update = useCallback((fields: Record<string, any>) => {
    const na = fields.floorAreaSqFt  ?? floorAreaSqFt;
    const rr = fields.ratePerSqFt    ?? ratePerSqFt;
    const mc = fields.minCharge      ?? minCharge;
    const nf = fields.frequency      ?? freq;
    const newTotals = calcTotals(Math.max(na * rr, mc), nf, contractMonths);
    onChange({
      serviceId: 'stripwax',
      displayName: 'Strip & Wax',
      isActive: na > 0,
      contractMonths,
      ...data,
      ...fields,
      frequency: nf,
      perVisit: newTotals.perVisit,
      monthlyRecurring: newTotals.monthlyRecurring,
      contractTotal: newTotals.contractTotal,
    });
  }, [data, freq, serviceVariant, floorAreaSqFt, ratePerSqFt, minCharge, contractMonths, onChange]);

  return (
    <ServiceCard serviceId="stripwax" displayName="Strip & Wax" icon="sparkles-outline" iconColor="#ea580c" iconBg="#ffedd5" onRemove={onRemove}>
      <View style={styles.variantRow}>
        <Text style={styles.variantLabel}>Service Variant</Text>
        <View style={styles.chips}>
          {VARIANTS.map(v => (
            <TouchableOpacity key={v.value} style={[styles.chip, serviceVariant === v.value && styles.chipActive]} onPress={() => update({serviceVariant: v.value})}>
              <Text style={[styles.chipText, serviceVariant === v.value && styles.chipTextActive]}>{v.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />
      <NumberRow label="Floor Area (sq ft)" value={floorAreaSqFt} onChange={v => update({floorAreaSqFt: v})} suffix="sq ft" decimals={0} />
      <NumberRow label="Rate per Sq Ft ($)" value={ratePerSqFt} onChange={v => update({ratePerSqFt: v})} prefix="$" decimals={4} />
      <NumberRow label="Minimum Charge ($)" value={minCharge} onChange={v => update({minCharge: v})} prefix="$" decimals={2} />
      <TotalsBlock frequency={freq} perVisit={totals.perVisit} firstMonth={totals.firstMonth} monthlyRecurring={totals.monthlyRecurring} contractMonths={contractMonths} contractTotal={totals.contractTotal} />
    </ServiceCard>
  );
}

const styles = StyleSheet.create({
  variantRow: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.xs},
  variantLabel: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm},
  chip: {paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface},
  chipActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  chipText: {fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500'},
  chipTextActive: {color: '#fff', fontWeight: '700'},
});
