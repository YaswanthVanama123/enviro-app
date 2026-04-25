/**
 * CreateAgreementDesktop.tsx
 * Desktop form — exact EnviroMaster web-app look.
 * Used by CreateAgreementScreen.windows.tsx and CreateAgreementScreen.ios.tsx (width >= 768).
 * Mobile / tablet wizard is untouched.
 */
import React, {useState} from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  ScrollView, StyleSheet, ActivityIndicator, Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useFormFilling} from '../hooks/useFormFilling';
import {Step2ProductsDesktop} from '../components/form/Step2ProductsDesktop';
import {Step3Services}         from '../components/form/Step3Services';
import {Step5Agreement}        from '../components/form/Step5Agreement';
import {Step4Review}           from '../components/form/Step4Review';

// ── Exact web-app palette ────────────────────────────────
const C = {
  primary:     '#c00000',   // dark red — all headers, active tabs, labels
  primaryDark: '#a00000',
  orange:      '#ff4500',   // save button
  surface:     '#ffffff',
  bg:          '#f5f5f5',
  border:      '#e5e7eb',
  borderDark:  '#000000',
  text:        '#212121',
  textMuted:   '#4a4a4a',
  textMutedLt: '#9ca3af',
  labelRed:    '#FF0000',   // customer field labels (exact from CustomerSection.css)
  greenDark:   '#1a7a1a',
  greenBg:     '#f0fdf4',
  blueBg:      '#dae9f8',   // table column headers (from ProductsSection.css)
  yellowBg:    '#fef3c7',
  yellow:      '#fbbf24',
};

// ── Duration options ─────────────────────────────────────
const DURATION_OPTIONS = Array.from({length: 35}, (_, i) => ({
  value: String(i + 2), label: `${i + 2} months`,
}));

const TRIP_FREQ_OPTIONS = [
  {value: '0',      label: 'One-time'},
  {value: '4',      label: 'Weekly (4×/mo)'},
  {value: '2',      label: 'Bi-weekly (2×/mo)'},
  {value: '1',      label: 'Monthly'},
  {value: '1.0833', label: 'Every 4 Weeks'},
  {value: '0.5',    label: 'Every 2 months'},
  {value: '0.33',   label: 'Quarterly'},
  {value: '0.17',   label: 'Bi-annually'},
  {value: '0.08',   label: 'Annually'},
];

const PAYMENT_OPTS = [
  {value: 'online' as const, label: 'Online Payment',
   desc: 'Card or portal payment keeps the document on auto-approved Green Line pricing.'},
  {value: 'cash'   as const, label: 'Cash Payment',
   desc: 'Customer will pay cash/check in the field on scheduled visits.'},
  {value: 'others' as const, label: 'Other Payment',
   desc: 'Custom payment terms require approval and will send this document to Pending Approval.'},
];

function fmt$(v: number) {
  return '$' + v.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// ── Reusable atoms ───────────────────────────────────────

/** Red uppercase label like "CUSTOMER NAME:" */
function RLabel({text}: {text: string}) {
  return <Text style={f.rlabel}>{text}:</Text>;
}

/** Underline-only text input (exact web app CustomerSection.css style) */
function UInput({
  value, onChange, placeholder, keyboard, multiline,
}: {
  value: string; onChange: (v: string) => void;
  placeholder?: string; keyboard?: any; multiline?: boolean;
}) {
  return (
    <TextInput
      style={[f.uinput, multiline && f.uinputMulti]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.textMutedLt}
      keyboardType={keyboard ?? 'default'}
      multiline={multiline}
      numberOfLines={multiline ? 3 : 1}
      autoCorrect={false}
    />
  );
}

/** Dark-red section header bar exactly like .prod__title / .svc-title */
function SectionBar({
  title, onAdd, onRemove, addLabel = '+ Row',
}: {
  title: string; onAdd?: () => void; onRemove?: () => void; addLabel?: string;
}) {
  return (
    <View style={bar.wrap}>
      <Text style={bar.title}>{title}</Text>
      <View style={bar.btnRow}>
        {onAdd && (
          <TouchableOpacity style={bar.btn} onPress={onAdd} activeOpacity={0.8}>
            <Text style={bar.btnText}>{addLabel}</Text>
          </TouchableOpacity>
        )}
        {onRemove && (
          <TouchableOpacity style={[bar.btn, bar.btnMinus]} onPress={onRemove} activeOpacity={0.8}>
            <Text style={bar.btnText}>−</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
const bar = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.primary, paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: 'rgba(0,0,0,0.3)',
  },
  title: {
    color: '#fff', fontWeight: '700', fontSize: 18,
    letterSpacing: 1, textTransform: 'uppercase', flex: 1, textAlign: 'center',
  },
  btnRow: {flexDirection: 'row', gap: 6},
  btn: {
    backgroundColor: C.surface, borderRadius: 20,
    paddingHorizontal: 14, paddingVertical: 5,
  },
  btnMinus: {paddingHorizontal: 12},
  btnText: {color: C.primary, fontWeight: '700', fontSize: 13},
});

/** Tab pill button — active = #c00000 bg, inactive = white bg + #c00000 border */
function TabPill({
  label, active, onPress,
}: {label: string; active: boolean; onPress: () => void}) {
  return (
    <TouchableOpacity
      style={[tp.pill, active && tp.pillActive]}
      onPress={onPress}
      activeOpacity={0.8}>
      <Text style={[tp.text, active && tp.textActive]}>{label}</Text>
    </TouchableOpacity>
  );
}
const tp = StyleSheet.create({
  pill: {
    borderWidth: 1, borderColor: C.primary,
    backgroundColor: C.surface, borderRadius: 4,
    paddingHorizontal: 16, paddingVertical: 8,
  },
  pillActive: {backgroundColor: C.primary},
  text: {fontSize: 13, fontWeight: '600', color: C.primary},
  textActive: {color: '#fff'},
});

/** Money input row: $ prefix + underline input */
function MoneyRow({
  label, value, onChange, suffix,
}: {label: string; value: number; onChange: (v: number) => void; suffix?: string}) {
  return (
    <View style={m.row}>
      <Text style={m.label}>{label}</Text>
      <View style={m.inputWrap}>
        <Text style={m.dollar}>$</Text>
        <TextInput
          style={m.input}
          value={value === 0 ? '' : String(value)}
          onChangeText={t => { const n = parseFloat(t); onChange(isNaN(n) ? 0 : n); }}
          placeholder="0.00"
          placeholderTextColor={C.textMutedLt}
          keyboardType="numeric"
        />
        {suffix ? <Text style={m.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}
const m = StyleSheet.create({
  row: {marginBottom: 16},
  label: {fontSize: 14, color: C.textMuted, marginBottom: 4},
  inputWrap: {flexDirection: 'row', alignItems: 'center', gap: 4},
  dollar: {fontSize: 15, color: '#2d7a2d', fontWeight: '600'},
  input: {
    flex: 1, borderBottomWidth: 1, borderBottomColor: C.borderDark,
    paddingVertical: 4, fontSize: 15, color: C.text,
  },
  suffix: {fontSize: 12, color: C.textMuted, marginLeft: 4},
});

/** Dropdown with overlay menu */
function Dropdown({
  label, value, options, onChange, small,
}: {
  label?: string; value: string;
  options: {value: string; label: string}[];
  onChange: (v: string) => void;
  small?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === value);
  return (
    <View style={[dd.wrap, {zIndex: open ? 200 : 1}]}>
      {label ? <Text style={dd.label}>{label}</Text> : null}
      <View style={{position: 'relative'}}>
        <TouchableOpacity
          style={[dd.trigger, small && dd.triggerSm, open && dd.triggerOpen]}
          onPress={() => setOpen(p => !p)}
          activeOpacity={0.85}>
          <Text style={[dd.val, small && dd.valSm]}>{current?.label ?? value}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={12} color={C.textMuted} />
        </TouchableOpacity>
        {open && (
          <View style={dd.menu}>
            <ScrollView style={{maxHeight: 220}} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {options.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[dd.opt, opt.value === value && dd.optSel]}
                  onPress={() => {onChange(opt.value); setOpen(false);}}>
                  <Text style={[dd.optText, opt.value === value && dd.optTextSel]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}
const dd = StyleSheet.create({
  wrap: {marginBottom: 14},
  label: {fontSize: 13, color: C.textMuted, marginBottom: 4},
  trigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: C.border, borderRadius: 4,
    paddingHorizontal: 10, paddingVertical: 8, backgroundColor: C.surface,
  },
  triggerSm: {paddingHorizontal: 8, paddingVertical: 5},
  triggerOpen: {borderColor: C.primary},
  val: {flex: 1, fontSize: 14, color: C.text},
  valSm: {fontSize: 13},
  menu: {
    position: 'absolute', top: 36, left: 0, right: 0,
    backgroundColor: C.surface, borderWidth: 1, borderColor: C.primary,
    borderRadius: 4, zIndex: 300,
    shadowColor: '#000', shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
  },
  opt: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  optSel: {backgroundColor: C.primary},
  optText: {fontSize: 13, color: C.text},
  optTextSel: {color: '#fff', fontWeight: '700'},
});

/** Month / year modal date picker */
function DatePicker({value, onChange}: {value: string; onChange: (v: string) => void}) {
  const [show, setShow] = useState(false);
  const today = new Date();
  const parsed = value ? new Date(value) : null;
  const [year,  setYear]  = useState(parsed?.getFullYear()  ?? today.getFullYear());
  const [month, setMonth] = useState(parsed?.getMonth()     ?? today.getMonth());
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const display = parsed
    ? parsed.toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})
    : 'Select date';
  return (
    <View style={dp.wrap}>
      <Text style={dp.label}>Agreement Start Date</Text>
      <TouchableOpacity style={dp.trigger} onPress={() => setShow(true)}>
        <Ionicons name="calendar-outline" size={15} color={C.primary} />
        <Text style={dp.val}>{display}</Text>
        <Ionicons name="chevron-down" size={12} color={C.textMuted} />
      </TouchableOpacity>
      <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
        <View style={dp.overlay}>
          <View style={dp.picker}>
            <View style={dp.hdr}>
              <TouchableOpacity onPress={() => setYear(y => y - 1)} style={dp.nav}>
                <Ionicons name="chevron-back" size={20} color={C.text} />
              </TouchableOpacity>
              <Text style={dp.year}>{year}</Text>
              <TouchableOpacity onPress={() => setYear(y => y + 1)} style={dp.nav}>
                <Ionicons name="chevron-forward" size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            <View style={dp.grid}>
              {MONTHS.map((mn, i) => (
                <TouchableOpacity
                  key={mn}
                  style={[dp.mBtn, i === month && dp.mBtnActive]}
                  onPress={() => {
                    setMonth(i);
                    onChange(new Date(year, i, 1).toISOString().split('T')[0]);
                    setShow(false);
                  }}>
                  <Text style={[dp.mText, i === month && dp.mTextActive]}>{mn}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={dp.cancel} onPress={() => setShow(false)}>
              <Text style={{fontSize: 14, color: C.textMuted}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
const dp = StyleSheet.create({
  wrap: {marginBottom: 14},
  label: {fontSize: 13, color: C.textMuted, marginBottom: 4},
  trigger: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderColor: C.border, borderRadius: 4,
    paddingHorizontal: 10, paddingVertical: 9, backgroundColor: C.surface,
  },
  val: {flex: 1, fontSize: 14, color: C.text},
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: 32},
  picker: {backgroundColor: C.surface, borderRadius: 12, padding: 20, width: '100%', maxWidth: 300},
  hdr: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16},
  nav: {padding: 6},
  year: {fontSize: 18, fontWeight: '700', color: C.text},
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center'},
  mBtn: {width: '22%', paddingVertical: 8, borderRadius: 6, alignItems: 'center', backgroundColor: '#f8fafc'},
  mBtnActive: {backgroundColor: C.primary},
  mText: {fontSize: 12, color: C.text, fontWeight: '500'},
  mTextActive: {color: '#fff', fontWeight: '700'},
  cancel: {marginTop: 16, paddingVertical: 10, alignItems: 'center'},
});

/** Pricing breakdown row */
function PRow({label, value, color, highlight}: {label: string; value: string; color?: string; highlight?: boolean}) {
  return (
    <View style={[pr.row, highlight && pr.rowHL]}>
      <Text style={pr.label}>{label}</Text>
      <Text style={[pr.val, color ? {color} : null]}>{value}</Text>
    </View>
  );
}
const pr = StyleSheet.create({
  row: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f3f4f6'},
  rowHL: {backgroundColor: C.yellowBg, borderRadius: 6, paddingHorizontal: 10, borderBottomWidth: 0, marginTop: 8},
  label: {fontSize: 14, color: C.textMuted},
  val: {fontSize: 15, fontWeight: '700', color: C.text},
});

/**
 * Reference table — shown when user clicks "Products Reference" or "Dispensers Reference" tab.
 * Matches web app ProductsSection.tsx ProductsReferenceTable / DispensersReferenceTable layout.
 */
function ReferenceTable({
  title, products,
}: {
  title: string;
  products: any[];
}) {
  if (!products || products.length === 0) {
    return (
      <View style={ref.empty}>
        <Text style={ref.emptyText}>No catalog data available.</Text>
      </View>
    );
  }
  return (
    <View style={ref.wrap}>
      <View style={ref.titleBar}>
        <Text style={ref.titleText}>{title}</Text>
      </View>
      {/* Header row */}
      <View style={ref.headerRow}>
        <Text style={[ref.hCell, {flex: 2}]}>Product Name</Text>
        <Text style={[ref.hCell, {flex: 3}]}>Description</Text>
        <Text style={[ref.hCell, {flex: 1.2}]}>Family</Text>
        <Text style={[ref.hCell, {flex: 1}]}>Base Price</Text>
        <Text style={[ref.hCell, {flex: 1}]}>Warranty Rate</Text>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {products.map((p: any, i: number) => (
          <View key={p.key ?? i} style={[ref.row, i % 2 === 1 && ref.rowAlt]}>
            <Text style={[ref.cell, ref.cellBold, {flex: 2}]} numberOfLines={2}>{p.name ?? '—'}</Text>
            <Text style={[ref.cell, {flex: 3}]} numberOfLines={3}>{p.description ?? '—'}</Text>
            <Text style={[ref.cell, {flex: 1.2}]}>{p.familyKey ?? '—'}</Text>
            <Text style={[ref.cell, ref.cellGreen, {flex: 1}]}>
              {p.basePrice?.amount != null ? `$${p.basePrice.amount}` : '—'}
            </Text>
            <Text style={[ref.cell, ref.cellGreen, {flex: 1}]}>
              {p.warrantyPricePerUnit?.amount != null ? `$${p.warrantyPricePerUnit.amount}` : '—'}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
const ref = StyleSheet.create({
  wrap: {backgroundColor: C.surface, borderWidth: 1, borderColor: C.border, borderRadius: 8, overflow: 'hidden'},
  titleBar: {
    backgroundColor: C.primary, paddingVertical: 10, paddingHorizontal: 14,
  },
  titleText: {
    color: '#fff', fontWeight: '700', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1,
  },
  headerRow: {
    flexDirection: 'row', backgroundColor: C.blueBg,
    paddingVertical: 10, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: '#b0c8e8',
  },
  hCell: {
    fontSize: 12, fontWeight: '700', color: '#1e3a5f',
    textTransform: 'uppercase', letterSpacing: 0.4,
  },
  row: {
    flexDirection: 'row', paddingVertical: 10, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  rowAlt: {backgroundColor: '#fafafa'},
  cell: {fontSize: 13, color: C.text, paddingRight: 8},
  cellBold: {fontWeight: '600'},
  cellGreen: {color: '#2d7a2d', fontWeight: '600'},
  empty: {padding: 40, alignItems: 'center'},
  emptyText: {fontSize: 14, color: C.textMuted},
});

// ── Field styles ─────────────────────────────────────────
const f = StyleSheet.create({
  // Red uppercase label (CustomerSection.css: color #FF0000, text-transform uppercase)
  rlabel: {
    fontSize: 12, fontWeight: '700', color: C.labelRed,
    textTransform: 'uppercase', marginBottom: 2,
  },
  // Underline-only input (CustomerSection.css: border:none; border-bottom:2px solid #000)
  uinput: {
    borderBottomWidth: 2, borderBottomColor: C.borderDark,
    paddingVertical: 5, paddingHorizontal: 2,
    fontSize: 15, color: C.text,
    backgroundColor: 'transparent',
  },
  uinputMulti: {minHeight: 72, textAlignVertical: 'top'},
});

// ── Main component ───────────────────────────────────────
export function CreateAgreementDesktop() {
  const navigation = useNavigation();
  const [activeFormTab, setActiveFormTab] = useState<'form' | 'products-ref' | 'dispensers-ref'>('form');

  const {
    form,
    setHeaderTitle, setHeaderRow,
    addSmallProduct, removeSmallProduct, updateSmallProduct,
    addDispenser,    removeDispenser,    updateDispenser,
    setContractMonths, setStartDate,
    setTripCharge, setTripChargeFrequency,
    setParkingCharge, setParkingChargeFrequency,
    setPaymentOption, setPaymentNote,
    setIncludeProductsTable,
    addService, removeService, updateService,
    setEnviroOf, updateServiceAgreement,
    saveDraft, generate, allServicesOneTime,
  } = useFormFilling();

  const {saving, saveError, savedId} = form;
  const rows = form.headerRows ?? [];

  // Flatten catalog into reference arrays for the two reference tabs
  const allCatalogProducts: any[] = (form.productCatalog?.families ?? []).flatMap((f: any) => f.products ?? []);
  const productsRefList  = allCatalogProducts.filter(p => p.familyKey !== 'dispensers');
  const dispensersRefList = allCatalogProducts.filter(p => p.familyKey === 'dispensers');

  const goBack = () => {
    if (navigation.canGoBack()) { navigation.goBack(); }
    else { (navigation as any).navigate('Saved'); }
  };

  const handleGenerate = async () => {
    const ok = await generate();
    if (ok) {goBack();}
  };

  // Simple totals for pricing breakdown
  const tripMonthly  = (form.tripCharge   ?? 0) * (form.tripChargeFrequency   ?? 1);
  const parkMonthly  = (form.parkingCharge ?? 0) * (form.parkingChargeFrequency ?? 1);
  const contractTotal = (tripMonthly + parkMonthly) * (form.contractMonths ?? 12);

  return (
    <View style={ss.root}>

      {/* ── Top action bar ── */}
      <View style={ss.topBar}>
        <TouchableOpacity style={ss.backBtn} onPress={goBack}>
          <Ionicons name="arrow-back" size={16} color="#4a4a4a" />
        </TouchableOpacity>
        <View style={ss.topBarText}>
          <Text style={ss.topBarTitle}>New Agreement</Text>
          <Text style={ss.topBarSub}>Fill in all sections below, then generate the PDF</Text>
        </View>
        {saveError ? (
          <View style={ss.errBadge}>
            <Ionicons name="alert-circle-outline" size={14} color="#b91c1c" />
            <Text style={ss.errText}>{saveError}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Scrollable body ── */}
      <ScrollView
        style={ss.scroll}
        contentContainerStyle={ss.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator>

        {/* ════════════════════════════════════
            CUSTOMER HEADER SECTION
            (matches web app CustomerSection layout)
        ════════════════════════════════════ */}
        <View style={ss.customerSection}>
          {/* Top row: logo | title | spacer */}
          <View style={ss.customerTop}>
            {/* EM logo box */}
            <View style={ss.logoBox}>
              <Text style={ss.logoText}>EM</Text>
            </View>

            {/* Agreement title — centered, red, editable */}
            <View style={ss.titleWrap}>
              <TextInput
                style={ss.agreementTitle}
                value={form.headerTitle}
                onChangeText={setHeaderTitle}
                placeholder="Agreement Title"
                placeholderTextColor="#ffaaaa"
                textAlign="center"
              />
            </View>

            {/* + Add field placeholder */}
            <TouchableOpacity style={ss.addFieldBtn}>
              <Text style={ss.addFieldText}>+ Add field</Text>
            </TouchableOpacity>
          </View>

          {/* Customer fields — 2-column grid, red labels, underline inputs */}
          <View style={ss.customerGrid}>
            <View style={ss.customerCol}>
              <RLabel text="Customer Name" />
              <UInput
                value={rows[0]?.valueLeft ?? ''}
                onChange={v => setHeaderRow(0, 'valueLeft', v)}
                placeholder="Company / Customer Name"
              />
            </View>
            <View style={ss.customerCol}>
              <RLabel text="Customer Contact" />
              <UInput
                value={rows[0]?.valueRight ?? ''}
                onChange={v => setHeaderRow(0, 'valueRight', v)}
                placeholder="Contact Person"
              />
            </View>
            <View style={ss.customerCol}>
              <RLabel text="Customer Number" />
              <UInput
                value={rows[1]?.valueLeft ?? ''}
                onChange={v => setHeaderRow(1, 'valueLeft', v)}
                placeholder="Phone Number"
                keyboard="phone-pad"
              />
            </View>
            <View style={ss.customerCol}>
              <RLabel text="POC Email" />
              <UInput
                value={rows[1]?.valueRight ?? ''}
                onChange={v => setHeaderRow(1, 'valueRight', v)}
                placeholder="point@company.com"
                keyboard="email-address"
              />
            </View>
            <View style={ss.customerCol}>
              <RLabel text="POC Name" />
              <UInput
                value={rows[2]?.valueLeft ?? ''}
                onChange={v => setHeaderRow(2, 'valueLeft', v)}
                placeholder="Point of Contact"
              />
            </View>
            <View style={ss.customerCol}>
              <RLabel text="POC Phone" />
              <UInput
                value={rows[2]?.valueRight ?? ''}
                onChange={v => setHeaderRow(2, 'valueRight', v)}
                placeholder="POC Direct Phone"
                keyboard="phone-pad"
              />
            </View>
          </View>
        </View>

        <View style={ss.gap} />

        {/* ── Section tabs: Form / Products Ref / Dispensers Ref ── */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={ss.tabRow}>
          <TabPill label="Form"                 active={activeFormTab === 'form'}           onPress={() => setActiveFormTab('form')} />
          <TabPill label="Products Reference"   active={activeFormTab === 'products-ref'}   onPress={() => setActiveFormTab('products-ref')} />
          <TabPill label="Dispensers Reference" active={activeFormTab === 'dispensers-ref'} onPress={() => setActiveFormTab('dispensers-ref')} />
        </ScrollView>

        <View style={ss.gap} />

        {/* ════════════════════════════════════
            PRODUCTS REFERENCE TAB
        ════════════════════════════════════ */}
        {activeFormTab === 'products-ref' && (
          <ReferenceTable
            title="Products Reference — For Salespeople"
            products={productsRefList}
          />
        )}

        {/* ════════════════════════════════════
            DISPENSERS REFERENCE TAB
        ════════════════════════════════════ */}
        {activeFormTab === 'dispensers-ref' && (
          <ReferenceTable
            title="Dispensers Reference — For Salespeople"
            products={dispensersRefList}
          />
        )}

        {/* ════════════════════════════════════
            MAIN FORM (hidden when on a reference tab)
        ════════════════════════════════════ */}
        {activeFormTab === 'form' && (<>

        {/* ════════════════════════════════════
            PRODUCTS section
        ════════════════════════════════════ */}
        <SectionBar
          title="Products"
          onAdd={() => addSmallProduct()}
          addLabel="+ Row"
        />
        <View style={ss.sectionBody}>
          <Step2ProductsDesktop
            smallProducts={form.smallProducts}
            dispensers={form.dispensers}
            onAddSmallProduct={addSmallProduct}
            onRemoveSmallProduct={removeSmallProduct}
            onUpdateSmallProduct={updateSmallProduct}
            onAddDispenser={addDispenser}
            onRemoveDispenser={removeDispenser}
            onUpdateDispenser={updateDispenser}
            productCatalog={form.productCatalog}
            includeProductsTable={form.includeProductsTable}
            onIncludeProductsTableChange={setIncludeProductsTable}
          />
        </View>

        <View style={ss.gap} />

        {/* ════════════════════════════════════
            SERVICES section
        ════════════════════════════════════ */}
        <SectionBar
          title="Services"
          addLabel="+ Service"
        />
        <View style={ss.sectionBody}>
          <Step3Services
            visibleServices={form.visibleServices}
            services={form.services}
            contractMonths={form.contractMonths}
            pricingConfigs={form.pricingConfigs}
            serviceConfigsList={form.serviceConfigsList}
            onAddService={addService}
            onRemoveService={removeService}
            onUpdateService={updateService}
            showServiceTabs
          />
        </View>

        <View style={ss.gap} />

        {/* ════════════════════════════════════
            CONTRACT DETAILS + PRICING BREAKDOWN
            2-column layout (exact web app Step2Contract)
        ════════════════════════════════════ */}
        <View style={ss.contractRow}>

          {/* Left: CONTRACT DETAILS card */}
          <View style={[ss.contractCard, ss.contractLeft]}>
            <Text style={ss.cardTitle}>CONTRACT DETAILS</Text>

            {!allServicesOneTime && (
              <>
                <View style={ss.contractFieldRow}>
                  <Ionicons name="calendar-outline" size={14} color={C.primary} style={{marginRight: 6}} />
                  <Text style={ss.contractFieldLabel}>Contract Duration</Text>
                </View>
                <Dropdown
                  value={String(form.contractMonths)}
                  options={DURATION_OPTIONS}
                  onChange={v => setContractMonths(parseInt(v, 10))}
                />
                <DatePicker value={form.startDate} onChange={setStartDate} />
                <View style={ss.inlineDivider} />
              </>
            )}

            <View style={ss.contractFieldRow}>
              <Ionicons name="car-outline" size={14} color={C.primary} style={{marginRight: 6}} />
              <Text style={ss.contractFieldLabel}>Trip Charge <Text style={ss.perVisit}>(per visit)</Text></Text>
            </View>
            <View style={ss.tripRow}>
              <View style={ss.tripInput}>
                <Text style={ss.dollarSign}>$</Text>
                <TextInput
                  style={ss.tripTextInput}
                  value={form.tripCharge === 0 ? '' : String(form.tripCharge)}
                  onChangeText={t => { const n = parseFloat(t); setTripCharge(isNaN(n) ? 0 : n); }}
                  placeholder="0.00"
                  placeholderTextColor={C.textMutedLt}
                  keyboardType="numeric"
                />
              </View>
              <Dropdown
                value={String(form.tripChargeFrequency)}
                options={TRIP_FREQ_OPTIONS}
                onChange={v => setTripChargeFrequency(parseFloat(v))}
                small
              />
            </View>

            <View style={[ss.contractFieldRow, {marginTop: 10}]}>
              <Ionicons name="business-outline" size={14} color={C.primary} style={{marginRight: 6}} />
              <Text style={ss.contractFieldLabel}>Parking Charge <Text style={ss.perVisit}>(per visit)</Text></Text>
            </View>
            <View style={ss.tripRow}>
              <View style={ss.tripInput}>
                <Text style={ss.dollarSign}>$</Text>
                <TextInput
                  style={ss.tripTextInput}
                  value={form.parkingCharge === 0 ? '' : String(form.parkingCharge)}
                  onChangeText={t => { const n = parseFloat(t); setParkingCharge(isNaN(n) ? 0 : n); }}
                  placeholder="0.00"
                  placeholderTextColor={C.textMutedLt}
                  keyboardType="numeric"
                />
              </View>
              <Dropdown
                value={String(form.parkingChargeFrequency)}
                options={TRIP_FREQ_OPTIONS}
                onChange={v => setParkingChargeFrequency(parseFloat(v))}
                small
              />
            </View>
          </View>

          {/* Right: PRICING BREAKDOWN card */}
          <View style={[ss.contractCard, ss.contractRight]}>
            <Text style={ss.cardTitle}>PRICING BREAKDOWN</Text>
            <PRow label="Trip Charge / visit"   value={fmt$(form.tripCharge)}   />
            <PRow label="Parking / visit"        value={fmt$(form.parkingCharge)} />
            {!allServicesOneTime && (
              <PRow label={`Contract Duration`}  value={`${form.contractMonths} months`} />
            )}
            <PRow
              label="Contract Total (est.)"
              value={fmt$(contractTotal)}
              color={C.primary}
              highlight
            />
          </View>
        </View>

        <View style={ss.gap} />

        {/* ════════════════════════════════════
            PAYMENT OPTIONS
            (exact web app layout: 3 cards in a row)
        ════════════════════════════════════ */}
        <View style={ss.payCard}>
          {/* Header row */}
          <View style={ss.payHeaderRow}>
            <View style={{flex: 1}}>
              <Text style={ss.payTitle}>Payment Options</Text>
              <Text style={ss.payDesc}>
                Select how the customer will pay. Choosing "Other Payment" moves the document to Pending Approval even if Green Line pricing applies.
              </Text>
            </View>
            <Text style={ss.payCurrent}>
              Current: {PAYMENT_OPTS.find(p => p.value === form.paymentOption)?.label ?? 'Online Payment'}
            </Text>
          </View>

          {/* 3 payment cards */}
          <View style={ss.payOptRow}>
            {PAYMENT_OPTS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[ss.payOpt, form.paymentOption === opt.value && ss.payOptActive]}
                onPress={() => setPaymentOption(opt.value)}
                activeOpacity={0.85}>
                <Text style={[ss.payOptTitle, form.paymentOption === opt.value && ss.payOptTitleActive]}>
                  {opt.label}
                </Text>
                <Text style={ss.payOptDesc}>{opt.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Note textarea */}
          <Text style={ss.noteLabel}>Note</Text>
          <TextInput
            style={ss.noteInput}
            value={form.paymentNote}
            onChangeText={setPaymentNote}
            placeholder="Write anything..."
            placeholderTextColor={C.textMutedLt}
            multiline
          />
        </View>

        <View style={ss.gap} />

        {/* ════════════════════════════════════
            SERVICE AGREEMENT
        ════════════════════════════════════ */}
        <Step5Agreement
          enviroOf={form.enviroOf}
          onEnviroOfChange={setEnviroOf}
          serviceAgreement={form.serviceAgreement}
          onUpdate={updateServiceAgreement}
          loading={form.initialLoading}
        />

        <View style={ss.gap} />

        {/* ════════════════════════════════════
            REVIEW
        ════════════════════════════════════ */}
        <Step4Review form={form} />

        <View style={{height: 24}} />
        </>)}
      </ScrollView>

      {/* ── Bottom action bar ── */}
      <View style={ss.actionBar}>
        <Text style={ss.actionHint}>
          {savedId ? 'Draft saved' : 'All changes are unsaved'}
        </Text>
        <View style={ss.actionBtns}>
          <TouchableOpacity
            style={[ss.draftBtn, saving && ss.disabled]}
            onPress={() => saveDraft()}
            disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#4a4a4a" />
              : <Ionicons name="save-outline" size={15} color="#4a4a4a" />}
            <Text style={ss.draftBtnText}>{savedId ? 'Save' : 'Save Draft'}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[ss.saveBtn, saving && ss.disabled]}
            onPress={handleGenerate}
            disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Ionicons name="document-text-outline" size={15} color="#fff" />
                  <Text style={ss.saveBtnText}>Generate PDF</Text>
                </>}
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

// ── Page-level styles ────────────────────────────────────
const ss = StyleSheet.create({
  root: {flex: 1, flexDirection: 'column', backgroundColor: C.bg},

  // Top action bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: '#e6e6e6',
  },
  backBtn: {
    width: 32, height: 32, borderRadius: 5,
    borderWidth: 1, borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarText: {flex: 1},
  topBarTitle: {fontSize: 16, fontWeight: '700', color: C.text},
  topBarSub: {fontSize: 12, color: C.textMuted, marginTop: 1},
  errBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 6, paddingHorizontal: 10, paddingVertical: 6,
  },
  errText: {fontSize: 12, color: '#b91c1c', fontWeight: '500'},

  // Scroll
  scroll: {flex: 1, backgroundColor: C.bg},
  content: {paddingTop: 16, paddingHorizontal: 16, paddingBottom: 16},

  // Gap spacer
  gap: {height: 16},

  // ── Customer section ────────────────────────────────────
  // White background, no card border (matches web app CustomerSection)
  customerSection: {
    backgroundColor: C.surface,
    paddingHorizontal: 20, paddingVertical: 20,
    borderWidth: 1, borderColor: C.border,
  },
  customerTop: {
    flexDirection: 'row', alignItems: 'center',
    marginBottom: 24, gap: 12,
  },
  logoBox: {
    width: 56, height: 56, borderRadius: 6,
    backgroundColor: C.primary,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  logoText: {color: '#fff', fontSize: 18, fontWeight: '900'},
  titleWrap: {flex: 1, alignItems: 'center'},
  agreementTitle: {
    fontSize: 20, fontWeight: '700', color: C.primary,
    textAlign: 'center',
    borderBottomWidth: 2, borderBottomColor: C.primary,
    paddingVertical: 4, paddingHorizontal: 8,
    minWidth: 200,
  },
  addFieldBtn: {
    borderWidth: 1, borderColor: C.border,
    borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
    flexShrink: 0,
  },
  addFieldText: {fontSize: 13, color: C.textMuted, fontWeight: '500'},

  // Customer fields 2-column grid
  customerGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 16},
  customerCol: {flex: 1, minWidth: 240, marginBottom: 4},

  // ── Section tabs ────────────────────────────────────────
  tabRow: {flexDirection: 'row', gap: 8, paddingVertical: 2},

  // ── Section body (white card below section header bar) ──
  sectionBody: {
    backgroundColor: C.surface,
    borderWidth: 1, borderTopWidth: 0, borderColor: 'rgba(0,0,0,0.2)',
    padding: 12,
  },

  // ── Contract 2-column row ────────────────────────────────
  contractRow: {flexDirection: 'row', gap: 16, flexWrap: 'wrap'},
  contractCard: {
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    padding: 20,
  },
  contractLeft:  {flex: 2, minWidth: 280},
  contractRight: {flex: 1, minWidth: 220},
  cardTitle: {
    fontSize: 14, fontWeight: '700', color: C.text,
    textTransform: 'uppercase', letterSpacing: 0.5,
    borderBottomWidth: 1, borderBottomColor: C.border,
    paddingBottom: 10, marginBottom: 14,
  },
  contractFieldRow: {
    flexDirection: 'row', alignItems: 'center', marginBottom: 6,
  },
  contractFieldLabel: {fontSize: 14, color: C.text, fontWeight: '500'},
  perVisit: {fontSize: 12, color: C.textMuted, fontWeight: '400'},
  tripRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 4},
  tripInput: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: C.border, borderRadius: 4,
    paddingHorizontal: 10, paddingVertical: 8, backgroundColor: C.surface,
  },
  dollarSign: {fontSize: 15, color: '#2d7a2d', fontWeight: '600'},
  tripTextInput: {flex: 1, fontSize: 14, color: C.text, paddingVertical: 0},
  inlineDivider: {height: 1, backgroundColor: C.border, marginVertical: 14},

  // ── Payment Options ─────────────────────────────────────
  payCard: {
    backgroundColor: C.surface,
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    padding: 20,
  },
  payHeaderRow: {flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16},
  payTitle: {fontSize: 17, fontWeight: '700', color: C.text, marginBottom: 6},
  payDesc: {fontSize: 13, color: C.textMuted, lineHeight: 18, maxWidth: 600},
  payCurrent: {fontSize: 13, fontWeight: '700', color: C.primary, flexShrink: 0},
  payOptRow: {flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginBottom: 16},
  payOpt: {
    flex: 1, minWidth: 180,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 8, padding: 16, backgroundColor: C.surface,
  },
  payOptActive: {
    borderWidth: 2, borderColor: '#ff8c42',
    backgroundColor: '#fff9f5',
  },
  payOptTitle: {fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 6},
  payOptTitleActive: {color: C.orange},
  payOptDesc: {fontSize: 13, color: C.textMuted, lineHeight: 18},
  noteLabel: {fontSize: 13, fontWeight: '600', color: C.textMuted, marginBottom: 6},
  noteInput: {
    borderWidth: 1, borderColor: C.border, borderRadius: 6,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: C.text, backgroundColor: C.surface,
    minHeight: 80, textAlignVertical: 'top',
  },

  // ── Bottom action bar ────────────────────────────────────
  actionBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: '#e6e6e6',
    paddingHorizontal: 20, paddingVertical: 12,
  },
  actionHint: {fontSize: 13, color: C.textMuted},
  actionBtns: {flexDirection: 'row', alignItems: 'center', gap: 12},
  draftBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 5, backgroundColor: '#f5f5f5',
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  draftBtnText: {fontSize: 14, fontWeight: '600', color: '#4a4a4a'},
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 7,
    paddingHorizontal: 18, paddingVertical: 10,
    borderRadius: 5, backgroundColor: C.orange,
    minWidth: 140, justifyContent: 'center',
  },
  saveBtnText: {fontSize: 14, fontWeight: '600', color: '#fff'},
  disabled: {opacity: 0.6},
});
