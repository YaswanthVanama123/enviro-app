
import React, {useRef, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Step1Customer}  from '../components/form/steps/Step1Customer';
import {Step2Products}  from '../components/form/steps/Step2Products';
import {Step3Services}  from '../components/form/steps/Step3Services';
import {Step2Contract}  from '../components/form/steps/Step2Contract';
import {Step5Agreement} from '../components/form/steps/Step5Agreement';
import {Step4Review}    from '../components/form/steps/Step4Review';
import {useFormFilling} from '../hooks/useFormFilling';
import {zohoApi} from '../../../services/api/endpoints/agreements.api';
import {ConfirmModal} from '../../../shared/components/ui/AppModal';

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
  const route = useRoute();
  const editAgreementId = (route.params as any)?.agreementId as string | undefined;
  const scrollRef  = useRef<ScrollView>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

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
    reset,
    allServicesOneTime,
  } = useFormFilling(editAgreementId);

  const {saving, saveError, savedId} = form;

  // Rendered as a stacked screen AND as the center "New" tab. In the tab there's
  // no stack to pop, so goBack() throws — fall back to resetting the form.
  const goBackSafe = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      reset();
    }
  };

  const handleGenerate = async () => {
    setShowSaveModal(false);
    const {ok, agreementId, status} = await generate();
    if (ok) {
      if (status === 'pending_approval' && agreementId) {
        zohoApi.createAutoApprovalTask(agreementId, form.headerTitle || 'Agreement').catch(() => {});
      }
      goBackSafe();
    }
  };

  return (
    <View style={ss.root}>

      {}
      <View style={ss.topBar}>
        <TouchableOpacity style={ss.backBtn} onPress={goBackSafe}>
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

      {}
      <ScrollView
        ref={scrollRef}
        style={ss.scroll}
        contentContainerStyle={ss.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={true}>

        {}
        <SectionHeader {...SECTIONS[0]} />
        <Step1Customer
          headerTitle={form.headerTitle}
          onHeaderTitleChange={setHeaderTitle}
          headerRows={form.headerRows}
          onRowChange={setHeaderRow}
        />

        <SectionDivider />

        {}
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

        {}
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

        {}
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

        {}
        <SectionHeader {...SECTIONS[4]} />
        <Step5Agreement
          enviroOf={form.enviroOf}
          onEnviroOfChange={setEnviroOf}
          serviceAgreement={form.serviceAgreement}
          onUpdate={updateServiceAgreement}
          loading={form.initialLoading}
        />

        <SectionDivider />

        {}
        <SectionHeader {...SECTIONS[5]} />
        <Step4Review form={form} />

        <View style={ss.scrollPad} />
      </ScrollView>

      {}
      <View style={ss.actionBar}>
        <View style={ss.actionLeft}>
          <Text style={ss.actionHint}>
            {savedId ? 'Draft saved' : 'All changes are unsaved'}
          </Text>
        </View>
        <View style={ss.actionRight}>
          {}
          <TouchableOpacity
            style={[ss.draftBtn, saving && ss.btnDisabled]}
            onPress={() => saveDraft()}
            disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color={C.draftText} />
              : <Ionicons name="save-outline" size={16} color={C.draftText} />
            }
            <Text style={ss.draftBtnText}>{saving ? 'Saving...' : 'Save as Draft'}</Text>
          </TouchableOpacity>

          {}
          <TouchableOpacity
            style={[ss.saveBtn, saving && ss.btnDisabled]}
            onPress={() => setShowSaveModal(true)}
            disabled={saving}>
            {saving
              ? <ActivityIndicator size="small" color="#fff" />
              : <>
                  <Ionicons name="document-text-outline" size={16} color="#fff" />
                  <Text style={ss.saveBtnText}>Save & Generate PDF</Text>
                </>
            }
          </TouchableOpacity>
        </View>
      </View>

      <ConfirmModal
        visible={showSaveModal}
        icon="document-text-outline"
        iconColor={C.orange}
        iconBg="#fff7ed"
        title="Confirm Save"
        subtitle="Are you sure you want to save this form and convert it to PDF? This will compile the document and store it in Bigin."
        confirmLabel="Yes, Save & Generate"
        confirmColor={C.orange}
        cancelLabel="Cancel"
        loading={saving}
        onConfirm={handleGenerate}
        onCancel={() => setShowSaveModal(false)}
      />
    </View>
  );
}

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

function SectionDivider() {
  return <View style={sd.wrap}><View style={sd.line} /></View>;
}

const ss = StyleSheet.create({
  root: {
    flex:            1,
    flexDirection:   'column',
    backgroundColor: C.bg,
  },

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
