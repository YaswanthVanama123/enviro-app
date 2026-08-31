import React, {useRef, useEffect, useState} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation, useRoute} from '@react-navigation/native';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';
import {StepIndicator} from '../components/form/ui/FormUI';
import {Step1Customer}   from '../components/form/steps/Step1Customer';
import {Step2Products}   from '../components/form/steps/Step2Products';
import {Step3Services}   from '../components/form/steps/Step3Services';
import {Step2Contract}   from '../components/form/steps/Step2Contract';
import {Step5Agreement}  from '../components/form/steps/Step5Agreement';
import {Step4Review}     from '../components/form/steps/Step4Review';
import {useFormFilling}  from '../hooks/useFormFilling';
import {useAccountTypeDetection} from '../hooks/useAccountTypeDetection';
import {GlobalCommissionSummary} from '../components/commission';
import {zohoApi} from '../../../services/api/endpoints/agreements.api';
import {ConfirmModal} from '../../../shared/components/ui/AppModal';

const STEP_LABELS = ['Customer', 'Products', 'Services', 'Agreement', 'Terms', 'Review'];

export function CreateAgreementScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const editAgreementId = (route.params as any)?.agreementId as string | undefined;
  const isEditMode = !!editAgreementId;
  const routeIsExtension = (route.params as any)?.isExtension === true;
  const scrollRef  = useRef<ScrollView>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);

  const {
    form,
    effectivePriorQuotaCredit,
    effectiveCommissionRules,
    isRouteStarMapped,
    isNewLocation,
    setIsNewLocation,
    priorFarRedline,
    priorFarGreenline,
    nextStep,
    prevStep,
    setHeaderTitle,
    setIsExtension,
    setHeaderRows,
    addSmallProduct,
    removeSmallProduct,
    updateSmallProduct,
    addDispenser,
    removeDispenser,
    updateDispenser,
    addBigProduct,
    removeBigProduct,
    updateBigProduct,
    setContractMonths,
    setStartDate,
    setTripCharge,
    setTripChargeFrequency,
    setParkingCharge,
    setParkingChargeFrequency,
    setPaymentOption,
    setPaymentNote,
    setIncludeProductsTable,
    setIncludeContractSummary,
    addService,
    removeService,
    updateService,
    setEnviroOf,
    updateServiceAgreement,
    saveDraft,
    generate,
    reset,
    allServicesOneTime,
    payrollLock,
  } = useFormFilling(editAgreementId);

  const {
    accountTypeCache,
    detectAccountTypes,
    isDetecting: isDetectingAccountTypes,
    error: accountTypeError,
    isCompanyMapped,
  } = useAccountTypeDetection({
    biginCompanyId: form.biginCompanyId,
    services: form.services,
    autoDetect: false,
    
    agreementId: form.savedId,
    
    initialCache: form.accountTypeCache,
    initialCacheLoadedFromSaved: form.accountTypeCacheLoadedFromSaved,
  });

  const {step, saving, saveError, savedId} = form;

  // Arriving via "Extend Agreement" marks the document as a renewal so it keeps the
  // legacy addendum heading. Edit mode restores the flag from the saved agreement
  // instead, so don't let the route param override it.
  useEffect(() => {
    if (routeIsExtension && !isEditMode) {
      setIsExtension(true);
    }
  }, [routeIsExtension, isEditMode, setIsExtension]);

  useEffect(() => {
    if (step === 3 && form.biginCompanyId && Object.keys(form.services).length > 0) {
      detectAccountTypes();
    }
  }, [step, form.biginCompanyId, form.services, detectAccountTypes]);

  const handleNext = () => {
    scrollRef.current?.scrollTo({y: 0, animated: true});
    nextStep();
  };

  const handlePrev = () => {
    scrollRef.current?.scrollTo({y: 0, animated: true});
    prevStep();
  };

  const handleSaveDraft = async () => {
    await saveDraft();
  };

  // The create flow is rendered both as a stacked screen (edit mode) AND as the
  // center "New" bottom tab. In the tab there's no stack to pop, so goBack()
  // throws "GO_BACK was not handled" — fall back to resetting the form instead.
  const goBackSafe = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      reset();
    }
  };

  const handleGenerate = async () => {
    setShowSaveModal(false);
    const {ok, agreementId, status, title} = await generate();
    if (ok) {
      if (status === 'pending_approval' && agreementId) {
        zohoApi.createAutoApprovalTask(agreementId, title).catch(() => {});
      }
      // The generated PDF lives in the Saved PDFs list — land the user there.
      reset();
      (navigation as any).navigate('Saved');
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Step1Customer
            headerTitle={form.headerTitle}
            onHeaderTitleChange={setHeaderTitle}
            headerRows={form.headerRows}
            onHeaderRowsChange={setHeaderRows}
          />
        );
      case 2:
        return (
          <Step2Products
            smallProducts={form.smallProducts}
            dispensers={form.dispensers}
            bigProducts={form.bigProducts}
            onAddSmallProduct={addSmallProduct}
            onRemoveSmallProduct={removeSmallProduct}
            onUpdateSmallProduct={updateSmallProduct}
            onAddDispenser={addDispenser}
            onRemoveDispenser={removeDispenser}
            onUpdateDispenser={updateDispenser}
            onAddBigProduct={addBigProduct}
            onRemoveBigProduct={removeBigProduct}
            onUpdateBigProduct={updateBigProduct}
            productCatalog={form.productCatalog}
            includeProductsTable={form.includeProductsTable}
            onIncludeProductsTableChange={setIncludeProductsTable}
          />
        );
      case 3:
        return (
          <View>
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
            {}
            {}
            <GlobalCommissionSummary
              services={form.services}
              accountTypeCache={accountTypeCache}
              priorQuotaCredit={effectivePriorQuotaCredit}
              rulesOverride={effectiveCommissionRules}
              showDetectButton={true}
              isDetecting={isDetectingAccountTypes}
              isCompanyMapped={isCompanyMapped}
              isRouteStarMapped={isRouteStarMapped}
              isNewLocation={isNewLocation}
              onNewLocationChange={setIsNewLocation}
              priorFarRedline={priorFarRedline}
              priorFarGreenline={priorFarGreenline}
              error={accountTypeError}
              onDetect={detectAccountTypes}
              addedToPayroll={!!payrollLock?.addedToPayroll}
              payrollPeriodLabel={payrollLock?.periodLabel}
            />
          </View>
        );
      case 4:
        return (
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
            includeContractSummary={form.includeContractSummary}
            onIncludeContractSummaryChange={setIncludeContractSummary}
          />
        );
      case 5:
        return (
          <Step5Agreement
            enviroOf={form.enviroOf}
            onEnviroOfChange={setEnviroOf}
            serviceAgreement={form.serviceAgreement}
            onUpdate={updateServiceAgreement}
            loading={form.initialLoading}
          />
        );
      case 6:
        return (
          <Step4Review
            form={form}
            accountTypeCache={accountTypeCache}
            priorQuotaCredit={effectivePriorQuotaCredit}
            rulesOverride={effectiveCommissionRules}
            isCompanyMapped={isCompanyMapped}
            isRouteStarMapped={isRouteStarMapped}
            isNewLocation={isNewLocation}
            onNewLocationChange={setIsNewLocation}
            priorFarRedline={priorFarRedline}
            priorFarGreenline={priorFarGreenline}
          />
        );
    }
  };

  const renderBottomBar = () => {
    const isFirst = step === 1;
    const isLast  = step === 6;

    return (
      <View style={styles.bottomBar}>
        {saveError ? (
          <Text style={styles.saveError}>{saveError}</Text>
        ) : null}

        {isLast ? (
          <>
            <View style={styles.bottomBtns}>
              {!isFirst && (
                <TouchableOpacity style={styles.backBtn} onPress={handlePrev}>
                  <Ionicons name="chevron-back" size={18} color={Colors.textSecondary} />
                  <Text style={styles.backBtnText}>Back</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.draftBtnFlex, saving && styles.btnDisabled]}
                onPress={handleSaveDraft}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="save-outline" size={16} color={Colors.primary} />
                )}
                <Text style={styles.draftBtnText} numberOfLines={1}>
                  {saving ? 'Saving…' : 'Save Draft'}
                </Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.generateBtnFull, saving && styles.btnDisabled]}
              onPress={() => setShowSaveModal(true)}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.nextBtnText}>Generate PDF</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.bottomBtns}>
            {!isFirst && (
              <TouchableOpacity style={styles.backBtn} onPress={handlePrev}>
                <Ionicons name="chevron-back" size={18} color={Colors.textSecondary} />
                <Text style={styles.backBtnText}>Back</Text>
              </TouchableOpacity>
            )}

            {step >= 3 && (
              <TouchableOpacity
                style={[styles.draftBtn, saving && styles.btnDisabled]}
                onPress={handleSaveDraft}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <Ionicons name="save-outline" size={16} color={Colors.primary} />
                )}
                <Text style={styles.draftBtnText} numberOfLines={1}>
                  {saving ? 'Saving…' : 'Save Draft'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.nextBtn, saving && styles.btnDisabled]}
              onPress={handleNext}
              disabled={saving}>
              <Text style={styles.nextBtnText}>Next</Text>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>

        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBack} onPress={goBackSafe}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{isEditMode ? 'Edit Agreement' : 'New Agreement'}</Text>
            <Text style={styles.headerSub}>{STEP_LABELS[step - 1]}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.stepBar}>
          <StepIndicator current={step} total={6} />
          <View style={styles.stepLabels}>
            {STEP_LABELS.map((lbl, i) => (
              <Text
                key={lbl}
                style={[styles.stepLabel, i + 1 === step && styles.stepLabelActive]}>
                {lbl}
              </Text>
            ))}
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {renderStep()}
          <View style={{height: Spacing.xxl}} />
        </ScrollView>

        {renderBottomBar()}
      </KeyboardAvoidingView>

      <ConfirmModal
        visible={showSaveModal}
        icon="document-text-outline"
        iconColor={Colors.primary}
        iconBg={Colors.primaryLight}
        title="Confirm Save"
        subtitle="Are you sure you want to save this form and convert it to PDF? This will compile the document and store it in Bigin."
        confirmLabel="Yes, Save & Generate"
        cancelLabel="Cancel"
        loading={saving}
        onConfirm={handleGenerate}
        onCancel={() => setShowSaveModal(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBack: {
    padding: Spacing.xs,
    width: 36,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  headerRight: {
    width: 36,
  },
  stepBar: {
    backgroundColor: Colors.surface,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stepLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 0,
    paddingHorizontal: Spacing.xl,
  },
  stepLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  stepLabelActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingTop: Spacing.md,
  },
  bottomBar: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    gap: Spacing.xs,
  },
  saveError: {
    fontSize: FontSize.sm,
    color: '#ef4444',
    textAlign: 'center',
    paddingBottom: Spacing.xs,
  },
  bottomBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  draftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  draftBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
  draftBtnFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  generateBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.green ?? '#10b981',
    marginTop: Spacing.sm,
  },
  nextBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
  },
  generateBtn: {
    backgroundColor: Colors.green ?? '#10b981',
  },
  nextBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
