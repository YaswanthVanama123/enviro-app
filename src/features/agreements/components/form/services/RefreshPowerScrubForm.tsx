import React, {useCallback} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import {
  ServiceCard, DollarRow, FormDivider, NumberRow,
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

const FREQ_OPTS = [
  {value: 'weekly',    label: 'Weekly'},
  {value: 'biweekly',  label: 'Bi-weekly'},
  {value: 'monthly',   label: 'Monthly'},
];

const PRICING_TYPES = [
  {value: 'flat',   label: 'Flat Rate'},
  {value: 'sqft',   label: 'Per Sq Ft'},
];

interface AreaConfig {
  enabled: boolean;
  pricingType: 'flat' | 'sqft';
  flatRate: number;
  sqFt: number;
  ratePerSqFt: number;
  frequencyLabel: string;
}

interface AreaSectionProps {
  label: string;
  config: AreaConfig;
  onChange: (c: AreaConfig) => void;
}

function AreaSection({label, config, onChange}: AreaSectionProps) {
  const {enabled, pricingType, flatRate, sqFt, ratePerSqFt, frequencyLabel} = config;
  const cost = pricingType === 'flat' ? flatRate : sqFt * ratePerSqFt;

  return (
    <View style={styles.areaBlock}>
      <View style={styles.areaHeader}>
        <Text style={styles.areaTitle}>{label}</Text>
        <TouchableOpacity
          style={[styles.toggle, enabled && styles.toggleOn]}
          onPress={() => onChange({...config, enabled: !enabled})}>
          <Text style={[styles.toggleText, enabled && styles.toggleTextOn]}>
            {enabled ? 'ON' : 'OFF'}
          </Text>
        </TouchableOpacity>
      </View>
      {enabled && (
        <View style={styles.areaBody}>
          {/* Pricing type chips */}
          <View style={styles.chips}>
            {PRICING_TYPES.map(p => (
              <TouchableOpacity
                key={p.value}
                style={[styles.chip, pricingType === p.value && styles.chipActive]}
                onPress={() => onChange({...config, pricingType: p.value as any})}>
                <Text style={[styles.chipText, pricingType === p.value && styles.chipTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          {pricingType === 'flat' ? (
            <View style={styles.inputRow}>
              <Text style={styles.inputLabel}>Flat Rate ($)</Text>
              <NumberRow
                label=""
                value={flatRate}
                onChange={v => onChange({...config, flatRate: v})}
                prefix="$"
                decimals={2}
              />
            </View>
          ) : (
            <>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Area (sq ft)</Text>
                <NumberRow
                  label=""
                  value={sqFt}
                  onChange={v => onChange({...config, sqFt: v})}
                  suffix="sq ft"
                  decimals={0}
                />
              </View>
              <View style={styles.inputRow}>
                <Text style={styles.inputLabel}>Rate / sq ft ($)</Text>
                <NumberRow
                  label=""
                  value={ratePerSqFt}
                  onChange={v => onChange({...config, ratePerSqFt: v})}
                  prefix="$"
                  decimals={4}
                />
              </View>
            </>
          )}
          {/* Freq chips */}
          <View style={styles.freqRow}>
            {FREQ_OPTS.map(f => (
              <TouchableOpacity
                key={f.value}
                style={[styles.chip, frequencyLabel === f.value && styles.chipActive]}
                onPress={() => onChange({...config, frequencyLabel: f.value})}>
                <Text style={[styles.chipText, frequencyLabel === f.value && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <DollarRow label="Area Cost" value={cost} />
        </View>
      )}
    </View>
  );
}

const DEFAULT_AREA: AreaConfig = {
  enabled: false,
  pricingType: 'flat',
  flatRate: 0,
  sqFt: 0,
  ratePerSqFt: 0.10,
  frequencyLabel: 'monthly',
};

function calcAreaCost(a: AreaConfig): number {
  return a.enabled ? (a.pricingType === 'flat' ? a.flatRate : a.sqFt * a.ratePerSqFt) : 0;
}

export function RefreshPowerScrubForm({data, onChange, contractMonths, onRemove}: Props) {
  const dumpster = data?.dumpster ?? DEFAULT_AREA;
  const patio    = data?.patio    ?? DEFAULT_AREA;
  const foh      = data?.foh      ?? DEFAULT_AREA;
  const boh      = data?.boh      ?? DEFAULT_AREA;

  const total = calcAreaCost(dumpster) + calcAreaCost(patio) + calcAreaCost(foh) + calcAreaCost(boh);

  const update = useCallback((fields: Record<string, any>) => {
    const nd = fields.dumpster ?? dumpster;
    const np = fields.patio    ?? patio;
    const nf = fields.foh      ?? foh;
    const nb = fields.boh      ?? boh;
    const newTotal = calcAreaCost(nd) + calcAreaCost(np) + calcAreaCost(nf) + calcAreaCost(nb);
    onChange({
      serviceId: 'refreshPowerScrub',
      displayName: 'Refresh Power Scrub',
      isActive: true,
      contractMonths,
      ...data,
      ...fields,
      dumpster: nd,
      patio:    np,
      foh:      nf,
      boh:      nb,
      contractTotal: newTotal,
      originalContractTotal: newTotal,
    });
  }, [data, dumpster, patio, foh, boh, contractMonths, onChange]);

  return (
    <ServiceCard
      serviceId="refreshPowerScrub"
      displayName="Refresh Power Scrub"
      icon="water-outline"
      iconColor="#0891b2"
      iconBg="#cffafe"
      onRemove={onRemove}>
      <AreaSection
        label="Dumpster Area"
        config={dumpster}
        onChange={c => update({dumpster: c})}
      />
      <FormDivider />
      <AreaSection
        label="Patio"
        config={patio}
        onChange={c => update({patio: c})}
      />
      <FormDivider />
      <AreaSection
        label="Front of House (FOH)"
        config={foh}
        onChange={c => update({foh: c})}
      />
      <FormDivider />
      <AreaSection
        label="Back of House (BOH)"
        config={boh}
        onChange={c => update({boh: c})}
      />
      <FormDivider />
      <DollarRow label="Total per Visit" value={total} highlight />
    </ServiceCard>
  );
}

const styles = StyleSheet.create({
  areaBlock: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  areaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  areaTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  toggle: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  toggleOn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  toggleTextOn: {
    color: '#fff',
  },
  areaBody: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  freqRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  inputRow: {
    gap: 2,
  },
  inputLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    paddingLeft: 2,
  },
});
