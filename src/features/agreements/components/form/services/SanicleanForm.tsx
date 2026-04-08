import React, {useCallback, useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  ServiceCard, TotalsBlock, calcTotals,
  FREQ_OPTIONS, DropdownRow, FormDivider, CalcRow, NumberRow, ToggleRow,
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

// ─── Default included items ───────────────────────────────────────────────────

const DEFAULT_INCLUDED_ITEMS = [
  'SaniClean service',
  'Electrostatic spray (free)',
  'Air freshener service (free)',
  'Soap service (free)',
];

// ─── Editable included list ───────────────────────────────────────────────────

function IncludedItemsEditor({
  items,
  isCustomized,
  onChange,
  onReset,
}: {
  items: string[];
  isCustomized: boolean;
  onChange: (items: string[]) => void;
  onReset: () => void;
}) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [addingNew, setAddingNew] = useState(false);
  const [newText, setNewText] = useState('');

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditingText(items[index]);
    setAddingNew(false);
  };

  const saveEdit = () => {
    if (editingIndex === null) {return;}
    const trimmed = editingText.trim();
    if (!trimmed) {return;}
    const next = [...items];
    next[editingIndex] = trimmed;
    onChange(next);
    setEditingIndex(null);
    setEditingText('');
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setEditingText('');
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    if (editingIndex === index) {setEditingIndex(null); setEditingText('');}
  };

  const saveNew = () => {
    const trimmed = newText.trim();
    if (!trimmed) {setAddingNew(false); setNewText(''); return;}
    onChange([...items, trimmed]);
    setNewText('');
    setAddingNew(false);
  };

  const cancelNew = () => {setAddingNew(false); setNewText('');};

  return (
    <View style={inc.container}>
      <View style={inc.header}>
        <Ionicons name="checkmark-circle-outline" size={14} color={Colors.primary} />
        <Text style={inc.headerText}>WHAT&apos;S INCLUDED</Text>
        {isCustomized && (
          <TouchableOpacity onPress={onReset} style={inc.resetBtn}>
            <Text style={inc.resetText}>Reset to defaults</Text>
          </TouchableOpacity>
        )}
      </View>

      {items.map((item, index) => (
        <View key={index} style={inc.itemRow}>
          {editingIndex === index ? (
            <View style={inc.editRow}>
              <TextInput
                style={inc.editInput}
                value={editingText}
                onChangeText={setEditingText}
                onSubmitEditing={saveEdit}
                autoFocus
                returnKeyType="done"
                blurOnSubmit={false}
              />
              <TouchableOpacity style={inc.iconBtn} onPress={saveEdit}>
                <Ionicons name="checkmark" size={16} color="#16a34a" />
              </TouchableOpacity>
              <TouchableOpacity style={inc.iconBtn} onPress={cancelEdit}>
                <Ionicons name="close" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={inc.bullet}>•</Text>
              <Text style={inc.itemText} numberOfLines={2}>{item}</Text>
              <TouchableOpacity style={inc.iconBtn} onPress={() => startEdit(index)}>
                <Ionicons name="pencil-outline" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
              <TouchableOpacity style={inc.iconBtn} onPress={() => removeItem(index)}>
                <Ionicons name="trash-outline" size={14} color="#dc2626" />
              </TouchableOpacity>
            </>
          )}
        </View>
      ))}

      {addingNew ? (
        <View style={inc.editRow}>
          <TextInput
            style={inc.editInput}
            value={newText}
            onChangeText={setNewText}
            onSubmitEditing={saveNew}
            placeholder="New item…"
            placeholderTextColor={Colors.textMuted}
            autoFocus
            returnKeyType="done"
            blurOnSubmit={false}
          />
          <TouchableOpacity style={inc.iconBtn} onPress={saveNew}>
            <Ionicons name="checkmark" size={16} color="#16a34a" />
          </TouchableOpacity>
          <TouchableOpacity style={inc.iconBtn} onPress={cancelNew}>
            <Ionicons name="close" size={16} color={Colors.textMuted} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={inc.addBtn} onPress={() => setAddingNew(true)}>
          <Ionicons name="add" size={14} color={Colors.primary} />
          <Text style={inc.addBtnText}>Add item</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function SanicleanForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  const freq                  = data?.frequency             ?? 'weekly';
  const sinks                 = data?.sinks                 ?? 0;
  const urinals               = data?.urinals               ?? 0;
  const maleToilets           = data?.maleToilets           ?? 0;
  const femaleToilets         = data?.femaleToilets         ?? 0;
  const fixtureRate           = cfg.geographicPricing?.insideBeltway?.ratePerFixture ?? 7;
  const sinkRate              = data?.sinkRate              ?? fixtureRate;
  const urinalRate            = data?.urinalRate            ?? fixtureRate;
  const maleRate              = data?.maleRate              ?? fixtureRate;
  const femaleRate            = data?.femaleRate            ?? fixtureRate;
  const minimumChargePerVisit = data?.minimumChargePerVisit ?? cfg.smallBathroomMinimums?.minimumPriceUnderThreshold ?? 0;
  const applyMinimum          = data?.applyMinimum !== false;

  const includedItems: string[] = data?.includedItems ?? DEFAULT_INCLUDED_ITEMS;
  const isCustomized: boolean   = Array.isArray(data?.includedItems);

  const rawCost =
    sinks * sinkRate +
    urinals * urinalRate +
    maleToilets * maleRate +
    femaleToilets * femaleRate;

  const perVisitBase = applyMinimum && minimumChargePerVisit > 0 ? Math.max(rawCost, minimumChargePerVisit) : rawCost;
  const totals = calcTotals(perVisitBase, freq, contractMonths);

  const update = useCallback((fields: Record<string, any>) => {
    const nf  = fields.frequency             ?? freq;
    const ns  = fields.sinks                 ?? sinks;
    const nu  = fields.urinals               ?? urinals;
    const nm  = fields.maleToilets           ?? maleToilets;
    const nfe = fields.femaleToilets         ?? femaleToilets;
    const nsr = fields.sinkRate              ?? sinkRate;
    const nur = fields.urinalRate            ?? urinalRate;
    const nmr = fields.maleRate              ?? maleRate;
    const nfr = fields.femaleRate            ?? femaleRate;
    const mn  = fields.minimumChargePerVisit ?? minimumChargePerVisit;
    const applyMin = (fields.applyMinimum !== undefined ? fields.applyMinimum : data?.applyMinimum) !== false;
    const raw      = ns * nsr + nu * nur + nm * nmr + nfe * nfr;
    const newBase  = applyMin && mn > 0 ? Math.max(raw, mn) : raw;
    const newTotals = calcTotals(newBase, nf, contractMonths);
    const origRate  = cfg.geographicPricing?.insideBeltway?.ratePerFixture ?? 7;
    const origMin   = cfg.smallBathroomMinimums?.minimumPriceUnderThreshold ?? 0;
    const origRaw   = ns * origRate + nu * origRate + nm * origRate + nfe * origRate;
    const originalPerVisitBase = applyMin && origMin > 0 ? Math.max(origRaw, origMin) : origRaw;
    const originalContractTotal = calcTotals(originalPerVisitBase, nf, contractMonths).contractTotal;
    onChange({
      serviceId: 'saniclean',
      displayName: 'Saniclean',
      isActive: true,
      contractMonths,
      ...data,
      ...fields,
      frequency: nf,
      applyMinimum: applyMin,
      perVisit: newTotals.perVisit,
      monthlyRecurring: newTotals.monthlyRecurring,
      contractTotal: newTotals.contractTotal,
      originalContractTotal,
    });
  }, [data, freq, sinks, urinals, maleToilets, femaleToilets, sinkRate, urinalRate, maleRate, femaleRate, minimumChargePerVisit, applyMinimum, contractMonths, onChange]);

  return (
    <ServiceCard
      serviceId="saniclean"
      displayName="Saniclean"
      icon="shield-checkmark-outline"
      iconColor="#7c3aed"
      iconBg="#ede9fe"
      onRemove={onRemove}
      notes={data?.notes ?? ''}
      onNotesChange={v => update({notes: v})}>
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />
      <CalcRow label="Sinks"          qty={sinks}         onQtyChange={v => update({sinks: v})}         rate={sinkRate}    onRateChange={v => update({sinkRate: v})}    total={sinks * sinkRate} />
      <CalcRow label="Urinals"        qty={urinals}       onQtyChange={v => update({urinals: v})}       rate={urinalRate}  onRateChange={v => update({urinalRate: v})}  total={urinals * urinalRate} />
      <CalcRow label="Male Toilets"   qty={maleToilets}   onQtyChange={v => update({maleToilets: v})}   rate={maleRate}    onRateChange={v => update({maleRate: v})}    total={maleToilets * maleRate} />
      <CalcRow label="Female Toilets" qty={femaleToilets} onQtyChange={v => update({femaleToilets: v})} rate={femaleRate}  onRateChange={v => update({femaleRate: v})}  total={femaleToilets * femaleRate} />
      <NumberRow label="Minimum Per Visit" value={minimumChargePerVisit} onChange={v => update({minimumChargePerVisit: v})} prefix="$" decimals={2} />
      <ToggleRow label="Apply Minimum" value={applyMinimum} onChange={v => update({applyMinimum: v})} subtitle="Use per-visit minimum charge when cost is lower" />
      <TotalsBlock
        frequency={freq}
        perVisit={totals.perVisit}
        firstMonth={totals.firstMonth}
        monthlyRecurring={totals.monthlyRecurring}
        contractMonths={contractMonths}
        contractTotal={totals.contractTotal}
      />
      <IncludedItemsEditor
        items={includedItems}
        isCustomized={isCustomized}
        onChange={items => onChange({...data, includedItems: items})}
        onReset={() => {
          const {includedItems: _removed, ...rest} = data ?? {};
          onChange({serviceId: 'saniclean', displayName: 'Saniclean', isActive: true, contractMonths, ...rest});
        }}
      />
    </ServiceCard>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const inc = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  headerText: {
    flex: 1,
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  resetBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  resetText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: 2,
  },
  bullet: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    width: 12,
  },
  itemText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  editInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  iconBtn: {
    padding: 5,
    borderRadius: Radius.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  addBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
});
