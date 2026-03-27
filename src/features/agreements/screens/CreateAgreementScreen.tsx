import React, {useRef} from 'react';
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
import {useNavigation} from '@react-navigation/native';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';
import {StepIndicator} from '../components/form/FormUI';
import {Step1Customer}   from '../components/form/Step1Customer';
import {Step2Products}   from '../components/form/Step2Products';
import {Step3Services}   from '../components/form/Step3Services';
import {Step2Contract}   from '../components/form/Step2Contract';
import {Step5Agreement}  from '../components/form/Step5Agreement';
import {Step4Review}     from '../components/form/Step4Review';
import {useFormFilling}  from '../hooks/useFormFilling';

// ─── Step metadata ────────────────────────────────────────────────────────────

const STEP_LABELS = ['Customer', 'Products', 'Services', 'Agreement', 'Terms', 'Review'];

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateAgreementScreen() {
  const navigation = useNavigation();
  const scrollRef  = useRef<ScrollView>(null);

  const {
    form,
    nextStep,
    prevStep,
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
    addService,
    removeService,
    updateService,
    setEnviroOf,
    updateServiceAgreement,
    saveDraft,
    generate,
  } = useFormFilling();

  const {step, saving, saveError, savedId} = form;

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

  const handleGenerate = async () => {
    const ok = await generate();
    if (ok) {
      navigation.goBack();
    }
  };

  // ─── Render step content ──────────────────────────────────────────────────

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <Step1Customer
            headerTitle={form.headerTitle}
            onHeaderTitleChange={setHeaderTitle}
            headerRows={form.headerRows}
            onRowChange={setHeaderRow}
          />
        );
      case 2:
        return (
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
          />
        );
      case 3:
        return (
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
          />
        );
      case 5:
        return (
          <Step5Agreement
            enviroOf={form.enviroOf}
            onEnviroOfChange={setEnviroOf}
            serviceAgreement={form.serviceAgreement}
            onUpdate={updateServiceAgreement}
            loading={form.serviceAgreementLoading}
          />
        );
      case 6:
        return <Step4Review form={form} />;
    }
  };

  // ─── Bottom bar ───────────────────────────────────────────────────────────

  const renderBottomBar = () => {
    const isFirst = step === 1;
    const isLast  = step === 6;

    return (
      <View style={styles.bottomBar}>
        {saveError ? (
          <Text style={styles.saveError}>{saveError}</Text>
        ) : null}

        <View style={styles.bottomBtns}>
          {/* Back */}
          {!isFirst && (
            <TouchableOpacity style={styles.backBtn} onPress={handlePrev}>
              <Ionicons name="chevron-back" size={18} color={Colors.textSecondary} />
              <Text style={styles.backBtnText}>Back</Text>
            </TouchableOpacity>
          )}

          {/* Save draft (visible on step 3+) */}
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
              <Text style={styles.draftBtnText}>
                {savedId ? 'Save' : 'Save Draft'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Next / Generate */}
          <TouchableOpacity
            style={[styles.nextBtn, isLast && styles.generateBtn, saving && styles.btnDisabled]}
            onPress={isLast ? handleGenerate : handleNext}
            disabled={saving}>
            {saving && isLast ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Text style={styles.nextBtnText}>
                  {isLast ? 'Generate' : 'Next'}
                </Text>
                <Ionicons
                  name={isLast ? 'checkmark-circle' : 'chevron-forward'}
                  size={18}
                  color="#fff"
                />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}>

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBack} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>New Agreement</Text>
            <Text style={styles.headerSub}>{STEP_LABELS[step - 1]}</Text>
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Step indicator */}
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

        {/* Scrollable content */}
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {renderStep()}
          <View style={{height: Spacing.xxl}} />
        </ScrollView>

        {/* Bottom navigation bar */}
        {renderBottomBar()}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

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
    color: Colors.error ?? '#ef4444',
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
