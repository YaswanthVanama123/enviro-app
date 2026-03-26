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

const SERVICE_TYPES = [
  {value: 'basic',    label: 'Basic'},
  {value: 'standard', label: 'Standard'},
  {value: 'premium',  label: 'Premium'},
];

export function JanitorialForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  const freq           = data?.frequency       ?? 'weekly';
  const serviceType    = data?.serviceType     ?? 'standard';
  const visitsPerWeek  = data?.visitsPerWeek   ?? 1;
  const baseHourlyRate = data?.baseHourlyRate  ?? cfg.standardHourlyPricing?.standardHourlyRate ?? 30;
  const manualHours    = data?.manualHours     ?? 0;
  const vacuumingHours = data?.vacuumingHours  ?? 0;

  const totalHours = manualHours + vacuumingHours;
  const perVisitBase = totalHours * baseHourlyRate;
  const totals = calcTotals(perVisitBase, freq, contractMonths);

  const update = useCallback((fields: Record<string, any>) => {
    const mh = fields.manualHours    ?? manualHours;
    const vh = fields.vacuumingHours ?? vacuumingHours;
    const hr = fields.baseHourlyRate ?? baseHourlyRate;
    const nf = fields.frequency      ?? freq;
    const newTotals = calcTotals((mh + vh) * hr, nf, contractMonths);
    const origHourlyRate = cfg.standardHourlyPricing?.standardHourlyRate ?? 30;
    const originalPerVisitBase = (mh + vh) * origHourlyRate;
    const originalContractTotal = calcTotals(originalPerVisitBase, nf, contractMonths).contractTotal;
    onChange({
      serviceId: 'pureJanitorial',
      displayName: 'Janitorial',
      isActive: (mh + vh) > 0,
      contractMonths,
      ...data,
      ...fields,
      frequency: nf,
      perVisit: newTotals.perVisit,
      monthlyRecurring: newTotals.monthlyRecurring,
      contractTotal: newTotals.contractTotal,
      originalContractTotal,
    });
  }, [data, freq, serviceType, visitsPerWeek, baseHourlyRate, manualHours, vacuumingHours, contractMonths, onChange]);

  return (
    <ServiceCard serviceId="pureJanitorial" displayName="Janitorial" icon="briefcase-outline" iconColor="#059669" iconBg="#d1fae5" onRemove={onRemove}>
      <View style={styles.typeRow}>
        <Text style={styles.typeLabel}>Service Type</Text>
        <View style={styles.chips}>
          {SERVICE_TYPES.map(t => (
            <TouchableOpacity key={t.value} style={[styles.chip, serviceType === t.value && styles.chipActive]} onPress={() => update({serviceType: t.value})}>
              <Text style={[styles.chipText, serviceType === t.value && styles.chipTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />
      <NumberRow label="Visits per Week" value={visitsPerWeek} onChange={v => update({visitsPerWeek: v})} decimals={0} />
      <NumberRow label="Hourly Rate ($)" value={baseHourlyRate} onChange={v => update({baseHourlyRate: v})} prefix="$" decimals={2} />
      <NumberRow label="Manual Cleaning Hours" value={manualHours} onChange={v => update({manualHours: v})} suffix="hrs" decimals={1} />
      <NumberRow label="Vacuuming Hours" value={vacuumingHours} onChange={v => update({vacuumingHours: v})} suffix="hrs" decimals={1} />
      <TotalsBlock frequency={freq} perVisit={totals.perVisit} firstMonth={totals.firstMonth} monthlyRecurring={totals.monthlyRecurring} contractMonths={contractMonths} contractTotal={totals.contractTotal} />
    </ServiceCard>
  );
}

const styles = StyleSheet.create({
  typeRow: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.xs},
  typeLabel: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary},
  chips: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm},
  chip: {paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface},
  chipActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  chipText: {fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500'},
  chipTextActive: {color: '#fff', fontWeight: '700'},
});
