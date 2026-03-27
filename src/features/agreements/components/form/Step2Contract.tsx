import React, {useState} from 'react';
import {View, Text, TouchableOpacity, Modal, StyleSheet, TextInput} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  FormSection,
  NumberRow,
  DropdownRow,
  SelectRow,
  FormDivider,
  DollarRow,
} from './FormUI';
import {PaymentOption} from '../../hooks/useFormFilling';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

// ─── Constants ────────────────────────────────────────────────────────────────

const DURATION_OPTIONS = Array.from({length: 35}, (_, i) => {
  const m = i + 2;
  return {value: String(m), label: `${m} months`};
});

const FREQ_OPTIONS = [
  {value: '0',    label: 'One-time'},
  {value: '4',    label: 'Weekly (4×/mo)'},
  {value: '2',    label: 'Bi-weekly (2×/mo)'},
  {value: '1',    label: 'Monthly'},
  {value: '0.5',  label: 'Every 2 months'},
  {value: '0.33', label: 'Quarterly'},
  {value: '0.17', label: 'Bi-annually'},
  {value: '0.08', label: 'Annually'},
];

const PAYMENT_OPTIONS: {value: PaymentOption; label: string; icon: string}[] = [
  {value: 'online', label: 'Online',  icon: 'card-outline'},
  {value: 'cash',   label: 'Cash',    icon: 'cash-outline'},
  {value: 'others', label: 'Others',  icon: 'ellipsis-horizontal-circle-outline'},
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Step2ContractProps {
  contractMonths: number;
  onContractMonthsChange: (v: number) => void;
  startDate: string;
  onStartDateChange: (v: string) => void;
  tripCharge: number;
  onTripChargeChange: (v: number) => void;
  tripChargeFrequency: number;
  onTripChargeFrequencyChange: (v: number) => void;
  parkingCharge: number;
  onParkingChargeChange: (v: number) => void;
  parkingChargeFrequency: number;
  onParkingChargeFrequencyChange: (v: number) => void;
  paymentOption: PaymentOption;
  onPaymentOptionChange: (v: PaymentOption) => void;
  paymentNote: string;
  onPaymentNoteChange: (v: string) => void;
  allServicesOneTime?: boolean;
}

// ─── Date Picker (simple inline) ─────────────────────────────────────────────

function SimpleDatePicker({value, onChange}: {value: string; onChange: (v: string) => void}) {
  const [show, setShow] = useState(false);
  const [year, setYear] = useState(value ? new Date(value).getFullYear() : new Date().getFullYear());
  const [month, setMonth] = useState(value ? new Date(value).getMonth() : new Date().getMonth());

  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const commitDate = (y: number, m: number) => {
    const d = new Date(y, m, 1);
    onChange(d.toISOString().split('T')[0]);
    setShow(false);
  };

  const displayDate = value
    ? new Date(value).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})
    : 'Not set';

  return (
    <View style={dp.container}>
      <TouchableOpacity style={dp.trigger} onPress={() => setShow(true)}>
        <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
        <Text style={dp.triggerText}>{displayDate}</Text>
        <Ionicons name="chevron-down" size={14} color={Colors.textMuted} />
      </TouchableOpacity>
      <Modal visible={show} transparent animationType="fade" onRequestClose={() => setShow(false)}>
        <View style={dp.overlay}>
          <View style={dp.picker}>
            <View style={dp.pickerHeader}>
              <TouchableOpacity onPress={() => setYear(y => y - 1)}>
                <Ionicons name="chevron-back" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
              <Text style={dp.yearText}>{year}</Text>
              <TouchableOpacity onPress={() => setYear(y => y + 1)}>
                <Ionicons name="chevron-forward" size={20} color={Colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <View style={dp.monthGrid}>
              {MONTHS.map((m, i) => (
                <TouchableOpacity
                  key={m}
                  style={[dp.monthBtn, i === month && dp.monthBtnActive]}
                  onPress={() => {setMonth(i); commitDate(year, i);}}>
                  <Text style={[dp.monthText, i === month && dp.monthTextActive]}>{m}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={dp.closeBtn} onPress={() => setShow(false)}>
              <Text style={dp.closeBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Step2Contract({
  contractMonths,
  onContractMonthsChange,
  startDate,
  onStartDateChange,
  tripCharge,
  onTripChargeChange,
  tripChargeFrequency,
  onTripChargeFrequencyChange,
  parkingCharge,
  onParkingChargeChange,
  parkingChargeFrequency,
  onParkingChargeFrequencyChange,
  paymentOption,
  onPaymentOptionChange,
  paymentNote,
  onPaymentNoteChange,
  allServicesOneTime = false,
}: Step2ContractProps) {
  return (
    <View>
      {/* Duration — hidden when all services are one-time */}
      {!allServicesOneTime && (
      <FormSection icon="calendar-outline" title="Contract Duration">
        <DropdownRow
          label="Duration"
          value={String(contractMonths)}
          options={DURATION_OPTIONS}
          onChange={v => onContractMonthsChange(parseInt(v, 10))}
        />
        <View style={styles.startDateRow}>
          <Text style={styles.label}>Start Date</Text>
          <SimpleDatePicker value={startDate} onChange={onStartDateChange} />
        </View>
      </FormSection>
      )}
      {!allServicesOneTime && <FormDivider />}

      {/* Charges */}
      <FormSection icon="car-outline" title="Trip & Parking Charges">
        <NumberRow
          label="Trip Charge"
          value={tripCharge}
          onChange={onTripChargeChange}
          prefix="$"
          suffix="per visit"
          decimals={2}
        />
        <DropdownRow
          label="Trip Charge Frequency"
          value={String(tripChargeFrequency)}
          options={FREQ_OPTIONS}
          onChange={v => onTripChargeFrequencyChange(parseFloat(v))}
        />

        <FormDivider />

        <NumberRow
          label="Parking Charge"
          value={parkingCharge}
          onChange={onParkingChargeChange}
          prefix="$"
          suffix="per visit"
          decimals={2}
        />
        <DropdownRow
          label="Parking Charge Frequency"
          value={String(parkingChargeFrequency)}
          options={FREQ_OPTIONS}
          onChange={v => onParkingChargeFrequencyChange(parseFloat(v))}
        />
      </FormSection>

      <FormDivider />

      {/* Payment */}
      <FormSection icon="card-outline" title="Payment Method">
        <View style={styles.paymentRow}>
          {PAYMENT_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[styles.paymentOption, paymentOption === opt.value && styles.paymentOptionActive]}
              onPress={() => onPaymentOptionChange(opt.value)}>
              <Ionicons
                name={opt.icon}
                size={20}
                color={paymentOption === opt.value ? '#fff' : Colors.textSecondary}
              />
              <Text style={[styles.paymentOptionText, paymentOption === opt.value && styles.paymentOptionTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.paymentNoteInput}
          value={paymentNote}
          onChangeText={onPaymentNoteChange}
          placeholder="Add a note..."
          placeholderTextColor={Colors.textMuted}
          multiline
        />
      </FormSection>

      <FormDivider />

      {/* Pricing Summary */}
      <FormSection icon="calculator-outline" title="Pricing Summary">
        <DollarRow label="Trip Charge / visit" value={tripCharge} />
        <DollarRow label="Parking / visit" value={parkingCharge} />
        {!allServicesOneTime && <DollarRow label="Contract Duration" value={contractMonths} />}
      </FormSection>
    </View>
  );
}

// ─── Date Picker styles ───────────────────────────────────────────────────────

const dp = StyleSheet.create({
  container: {marginHorizontal: Spacing.lg, marginVertical: Spacing.sm},
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  triggerText: {flex: 1, fontSize: FontSize.md, color: Colors.textPrimary},
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center', padding: Spacing.xl},
  picker: {backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, width: '100%'},
  pickerHeader: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg},
  yearText: {fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary},
  monthGrid: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, justifyContent: 'center'},
  monthBtn: {width: '22%', paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center', backgroundColor: '#f8fafc'},
  monthBtnActive: {backgroundColor: Colors.primary},
  monthText: {fontSize: FontSize.sm, color: Colors.textSecondary, fontWeight: '500'},
  monthTextActive: {color: '#fff', fontWeight: '700'},
  closeBtn: {marginTop: Spacing.lg, paddingVertical: Spacing.md, alignItems: 'center'},
  closeBtnText: {fontSize: FontSize.md, color: Colors.textMuted},
});

// ─── Main styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  startDateRow: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  paymentRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  paymentOption: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  paymentOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentOptionText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  paymentOptionTextActive: {
    color: '#fff',
  },
  paymentNoteInput: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    minHeight: 72,
    textAlignVertical: 'top',
  },
});
