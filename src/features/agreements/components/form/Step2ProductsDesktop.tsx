/**
 * Step2ProductsDesktop.tsx
 * Desktop / Mac Catalyst products section — exact web app style.
 * Logic identical to Step2Products.tsx; only sizing and styles differ.
 * Mobile view is unchanged (still uses Step2Products.tsx).
 */
import React, {useState, useMemo, useRef, useEffect} from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, FlatList, ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {SmallProduct, Dispenser} from '../../hooks/useFormFilling';

// ── Web app palette ───────────────────────────────────────
const C = {
  primary:     '#c00000',
  primaryBg:   '#fff0f0',
  surface:     '#ffffff',
  bg:          '#f9fafb',
  bgCard:      '#f8fafc',
  border:      '#e5e7eb',
  borderLight: '#f3f4f6',
  text:        '#1f2937',
  textCard:    '#374151',
  label:       '#4b5563',
  textMuted:   '#6b7280',
  textMutedLt: '#9ca3af',
  inputText:   '#2c3e50',
};

const PROD_FREQ = [
  {value: 'daily',     label: 'Daily'},
  {value: 'weekly',    label: 'Weekly'},
  {value: 'biweekly',  label: 'Bi-Wk'},
  {value: 'monthly',   label: 'Monthly'},
  {value: 'quarterly', label: 'Qtrly'},
  {value: 'yearly',    label: 'Yearly'},
];

interface CatalogItemFlat {
  key: string;
  name: string;
  familyLabel: string;
  basePrice: number;
  warrantyRate: number;
  replacementRate: number;
  description: string;
}

interface Step2ProductsDesktopProps {
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

// ── Autocomplete name input ───────────────────────────────
function NameInput({
  value, onChangeText, placeholder, catalogItems, onSelectItem, onOpenFullCatalog,
}: {
  value: string; onChangeText: (t: string) => void; placeholder: string;
  catalogItems: CatalogItemFlat[];
  onSelectItem: (item: CatalogItemFlat) => void;
  onOpenFullCatalog: () => void;
}) {
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    if (!value.trim()) {return [];}
    const q = value.trim().toLowerCase();
    return catalogItems.filter(it => it.name.toLowerCase().includes(q)).slice(0, 8);
  }, [value, catalogItems]);

  const showDrop = focused && suggestions.length > 0;

  return (
    <View style={ai.wrap}>
      <View style={[ai.row, showDrop && ai.rowOpen]}>
        <TextInput
          style={ai.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={C.textMutedLt}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 200)}
          autoCorrect={false}
        />
        <TouchableOpacity style={ai.catBtn} onPress={onOpenFullCatalog}>
          <Ionicons name="list-outline" size={16} color={C.primary} />
        </TouchableOpacity>
      </View>
      {showDrop && (
        <View style={ai.drop}>
          {suggestions.map((item, idx) => (
            <TouchableOpacity
              key={item.key}
              style={[ai.dropItem, idx === suggestions.length - 1 && ai.dropItemLast]}
              onPress={() => {onSelectItem(item); setFocused(false);}}>
              <Text style={ai.dropName} numberOfLines={1}>{item.name}</Text>
              <Text style={ai.dropPrice}>${item.basePrice.toFixed(2)}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const ai = StyleSheet.create({
  wrap: {flex: 1},
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    backgroundColor: C.surface,
  },
  rowOpen: {
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
    borderBottomColor: C.primary,
  },
  input: {flex: 1, fontSize: 15, fontWeight: '600', color: C.text, padding: 0},
  catBtn: {
    padding: 4, borderRadius: 6, borderWidth: 1,
    borderColor: C.primary, backgroundColor: C.primaryBg,
  },
  drop: {
    borderWidth: 1, borderTopWidth: 0, borderColor: C.primary,
    borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
    backgroundColor: C.surface,
    shadowColor: '#000', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 6,
  },
  dropItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
  },
  dropItemLast: {borderBottomWidth: 0},
  dropName: {flex: 1, fontSize: 14, color: C.text, fontWeight: '500'},
  dropPrice: {fontSize: 14, fontWeight: '700', color: C.primary},
});

// ── Catalog picker modal ──────────────────────────────────
type PickCb = (item: CatalogItemFlat) => void;

function CatalogModal({visible, items, onSelect, onClose}: {
  visible: boolean; items: CatalogItemFlat[];
  onSelect: PickCb; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const ref = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {setSearch(''); setTimeout(() => ref.current?.focus(), 300);}
  }, [visible]);

  const filtered = useMemo(() => {
    if (!search.trim()) {return items;}
    const q = search.trim().toLowerCase();
    return items.filter(it =>
      it.name.toLowerCase().includes(q) || it.familyLabel.toLowerCase().includes(q),
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

  const rows: ({type: 'header'; label: string} | {type: 'item'; item: CatalogItemFlat})[] =
    grouped.flatMap(g => [
      {type: 'header', label: g.label},
      ...g.products.map(item => ({type: 'item' as const, item})),
    ]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={cm.overlay}>
        <View style={cm.sheet}>
          <View style={cm.header}>
            <Text style={cm.title}>Select from Catalog</Text>
            <TouchableOpacity onPress={onClose} style={cm.closeBtn}>
              <Ionicons name="close" size={22} color={C.text} />
            </TouchableOpacity>
          </View>
          <View style={cm.searchRow}>
            <Ionicons name="search-outline" size={16} color={C.textMuted} />
            <TextInput
              ref={ref}
              style={cm.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search products…"
              placeholderTextColor={C.textMuted}
              returnKeyType="search"
              autoCorrect={false}
              autoCapitalize="none"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={16} color={C.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          {rows.length === 0 ? (
            <View style={cm.empty}>
              <Ionicons name="search-outline" size={32} color={C.textMuted} />
              <Text style={cm.emptyText}>
                {items.length === 0 ? 'No catalog products available' : `No results for "${search}"`}
              </Text>
            </View>
          ) : (
            <FlatList
              data={rows}
              keyExtractor={(_, i) => String(i)}
              style={{flex: 1}}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({item: row}) => {
                if (row.type === 'header') {
                  return (
                    <View style={cm.catHead}>
                      <Text style={cm.catLabel}>{row.label}</Text>
                    </View>
                  );
                }
                const it = row.item;
                return (
                  <TouchableOpacity
                    style={cm.prodRow}
                    onPress={() => {onSelect(it); onClose();}}>
                    <View style={{flex: 1, gap: 2}}>
                      <Text style={cm.prodName}>{it.name}</Text>
                      {it.description ? (
                        <Text style={cm.prodDesc} numberOfLines={1}>{it.description}</Text>
                      ) : null}
                    </View>
                    <Text style={cm.prodPrice}>${it.basePrice.toFixed(2)}</Text>
                    <Ionicons name="chevron-forward" size={14} color={C.textMuted} />
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

const cm = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end'},
  sheet: {
    backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    height: '72%',
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  title: {fontSize: 18, fontWeight: '700', color: C.text},
  closeBtn: {padding: 4},
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, paddingHorizontal: 12, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  searchInput: {flex: 1, fontSize: 15, color: C.text, paddingVertical: 0},
  empty: {flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12},
  emptyText: {fontSize: 14, color: C.textMuted, textAlign: 'center'},
  catHead: {
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6, backgroundColor: '#f8fafc',
  },
  catLabel: {
    fontSize: 11, fontWeight: '700', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  prodRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: C.borderLight, gap: 8,
  },
  prodName: {fontSize: 15, fontWeight: '600', color: C.text},
  prodDesc: {fontSize: 12, color: C.textMuted},
  prodPrice: {fontSize: 14, fontWeight: '700', color: C.primary},
});

// ── Section header ────────────────────────────────────────
function SecHeader({icon, title, count, onAdd}: {
  icon: string; title: string; count: number; onAdd: () => void;
}) {
  return (
    <View style={s.secHead}>
      <View style={s.secLeft}>
        <Ionicons name={icon} size={15} color={C.primary} />
        <Text style={s.secTitle}>{title.toUpperCase()}</Text>
        {count > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{count}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity style={s.addBtn} onPress={onAdd} activeOpacity={0.8}>
        <Ionicons name="add" size={13} color={C.primary} />
        <Text style={s.addBtnText}>Add</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Cost type toggle ──────────────────────────────────────
function CostToggle({value, onChange}: {
  value: 'productCost' | 'warranty';
  onChange: (v: 'productCost' | 'warranty') => void;
}) {
  return (
    <View style={s.toggleRow}>
      <TouchableOpacity
        style={[s.toggleBtn, value === 'warranty' && s.toggleBtnActive]}
        onPress={() => onChange('warranty')}>
        <Text style={[s.toggleText, value === 'warranty' && s.toggleTextActive]}>
          Warranty
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.toggleBtn, value === 'productCost' && s.toggleBtnActive]}
        onPress={() => onChange('productCost')}>
        <Text style={[s.toggleText, value === 'productCost' && s.toggleTextActive]}>
          Direct Price
        </Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Frequency chips ───────────────────────────────────────
function FreqChips({value, onChange}: {value: string; onChange: (v: string) => void}) {
  return (
    <View style={s.freqRow}>
      {PROD_FREQ.map(f => (
        <TouchableOpacity
          key={f.value}
          style={[s.chip, value === f.value && s.chipActive]}
          onPress={() => onChange(f.value)}>
          <Text style={[s.chipText, value === f.value && s.chipTextActive]}>
            {f.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

// ── Small product row ─────────────────────────────────────
function SmallProductRow({product, catalogItems, onUpdate, onRemove, onOpenCatalog}: {
  product: SmallProduct;
  catalogItems: CatalogItemFlat[];
  onUpdate: (d: Partial<SmallProduct>) => void;
  onRemove: () => void;
  onOpenCatalog: () => void;
}) {
  const costType = product.costType ?? 'warranty';
  const total = product.qty * product.unitPrice;

  return (
    <View style={s.rowCard}>
      {/* Name row */}
      <View style={s.nameRow}>
        <NameInput
          value={product.displayName}
          onChangeText={t => onUpdate({displayName: t})}
          placeholder="Product name"
          catalogItems={catalogItems}
          onSelectItem={item => onUpdate({displayName: item.name, unitPrice: item.basePrice})}
          onOpenFullCatalog={onOpenCatalog}
        />
        <TouchableOpacity style={s.removeBtn} onPress={onRemove} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Ionicons name="close-circle" size={22} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Cost type */}
      <CostToggle value={costType} onChange={v => onUpdate({costType: v})} />

      {/* Qty × Price = Total */}
      <View style={s.calcRow}>
        <View style={s.calcCell}>
          <Text style={s.calcLabel}>Qty</Text>
          <TextInput
            style={s.numInput}
            value={displayNum(product.qty)}
            onChangeText={t => onUpdate({qty: parseNum(t)})}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={C.textMutedLt}
          />
        </View>
        <Text style={s.opX}>×</Text>
        <View style={[s.calcCell, s.calcCellFlex]}>
          <Text style={s.calcLabel}>Unit Price ($)</Text>
          <TextInput
            style={s.numInput}
            value={displayNum(product.unitPrice)}
            onChangeText={t => onUpdate({unitPrice: parseNum(t)})}
            keyboardType="numeric"
            placeholder="0.00"
            placeholderTextColor={C.textMutedLt}
          />
        </View>
        <View style={s.totalCell}>
          <Text style={s.calcLabel}>Total</Text>
          <Text style={s.totalAmt}>${total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Frequency */}
      {costType === 'warranty'
        ? <FreqChips value={product.frequency} onChange={v => onUpdate({frequency: v})} />
        : <Text style={s.noFreq}>One-time charge — no frequency</Text>
      }
    </View>
  );
}

// ── Dispenser row ─────────────────────────────────────────
function DispenserRow({product, catalogItems, onUpdate, onRemove, onOpenCatalog}: {
  product: Dispenser;
  catalogItems: CatalogItemFlat[];
  onUpdate: (d: Partial<Dispenser>) => void;
  onRemove: () => void;
  onOpenCatalog: () => void;
}) {
  const costType = product.costType ?? 'productCost';
  const total = costType === 'warranty'
    ? product.qty * product.warrantyRate
    : product.qty * product.replacementRate;

  return (
    <View style={s.rowCard}>
      {/* Name row */}
      <View style={s.nameRow}>
        <NameInput
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
        <TouchableOpacity style={s.removeBtn} onPress={onRemove} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Ionicons name="close-circle" size={22} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Cost type */}
      <CostToggle value={costType} onChange={v => onUpdate({costType: v})} />

      {/* Qty × Rate = Total */}
      <View style={s.calcRow}>
        <View style={s.calcCell}>
          <Text style={s.calcLabel}>Qty</Text>
          <TextInput
            style={s.numInput}
            value={displayNum(product.qty)}
            onChangeText={t => onUpdate({qty: parseNum(t)})}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={C.textMutedLt}
          />
        </View>
        <Text style={s.opX}>×</Text>
        {costType === 'warranty' ? (
          <View style={[s.calcCell, s.calcCellFlex]}>
            <Text style={s.calcLabel}>Warranty ($)</Text>
            <TextInput
              style={s.numInput}
              value={displayNum(product.warrantyRate)}
              onChangeText={t => onUpdate({warrantyRate: parseNum(t)})}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={C.textMutedLt}
            />
          </View>
        ) : (
          <View style={[s.calcCell, s.calcCellFlex]}>
            <Text style={s.calcLabel}>Replace ($)</Text>
            <TextInput
              style={s.numInput}
              value={displayNum(product.replacementRate)}
              onChangeText={t => onUpdate({replacementRate: parseNum(t)})}
              keyboardType="numeric"
              placeholder="0.00"
              placeholderTextColor={C.textMutedLt}
            />
          </View>
        )}
        <View style={s.totalCell}>
          <Text style={s.calcLabel}>Total</Text>
          <Text style={s.totalAmt}>${total.toFixed(2)}</Text>
        </View>
      </View>

      {/* Frequency */}
      {costType === 'warranty'
        ? <FreqChips value={product.frequency} onChange={v => onUpdate({frequency: v})} />
        : <Text style={s.noFreq}>One-time charge — no frequency</Text>
      }
    </View>
  );
}

// ── Main export ───────────────────────────────────────────
export function Step2ProductsDesktop({
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
}: Step2ProductsDesktopProps) {
  const [pickerCb, setPickerCb] = useState<PickCb | null>(null);

  const allItems = useMemo<CatalogItemFlat[]>(() => {
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

  const dispenserItems = useMemo(
    () => allItems.filter(it => it.warrantyRate > 0),
    [allItems],
  );

  const openPicker = (cb: PickCb) => setPickerCb(() => cb);

  return (
    <View style={s.root}>
      <CatalogModal
        visible={pickerCb !== null}
        items={allItems}
        onSelect={item => pickerCb?.(item)}
        onClose={() => setPickerCb(null)}
      />

      {/* ── Small Products ── */}
      <View style={s.section}>
        <SecHeader
          icon="document-outline"
          title="Small Products (Paper)"
          count={smallProducts.length}
          onAdd={onAddSmallProduct}
        />
        {smallProducts.length === 0 ? (
          <Text style={s.empty}>No products added — click Add to start</Text>
        ) : (
          smallProducts.map(p => (
            <SmallProductRow
              key={p.id}
              product={p}
              catalogItems={allItems}
              onUpdate={d => onUpdateSmallProduct(p.id, d)}
              onRemove={() => onRemoveSmallProduct(p.id)}
              onOpenCatalog={() => openPicker(item => {
                onUpdateSmallProduct(p.id, {displayName: item.name, unitPrice: item.basePrice});
              })}
            />
          ))
        )}
      </View>

      {/* ── Dispensers ── */}
      <View style={s.section}>
        <SecHeader
          icon="cube-outline"
          title="Dispensers"
          count={dispensers.length}
          onAdd={onAddDispenser}
        />
        {dispensers.length === 0 ? (
          <Text style={s.empty}>No dispensers added — click Add to start</Text>
        ) : (
          dispensers.map(d => (
            <DispenserRow
              key={d.id}
              product={d}
              catalogItems={dispenserItems}
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

      {/* ── Include in PDF checkbox ── */}
      <TouchableOpacity
        style={s.checkRow}
        onPress={() => onIncludeProductsTableChange(!includeProductsTable)}
        activeOpacity={0.7}>
        <View style={[s.checkbox, includeProductsTable && s.checkboxOn]}>
          {includeProductsTable && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
        <Text style={s.checkLabel}>Include Products Table in PDF</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── Styles — web app values ───────────────────────────────
const s = StyleSheet.create({
  root: {paddingBottom: 8},

  // ── Section container — matches web app .contract-card ──
  section: {
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: '#000', shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },

  // ── Section header — red left border, grey bg ──
  secHead: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.bgCard,
    borderBottomWidth: 1, borderBottomColor: C.border,
    borderLeftWidth: 3, borderLeftColor: C.primary,
  },
  secLeft: {flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8},
  secTitle: {
    fontSize: 13, fontWeight: '700', color: C.textCard,
    letterSpacing: 0.4,
  },
  badge: {
    backgroundColor: C.primary, borderRadius: 10,
    paddingHorizontal: 7, paddingVertical: 1, minWidth: 22, alignItems: 'center',
  },
  badgeText: {fontSize: 11, fontWeight: '700', color: '#fff'},
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 6, borderWidth: 1, borderColor: C.primary,
  },
  addBtnText: {fontSize: 13, fontWeight: '700', color: C.primary},

  empty: {
    fontSize: 14, color: C.textMuted, textAlign: 'center',
    paddingVertical: 24, paddingHorizontal: 16,
  },

  // ── Product row card ──
  rowCard: {
    padding: 16,
    borderBottomWidth: 1, borderBottomColor: C.borderLight,
    gap: 12,
  },
  nameRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
  },
  removeBtn: {padding: 2, marginTop: 4},

  // ── Cost type toggle — pill style ──
  toggleRow: {flexDirection: 'row', gap: 6},
  toggleBtn: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.bg,
  },
  toggleBtnActive: {backgroundColor: C.primary, borderColor: C.primary},
  toggleText: {fontSize: 12, color: C.textMuted, fontWeight: '500'},
  toggleTextActive: {color: '#fff', fontWeight: '700'},

  // ── Qty × Price = Total row ──
  calcRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 12,
  },
  calcCell: {gap: 4},
  calcCellFlex: {flex: 1},
  calcLabel: {
    fontSize: 11, fontWeight: '600', color: C.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.3,
  },
  numInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 9,
    fontSize: 14, fontWeight: '500', color: C.inputText,
    backgroundColor: C.surface, minWidth: 64,
  },
  opX: {
    fontSize: 16, color: C.textMuted, fontWeight: '600', paddingBottom: 8,
  },
  totalCell: {alignItems: 'flex-end', gap: 4},
  totalAmt: {
    fontSize: 15, fontWeight: '700', color: C.primary, paddingBottom: 8,
  },

  // ── Frequency chips ──
  freqRow: {flexDirection: 'row', flexWrap: 'wrap', gap: 6},
  chip: {
    paddingHorizontal: 12, paddingVertical: 5,
    borderRadius: 20, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg,
  },
  chipActive: {backgroundColor: C.primary, borderColor: C.primary},
  chipText: {fontSize: 12, color: C.textCard, fontWeight: '500'},
  chipTextActive: {color: '#fff', fontWeight: '700'},

  noFreq: {fontSize: 12, color: C.textMuted, fontStyle: 'italic'},

  // ── Include checkbox ──
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginTop: 4, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.surface,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: {backgroundColor: C.primary, borderColor: C.primary},
  checkLabel: {fontSize: 14, fontWeight: '600', color: C.text},
});
