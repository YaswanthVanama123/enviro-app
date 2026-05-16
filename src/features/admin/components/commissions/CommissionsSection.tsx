import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {commissionApi} from '../../../../services/api/endpoints/commission.api';
import {CommissionResultCard} from './CommissionResultCard';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';
import type {
  CommissionCalculationInput,
  CommissionCalculationResult,
  AccountType,
  AgreementTerm,
  PricingLine,
  QuotaLevel,
  BusinessType,
} from '../../types/commission.types';

const ACCOUNT_TYPES: {value: AccountType; label: string}[] = [
  {value: 'Anchor', label: 'Anchor ($200+/visit)'},
  {value: 'Bread5', label: 'Bread5 (within 5 min)'},
  {value: 'Bread15', label: 'Bread15 (within 15 min)'},
  {value: 'Pit', label: 'Pit (new location)'},
];

const AGREEMENT_TERMS: {value: AgreementTerm; label: string}[] = [
  {value: '3-year', label: '3-Year (135%)'},
  {value: '1-year', label: '1-Year (100%)'},
  {value: 'MTM-with-install', label: 'MTM + Install (100%)'},
  {value: 'MTM-no-install', label: 'MTM No Install (50%)'},
];

const QUOTA_LEVELS: {value: QuotaLevel; label: string}[] = [
  {value: 'below', label: 'Below Quota (3%)'},
  {value: 'above', label: 'Above Quota (6%)'},
  {value: 'double', label: 'Double Quota (9%)'},
];

type PickerType = 'accountType' | 'agreementTerm' | 'quotaLevel' | null;

export function CommissionsSection() {
  const insets = useSafeAreaInsets();

  // Form state
  const [monthlyValue, setMonthlyValue] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('Anchor');
  const [agreementTerm, setAgreementTerm] = useState<AgreementTerm>('1-year');
  const [pricingLine, setPricingLine] = useState<PricingLine>('Redline');
  const [quotaLevel, setQuotaLevel] = useState<QuotaLevel>('below');
  const [businessType, setBusinessType] = useState<BusinessType>('new');
  const [yearsAsCustomer, setYearsAsCustomer] = useState('0');
  const [isInsideSales, setIsInsideSales] = useState(false);
  const [customerName, setCustomerName] = useState('');

  // UI state
  const [activePicker, setActivePicker] = useState<PickerType>(null);

  // Result state
  const [result, setResult] = useState<CommissionCalculationResult | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = useCallback(async () => {
    if (!monthlyValue || parseFloat(monthlyValue) <= 0) {
      setError('Please enter a valid monthly value');
      return;
    }

    setCalculating(true);
    setError(null);

    const input: CommissionCalculationInput = {
      monthlyValue: parseFloat(monthlyValue),
      agreementTerm,
      accountType,
      pricingLine,
      quotaLevel,
      businessType,
      yearsAsCustomer:
        businessType === 'renewal' ? parseInt(yearsAsCustomer, 10) : undefined,
      isInsideSales,
      customerName: customerName || undefined,
    };

    const data = await commissionApi.calculate(input);
    if (data) {
      setResult(data);
    } else {
      setError('Failed to calculate commission');
    }
    setCalculating(false);
  }, [
    monthlyValue,
    agreementTerm,
    accountType,
    pricingLine,
    quotaLevel,
    businessType,
    yearsAsCustomer,
    isInsideSales,
    customerName,
  ]);

  const handleClear = useCallback(() => {
    setMonthlyValue('');
    setAccountType('Anchor');
    setAgreementTerm('1-year');
    setPricingLine('Redline');
    setQuotaLevel('below');
    setBusinessType('new');
    setYearsAsCustomer('0');
    setIsInsideSales(false);
    setCustomerName('');
    setResult(null);
    setError(null);
  }, []);

  const renderPickerOptions = (
    type: PickerType,
    options: {value: string; label: string}[],
    currentValue: string,
    onSelect: (value: string) => void,
  ) => {
    if (activePicker !== type) {return null;}
    return (
      <View style={styles.pickerDropdown}>
        {options.map(option => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.pickerOption,
              currentValue === option.value && styles.pickerOptionSelected,
            ]}
            onPress={() => {
              onSelect(option.value);
              setActivePicker(null);
            }}>
            <Text
              style={[
                styles.pickerOptionText,
                currentValue === option.value && styles.pickerOptionTextSelected,
              ]}>
              {option.label}
            </Text>
            {currentValue === option.value && (
              <Ionicons name="checkmark" size={18} color={Colors.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {paddingBottom: insets.bottom + 24},
      ]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Commission Calculator</Text>
        <Text style={styles.cardSubtitle}>
          Calculate sales commissions based on deal parameters
        </Text>

        {/* Monthly Value Input */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Monthly Contract Value ($)</Text>
          <View style={styles.inputRow}>
            <Ionicons name="cash-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              value={monthlyValue}
              onChangeText={setMonthlyValue}
              placeholder="Enter monthly value"
              placeholderTextColor={Colors.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Customer Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Customer Name (Optional)</Text>
          <View style={styles.inputRow}>
            <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.input}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Enter customer name"
              placeholderTextColor={Colors.textMuted}
            />
          </View>
        </View>

        {/* Account Type */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Account Type</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() =>
              setActivePicker(activePicker === 'accountType' ? null : 'accountType')
            }>
            <Text style={styles.pickerButtonText}>
              {ACCOUNT_TYPES.find(t => t.value === accountType)?.label}
            </Text>
            <Ionicons
              name={activePicker === 'accountType' ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
          {renderPickerOptions(
            'accountType',
            ACCOUNT_TYPES,
            accountType,
            v => setAccountType(v as AccountType),
          )}
        </View>

        {/* Agreement Term */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Agreement Term</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() =>
              setActivePicker(
                activePicker === 'agreementTerm' ? null : 'agreementTerm',
              )
            }>
            <Text style={styles.pickerButtonText}>
              {AGREEMENT_TERMS.find(t => t.value === agreementTerm)?.label}
            </Text>
            <Ionicons
              name={activePicker === 'agreementTerm' ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
          {renderPickerOptions(
            'agreementTerm',
            AGREEMENT_TERMS,
            agreementTerm,
            v => setAgreementTerm(v as AgreementTerm),
          )}
        </View>

        {/* Pricing Line */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Pricing Line</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                pricingLine === 'Redline' && styles.toggleBtnActive,
              ]}
              onPress={() => setPricingLine('Redline')}>
              <Text
                style={[
                  styles.toggleBtnText,
                  pricingLine === 'Redline' && styles.toggleBtnTextActive,
                ]}>
                Redline
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                pricingLine === 'Greenline' && styles.toggleBtnActiveGreen,
              ]}
              onPress={() => setPricingLine('Greenline')}>
              <Text
                style={[
                  styles.toggleBtnText,
                  pricingLine === 'Greenline' && styles.toggleBtnTextActive,
                ]}>
                Greenline (130%+)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Quota Level */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Quota Achievement</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() =>
              setActivePicker(activePicker === 'quotaLevel' ? null : 'quotaLevel')
            }>
            <Text style={styles.pickerButtonText}>
              {QUOTA_LEVELS.find(t => t.value === quotaLevel)?.label}
            </Text>
            <Ionicons
              name={activePicker === 'quotaLevel' ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
          {renderPickerOptions(
            'quotaLevel',
            QUOTA_LEVELS,
            quotaLevel,
            v => setQuotaLevel(v as QuotaLevel),
          )}
        </View>

        {/* Business Type */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Business Type</Text>
          <View style={styles.toggleRow}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                businessType === 'new' && styles.toggleBtnActive,
              ]}
              onPress={() => setBusinessType('new')}>
              <Text
                style={[
                  styles.toggleBtnText,
                  businessType === 'new' && styles.toggleBtnTextActive,
                ]}>
                New Business
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                businessType === 'renewal' && styles.toggleBtnActive,
              ]}
              onPress={() => setBusinessType('renewal')}>
              <Text
                style={[
                  styles.toggleBtnText,
                  businessType === 'renewal' && styles.toggleBtnTextActive,
                ]}>
                Renewal
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Years as Customer (for renewals) */}
        {businessType === 'renewal' && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Years as Customer (4% bonus at 2+ years)</Text>
            <View style={styles.inputRow}>
              <Ionicons
                name="calendar-outline"
                size={18}
                color={Colors.textMuted}
              />
              <TextInput
                style={styles.input}
                value={yearsAsCustomer}
                onChangeText={setYearsAsCustomer}
                placeholder="0"
                placeholderTextColor={Colors.textMuted}
                keyboardType="number-pad"
              />
            </View>
          </View>
        )}

        {/* Inside Sales Toggle */}
        <TouchableOpacity
          style={styles.checkboxRow}
          onPress={() => setIsInsideSales(!isInsideSales)}>
          <View
            style={[styles.checkbox, isInsideSales && styles.checkboxActive]}>
            {isInsideSales && (
              <Ionicons name="checkmark" size={14} color="#fff" />
            )}
          </View>
          <Text style={styles.checkboxLabel}>
            Inside Sales Involvement (-3%)
          </Text>
        </TouchableOpacity>

        {/* Calculate Button */}
        <TouchableOpacity
          style={[styles.calculateBtn, calculating && {opacity: 0.6}]}
          onPress={handleCalculate}
          disabled={calculating}>
          {calculating ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="calculator-outline" size={18} color="#fff" />
              <Text style={styles.calculateBtnText}>Calculate Commission</Text>
            </>
          )}
        </TouchableOpacity>

        {(result || monthlyValue) && (
          <TouchableOpacity
            style={[styles.clearBtn]}
            onPress={handleClear}>
            <Ionicons name="refresh-outline" size={18} color={Colors.textMuted} />
            <Text style={styles.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}

        {error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </View>

      {/* Result Card */}
      {result && <CommissionResultCard result={result} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  content: {padding: Spacing.lg, gap: Spacing.md},
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  cardTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: -Spacing.xs,
    marginBottom: Spacing.xs,
  },
  formGroup: {gap: Spacing.xs},
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    padding: 0,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  pickerButtonText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  pickerDropdown: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: Spacing.xs,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pickerOptionSelected: {
    backgroundColor: Colors.primaryLight,
  },
  pickerOptionText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  pickerOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  toggleRow: {flexDirection: 'row', gap: Spacing.sm},
  toggleBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  toggleBtnActiveGreen: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  toggleBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleBtnTextActive: {color: '#fff'},
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radius.sm,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  calculateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
  },
  calculateBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.background,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  errorText: {fontSize: FontSize.xs, color: '#ef4444', flex: 1},
});
