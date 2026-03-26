/**
 * Shared UI primitives used across all form steps and service forms.
 */
import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardTypeOptions,
  Switch,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

// ─── Section Header ───────────────────────────────────────────────────────────

export function FormSection({icon, title, children}: {icon: string; title: string; children?: React.ReactNode}) {
  return (
    <View style={ss.section}>
      <View style={ss.sectionHeader}>
        <View style={ss.sectionIconBox}>
          <Ionicons name={icon} size={15} color={Colors.primary} />
        </View>
        <Text style={ss.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Text Field Row ───────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  multiline?: boolean;
  required?: boolean;
}

export function FieldRow({label, value, onChangeText, placeholder, keyboardType, multiline, required}: FieldRowProps) {
  return (
    <View style={ss.fieldRow}>
      <Text style={ss.fieldLabel}>
        {label}
        {required && <Text style={ss.required}> *</Text>}
      </Text>
      <TextInput
        style={[ss.input, multiline && ss.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="words"
        autoCorrect={false}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

// ─── Number Field Row ─────────────────────────────────────────────────────────

interface NumberRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  step?: number;
  decimals?: number;
}

export function NumberRow({label, value, onChange, placeholder, prefix, suffix, min = 0, decimals = 0}: NumberRowProps) {
  return (
    <View style={ss.fieldRow}>
      <Text style={ss.fieldLabel}>{label}</Text>
      <View style={ss.numberInputRow}>
        {prefix ? <Text style={ss.prefixText}>{prefix}</Text> : null}
        <TextInput
          style={ss.numberInput}
          value={value === 0 ? '' : String(value)}
          onChangeText={t => {
            const n = parseFloat(t);
            if (!isNaN(n) && n >= min) {onChange(decimals > 0 ? n : Math.floor(n));}
            else if (t === '' || t === '-') {onChange(0);}
          }}
          placeholder={placeholder ?? '0'}
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
        />
        {suffix ? <Text style={ss.suffixText}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

// ─── Select Row (picker-style using buttons) ──────────────────────────────────

interface SelectRowProps {
  label: string;
  value: string;
  options: {value: string; label: string}[];
  onChange: (v: string) => void;
}

export function SelectRow({label, value, options, onChange}: SelectRowProps) {
  const current = options.find(o => o.value === value);
  return (
    <View style={ss.fieldRow}>
      <Text style={ss.fieldLabel}>{label}</Text>
      <View style={ss.selectChips}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[ss.selectChip, opt.value === value && ss.selectChipActive]}
            onPress={() => onChange(opt.value)}>
            <Text style={[ss.selectChipText, opt.value === value && ss.selectChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─── Select Dropdown Row (compact, for many options) ─────────────────────────

interface DropdownRowProps {
  label: string;
  value: string;
  options: {value: string; label: string}[];
  onChange: (v: string) => void;
}

export function DropdownRow({label, value, options, onChange}: DropdownRowProps) {
  const [open, setOpen] = React.useState(false);
  const current = options.find(o => o.value === value);
  return (
    <View style={ss.fieldRow}>
      <Text style={ss.fieldLabel}>{label}</Text>
      <View>
        <TouchableOpacity style={ss.dropdown} onPress={() => setOpen(p => !p)}>
          <Text style={ss.dropdownText}>{current?.label ?? value}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textSecondary} />
        </TouchableOpacity>
        {open && (
          <View style={ss.dropdownMenu}>
            {options.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[ss.dropdownOption, opt.value === value && ss.dropdownOptionActive]}
                onPress={() => {onChange(opt.value); setOpen(false);}}>
                <Text style={[ss.dropdownOptionText, opt.value === value && ss.dropdownOptionTextActive]}>
                  {opt.label}
                </Text>
                {opt.value === value && <Ionicons name="checkmark" size={14} color={Colors.primary} />}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Toggle Row ───────────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  subtitle?: string;
}

export function ToggleRow({label, value, onChange, subtitle}: ToggleRowProps) {
  return (
    <View style={ss.toggleRow}>
      <View style={ss.toggleInfo}>
        <Text style={ss.fieldLabel}>{label}</Text>
        {subtitle ? <Text style={ss.toggleSub}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{false: Colors.border, true: Colors.primaryLight}}
        thumbColor={value ? Colors.primary : Colors.textMuted}
      />
    </View>
  );
}

// ─── Calc Row (qty @ rate = total) ───────────────────────────────────────────

interface CalcRowProps {
  label: string;
  qty: number;
  onQtyChange: (v: number) => void;
  rate: number;
  onRateChange?: (v: number) => void;
  total: number;
  rateReadOnly?: boolean;
}

export function CalcRow({label, qty, onQtyChange, rate, onRateChange, total, rateReadOnly}: CalcRowProps) {
  return (
    <View style={ss.calcRow}>
      <Text style={ss.calcLabel}>{label}</Text>
      <View style={ss.calcFields}>
        <TextInput
          style={ss.calcInput}
          value={qty === 0 ? '' : String(qty)}
          onChangeText={t => {const n = parseInt(t, 10); onQtyChange(isNaN(n) ? 0 : Math.max(0, n));}}
          placeholder="Qty"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
        />
        <Text style={ss.calcAt}>@</Text>
        <Text style={ss.calcAt}>$</Text>
        <TextInput
          style={[ss.calcInput, rateReadOnly && ss.calcInputReadOnly]}
          value={rate === 0 ? '' : rate.toFixed(2)}
          onChangeText={t => {if (onRateChange) {const n = parseFloat(t); onRateChange(isNaN(n) ? 0 : n);}}}
          placeholder="0.00"
          placeholderTextColor={Colors.textMuted}
          keyboardType="numeric"
          editable={!rateReadOnly}
        />
        <Text style={ss.calcAt}>=</Text>
        <View style={ss.calcTotal}>
          <Text style={ss.calcTotalText}>${total.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Dollar Row (display total) ───────────────────────────────────────────────

export function DollarRow({label, value, highlight}: {label: string; value: number; highlight?: boolean}) {
  return (
    <View style={[ss.dollarRow, highlight && ss.dollarRowHighlight]}>
      <Text style={[ss.dollarLabel, highlight && ss.dollarLabelHighlight]}>{label}</Text>
      <Text style={[ss.dollarValue, highlight && ss.dollarValueHighlight]}>${value.toFixed(2)}</Text>
    </View>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────

export function FormDivider() {
  return <View style={ss.divider} />;
}

// ─── Step Indicator ───────────────────────────────────────────────────────────

export function StepIndicator({current, total}: {current: number; total: number}) {
  return (
    <View style={ss.stepRow}>
      {Array.from({length: total}, (_, i) => (
        <React.Fragment key={i}>
          <View style={[ss.stepDot, i + 1 === current && ss.stepDotActive, i + 1 < current && ss.stepDotDone]}>
            {i + 1 < current
              ? <Ionicons name="checkmark" size={10} color="#fff" />
              : <Text style={[ss.stepDotText, (i + 1 === current || i + 1 < current) && ss.stepDotTextActive]}>{i + 1}</Text>}
          </View>
          {i < total - 1 && <View style={[ss.stepLine, i + 1 < current && ss.stepLineDone]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ss = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    marginBottom: Spacing.xs,
  },
  sectionIconBox: {
    width: 24,
    height: 24,
    borderRadius: Radius.sm,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  required: {
    color: Colors.primary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  inputMultiline: {
    height: 80,
    textAlignVertical: 'top',
  },
  numberInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  numberInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  prefixText: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    fontWeight: '600',
    minWidth: 16,
  },
  suffixText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  selectChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  selectChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  selectChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  selectChipText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  selectChipTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  dropdownText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    flex: 1,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 44,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    maxHeight: 280,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  dropdownOptionActive: {
    backgroundColor: Colors.primaryLight,
  },
  dropdownOptionText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  dropdownOptionTextActive: {
    color: Colors.primary,
    fontWeight: '700',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  toggleInfo: {
    flex: 1,
    gap: 2,
  },
  toggleSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  calcRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  calcLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  calcFields: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  calcInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  calcInputReadOnly: {
    backgroundColor: '#f8fafc',
    borderColor: Colors.borderLight,
    color: Colors.textMuted,
  },
  calcAt: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  calcTotal: {
    flex: 1,
    backgroundColor: '#f0fdf4',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  calcTotalText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#065f46',
  },
  dollarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  dollarRowHighlight: {
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  dollarLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dollarLabelHighlight: {
    color: Colors.primary,
    fontWeight: '700',
  },
  dollarValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  dollarValueHighlight: {
    color: Colors.primary,
    fontSize: FontSize.md,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  stepDotDone: {
    borderColor: Colors.green,
    backgroundColor: Colors.green,
  },
  stepDotText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  stepDotTextActive: {
    color: '#fff',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: Colors.border,
    maxWidth: 40,
  },
  stepLineDone: {
    backgroundColor: Colors.green,
  },
});
