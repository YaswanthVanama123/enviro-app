/**
 * CreateAgreementSinglePage.tsx
 * Shared single-page layout used by both .windows.tsx and .macos.tsx
 * All 6 sections visible at once on one scrollable page — exactly like the web app.
 */
import React, {useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {Step1Customer}  from '../components/form/Step1Customer';
import {Step2Products}  from '../components/form/Step2Products';
import {Step3Services}  from '../components/form/Step3Services';
import {Step2Contract}  from '../components/form/Step2Contract';
import {Step5Agreement} from '../components/form/Step5Agreement';
import {Step4Review}    from '../components/form/Step4Review';
import {useFormFilling} from '../hooks/useFormFilling';
import {zohoApi} from '../../../services/api/endpoints/agreements.api';

// ── Web app exact palette ────────────────────────────────
const C = {
  primary:      '#c00000',
  orange:       '#ff4500',
  surface:      '#ffffff',
  bg:           '#f9fafb',
  border:       '#e5e7eb',
  borderLight:  '#e6e6e6',
  text:         '#1f2937',
  textSecondary:'#4a4a4a',
  textMuted:    '#9ca3af',
  draftBg:      '#f5f5f5',
  draftBorder:  '#e0e0e0',
  draftText:    '#4a4a4a',
  green:        '#10b981',
};

const SECTIONS = [
  {icon: 'person-outline',        title: 'Customer Information',  sub: 'Client details & contact info'},
  {icon: 'cube-outline',          title: 'Products & Dispensers', sub: 'Product selection & quantities'},
  {icon: 'construct-outline',     title: 'Services',              sub: 'Service types & pricing config'},
  {icon: 'document-text-outline', title: 'Contract Details',      sub: 'Duration, charges & payment'},
  {icon: 'clipboard-outline',     title: 'Terms & Agreement',     sub: 'Service agreement text'},
  {icon: 'eye-outline',           title: 'Review',                sub: 'Summary before generating'},
];

export function CreateAgreementSinglePage() {
  const navigation = useNavigation();
  const scrollRef  = useRef<ScrollView>(null);

  const {
    form,
    setHeaderTitle,
    setHeaderRow,
    addSmallProduct,
    removeSmallProduct,
    updateSmallProduct,
    addDispenser,
    removeDispenser,
    updateDispenser,
    setContractMonths,
    setStartDate,
    setTripCharge,
    setTripChargeFrequency,
    setParkingCharge,
    setParkingChargeFrequency,
    setPaymentOption,
    setPaymentNote,
    setIncludeProductsTable,
    addService,
    removeService,
    updateService,
    setEnviroOf,
    updateServiceAgreement,
    saveDraft,
    generate,
    allServicesOneTime,
  } = useFormFilling();

  const {saving, saveError, savedId} = form;

  const handleGenerate = async () => {
    const {ok, agreementId, status} = await generate();
    if (ok) {
      if (status === 'pending_approval' && agreementId) {
        zohoApi.createAutoApprovalTask(agreementId, form.headerTitle || 'Agreement').catch(() => {});
      }
      navigation.goBack();
    }
  };

  return (
    <View style={ss.root}>

      {/* ── Top bar — matches web app topnav sub-header ── */}
      <View style={ss.topBar}>
        <TouchableOpacity style={ss.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={16} color={C.draftText} />
        </TouchableOpacity>
        <View style={ss.topBarText}>
          <Text style={ss.topBarTitle}>New Agreement</Text>
          <Text style={ss.topBarSub}>Fill in all sections below, then generate the PDF</Text>
        </View>
        {saveError ? (
          <View style={ss.errorBadge}>
            <Ionicons name="alert-circle-outline" size={14} color="#b91c1c" />
            <Text style={ss.errorText}>{saveError}</Text>
          </View>
        ) : null}
      </View>

      {/* ── Single scrollable page — all sections ── */}
      <ScrollView
        ref={scrollRef}
        style={ss.scroll}
        contentContainerStyle={ss.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}>

        {/* ── Section 1: Customer ── */}
        <SectionHeader {...SECTIONS[0]} />
        <Step1Customer
          headerTitle={form.headerTitle}
          onHeaderTitleChange={setHeaderTitle}
          headerRows={form.headerRows}
          onRowChange={setHeaderRow}
        />

        <SectionDivider />

        {/* ── Section 2: Products ── */}
        <SectionHeader {...SECTIONS[1]} />
        <Step2Products
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

        <SectionDivider />

        {/* ── Section 3: Services ── */}
        <SectionHeader {...SECTIONS[2]} />
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

        <SectionDivider />

        {/* ── Section 4: Contract Details ── */}
        <SectionHeader {...SECTIONS[3]} />
        <Step2Contract
          contractMonths={form.contractMonths}
          onContractMonthsChange={setContractMonths}
          startDate={form.startDate}
          onStartDateChange={setStartDate}
          tripCharge={form.tripCharge}
          onTripChargeChange={setTripCharge}
          tripChargeFrequency={form.tripChargeFrequency}
          onTripChargeFrequencyChange={setTripChargeFrequency}
          parkingCharge={form.parkingCharge}
          onParkingChargeChange={setParkingCharge}
          parkingChargeFrequency={form.parkingChargeFrequency}
          onParkingChargeFrequencyChange={setParkingChargeFrequency}
          paymentOption={form.paymentOption}
          onPaymentOptionChange={setPaymentOption}
          paymentNote={form.paymentNote}
          onPaymentNoteChange={setPaymentNote}
          allServicesOneTime={allServicesOneTime}
        />

        <SectionDivider />

        {/* ── Section 5: Terms ── */}
        <SectionHeader {...SECTIONS[4]} />
        <Step5Agreement
          enviroOf={form.enviroOf}
          onEnviroOfChange={setEnviroOf}
          serviceAgreement={form.serviceAgreement}
          onUpdate={updateServiceAgreement}
          loading={form.serviceAgreementLoading}
        />

        <SectionDivider />

        {/* ── Section 6: Review ── */}
        <SectionHeader {...SECTIONS[5]} />
        <Step4Review form={form} />

        <View style={ss.scrollPad} />
      </ScrollView>

      {/* ── Bottom action bar — matches web .formfilling__actions ── */}
      <View style={ss.actionBar}>
        <View style={ss.actionLeft}>
          <Text style={ss.actionHint}>
            {savedId ? 'Draft saved' : 'All changes are unsaved'}
          </Text>
        </View>
        <View style={ss.actionRight}>
          {/* Save Draft — matches .formfilling__draftBtn */}
          <TouchableOpacity
            style={[ss.draftBtn, saving && ss.btnDisabled]}
            onPress={() => saveDraft()}
            disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={C.draftText} />
              : <Ionicons name="save-outline" size={16} color={C.draftText} />
            }
            <Text style={ss.draftBtnText}>{savedId ? 'Save' : 'Save Draft'}</Text>
          </TouchableOpacity>

          {/* Generate — matches .formfilling__saveBtn (#ff4500) */}
          <TouchableOpacity
            style={[ss.saveBtn, saving && ss.btnDisabled]}
            onPress={handleGenerate}
            disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Ionicons name="document-text-outline" size={16} color="#fff" />
                  <Text style={ss.saveBtnText}>Generate PDF</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

// ── Section header — matches web .contract-summary-header h2 ──
function SectionHeader({icon, title, sub}: {icon: string; title: string; sub: string}) {
  return (
    <View style={sh.wrap}>
      <View style={sh.iconWrap}>
        <Ionicons name={icon} size={20} color={C.orange} />
      </View>
      <View>
        <Text style={sh.title}>{title}</Text>
        <Text style={sh.sub}>{sub}</Text>
      </View>
    </View>
  );
}

// ── Section divider — visual separator between major sections ──
function SectionDivider() {
  return <View style={sd.wrap}><View style={sd.line} /></View>;
}

// ── Styles ───────────────────────────────────────────────
const ss = StyleSheet.create({
  root: {
    flex:            1,
    flexDirection:   'column',
    backgroundColor: C.bg,
  },

  // Top bar
  topBar: {
    flexDirection:   'row',
    alignItems:      'center',
    gap: 16,
    paddingHorizontal: 24,
    paddingVertical:   14,
    backgroundColor:   C.surface,
    borderBottomWidth: 1,
    borderBottomColor: C.borderLight,
  },
  backBtn: {
    width:           34,
    height:          34,
    borderRadius:    6,
    borderWidth:     1,
    borderColor:     C.draftBorder,
    backgroundColor: C.draftBg,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  topBarText: {
    flex: 1,
  },
  topBarTitle: {
    fontSize:   18,
    fontWeight: '700',
    color:      C.text,
    fontFamily: 'Arial',
  },
  topBarSub: {
    fontSize:   13,
    color:      C.textMuted,
    marginTop:  2,
    fontFamily: 'Arial',
  },
  errorBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth:     1,
    borderColor:     '#fecaca',
    borderRadius:    8,
    paddingHorizontal: 12,
    paddingVertical:   8,
  },
  errorText: {
    fontSize:   13,
    color:      '#b91c1c',
    fontWeight: '500',
    fontFamily: 'Arial',
  },

  // Scroll
  scroll: {
    flex:            1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    maxWidth:         1100,
    width:            '100%',
    alignSelf:        'center',
    paddingTop:       32,
    paddingHorizontal: 24,
    paddingBottom:    16,
  },
  scrollPad: {height: 32},

  // Bottom action bar — .formfilling__actions
  actionBar: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    backgroundColor: C.surface,
    borderTopWidth:  1,
    borderTopColor:  C.borderLight,
    paddingHorizontal: 24,
    paddingVertical:   16,
  },
  actionLeft: {
    flex: 1,
  },
  actionHint: {
    fontSize:   13,
    color:      C.textMuted,
    fontFamily: 'Arial',
  },
  actionRight: {
    flexDirection: 'row',
    alignItems:    'center',
    gap: 16,
  },

  // .formfilling__draftBtn
  draftBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical:   12,
    borderRadius:      6,
    backgroundColor:   C.draftBg,
    borderWidth:       2,
    borderColor:       C.draftBorder,
  },
  draftBtnText: {
    fontSize:   16,
    fontWeight: '600',
    color:      C.draftText,
    fontFamily: 'Arial',
  },

  // .formfilling__saveBtn — #ff4500 orange-red
  saveBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical:   12,
    borderRadius:      6,
    backgroundColor:   C.orange,
    minWidth:          160,
    justifyContent:    'center',
  },
  saveBtnText: {
    fontSize:   16,
    fontWeight: '600',
    color:      '#ffffff',
    fontFamily: 'Arial',
  },
  btnDisabled: {opacity: 0.6},
});

// Section header styles — .contract-summary-header h2
const sh = StyleSheet.create({
  wrap: {
    flexDirection:  'row',
    alignItems:     'center',
    gap: 12,
    marginBottom:   20,
    paddingLeft:    4,
  },
  iconWrap: {
    width:           40,
    height:          40,
    borderRadius:    8,
    backgroundColor: '#fff5f0',
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  title: {
    fontSize:   22,
    fontWeight: '700',
    color:      C.text,
    fontFamily: 'Arial',
  },
  sub: {
    fontSize:   13,
    color:      C.textSecondary,
    marginTop:  2,
    fontFamily: 'Arial',
  },
});

// Section divider styles
const sd = StyleSheet.create({
  wrap: {
    paddingVertical: 24,
  },
  line: {
    height:          2,
    backgroundColor: C.border,
    borderRadius:    1,
  },
});
