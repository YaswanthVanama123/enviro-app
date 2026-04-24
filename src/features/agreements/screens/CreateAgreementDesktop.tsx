/**
 * CreateAgreementDesktop.tsx
 * Full desktop form UI — exact EnviroMaster web app look.
 * Used by CreateAgreementScreen.windows.tsx and CreateAgreementScreen.ios.tsx (width >= 768).
 * Does NOT touch mobile / tablet view (that still uses the wizard in CreateAgreementScreen.tsx).
 */
import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {useFormFilling} from '../hooks/useFormFilling';
import {Step2ProductsDesktop} from '../components/form/Step2ProductsDesktop';
import {Step3Services}  from '../components/form/Step3Services';
import {Step5Agreement} from '../components/form/Step5Agreement';
import {Step4Review}    from '../components/form/Step4Review';

// ── Web app exact palette ─────────────────────────────────
const C = {
  primary:      '#c00000',
  orange:       '#ff4500',
  surface:      '#ffffff',
  bg:           '#f9fafb',
  border:       '#e5e7eb',
  borderLight:  '#f3f4f6',
  text:         '#1f2937',
  textCard:     '#374151',
  label:        '#4b5563',
  textMuted:    '#6b7280',
  textMutedLt:  '#9ca3af',
  inputText:    '#2c3e50',
  greenBg:      '#f0fdf4',
  greenBorder:  '#86efac',
  greenDark:    '#059669',
  greenDarkest: '#065f46',
  yellowBg:     '#fef3c7',
  yellow:       '#fbbf24',
};

function fmt$(v: number) {
  return '$' + v.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// ── Duration & frequency options ──────────────────────────
const DURATION_OPTIONS = Array.from({length: 35}, (_, i) => ({
  value: String(i + 2),
  label: `${i + 2} months`,
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

// ── Reusable desktop field components ────────────────────

function FieldLabel({text, required}: {text: string; required?: boolean}) {
  return (
    <Text style={f.label}>
      {text}
      {required ? <Text style={{color: C.primary}}> *</Text> : null}
    </Text>
  );
}

function FieldInput({
  label, value, onChange, placeholder, keyboard, multiline, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; keyboard?: any; multiline?: boolean; required?: boolean;
}) {
  return (
    <View style={f.group}>
      <FieldLabel text={label} required={required} />
      <TextInput
        style={[f.input, multiline && f.inputMulti]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? label}
        placeholderTextColor={C.textMutedLt}
        keyboardType={keyboard ?? 'default'}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        autoCorrect={false}
      />
    </View>
  );
}

function MoneyInput({
  label, value, onChange, suffix,
}: {
  label: string; value: number; onChange: (v: number) => void; suffix?: string;
}) {
  return (
    <View style={f.group}>
      <FieldLabel text={label} />
      <View style={f.moneyRow}>
        <Text style={f.prefix}>$</Text>
        <TextInput
          style={f.moneyInput}
          value={value === 0 ? '' : String(value)}
          onChangeText={t => {
            const n = parseFloat(t);
            onChange(isNaN(n) ? 0 : n);
          }}
          placeholder="0.00"
          placeholderTextColor={C.textMutedLt}
          keyboardType="numeric"
        />
        {suffix ? <Text style={f.suffix}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

function DropdownField({
  label, value, options, onChange,
}: {
  label: string; value: string;
  options: {value: string; label: string}[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const current = options.find(o => o.value === value);
  return (
    <View style={[f.group, {zIndex: open ? 200 : 1}]}>
      <FieldLabel text={label} />
      <View style={{position: 'relative'}}>
        <TouchableOpacity
          style={[f.dropTrigger, open && f.dropTriggerOpen]}
          onPress={() => setOpen(p => !p)}
          activeOpacity={0.85}>
          <Text style={f.dropValue}>{current?.label ?? value}</Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={open ? C.orange : C.textMuted}
          />
        </TouchableOpacity>
        {open && (
          <View style={f.dropMenu}>
            <ScrollView style={{maxHeight: 260}} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {options.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[f.dropOption, opt.value === value && f.dropOptionSel]}
                  onPress={() => {onChange(opt.value); setOpen(false);}}>
                  <Text style={[f.dropOptionText, opt.value === value && f.dropOptionTextSel]}>
                    {opt.label}
                  </Text>
                  {opt.value === value && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

// ── Date picker (month/year modal) ────────────────────────
function DatePickerField({value, onChange}: {value: string; onChange: (v: string) => void}) {
  const [show, setShow] = useState(false);
  const today = new Date();
  const parsed = value ? new Date(value) : null;
  const [year,  setYear]  = useState(parsed?.getFullYear()  ?? today.getFullYear());
  const [month, setMonth] = useState(parsed?.getMonth()     ?? today.getMonth());
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const displayDate = parsed
    ? parsed.toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})
    : 'Select start date';

  return (
    <View style={f.group}>
      <FieldLabel text="Start Date" />
      <TouchableOpacity style={f.dateTrigger} onPress={() => setShow(true)}>
        <Ionicons name="calendar-outline" size={16} color={C.orange} />
        <Text style={f.dateText}>{displayDate}</Text>
        <Ionicons name="chevron-down" size={14} color={C.textMuted} />
      </TouchableOpacity>
      <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
        <View style={f.dateOverlay}>
          <View style={f.datePicker}>
            <View style={f.datePickerHeader}>
              <TouchableOpacity onPress={() => setYear(y => y - 1)} style={f.dateNavBtn}>
                <Ionicons name="chevron-back" size={20} color={C.text} />
              </TouchableOpacity>
              <Text style={f.dateYear}>{year}</Text>
              <TouchableOpacity onPress={() => setYear(y => y + 1)} style={f.dateNavBtn}>
                <Ionicons name="chevron-forward" size={20} color={C.text} />
              </TouchableOpacity>
            </View>
            <View style={f.dateGrid}>
              {MONTHS.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  style={[f.dateMonthBtn, i === month && f.dateMonthBtnActive]}
                  onPress={() => {
                    setMonth(i);
                    onChange(new Date(year, i, 1).toISOString().split('T')[0]);
                    setShow(false);
                  }}>
                  <Text style={[f.dateMonthText, i === month && f.dateMonthTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={f.dateCloseBtn} onPress={() => setShow(false)}>
              <Text style={f.dateCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Field styles
const f = StyleSheet.create({
  group: {marginBottom: 20},
  label: {fontSize: 13, fontWeight: '600', color: C.label, marginBottom: 8},
  input: {
    backgroundColor: C.surface,
    borderWidth: 2, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, fontWeight: '500', color: C.inputText,
  },
  inputMulti: {minHeight: 96, textAlignVertical: 'top'},
  moneyRow: {flexDirection: 'row', alignItems: 'center', gap: 8},
  prefix: {fontSize: 16, fontWeight: '600', color: C.textMuted, minWidth: 16},
  moneyInput: {
    flex: 1, backgroundColor: C.surface,
    borderWidth: 2, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 12,
    fontSize: 16, fontWeight: '500', color: C.inputText,
  },
  suffix: {fontSize: 13, color: C.textMuted},
  dropTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.bg, borderWidth: 2, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 12, gap: 8,
  },
  dropTriggerOpen: {borderColor: C.orange, backgroundColor: C.surface},
  dropValue: {flex: 1, fontSize: 16, fontWeight: '500', color: C.inputText},
  dropMenu: {
    position: 'absolute', top: 50, left: 0, right: 0,
    backgroundColor: C.surface, borderWidth: 2, borderColor: C.orange,
    borderRadius: 8, zIndex: 300,
    shadowColor: '#000', shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
  },
  dropOption: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
    backgroundColor: C.surface,
  },
  dropOptionSel: {backgroundColor: C.orange},
  dropOptionText: {flex: 1, fontSize: 14, fontWeight: '500', color: C.textCard},
  dropOptionTextSel: {color: '#fff', fontWeight: '700'},
  dateTrigger: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: C.surface, borderWidth: 2, borderColor: C.border, borderRadius: 8,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  dateText: {flex: 1, fontSize: 16, fontWeight: '500', color: C.inputText},
  dateOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center', alignItems: 'center', padding: 32,
  },
  datePicker: {
    backgroundColor: C.surface, borderRadius: 16, padding: 24,
    width: '100%', maxWidth: 320,
  },
  datePickerHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 20,
  },
  dateNavBtn: {padding: 8},
  dateYear: {fontSize: 20, fontWeight: '700', color: C.text},
  dateGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center'},
  dateMonthBtn: {
    width: '22%', paddingVertical: 10, borderRadius: 8,
    alignItems: 'center', backgroundColor: '#f8fafc',
  },
  dateMonthBtnActive: {backgroundColor: C.primary},
  dateMonthText: {fontSize: 13, color: C.textCard, fontWeight: '500'},
  dateMonthTextActive: {color: '#fff', fontWeight: '700'},
  dateCloseBtn: {marginTop: 20, paddingVertical: 12, alignItems: 'center'},
  dateCancelText: {fontSize: 15, color: C.textMuted},
});

// ── Breakdown row (pricing summary) ──────────────────────
function BRow({label, value, highlight}: {label: string; value: number; highlight?: boolean}) {
  return (
    <View style={[brow.row, highlight && brow.rowHL]}>
      <Text style={[brow.label, highlight && brow.labelHL]} numberOfLines={1}>{label}</Text>
      <Text style={[brow.value, highlight && brow.valueHL]} numberOfLines={1}>{fmt$(value)}</Text>
    </View>
  );
}

const brow = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.bg, borderRadius: 8, marginBottom: 8,
  },
  rowHL: {backgroundColor: C.yellowBg, borderWidth: 2, borderColor: C.yellow},
  label: {fontSize: 14, fontWeight: '500', color: C.textMuted, flex: 1, marginRight: 8},
  labelHL: {color: '#92400e', fontWeight: '700'},
  value: {fontSize: 16, fontWeight: '700', color: C.text},
  valueHL: {color: '#92400e'},
});

// ── Web-app Card ──────────────────────────────────────────
function WCard({title, children, flex}: {title: string; children: React.ReactNode; flex?: boolean}) {
  return (
    <View style={[wc.card, flex && wc.cardFlex]}>
      <Text style={wc.title}>{title}</Text>
      {children}
    </View>
  );
}

const wc = StyleSheet.create({
  card: {
    backgroundColor: C.surface,
    borderWidth: 2, borderColor: C.border, borderRadius: 12, padding: 24,
    marginBottom: 0,
    shadowColor: '#000', shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  cardFlex: {flex: 1, minWidth: 260},
  title: {
    fontSize: 16, fontWeight: '700', color: C.textCard,
    textTransform: 'uppercase', letterSpacing: 0.5,
    paddingBottom: 16, marginBottom: 20,
    borderBottomWidth: 2, borderBottomColor: C.borderLight,
  },
});

// ── Main desktop form ─────────────────────────────────────
export function CreateAgreementDesktop() {
  const navigation = useNavigation();

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

  const goBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      (navigation as any).navigate('Saved');
    }
  };

  const handleGenerate = async () => {
    const ok = await generate();
    if (ok) {goBack();}
  };

  const rows = form.headerRows ?? [];

  const PAYMENT_OPTS = [
    {value: 'online' as const, label: 'Online Payment',  desc: 'Credit/debit card or bank transfer', icon: 'card-outline'},
    {value: 'cash'   as const, label: 'Cash Payment',    desc: 'Cash on delivery or pickup',         icon: 'cash-outline'},
    {value: 'others' as const, label: 'Other Methods',   desc: 'Check, wire transfer, etc.',         icon: 'ellipsis-horizontal-circle-outline'},
  ];

  return (
    <View style={ss.root}>

      {/* ── Top bar ── */}
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

      {/* ── Scrollable content ── */}
      <ScrollView
        style={ss.scroll}
        contentContainerStyle={ss.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator>

        {/* ══════════════════════════════════
            SECTION 1 — CUSTOMER INFORMATION
        ══════════════════════════════════ */}
        <WCard title="CUSTOMER INFORMATION">
          {/* Agreement title — full width, above the grid */}
          <FieldInput
            label="Agreement Title"
            value={form.headerTitle}
            onChange={setHeaderTitle}
            placeholder="e.g. ABC Corporation – Jan 2025 Agreement"
          />
          <View style={ss.inlineDivider} />
          {/* 3-column grid for all 6 customer fields */}
          <View style={ss.threeCol}>
            <View style={ss.col}>
              <FieldInput
                label="Customer Name"
                value={rows[0]?.valueLeft ?? ''}
                onChange={v => setHeaderRow(0, 'valueLeft', v)}
                placeholder="Company / Customer Name"
              />
            </View>
            <View style={ss.col}>
              <FieldInput
                label="Customer Contact"
                value={rows[0]?.valueRight ?? ''}
                onChange={v => setHeaderRow(0, 'valueRight', v)}
                placeholder="Contact Person"
              />
            </View>
            <View style={ss.col}>
              <FieldInput
                label="Customer Number"
                value={rows[1]?.valueLeft ?? ''}
                onChange={v => setHeaderRow(1, 'valueLeft', v)}
                placeholder="Phone Number"
                keyboard="phone-pad"
              />
            </View>
            <View style={ss.col}>
              <FieldInput
                label="POC Email"
                value={rows[1]?.valueRight ?? ''}
                onChange={v => setHeaderRow(1, 'valueRight', v)}
                placeholder="point@company.com"
                keyboard="email-address"
              />
            </View>
            <View style={ss.col}>
              <FieldInput
                label="POC Name"
                value={rows[2]?.valueLeft ?? ''}
                onChange={v => setHeaderRow(2, 'valueLeft', v)}
                placeholder="Point of Contact Name"
              />
            </View>
            <View style={ss.col}>
              <FieldInput
                label="POC Phone"
                value={rows[2]?.valueRight ?? ''}
                onChange={v => setHeaderRow(2, 'valueRight', v)}
                placeholder="POC Direct Phone"
                keyboard="phone-pad"
              />
            </View>
          </View>
        </WCard>

        <View style={ss.gap} />

        {/* ══════════════════════════════════
            SECTION 2 — PRODUCTS & DISPENSERS
        ══════════════════════════════════ */}
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

        <View style={ss.gap} />

        {/* ══════════════════════════════════
            SECTION 3 — SERVICES
        ══════════════════════════════════ */}
        <Step3Services
          visibleServices={form.visibleServices}
          services={form.services}
          contractMonths={form.contractMonths}
          pricingConfigs={form.pricingConfigs}
          serviceConfigsList={form.serviceConfigsList}
          onAddService={addService}
          onRemoveService={removeService}
          onUpdateService={updateService}
        />

        <View style={ss.gap} />

        {/* ══════════════════════════════════
            SECTION 4 — CONTRACT DETAILS
            Duration + Charges + Payment in one row
        ══════════════════════════════════ */}
        <View style={ss.grid}>
          {!allServicesOneTime && (
            <WCard title="CONTRACT DURATION" flex>
              <DropdownField
                label="Contract Duration"
                value={String(form.contractMonths)}
                options={DURATION_OPTIONS}
                onChange={v => setContractMonths(parseInt(v, 10))}
              />
              <DatePickerField value={form.startDate} onChange={setStartDate} />
            </WCard>
          )}

          <WCard title="TRIP & PARKING" flex>
            <MoneyInput label="Trip Charge" value={form.tripCharge} onChange={setTripCharge} suffix="per visit" />
            <DropdownField
              label="Trip Frequency"
              value={String(form.tripChargeFrequency)}
              options={TRIP_FREQ_OPTIONS}
              onChange={v => setTripChargeFrequency(parseFloat(v))}
            />
            <View style={ss.inlineDivider} />
            <MoneyInput label="Parking Charge" value={form.parkingCharge} onChange={setParkingCharge} suffix="per visit" />
            <DropdownField
              label="Parking Frequency"
              value={String(form.parkingChargeFrequency)}
              options={TRIP_FREQ_OPTIONS}
              onChange={v => setParkingChargeFrequency(parseFloat(v))}
            />
          </WCard>

          <WCard title="PAYMENT METHOD" flex>
            <View style={ss.payStack}>
              {PAYMENT_OPTS.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[ss.payOpt, form.paymentOption === opt.value && ss.payOptActive]}
                  onPress={() => setPaymentOption(opt.value)}
                  activeOpacity={0.85}>
                  <Ionicons name={opt.icon} size={20} color={form.paymentOption === opt.value ? C.orange : C.textMuted} />
                  <View style={{flex: 1}}>
                    <Text style={[ss.payOptTitle, form.paymentOption === opt.value && ss.payOptTitleActive]}>{opt.label}</Text>
                    <Text style={[ss.payOptDesc, form.paymentOption === opt.value && ss.payOptDescActive]}>{opt.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
            <View style={ss.inlineDivider} />
            <Text style={ss.payNoteLabel}>Payment Note</Text>
            <TextInput
              style={ss.payNoteInput}
              value={form.paymentNote}
              onChangeText={setPaymentNote}
              placeholder="Add a payment note..."
              placeholderTextColor={C.textMutedLt}
              multiline
            />
          </WCard>
        </View>

        <View style={ss.gap} />

        {/* Pricing summary */}
        <WCard title="PRICING SUMMARY">
          <View style={ss.threeCol}>
            <View style={ss.col}><BRow label="Trip Charge / visit" value={form.tripCharge} /></View>
            <View style={ss.col}><BRow label="Parking / visit" value={form.parkingCharge} /></View>
            {!allServicesOneTime && (
              <View style={ss.col}><BRow label={`Duration (${form.contractMonths} mo)`} value={form.contractMonths} /></View>
            )}
          </View>
        </WCard>

        <View style={ss.gap} />

        {/* ══════════════════════════════════
            SECTION 5 — TERMS & AGREEMENT
        ══════════════════════════════════ */}
        <Step5Agreement
          enviroOf={form.enviroOf}
          onEnviroOfChange={setEnviroOf}
          serviceAgreement={form.serviceAgreement}
          onUpdate={updateServiceAgreement}
          loading={form.serviceAgreementLoading}
        />

        <View style={ss.gap} />

        {/* ══════════════════════════════════
            SECTION 6 — REVIEW
        ══════════════════════════════════ */}
        <Step4Review form={form} />

        <View style={{height: 24}} />
      </ScrollView>

      {/* ── Bottom action bar — .formfilling__actions ── */}
      <View style={ss.actionBar}>
        <Text style={ss.actionHint}>
          {savedId ? 'Draft saved' : 'All changes are unsaved'}
        </Text>
        <View style={ss.actionBtns}>
          {/* Save Draft — .formfilling__draftBtn */}
          <TouchableOpacity
            style={[ss.draftBtn, saving && ss.disabled]}
            onPress={() => saveDraft()}
            disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#4a4a4a" />
              : <Ionicons name="save-outline" size={16} color="#4a4a4a" />}
            <Text style={ss.draftBtnText}>{savedId ? 'Save' : 'Save Draft'}</Text>
          </TouchableOpacity>

          {/* Generate — .formfilling__saveBtn #ff4500 */}
          <TouchableOpacity
            style={[ss.saveBtn, saving && ss.disabled]}
            onPress={handleGenerate}
            disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : (
                <>
                  <Ionicons name="document-text-outline" size={16} color="#fff" />
                  <Text style={ss.saveBtnText}>Generate PDF</Text>
                </>
              )}
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
}

// ── Page styles ───────────────────────────────────────────
const ss = StyleSheet.create({
  root: {flex: 1, flexDirection: 'column', backgroundColor: C.bg},

  // Top bar
  topBar: {
    flexDirection: 'row', alignItems: 'center', gap: 16,
    paddingHorizontal: 24, paddingVertical: 14,
    backgroundColor: C.surface,
    borderBottomWidth: 1, borderBottomColor: '#e6e6e6',
  },
  backBtn: {
    width: 34, height: 34, borderRadius: 6,
    borderWidth: 1, borderColor: '#e0e0e0',
    backgroundColor: '#f5f5f5',
    alignItems: 'center', justifyContent: 'center',
  },
  topBarText: {flex: 1},
  topBarTitle: {fontSize: 18, fontWeight: '700', color: C.text},
  topBarSub: {fontSize: 13, color: C.textMuted, marginTop: 2},
  errBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca',
    borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8,
  },
  errText: {fontSize: 13, color: '#b91c1c', fontWeight: '500'},

  // Scroll — full width, no maxWidth cap
  scroll: {flex: 1, backgroundColor: C.bg},
  content: {
    paddingTop: 20, paddingHorizontal: 20, paddingBottom: 20,
  },

  // Layout helpers
  grid: {flexDirection: 'row', flexWrap: 'wrap', gap: 16},
  gap: {height: 16},
  threeCol: {flexDirection: 'row', flexWrap: 'wrap', gap: 16},
  col: {flex: 1, minWidth: 200},
  inlineDivider: {height: 1, backgroundColor: C.borderLight, marginVertical: 14},

  // Payment — vertical stack inside card
  payStack: {gap: 8, marginBottom: 0},
  payOpt: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1, borderColor: C.border,
    borderRadius: 8, padding: 10,
    backgroundColor: C.surface,
  },
  payOptActive: {
    borderColor: '#ff8c42',
    backgroundColor: '#fff5f0',
  },
  payOptTitle: {fontSize: 14, fontWeight: '600', color: C.text},
  payOptTitleActive: {color: C.orange},
  payOptDesc: {fontSize: 12, color: C.textMuted, marginTop: 1},
  payOptDescActive: {color: '#ea580c'},
  payNoteLabel: {
    fontSize: 13, fontWeight: '600', color: C.label, marginBottom: 6,
  },
  payNoteInput: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: C.border, borderRadius: 8,
    fontSize: 14, color: C.text, backgroundColor: C.surface,
    minHeight: 64, textAlignVertical: 'top',
  },

  // Bottom action bar
  actionBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.surface,
    borderTopWidth: 1, borderTopColor: '#e6e6e6',
    paddingHorizontal: 24, paddingVertical: 14,
  },
  actionHint: {fontSize: 13, color: C.textMuted},
  actionBtns: {flexDirection: 'row', alignItems: 'center', gap: 12},
  draftBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 6, backgroundColor: '#f5f5f5',
    borderWidth: 1, borderColor: '#e0e0e0',
  },
  draftBtnText: {fontSize: 15, fontWeight: '600', color: '#4a4a4a'},
  saveBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: 6, backgroundColor: C.orange,
    minWidth: 148, justifyContent: 'center',
  },
  saveBtnText: {fontSize: 15, fontWeight: '600', color: '#fff'},
  disabled: {opacity: 0.6},
});
