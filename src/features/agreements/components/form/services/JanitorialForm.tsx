import React, {useCallback} from 'react';
import {View, Text, StyleSheet, TextInput} from 'react-native';
import {
  ServiceCard, DollarRow, FormDivider, NumberRow, DropdownRow, FREQ_OPTIONS,
} from './ServiceBase';
import {Colors} from '../../../../../theme/colors';
import {Spacing, Radius} from '../../../../../theme/spacing';
import {FontSize} from '../../../../../theme/typography';

interface SupplyItem {
  name: string;
  amount: number;
}

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
}

const VISITS_PER_WEEK = [1, 2, 3, 4, 5, 6, 7];

const DEFAULT_PLACE_TYPE_LABELS: Record<string, string> = {
  office:        'Office',
  home:          'Home',
  restaurant:    'Restaurant',
  businessPlace: 'Business Place',
};

function placeTypeLabel(key: string): string {
  if (DEFAULT_PLACE_TYPE_LABELS[key]) {return DEFAULT_PLACE_TYPE_LABELS[key];}
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
}

const DEFAULT_SUPPLIES: SupplyItem[] = [
  {name: 'Vacuums',           amount: 100},
  {name: 'Mops',              amount: 500},
  {name: 'Mop Buckets',       amount: 200},
  {name: 'Dust Mops',         amount: 300},
  {name: 'Microfiber',        amount: 0},
  {name: 'Cleaning Products', amount: 0},
  {name: 'Consumables',       amount: 0},
  {name: 'Miscellaneous',     amount: 0},
];

interface JanCalcResult {
  hoursPerVisit: number;
  weeklyLabor: number;
  annualBaseLabor: number;
  annualLaborTax: number;
  totalAnnualSupplies: number;
  totalAnnualCost: number;
  annualContractValue: number;
  contractTotal: number;
  grossProfit: number;
}

function calcJanitorial(
  sqFt: number,
  productionRate: number,
  visitsPerWeek: number,
  costPerHour: number,
  laborTaxPct: number,
  grossProfitPct: number,
  supplies: SupplyItem[],
  contractMonths: number,
): JanCalcResult {
  const hoursPerVisit = productionRate > 0 ? sqFt / productionRate : 0;
  const weeklyLabor = hoursPerVisit * costPerHour * visitsPerWeek;
  const annualBaseLabor = weeklyLabor * 52;
  const annualLaborTax = annualBaseLabor * (laborTaxPct / 100);
  const totalAnnualSupplies = supplies.reduce((s, x) => s + x.amount, 0);
  const totalAnnualCost = annualBaseLabor + annualLaborTax + totalAnnualSupplies;
  const gp = Math.min(Math.max(grossProfitPct / 100, 0), 0.999);
  const annualContractValue = gp < 1 ? totalAnnualCost / (1 - gp) : 0;
  const contractTotal = annualContractValue * contractMonths / 12;
  const grossProfit = annualContractValue - totalAnnualCost;
  return {hoursPerVisit, weeklyLabor, annualBaseLabor, annualLaborTax, totalAnnualSupplies, totalAnnualCost, annualContractValue, contractTotal, grossProfit};
}

export function JanitorialForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  // Build production rates from backend config only
  const productionRates: Record<string, number> = cfg.productionRates ?? {};

  // Dropdown options derived from backend production rates
  const placeTypeOptions = Object.keys(productionRates).map(key => ({
    value: key,
    label: placeTypeLabel(key),
  }));

  const adminCostPerHour    = cfg.costPerHour    ?? 20;
  const adminLaborTaxPct    = cfg.laborTaxPct    ?? 15;
  const adminGrossProfitPct = cfg.grossProfitPct ?? 33;

  // Build admin-configured supply defaults (merge overrides into canonical order)
  const adminDefaultSupplies: SupplyItem[] = DEFAULT_SUPPLIES.map(item => {
    const key = item.name.replace(/\s+/g, '').charAt(0).toLowerCase() +
                item.name.replace(/\s+/g, '').slice(1);
    const adminOverrides = cfg.defaultSupplies ?? {};
    const variants = [
      key,
      item.name.toLowerCase().replace(/\s+/g, ''),
      item.name.toLowerCase().replace(/\s+/g, '_'),
    ];
    for (const v of variants) {
      if (adminOverrides[v] !== undefined) {
        return {...item, amount: Number(adminOverrides[v])};
      }
    }
    return item;
  });

  const freq           = data?.frequency      ?? 'weekly';
  const visitsPerWeek  = data?.visitsPerWeek  ?? 1;
  const availablePlaceTypes = Object.keys(productionRates);
  const placeType      = data?.placeType && productionRates[data.placeType] !== undefined
    ? data.placeType
    : (availablePlaceTypes[0] ?? 'office');
  const sqFt           = data?.sqFt           ?? 0;
  const costPerHour    = data?.costPerHour    ?? adminCostPerHour;
  const laborTaxPct    = data?.laborTaxPct    ?? adminLaborTaxPct;
  const grossProfitPct = data?.grossProfitPct ?? adminGrossProfitPct;
  const supplies: SupplyItem[] = data?.supplies ?? adminDefaultSupplies;

  const productionRate = (productionRates as any)[placeType] ?? 0;
  console.log('[JAN DEBUG] placeType:', placeType, '| productionRates:', JSON.stringify(productionRates), '| rate:', productionRate, '| sqFt:', sqFt);

  const calc = calcJanitorial(sqFt, productionRate, visitsPerWeek, costPerHour, laborTaxPct, grossProfitPct, supplies, contractMonths);
  const monthlyRecurring = contractMonths > 0 ? calc.contractTotal / contractMonths : 0;

  const update = useCallback((fields: Record<string, any>) => {
    const newVisits         = fields.visitsPerWeek  ?? visitsPerWeek;
    const newPlaceType      = fields.placeType      ?? placeType;
    const newSqFt           = fields.sqFt           ?? sqFt;
    const newCostPerHour    = fields.costPerHour    ?? costPerHour;
    const newLaborTaxPct    = fields.laborTaxPct    ?? laborTaxPct;
    const newGrossProfitPct = fields.grossProfitPct ?? grossProfitPct;
    const newSupplies       = fields.supplies       ?? supplies;
    const newFreq           = fields.frequency      ?? freq;
    const newProdRate       = (productionRates as any)[newPlaceType] ?? 0;

    const newCalc  = calcJanitorial(newSqFt, newProdRate, newVisits, newCostPerHour, newLaborTaxPct, newGrossProfitPct, newSupplies, contractMonths);
    const origCalc = calcJanitorial(newSqFt, newProdRate, newVisits, adminCostPerHour, adminLaborTaxPct, adminGrossProfitPct, adminDefaultSupplies, contractMonths);
    const newMonthly = contractMonths > 0 ? newCalc.contractTotal / contractMonths : 0;

    onChange({
      serviceId: 'pureJanitorial',
      displayName: 'Janitorial',
      isActive: newSqFt > 0,
      contractMonths,
      ...data,
      ...fields,
      placeType: newPlaceType,
      frequency: newFreq,
      perVisit: newMonthly,
      monthlyRecurring: newMonthly,
      contractTotal: newCalc.contractTotal,
      originalContractTotal: origCalc.contractTotal,
    });
  }, [data, freq, visitsPerWeek, placeType, sqFt, costPerHour, laborTaxPct, grossProfitPct, supplies, contractMonths, onChange]);

  const updateSupply = useCallback((index: number, amount: number) => {
    const newSupplies = supplies.map((s, i) => i === index ? {...s, amount} : s);
    update({supplies: newSupplies});
  }, [supplies, update]);

  return (
    <ServiceCard
      serviceId="pureJanitorial"
      displayName="Janitorial"
      icon="briefcase-outline"
      iconColor="#059669"
      iconBg="#d1fae5"
      onRemove={onRemove}
      notes={data?.notes ?? ''}
      onNotesChange={v => update({notes: v})}>

      {/* Frequency */}
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />

      {/* Visits per Week */}
      <DropdownRow
        label="Visits per Week"
        value={String(visitsPerWeek)}
        options={VISITS_PER_WEEK.map(n => ({value: String(n), label: String(n)}))}
        onChange={v => update({visitsPerWeek: Number(v)})}
      />

      {/* Place Type */}
      <DropdownRow
        label="Place Type"
        value={placeType}
        options={placeTypeOptions}
        onChange={v => update({placeType: v})}
      />

      {/* Square Feet */}
      <NumberRow label="Square Feet" value={sqFt} onChange={v => update({sqFt: v})} decimals={0} suffix="sq ft" />

      {/* Hours Per Visit (read-only) */}
      <View style={styles.readOnlyRow}>
        <Text style={styles.readOnlyLabel}>Hours Per Visit</Text>
        <Text style={styles.readOnlyValue}>{calc.hoursPerVisit.toFixed(2)} hrs</Text>
      </View>

      <FormDivider />

      {/* Editable rates */}
      <NumberRow label="Cost Per Hour" value={costPerHour} onChange={v => update({costPerHour: v})} prefix="$" decimals={2} />
      <NumberRow label="Labor Tax %" value={laborTaxPct} onChange={v => update({laborTaxPct: v})} suffix="%" decimals={1} />
      <NumberRow label="Gross Profit %" value={grossProfitPct} onChange={v => update({grossProfitPct: v})} suffix="%" decimals={1} />

      <FormDivider />

      {/* Supply Line Items */}
      <View style={styles.suppliesHeader}>
        <Text style={styles.suppliesTitle}>Supply Line Items (Annual)</Text>
      </View>
      {supplies.map((s, i) => (
        <View key={i} style={styles.supplyRow}>
          <Text style={styles.supplyName}>{s.name}</Text>
          <View style={styles.supplyInputRow}>
            <Text style={styles.supplyPrefix}>$</Text>
            <TextInput
              style={styles.supplyInput}
              value={s.amount === 0 ? '' : String(s.amount)}
              onChangeText={t => {const n = parseFloat(t); updateSupply(i, isNaN(n) ? 0 : n);}}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              keyboardType="numeric"
            />
          </View>
        </View>
      ))}

      {/* Pricing Summary */}
      <View style={styles.summarySection}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryHeaderText}>Pricing Summary</Text>
        </View>
        <DollarRow label="Annual Base Labor" value={calc.annualBaseLabor} />
        <DollarRow label={`Annual Labor Tax (${laborTaxPct}%)`} value={calc.annualLaborTax} />
        <DollarRow label="Total Annual Labor" value={calc.annualBaseLabor + calc.annualLaborTax} />
        <FormDivider />
        <DollarRow label="Annual Supplies" value={calc.totalAnnualSupplies} />
        <FormDivider />
        <DollarRow label="Total Annual Cost" value={calc.totalAnnualCost} />
        <DollarRow label={`Gross Profit (${grossProfitPct}%)`} value={calc.grossProfit} />
        <DollarRow label="Annual Contract Value" value={calc.annualContractValue} />
        <FormDivider />
        <DollarRow label="Monthly Recurring" value={monthlyRecurring} />
        <DollarRow label={`Contract Total (${contractMonths} mo)`} value={calc.contractTotal} highlight />
      </View>
    </ServiceCard>
  );
}

const styles = StyleSheet.create({
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  readOnlyLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  readOnlyValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  suppliesHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xs,
  },
  suppliesTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  supplyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  supplyName: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  supplyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  supplyPrefix: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  supplyInput: {
    width: 80,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  summarySection: {
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  summaryHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: '#f8fafc',
  },
  summaryHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
