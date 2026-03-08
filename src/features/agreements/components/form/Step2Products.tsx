import React, {useState, useMemo, useRef, useEffect} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, FlatList, ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {SmallProduct, Dispenser} from '../../hooks/useFormFilling';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

// ─── Frequency options ────────────────────────────────────────────────────────

const PROD_FREQ = [
  {value: 'daily',     label: 'Daily'},
  {value: 'weekly',    label: 'Weekly'},
  {value: 'biweekly',  label: 'Bi-Wk'},
  {value: 'monthly',   label: 'Monthly'},
  {value: 'quarterly', label: 'Qtrly'},
  {value: 'yearly',    label: 'Yearly'},
];

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(t: string): number {
  const n = parseFloat(t);
  return isNaN(n) ? 0 : n;
}

function displayNum(n: number): string {
  return n === 0 ? '' : String(n);
}

// ─── Autocomplete name input ──────────────────────────────────────────────────

function NameAutocompleteInput({
  value,
  onChangeText,
  placeholder,
  catalogItems,
  onSelectItem,
  onOpenFullCatalog,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  catalogItems: CatalogItemFlat[];
  onSelectItem: (item: CatalogItemFlat) => void;
  onOpenFullCatalog: () => void;
}) {
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    if (!value.trim()) {return [];}
    const q = value.trim().toLowerCase();
    return catalogItems
      .filter(it => it.name.toLowerCase().includes(q))
      .slice(0, 8);
  }, [value, catalogItems]);

  const showDropdown = focused && suggestions.length > 0;

  return (
    <View style={auto.wrapper}>
      {/* Input row */}
      <View style={[auto.inputRow, showDropdown && auto.inputRowOpen]}>
        <TextInput
          style={auto.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
        />
        <TouchableOpacity style={auto.catalogBtn} onPress={onOpenFullCatalog}>
          <Ionicons name="list-outline" size={16} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Inline dropdown */}
      {showDropdown && (
        <View style={auto.dropdown}>
          {suggestions.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[auto.dropItem, idx === suggestions.length - 1 && auto.dropItemLast]}
              onPress={() => {
                onSelectItem(item);
                setFocused(false);
              }}>
              <Text style={auto.dropName} numberOfLines={1}>{item.name}</Text>
              <Text style={auto.dropPrice}>${item.basePrice.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Full catalog picker modal ────────────────────────────────────────────────

type PickCallback = (item: CatalogItemFlat) => void;

function CatalogPickerModal({
  visible,
  items,
  onSelect,
  onClose,
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

          {/* Search bar */}
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
                      <Text style={cp.priceText}>${it.basePrice.toFixed(2)}</Text>
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

// ─── Section header ───────────────────────────────────────────────────────────

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

// ─── Frequency chips ──────────────────────────────────────────────────────────

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

// ─── Small Product Row ────────────────────────────────────────────────────────

function SmallProductRow({
  product, catalogItems, onUpdate, onRemove, onOpenCatalog,
}: {
  product: SmallProduct;
  catalogItems: CatalogItemFlat[];
  onUpdate: (d: Partial<SmallProduct>) => void;
  onRemove: () => void;
  onOpenCatalog: () => void;
}) {
  const total = product.qty * product.unitPrice;
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowTopLine}>
        <NameAutocompleteInput
          value={product.displayName}
          onChangeText={t => onUpdate({displayName: t})}
          placeholder="Product name"
          catalogItems={catalogItems}
          onSelectItem={item => onUpdate({displayName: item.name, unitPrice: item.basePrice})}
          onOpenFullCatalog={onOpenCatalog}
        />
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={styles.fieldRow}>
        <View style={styles.fieldUnit}>
          <Text style={styles.fieldLabel}>Qty</Text>
          <TextInput
            style={styles.numInput}
            value={displayNum(product.qty)}
            onChangeText={t => onUpdate({qty: parseNum(t)})}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <Text style={styles.opSign}>×</Text>
        <View style={[styles.fieldUnit, styles.fieldUnitFlex]}>
          <Text style={styles.fieldLabel}>Unit Price ($)</Text>
          <TextInput
            style={styles.numInput}
            value={displayNum(product.unitPrice)}
            onChangeText={t => onUpdate({unitPrice: parseNum(t)})}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <View style={styles.totalCell}>
          <Text style={styles.fieldLabel}>Total</Text>
          <Text style={styles.totalAmt}>${total.toFixed(2)}</Text>
        </View>
      </View>
      <FreqChips value={product.frequency} onChange={v => onUpdate({frequency: v})} />
    </View>
  );
}

// ─── Dispenser Row ────────────────────────────────────────────────────────────

function DispenserRow({
  product, catalogItems, onUpdate, onRemove, onOpenCatalog,
}: {
  product: Dispenser;
  catalogItems: CatalogItemFlat[];
  onUpdate: (d: Partial<Dispenser>) => void;
  onRemove: () => void;
  onOpenCatalog: () => void;
}) {
  const total = product.qty * (product.warrantyRate + product.replacementRate);
  return (
    <View style={styles.rowCard}>
      <View style={styles.rowTopLine}>
        <NameAutocompleteInput
          value={product.displayName}
          onChangeText={t => onUpdate({displayName: t})}
          placeholder="Dispenser name"
          catalogItems={catalogItems}
          onSelectItem={item => onUpdate({
            displayName: item.name,
            warrantyRate: item.warrantyRate,
            replacementRate: item.replacementRate,
          })}
          onOpenFullCatalog={onOpenCatalog}
        />
        <TouchableOpacity style={styles.removeBtn} onPress={onRemove}>
          <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>
      <View style={styles.fieldRow}>
        <View style={styles.fieldUnit}>
          <Text style={styles.fieldLabel}>Qty</Text>
          <TextInput
            style={styles.numInput}
            value={displayNum(product.qty)}
            onChangeText={t => onUpdate({qty: parseNum(t)})}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <View style={[styles.fieldUnit, styles.fieldUnitFlex]}>
          <Text style={styles.fieldLabel}>Warranty ($)</Text>
          <TextInput
            style={styles.numInput}
            value={displayNum(product.warrantyRate)}
            onChangeText={t => onUpdate({warrantyRate: parseNum(t)})}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <View style={[styles.fieldUnit, styles.fieldUnitFlex]}>
          <Text style={styles.fieldLabel}>Replace ($)</Text>
          <TextInput
            style={styles.numInput}
            value={displayNum(product.replacementRate)}
            onChangeText={t => onUpdate({replacementRate: parseNum(t)})}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor={Colors.textMuted}
          />
        </View>
        <View style={styles.totalCell}>
          <Text style={styles.fieldLabel}>Total</Text>
          <Text style={styles.totalAmt}>${total.toFixed(2)}</Text>
        </View>
      </View>
      <FreqChips value={product.frequency} onChange={v => onUpdate({frequency: v})} />
    </View>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

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
}: Step2ProductsProps) {
  const [pickerCallback, setPickerCallback] = useState<PickCallback | null>(null);

  // Flatten catalog — all items for the full picker modal
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

  // Separate dispenser items for autocomplete
  const dispenserCatalogItems = useMemo(
    () => allCatalogItems.filter(it => it.warrantyRate > 0),
    [allCatalogItems],
  );

  const openPicker = (cb: PickCallback) => {
    setPickerCallback(() => cb);
  };

  return (
    <View style={styles.container}>

      {/* Full catalog picker modal */}
      <CatalogPickerModal
        visible={pickerCallback !== null}
        items={allCatalogItems}
        onSelect={item => pickerCallback?.(item)}
        onClose={() => setPickerCallback(null)}
      />

      {/* Small Products (Paper / Supplies) */}
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
          smallProducts.map(p => (
            <SmallProductRow
              key={p.id}
              product={p}
              catalogItems={allCatalogItems}
              onUpdate={d => onUpdateSmallProduct(p.id, d)}
              onRemove={() => onRemoveSmallProduct(p.id)}
              onOpenCatalog={() => openPicker(item => {
                onUpdateSmallProduct(p.id, {displayName: item.name, unitPrice: item.basePrice});
              })}
            />
          ))
        )}
      </View>

      {/* Dispensers */}
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
          dispensers.map(d => (
            <DispenserRow
              key={d.id}
              product={d}
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
          ))
        )}
      </View>

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    paddingBottom: Spacing.xl,
  },
  section: {
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
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
  rowCard: {
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  rowTopLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  removeBtn: {
    padding: 2,
    marginTop: 6,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.sm,
  },
  fieldUnit: {
    gap: 3,
  },
  fieldUnitFlex: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  numInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 7,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    minWidth: 56,
  },
  opSign: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    paddingBottom: 6,
  },
  totalCell: {
    alignItems: 'flex-end',
    gap: 3,
  },
  totalAmt: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
    paddingBottom: 6,
  },
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
});

// ─── Autocomplete styles ──────────────────────────────────────────────────────

const auto = StyleSheet.create({
  wrapper: {
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    backgroundColor: Colors.background,
  },
  inputRowOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomColor: Colors.primary,
  },
  input: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    paddingVertical: 1,
  },
  catalogBtn: {
    padding: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  dropdown: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: Colors.primary,
    borderBottomLeftRadius: Radius.md,
    borderBottomRightRadius: Radius.md,
    backgroundColor: Colors.surface,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 3},
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 6,
  },
  dropItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  dropItemLast: {
    borderBottomWidth: 0,
  },
  dropName: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  dropPrice: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
});

// ─── Catalog picker styles ────────────────────────────────────────────────────

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
