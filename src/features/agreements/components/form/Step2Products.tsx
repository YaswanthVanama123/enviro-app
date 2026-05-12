import React, {useState, useMemo, useRef, useEffect} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, FlatList,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {SmallProduct, Dispenser} from '../../hooks/useFormFilling';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';
import {formatCurrency} from '../../../../shared/utils/format.utils';

const PROD_FREQ = [
  {value: 'daily',     label: 'Daily',   short: 'Daily'},
  {value: 'weekly',    label: 'Weekly',   short: 'Wkly'},
  {value: 'biweekly',  label: 'Bi-Wk',   short: 'Bi-Wk'},
  {value: 'monthly',   label: 'Monthly',  short: 'Mthly'},
  {value: 'quarterly', label: 'Qtrly',    short: 'Qtrly'},
  {value: 'yearly',    label: 'Yearly',   short: 'Yrly'},
];

function freqShort(value: string): string {
  return PROD_FREQ.find(f => f.value === value)?.short ?? value;
}

interface CatalogItemFlat {
  key: string;
  name: string;
  familyLabel: string;
  basePrice: number;
  warrantyRate: number;
  replacementRate: number;
  description: string;
}

interface Step2ProductsProps {
  smallProducts: SmallProduct[];
  dispensers: Dispenser[];
  onAddSmallProduct: () => void;
  onRemoveSmallProduct: (id: string) => void;
  onUpdateSmallProduct: (id: string, data: Partial<SmallProduct>) => void;
  onAddDispenser: () => void;
  onRemoveDispenser: (id: string) => void;
  onUpdateDispenser: (id: string, data: Partial<Dispenser>) => void;
  productCatalog?: any;
  includeProductsTable: boolean;
  onIncludeProductsTableChange: (v: boolean) => void;
}

function parseNum(t: string): number {
  const n = parseFloat(t);
  return isNaN(n) ? 0 : n;
}

function displayNum(n: number): string {
  return n === 0 ? '' : String(n);
}

// ─── Catalog Picker Modal ──────────────────────────────────────────
type PickCallback = (item: CatalogItemFlat) => void;

function CatalogPickerModal({
  visible, items, onSelect, onClose,
}: {
  visible: boolean;
  items: CatalogItemFlat[];
  onSelect: PickCallback;
  onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const searchRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setSearch('');
      setTimeout(() => searchRef.current?.focus(), 300);
    }
  }, [visible]);

  const filtered = useMemo(() => {
    if (!search.trim()) {return items;}
    const q = search.trim().toLowerCase();
    return items.filter(it =>
      it.name.toLowerCase().includes(q) ||
      it.familyLabel.toLowerCase().includes(q),
    );
  }, [items, search]);

  const grouped = useMemo(() => {
    const map: Record<string, CatalogItemFlat[]> = {};
    filtered.forEach(it => {
      if (!map[it.familyLabel]) {map[it.familyLabel] = [];}
      map[it.familyLabel].push(it);
    });
    return Object.entries(map).map(([label, products]) => ({label, products}));
  }, [filtered]);

  const flatData: ({type: 'header'; label: string} | {type: 'item'; item: CatalogItemFlat})[] =
    grouped.flatMap(g => [
      {type: 'header', label: g.label},
      ...g.products.map(item => ({type: 'item' as const, item})),
    ]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cp.overlay}>
        <View style={cp.sheet}>
          <View style={cp.header}>
            <Text style={cp.headerTitle}>Select from Catalog</Text>
            <TouchableOpacity onPress={onClose} style={cp.closeBtn}>
              <Ionicons name="close" size={22} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={cp.searchRow}>
            <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
            <TextInput
              ref={searchRef}
              style={cp.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search products…"
              placeholderTextColor={Colors.textMuted}
              returnKeyType="search"
              clearButtonMode="while-editing"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {flatData.length === 0 ? (
            <View style={cp.empty}>
              <Ionicons name="search-outline" size={32} color={Colors.textMuted} />
              <Text style={cp.emptyText}>
                {items.length === 0 ? 'No catalog products available' : `No results for "${search}"`}
              </Text>
            </View>
          ) : (
            <FlatList
              data={flatData}
              keyExtractor={(_, i) => String(i)}
              style={cp.list}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({item: row}) => {
                if (row.type === 'header') {
                  return (
                    <View style={cp.catHeader}>
                      <Text style={cp.catLabel}>{row.label}</Text>
                    </View>
                  );
                }
                const it = row.item;
                return (
                  <TouchableOpacity
                    style={cp.productRow}
                    onPress={() => { onSelect(it); onClose(); }}>
                    <View style={cp.productInfo}>
                      <Text style={cp.productName}>{it.name}</Text>
                      {it.description ? (
                        <Text style={cp.productDesc} numberOfLines={1}>{it.description}</Text>
                      ) : null}
                    </View>
                    <View style={cp.productPrices}>
                      <Text style={cp.priceText}>{formatCurrency(it.basePrice)}</Text>
                      <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Section Header ────────────────────────────────────────────────
function SectionHeader({title, icon, count, onAdd}: {
  title: string; icon: string; count: number; onAdd: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionLeft}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
        {count > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{count}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={onAdd}>
        <Ionicons name="add" size={14} color={Colors.primary} />
        <Text style={styles.addBtnText}>Add</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Table Column Header ───────────────────────────────────────────
function TableColHeader({priceLabel}: {priceLabel?: string}) {
  return (
    <View style={styles.colHeaderRow}>
      <Text style={[styles.colLabel, {flex: 1}]}>Product</Text>
      <Text style={[styles.colLabel, {width: 36, textAlign: 'center'}]}>Qty</Text>
      <Text style={[styles.colLabel, {width: 56, textAlign: 'center'}]}>{priceLabel ?? 'Price'}</Text>
      <Text style={[styles.colLabel, {width: 44, textAlign: 'center'}]}>Freq</Text>
      <Text style={[styles.colLabel, {width: 58, textAlign: 'right'}]}>Total</Text>
      <View style={{width: 24}} />
    </View>
  );
}

// ─── Frequency Chips (Expanded) ────────────────────────────────────
function FreqChips({value, onChange}: {value: string; onChange: (v: string) => void}) {
  return (
    <View style={styles.freqRow}>
      {PROD_FREQ.map(f => (
        <TouchableOpacity
          key={f.value}
          style={[styles.freqChip, value === f.value && styles.freqChipActive]}
          onPress={() => onChange(f.value)}>
          <Text style={[styles.freqText, value === f.value && styles.freqTextActive]}>
            {f.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ─── Cost Type Toggle (Expanded) ───────────────────────────────────
function CostTypeToggle({value, onChange, labels}: {
  value: 'productCost' | 'warranty';
  onChange: (v: 'productCost' | 'warranty') => void;
  labels?: [string, string];
}) {
  const l1 = labels?.[0] ?? 'Warranty';
  const l2 = labels?.[1] ?? 'Direct Price';
  return (
    <View style={styles.costToggleRow}>
      <TouchableOpacity
        style={[styles.costToggleBtn, value === 'warranty' && styles.costToggleBtnActive]}
        onPress={() => onChange('warranty')}>
        <Text style={[styles.costToggleText, value === 'warranty' && styles.costToggleTextActive]}>
          {l1}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.costToggleBtn, value === 'productCost' && styles.costToggleBtnActive]}
        onPress={() => onChange('productCost')}>
        <Text style={[styles.costToggleText, value === 'productCost' && styles.costToggleTextActive]}>
          {l2}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Compact Product Row ───────────────────────────────────────────
function CompactProductRow({
  product, isExpanded, onToggle, catalogItems, onUpdate, onRemove, onOpenCatalog,
}: {
  product: SmallProduct;
  isExpanded: boolean;
  onToggle: () => void;
  catalogItems: CatalogItemFlat[];
  onUpdate: (d: Partial<SmallProduct>) => void;
  onRemove: () => void;
  onOpenCatalog: () => void;
}) {
  const costType = product.costType ?? 'warranty';
  const total = product.qty * product.unitPrice;

  return (
    <View style={[styles.compactCard, isExpanded && styles.compactCardExpanded]}>
      {/* Compact row */}
      <TouchableOpacity style={styles.compactRow} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.compactName} numberOfLines={1}>{product.displayName || '—'}</Text>
        <TextInput
          style={styles.compactInput}
          value={displayNum(product.qty)}
          onChangeText={t => onUpdate({qty: parseNum(t)})}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
        />
        <TextInput
          style={[styles.compactInput, styles.compactInputWide]}
          value={displayNum(product.unitPrice)}
          onChangeText={t => onUpdate({unitPrice: parseNum(t)})}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
        />
        <View style={[styles.freqLabel, costType === 'warranty' && styles.freqLabelActive]}>
          <Text style={[styles.freqLabelText, costType === 'warranty' && styles.freqLabelTextActive]} numberOfLines={1}>
            {costType === 'warranty' ? freqShort(product.frequency) : '1×'}
          </Text>
        </View>
        <Text style={styles.compactTotal}>{formatCurrency(total)}</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
          <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Expanded detail */}
      {isExpanded && (
        <View style={styles.expandPanel}>
          <View style={styles.expandNameRow}>
            <TextInput
              style={styles.expandNameInput}
              value={product.displayName}
              onChangeText={t => onUpdate({displayName: t})}
              placeholder="Product name"
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity style={styles.catalogBtn} onPress={onOpenCatalog}>
              <Ionicons name="list-outline" size={15} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <CostTypeToggle value={costType} onChange={v => onUpdate({costType: v})} />
          {costType === 'warranty' ? (
            <FreqChips value={product.frequency} onChange={v => onUpdate({frequency: v})} />
          ) : (
            <Text style={styles.noFreqNote}>One-time charge — no frequency</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Compact Dispenser Row ─────────────────────────────────────────
function CompactDispenserRow({
  product, isExpanded, onToggle, catalogItems, onUpdate, onRemove, onOpenCatalog,
}: {
  product: Dispenser;
  isExpanded: boolean;
  onToggle: () => void;
  catalogItems: CatalogItemFlat[];
  onUpdate: (d: Partial<Dispenser>) => void;
  onRemove: () => void;
  onOpenCatalog: () => void;
}) {
  const costType = product.costType ?? 'productCost';
  const rate = costType === 'warranty' ? product.warrantyRate : product.replacementRate;
  const total = product.qty * rate;

  return (
    <View style={[styles.compactCard, isExpanded && styles.compactCardExpanded]}>
      {/* Compact row */}
      <TouchableOpacity style={styles.compactRow} onPress={onToggle} activeOpacity={0.7}>
        <Text style={styles.compactName} numberOfLines={1}>{product.displayName || '—'}</Text>
        <TextInput
          style={styles.compactInput}
          value={displayNum(product.qty)}
          onChangeText={t => onUpdate({qty: parseNum(t)})}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
        />
        <TextInput
          style={[styles.compactInput, styles.compactInputWide]}
          value={displayNum(rate)}
          onChangeText={t => {
            if (costType === 'warranty') {onUpdate({warrantyRate: parseNum(t)});}
            else {onUpdate({replacementRate: parseNum(t)});}
          }}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={Colors.textMuted}
        />
        <View style={[styles.freqLabel, costType === 'warranty' && styles.freqLabelActive]}>
          <Text style={[styles.freqLabelText, costType === 'warranty' && styles.freqLabelTextActive]} numberOfLines={1}>
            {costType === 'warranty' ? freqShort(product.frequency) : '1×'}
          </Text>
        </View>
        <Text style={styles.compactTotal}>{formatCurrency(total)}</Text>
        <TouchableOpacity onPress={onRemove} hitSlop={{top: 8, bottom: 8, left: 4, right: 4}}>
          <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Expanded detail */}
      {isExpanded && (
        <View style={styles.expandPanel}>
          <View style={styles.expandNameRow}>
            <TextInput
              style={styles.expandNameInput}
              value={product.displayName}
              onChangeText={t => onUpdate({displayName: t})}
              placeholder="Dispenser name"
              placeholderTextColor={Colors.textMuted}
            />
            <TouchableOpacity style={styles.catalogBtn} onPress={onOpenCatalog}>
              <Ionicons name="list-outline" size={15} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          <CostTypeToggle value={costType} onChange={v => onUpdate({costType: v})} labels={['Warranty', 'Replace']} />
          {costType === 'warranty' ? (
            <FreqChips value={product.frequency} onChange={v => onUpdate({frequency: v})} />
          ) : (
            <Text style={styles.noFreqNote}>One-time charge — no frequency</Text>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export function Step2Products({
  smallProducts,
  dispensers,
  onAddSmallProduct,
  onRemoveSmallProduct,
  onUpdateSmallProduct,
  onAddDispenser,
  onRemoveDispenser,
  onUpdateDispenser,
  productCatalog,
  includeProductsTable,
  onIncludeProductsTableChange,
}: Step2ProductsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pickerCallback, setPickerCallback] = useState<PickCallback | null>(null);

  const allCatalogItems = useMemo<CatalogItemFlat[]>(() => {
    if (!productCatalog?.families) {return [];}
    const items: CatalogItemFlat[] = [];
    productCatalog.families.forEach((family: any) => {
      if (!Array.isArray(family.products)) {return;}
      family.products.forEach((p: any) => {
        items.push({
          key:             p.key ?? p._id ?? '',
          name:            p.name ?? '',
          familyLabel:     family.label ?? family.key ?? '',
          basePrice:       p.basePrice?.amount ?? 0,
          warrantyRate:    p.warrantyPricePerUnit?.amount ?? 0,
          replacementRate: p.basePrice?.amount ?? 0,
          description:     p.description ?? '',
        });
      });
    });
    return items;
  }, [productCatalog]);

  const dispenserCatalogItems = useMemo(
    () => allCatalogItems.filter(it => it.warrantyRate > 0),
    [allCatalogItems],
  );

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const openPicker = (cb: PickCallback) => {
    setPickerCallback(() => cb);
  };

  return (
    <View style={styles.container}>

      <CatalogPickerModal
        visible={pickerCallback !== null}
        items={allCatalogItems}
        onSelect={item => pickerCallback?.(item)}
        onClose={() => setPickerCallback(null)}
      />

      {/* ── Small Products Section ── */}
      <View style={styles.section}>
        <SectionHeader
          icon="document-outline"
          title="Small Products (Paper)"
          count={smallProducts.length}
          onAdd={onAddSmallProduct}
        />
        {smallProducts.length === 0 ? (
          <Text style={styles.emptyText}>No products added — tap Add to start</Text>
        ) : (
          <>
            <TableColHeader />
            {smallProducts.map(p => (
              <CompactProductRow
                key={p.id}
                product={p}
                isExpanded={expandedId === p.id}
                onToggle={() => toggleExpand(p.id)}
                catalogItems={allCatalogItems}
                onUpdate={d => onUpdateSmallProduct(p.id, d)}
                onRemove={() => onRemoveSmallProduct(p.id)}
                onOpenCatalog={() => openPicker(item => {
                  onUpdateSmallProduct(p.id, {displayName: item.name, unitPrice: item.basePrice});
                })}
              />
            ))}
          </>
        )}
      </View>

      {/* ── Dispensers Section ── */}
      <View style={styles.section}>
        <SectionHeader
          icon="cube-outline"
          title="Dispensers"
          count={dispensers.length}
          onAdd={onAddDispenser}
        />
        {dispensers.length === 0 ? (
          <Text style={styles.emptyText}>No dispensers added — tap Add to start</Text>
        ) : (
          <>
            <TableColHeader priceLabel="Rate" />
            {dispensers.map(d => (
              <CompactDispenserRow
                key={d.id}
                product={d}
                isExpanded={expandedId === d.id}
                onToggle={() => toggleExpand(d.id)}
                catalogItems={dispenserCatalogItems}
                onUpdate={upd => onUpdateDispenser(d.id, upd)}
                onRemove={() => onRemoveDispenser(d.id)}
                onOpenCatalog={() => openPicker(item => {
                  onUpdateDispenser(d.id, {
                    displayName: item.name,
                    warrantyRate: item.warrantyRate,
                    replacementRate: item.replacementRate,
                  });
                })}
              />
            ))}
          </>
        )}
      </View>

      {/* ── Include checkbox ── */}
      <TouchableOpacity
        style={styles.includeCheckboxRow}
        onPress={() => onIncludeProductsTableChange(!includeProductsTable)}
        activeOpacity={0.7}>
        <View style={[styles.checkbox, includeProductsTable && styles.checkboxChecked]}>
          {includeProductsTable && (
            <Ionicons name="checkmark" size={14} color="#fff" />
          )}
        </View>
        <Text style={styles.includeCheckboxLabel}>Include Products Table in PDF</Text>
      </TouchableOpacity>

    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  includeCheckboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  includeCheckboxLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  // Section
  section: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  sectionLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  badge: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 6,
    paddingVertical: 1,
    minWidth: 20,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#fff',
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  addBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },

  // Column header
  colHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: 4,
  },
  colLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Compact row
  compactCard: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  compactCardExpanded: {
    backgroundColor: '#fafbfc',
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    gap: 4,
  },
  compactName: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  compactInput: {
    width: 36,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
    fontSize: 12,
    color: Colors.textPrimary,
    textAlign: 'center',
    backgroundColor: '#fff',
  },
  compactInputWide: {
    width: 56,
  },
  freqLabel: {
    width: 44,
    paddingVertical: 3,
    paddingHorizontal: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  freqLabelActive: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  freqLabelText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  freqLabelTextActive: {
    color: '#166534',
  },
  compactTotal: {
    width: 58,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'right',
  },

  // Expanded panel
  expandPanel: {
    paddingHorizontal: Spacing.sm,
    paddingTop: 4,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    backgroundColor: '#f8fafc',
  },
  expandNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  expandNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: '#fff',
  },
  catalogBtn: {
    padding: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },

  // Frequency chips
  freqRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  freqChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  freqChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  freqText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  freqTextActive: {
    color: '#fff',
    fontWeight: '700',
  },

  // Cost type toggle
  costToggleRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  costToggleBtn: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  costToggleBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  costToggleText: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  costToggleTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  noFreqNote: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
});

const cp = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    height: '70%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    paddingVertical: 0,
  },
  list: {
    flex: 1,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  catHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xs,
    backgroundColor: '#f8fafc',
  },
  catLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  productInfo: {
    flex: 1,
    gap: 2,
  },
  productName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  productDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  productPrices: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  priceText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
});
