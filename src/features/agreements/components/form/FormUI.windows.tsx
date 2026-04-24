/**
 * FormUI.windows.tsx
 * Desktop-size UI primitives — exact web app values:
 *  • contract-input:   padding 12px 16px, 16px font, border 2px #e5e7eb, radius 8px
 *  • contract-label:  13px, 600, #4b5563
 *  • card-title:      16px, 700, uppercase, border-bottom 2px #f3f4f6
 *  • breakdown-row:   bg #f9fafb, radius 8px, padding 12px 16px
 *  • total-section:   green gradient, border 3px #86efac, 42px amount
 *  • dropdown-menu:   border 2px #ff4500, shadow
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
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// ── Web app exact palette ────────────────────────────────
const C = {
  primary:       '#c00000',
  orange:        '#ff4500',
  surface:       '#ffffff',
  bg:            '#f9fafb',
  bgCard:        '#f8fafc',
  border:        '#e5e7eb',
  borderLight:   '#f3f4f6',
  text:          '#1f2937',
  textCard:      '#374151',
  label:         '#4b5563',
  textMuted:     '#6b7280',
  textMutedLight:'#9ca3af',
  inputText:     '#2c3e50',
  green:         '#10b981',
  greenDark:     '#059669',
  greenDarkest:  '#065f46',
  greenBg:       '#f0fdf4',
  greenBg2:      '#dcfce7',
  greenBorder:   '#86efac',
  yellow:        '#fbbf24',
  yellowBg:      '#fef3c7',
  yellowBg2:     '#fde68a',
  chipActive:    '#c00000',
  dropdownBorder:'#ff4500',
  dropdownHover: '#fff5f0',
  inputFocus:    '#ff4500',
};

// ── FormSection ──────────────────────────────────────────
// Matches web app .contract-card + .card-title
export function FormSection({icon, title, children}: {icon: string; title: string; children?: React.ReactNode}) {
  return (
    <View style={ss.card}>
      <View style={ss.cardHeader}>
        <View style={ss.cardIconBox}>
          <Ionicons name={icon} size={16} color={C.orange} />
        </View>
        <Text style={ss.cardTitle}>{title}</Text>
      </View>
      <View style={ss.cardBody}>
        {children}
      </View>
    </View>
  );
}

// ── FieldRow ─────────────────────────────────────────────
// Matches web app .contract-field-group + .contract-label + .contract-input
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
    <View style={ss.fieldGroup}>
      <Text style={ss.fieldLabel}>
        {label}
        {required && <Text style={ss.required}> *</Text>}
      </Text>
      <TextInput
        style={[ss.input, multiline && ss.inputMultiline]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? label}
        placeholderTextColor={C.textMutedLight}
        keyboardType={keyboardType ?? 'default'}
        autoCapitalize="words"
        autoCorrect={false}
        multiline={multiline}
        numberOfLines={multiline ? 4 : 1}
      />
    </View>
  );
}

// ── NumberRow ────────────────────────────────────────────
interface NumberRowProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  prefix?: string;
  suffix?: string;
  min?: number;
  decimals?: number;
}

export function NumberRow({label, value, onChange, placeholder, prefix, suffix, min = 0, decimals = 0}: NumberRowProps) {
  return (
    <View style={ss.fieldGroup}>
      <Text style={ss.fieldLabel}>{label}</Text>
      <View style={ss.numberRow}>
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
          placeholderTextColor={C.textMutedLight}
          keyboardType="numeric"
        />
        {suffix ? <Text style={ss.suffixText}>{suffix}</Text> : null}
      </View>
    </View>
  );
}

// ── SelectRow ────────────────────────────────────────────
interface SelectRowProps {
  label: string;
  value: string;
  options: {value: string; label: string}[];
  onChange: (v: string) => void;
}

export function SelectRow({label, value, options, onChange}: SelectRowProps) {
  return (
    <View style={ss.fieldGroup}>
      <Text style={ss.fieldLabel}>{label}</Text>
      <View style={ss.chips}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[ss.chip, opt.value === value && ss.chipActive]}
            onPress={() => onChange(opt.value)}>
            <Text style={[ss.chipText, opt.value === value && ss.chipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── DropdownRow ──────────────────────────────────────────
// Matches web app .frequency-dropdown-trigger / .frequency-dropdown-menu
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
    <View style={ss.fieldGroup}>
      <Text style={ss.fieldLabel}>{label}</Text>
      <View style={ss.dropdownWrap}>
        {/* Trigger */}
        <TouchableOpacity
          style={[ss.dropdownTrigger, open && ss.dropdownTriggerOpen]}
          onPress={() => setOpen(p => !p)}
          activeOpacity={0.8}>
          <Text style={ss.dropdownValue}>{current?.label ?? value}</Text>
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={open ? C.orange : C.textMuted}
          />
        </TouchableOpacity>
        {/* Menu */}
        {open && (
          <View style={ss.dropdownMenu}>
            <ScrollView style={ss.dropdownScroll} showsVerticalScrollIndicator={true} nestedScrollEnabled>
              {options.map(opt => (
                <TouchableOpacity
                  key={opt.value}
                  style={[ss.dropdownOption, opt.value === value && ss.dropdownOptionSelected]}
                  onPress={() => {onChange(opt.value); setOpen(false);}}>
                  <Text style={[ss.dropdownOptionText, opt.value === value && ss.dropdownOptionTextSelected]}>
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

// ── ToggleRow ────────────────────────────────────────────
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
        trackColor={{false: C.border, true: '#fecaca'}}
        thumbColor={value ? C.primary : C.textMutedLight}
      />
    </View>
  );
}

// ── CalcRow ──────────────────────────────────────────────
// Larger, desktop-friendly calc row (qty @ $rate = total)
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
    <View style={ss.fieldGroup}>
      <Text style={ss.fieldLabel}>{label}</Text>
      <View style={ss.calcFields}>
        {/* Qty */}
        <View style={ss.calcCell}>
          <Text style={ss.calcMeta}>QTY</Text>
          <TextInput
            style={ss.calcInput}
            value={qty === 0 ? '' : String(qty)}
            onChangeText={t => {const n = parseInt(t, 10); onQtyChange(isNaN(n) ? 0 : Math.max(0, n));}}
            placeholder="0"
            placeholderTextColor={C.textMutedLight}
            keyboardType="numeric"
          />
        </View>
        <Text style={ss.calcOp}>×</Text>
        {/* Rate */}
        <View style={ss.calcCell}>
          <Text style={ss.calcMeta}>RATE ($)</Text>
          <TextInput
            style={[ss.calcInput, rateReadOnly && ss.calcInputReadOnly]}
            value={rate === 0 ? '' : rate.toFixed(2)}
            onChangeText={t => {if (onRateChange) {const n = parseFloat(t); onRateChange(isNaN(n) ? 0 : n);}}}
            placeholder="0.00"
            placeholderTextColor={C.textMutedLight}
            keyboardType="numeric"
            editable={!rateReadOnly}
          />
        </View>
        <Text style={ss.calcOp}>=</Text>
        {/* Total */}
        <View style={[ss.calcCell, ss.calcTotalCell]}>
          <Text style={ss.calcMeta}>TOTAL</Text>
          <Text style={ss.calcTotal} numberOfLines={1}>{formatDollar(total)}</Text>
        </View>
      </View>
    </View>
  );
}

// ── DollarRow ────────────────────────────────────────────
// Matches web app .breakdown-row
export function DollarRow({label, value, highlight}: {label: string; value: number; highlight?: boolean}) {
  return (
    <View style={[ss.breakdownRow, highlight && ss.breakdownRowHighlight]}>
      <Text style={[ss.breakdownLabel, highlight && ss.breakdownLabelHighlight]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[ss.breakdownValue, highlight && ss.breakdownValueHighlight]} numberOfLines={1}>
        {formatDollar(value)}
      </Text>
    </View>
  );
}

// ── FormDivider ──────────────────────────────────────────
export function FormDivider() {
  return <View style={ss.divider} />;
}

// ── StepIndicator ────────────────────────────────────────
export function StepIndicator({current, total}: {current: number; total: number}) {
  return (
    <View style={ss.stepRow}>
      {Array.from({length: total}, (_, i) => (
        <React.Fragment key={i}>
          <View style={[ss.stepDot, i + 1 === current && ss.stepDotActive, i + 1 < current && ss.stepDotDone]}>
            {i + 1 < current
              ? <Ionicons name="checkmark" size={11} color="#fff" />
              : <Text style={[ss.stepDotText, (i + 1 <= current) && ss.stepDotTextActive]}>{i + 1}</Text>
            }
          </View>
          {i < total - 1 && <View style={[ss.stepLine, i + 1 < current && ss.stepLineDone]} />}
        </React.Fragment>
      ))}
    </View>
  );
}

// ── Helpers ──────────────────────────────────────────────
function formatDollar(v: number): string {
  return '$' + v.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// ── Styles — web app values in React Native ──────────────
const ss = StyleSheet.create({

  // ── Card (contract-card) ──
  card: {
    backgroundColor: C.surface,
    borderWidth:     2,
    borderColor:     C.border,
    borderRadius:    12,
    marginHorizontal: 0,
    marginBottom:    24,
    shadowColor:     '#000',
    shadowOffset:    {width: 0, height: 2},
    shadowOpacity:   0.06,
    shadowRadius:    8,
    elevation:       2,
    overflow:        'hidden',
  },
  // Card header (card-title style)
  cardHeader: {
    flexDirection:   'row',
    alignItems:      'center',
    gap: 10,
    paddingHorizontal: 24,
    paddingTop:      20,
    paddingBottom:   12,
    borderBottomWidth: 2,
    borderBottomColor: C.borderLight,
  },
  cardIconBox: {
    width:           28,
    height:          28,
    borderRadius:    6,
    backgroundColor: '#fff5f0',
    alignItems:      'center',
    justifyContent:  'center',
  },
  cardTitle: {
    fontSize:        16,
    fontWeight:      '700',
    color:           C.textCard,
    textTransform:   'uppercase',
    letterSpacing:   0.5,
    fontFamily:      'Arial',
  },
  cardBody: {
    paddingHorizontal: 24,
    paddingTop:        16,
    paddingBottom:     20,
  },

  // ── Field group (contract-field-group) ──
  fieldGroup: {
    flexDirection:   'column',
    gap: 8,
    marginBottom:    20,
  },

  // ── Label (contract-label) ──
  fieldLabel: {
    fontSize:   13,
    fontWeight: '600',
    color:      C.label,
    fontFamily: 'Arial',
  },
  required: {
    color: C.primary,
  },

  // ── Text input (contract-input) ──
  input: {
    backgroundColor: C.surface,
    borderWidth:     2,
    borderColor:     C.border,
    borderRadius:    8,
    paddingHorizontal: 16,
    paddingVertical:   12,
    fontSize:          16,
    fontWeight:        '500',
    color:             C.inputText,
    fontFamily:        'Arial',
  },
  inputMultiline: {
    height:            100,
    textAlignVertical: 'top',
  },

  // ── Number input ──
  numberRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap: 8,
  },
  numberInput: {
    flex:            1,
    backgroundColor: C.surface,
    borderWidth:     2,
    borderColor:     C.border,
    borderRadius:    8,
    paddingHorizontal: 16,
    paddingVertical:   12,
    fontSize:          16,
    fontWeight:        '500',
    color:             C.inputText,
    fontFamily:        'Arial',
  },
  prefixText: {
    fontSize:   16,
    fontWeight: '600',
    color:      C.textMuted,
    minWidth:   18,
    fontFamily: 'Arial',
  },
  suffixText: {
    fontSize:   14,
    color:      C.textMuted,
    fontFamily: 'Arial',
  },

  // ── Chips (SelectRow) ──
  chips: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical:    8,
    borderRadius:       20,
    borderWidth:        1,
    borderColor:        C.border,
    backgroundColor:    C.surface,
  },
  chipActive: {
    backgroundColor: C.chipActive,
    borderColor:     C.chipActive,
  },
  chipText: {
    fontSize:   14,
    fontWeight: '500',
    color:      C.textMuted,
    fontFamily: 'Arial',
  },
  chipTextActive: {
    color:      '#fff',
    fontWeight: '700',
  },

  // ── Dropdown ──
  dropdownWrap: {
    position: 'relative',
    zIndex:   200,
  },
  dropdownTrigger: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    backgroundColor: C.bg,
    borderWidth:     2,
    borderColor:     C.border,
    borderRadius:    8,
    paddingHorizontal: 16,
    paddingVertical:   12,
    gap: 8,
  },
  dropdownTriggerOpen: {
    borderColor:     C.dropdownBorder,
    backgroundColor: C.surface,
  },
  dropdownValue: {
    fontSize:   16,
    fontWeight: '500',
    color:      C.inputText,
    flex:       1,
    fontFamily: 'Arial',
  },
  dropdownMenu: {
    position:        'absolute',
    top:             52,
    left:            0,
    right:           0,
    backgroundColor: C.surface,
    borderWidth:     2,
    borderColor:     C.dropdownBorder,
    borderRadius:    8,
    zIndex:          300,
    shadowColor:     '#000',
    shadowOffset:    {width: 0, height: 8},
    shadowOpacity:   0.15,
    shadowRadius:    24,
    elevation:       10,
    maxHeight:       300,
  },
  dropdownScroll: {
    maxHeight: 298,
  },
  dropdownOption: {
    flexDirection:   'row',
    alignItems:      'center',
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor:   C.surface,
  },
  dropdownOptionSelected: {
    backgroundColor: C.orange,
  },
  dropdownOptionText: {
    flex:       1,
    fontSize:   14,
    fontWeight: '500',
    color:      C.textCard,
    fontFamily: 'Arial',
  },
  dropdownOptionTextSelected: {
    color:      '#ffffff',
    fontWeight: '700',
  },

  // ── Toggle ──
  toggleRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingVertical:  8,
    marginBottom:     20,
  },
  toggleInfo: {
    flex: 1,
    gap:  4,
    paddingRight: 16,
  },
  toggleSub: {
    fontSize:   12,
    color:      C.textMutedLight,
    fontFamily: 'Arial',
  },

  // ── Calc row ──
  calcFields: {
    flexDirection: 'row',
    alignItems:    'flex-end',
    gap: 12,
  },
  calcCell: {
    flex: 1,
    gap:  4,
  },
  calcTotalCell: {
    flex: 1,
  },
  calcMeta: {
    fontSize:        11,
    fontWeight:      '700',
    color:           C.textMutedLight,
    textTransform:   'uppercase',
    letterSpacing:   0.5,
    fontFamily:      'Arial',
  },
  calcInput: {
    backgroundColor: C.surface,
    borderWidth:     2,
    borderColor:     C.border,
    borderRadius:    8,
    paddingHorizontal: 12,
    paddingVertical:   10,
    fontSize:          15,
    color:             C.inputText,
    textAlign:         'center',
    fontFamily:        'Arial',
  },
  calcInputReadOnly: {
    backgroundColor: C.bg,
    borderColor:     '#f3f4f6',
    color:           C.textMuted,
  },
  calcOp: {
    fontSize:        18,
    color:           C.textMuted,
    fontWeight:      '600',
    marginBottom:    10,
    fontFamily:      'Arial',
  },
  calcTotal: {
    paddingHorizontal: 12,
    paddingVertical:   10,
    backgroundColor:   '#f0fdf4',
    borderRadius:       8,
    fontSize:           15,
    fontWeight:         '700',
    color:              '#065f46',
    textAlign:          'center',
    fontFamily:         'Arial',
  },

  // ── Breakdown row (DollarRow) — matches web .breakdown-row ──
  breakdownRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: 16,
    paddingVertical:   12,
    backgroundColor:   C.bg,
    borderRadius:       8,
    marginBottom:       8,
  },
  breakdownRowHighlight: {
    backgroundColor: C.yellowBg,
    borderWidth:     2,
    borderColor:     C.yellow,
  },
  breakdownLabel: {
    fontSize:   14,
    fontWeight: '500',
    color:      C.textMuted,
    flex:       1,
    marginRight: 8,
    fontFamily: 'Arial',
  },
  breakdownLabelHighlight: {
    color:      '#92400e',
    fontWeight: '700',
  },
  breakdownValue: {
    fontSize:   16,
    fontWeight: '700',
    color:      C.text,
    flexShrink: 1,
    fontFamily: 'Arial',
  },
  breakdownValueHighlight: {
    color: '#92400e',
  },

  // ── Divider ──
  divider: {
    height:          2,
    backgroundColor: '#e5e7eb',
    marginVertical:   12,
  },

  // ── Step indicator ──
  stepRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    paddingVertical:  16,
  },
  stepDot: {
    width:           32,
    height:          32,
    borderRadius:    16,
    backgroundColor: C.surface,
    borderWidth:     2,
    borderColor:     C.border,
    alignItems:      'center',
    justifyContent:  'center',
  },
  stepDotActive: {
    borderColor:     C.primary,
    backgroundColor: C.primary,
  },
  stepDotDone: {
    borderColor:     C.green,
    backgroundColor: C.green,
  },
  stepDotText: {
    fontSize:   12,
    fontWeight: '700',
    color:      C.textMutedLight,
    fontFamily: 'Arial',
  },
  stepDotTextActive: {
    color: '#fff',
  },
  stepLine: {
    flex:            1,
    height:          2,
    backgroundColor: C.border,
    maxWidth:        48,
  },
  stepLineDone: {
    backgroundColor: C.green,
  },
});
