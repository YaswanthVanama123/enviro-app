/**
 * ServiceBase.windows.tsx
 * Desktop-size service card & totals block — matches web app:
 *  • ServiceCard: 16px title, border 2px #e5e7eb, radius 12px, padding 24px
 *  • TotalsBlock: breakdown-row bg #f9fafb, highlight yellow gradient
 *                 total-section: green gradient bg, 42px amount, border 3px #86efac
 */
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {FREQ_OPTIONS, FREQ_LABELS} from '../../../../../services/api/endpoints/form.api';
import {DropdownRow, DollarRow, FormDivider, NumberRow, ToggleRow, CalcRow} from '../FormUI';

export {DropdownRow, DollarRow, FormDivider, NumberRow, ToggleRow, CalcRow, FREQ_OPTIONS, FREQ_LABELS};

// ── Web app palette ──────────────────────────────────────
const C = {
  surface:      '#ffffff',
  bg:           '#f9fafb',
  border:       '#e5e7eb',
  borderLight:  '#f3f4f6',
  text:         '#1f2937',
  textCard:     '#374151',
  textMuted:    '#6b7280',
  textMutedLg:  '#9ca3af',
  orange:       '#ff4500',
  primary:      '#c00000',
  green:        '#10b981',
  greenDark:    '#059669',
  greenDarkest: '#065f46',
  greenBg:      '#f0fdf4',
  greenBg2:     '#dcfce7',
  greenBorder:  '#86efac',
  yellow:       '#fbbf24',
  yellowBg:     '#fef3c7',
  yellowBg2:    '#fde68a',
};

// ── ServiceCard ──────────────────────────────────────────
interface ServiceCardProps {
  serviceId:     string;
  displayName:   string;
  icon:          string;
  iconColor:     string;
  iconBg:        string;
  onRemove:      () => void;
  loading?:      boolean;
  notes?:        string;
  onNotesChange?:(v: string) => void;
  children:      React.ReactNode;
}

export function ServiceCard({
  displayName, icon, iconColor, iconBg,
  onRemove, loading, notes, onNotesChange, children,
}: ServiceCardProps) {
  return (
    <View style={sc.card}>
      {/* Header — card-title style */}
      <View style={sc.header}>
        <View style={[sc.iconBox, {backgroundColor: iconBg}]}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <Text style={sc.title}>{displayName}</Text>
        <TouchableOpacity style={sc.removeBtn} onPress={onRemove} hitSlop={{top:8,bottom:8,left:8,right:8}}>
          <Ionicons name="close-circle" size={20} color={C.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Loading */}
      {loading && (
        <View style={sc.loading}>
          <ActivityIndicator size="small" color={C.orange} />
          <Text style={sc.loadingText}>Loading pricing...</Text>
        </View>
      )}

      {/* Body — each inner component has its own padding via FormUI.windows.tsx */}
      {!loading && <View style={sc.body}>{children}</View>}

      {/* Notes */}
      {!loading && onNotesChange !== undefined && (
        <View style={sc.notesWrap}>
          <Text style={sc.notesLabel}>Service Notes</Text>
          <TextInput
            style={sc.notesInput}
            value={notes ?? ''}
            onChangeText={onNotesChange}
            placeholder="Add notes (will require approval)..."
            placeholderTextColor={C.textMutedLg}
            multiline
          />
        </View>
      )}
    </View>
  );
}

// ── TotalsBlock ──────────────────────────────────────────
// Matches web app .contract-total-section + .breakdown-row
interface TotalsBlockProps {
  frequency:        string;
  perVisit:         number;
  firstMonth?:      number;
  monthlyRecurring?:number;
  contractMonths:   number;
  contractTotal:    number;
}

export function TotalsBlock({
  frequency, perVisit, firstMonth, monthlyRecurring,
  contractMonths, contractTotal,
}: TotalsBlockProps) {
  const isOneTime       = frequency === 'oneTime';
  const isEveryFourWeeks= frequency === 'everyFourWeeks';
  const isVisitBased    = ['bimonthly', 'quarterly', 'biannual', 'annual'].includes(frequency);

  return (
    <View style={tb.wrap}>
      {/* Section label */}
      <View style={tb.sectionHeader}>
        <Text style={tb.sectionTitle}>Pricing Summary</Text>
      </View>

      <View style={tb.rows}>
        {isOneTime ? (
          <BreakdownRow label="Total Price" value={contractTotal} highlight />
        ) : isEveryFourWeeks ? (
          <>
            <BreakdownRow label="First Visit Total"     value={perVisit} />
            <BreakdownRow label="Recurring Visit Total" value={perVisit} />
            <View style={tb.divider} />
            <BreakdownRow label={`Contract Total (${contractMonths} mo)`} value={contractTotal} highlight />
          </>
        ) : (
          <>
            <BreakdownRow label={isVisitBased ? 'Recurring Visit Total' : 'Per Visit Total'} value={perVisit} />
            {!isVisitBased && firstMonth !== undefined && (
              <BreakdownRow label="First Month Total"   value={firstMonth} />
            )}
            {!isVisitBased && monthlyRecurring !== undefined && (
              <BreakdownRow label="Monthly Recurring"   value={monthlyRecurring} />
            )}
            <View style={tb.divider} />
            <BreakdownRow label={`Contract Total (${contractMonths} mo)`} value={contractTotal} highlight />
          </>
        )}
      </View>

      {/* Big green total — matches .contract-total-section */}
      <View style={tb.totalSection}>
        <Text style={tb.totalLabel}>CONTRACT TOTAL</Text>
        <Text style={tb.totalAmount}>{formatDollar(contractTotal)}</Text>
        <Text style={tb.totalSub}>{contractMonths}-month agreement</Text>
      </View>
    </View>
  );
}

// ── BreakdownRow (internal to TotalsBlock) ───────────────
function BreakdownRow({label, value, highlight}: {label: string; value: number; highlight?: boolean}) {
  return (
    <View style={[tb.row, highlight && tb.rowHighlight]}>
      <Text style={[tb.rowLabel, highlight && tb.rowLabelHL]}>{label}</Text>
      <Text style={[tb.rowValue, highlight && tb.rowValueHL]}>{formatDollar(value)}</Text>
    </View>
  );
}

function formatDollar(v: number): string {
  return '$' + v.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

// ── calcTotals & getFreqMultiplier (unchanged logic) ─────
export function calcTotals(perVisitBase: number, frequency: string, contractMonths: number, customFieldsTotal = 0) {
  const mult        = getFreqMultiplier(frequency);
  const isOneTime   = frequency === 'oneTime';
  const perVisit    = perVisitBase;
  const monthlyRecurring = isOneTime ? 0 : perVisit * mult;
  const firstMonth  = isOneTime ? 0 : perVisit * mult;
  const contractTotal = (isOneTime ? perVisit : monthlyRecurring * contractMonths) + customFieldsTotal;
  return {perVisit, firstMonth, monthlyRecurring, contractTotal};
}

export function getFreqMultiplier(frequency: string): number {
  const map: Record<string, number> = {
    weekly: 4.33, biweekly: 2.165, twicePerMonth: 2.0, monthly: 1.0,
    everyFourWeeks: 1.0833,
    bimonthly: 0.5, quarterly: 0.33, biannual: 0.17, annual: 1 / 12,
  };
  return map[frequency] ?? 1.0;
}

// ── Styles ───────────────────────────────────────────────
const sc = StyleSheet.create({
  // Card — contract-card
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
  // Header — card-title style
  header: {
    flexDirection:   'row',
    alignItems:      'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical:   16,
    backgroundColor:   C.bg,
    borderBottomWidth: 2,
    borderBottomColor: C.borderLight,
  },
  iconBox: {
    width:           36,
    height:          36,
    borderRadius:     8,
    alignItems:      'center',
    justifyContent:  'center',
  },
  title: {
    flex:            1,
    fontSize:         16,
    fontWeight:       '700',
    color:            C.textCard,
    textTransform:    'uppercase',
    letterSpacing:    0.5,
    fontFamily:       'Arial',
  },
  removeBtn: {
    padding: 4,
  },
  loading: {
    flexDirection: 'row',
    alignItems:    'center',
    gap: 10,
    padding: 24,
  },
  loadingText: {
    fontSize:   14,
    color:      C.textMuted,
    fontFamily: 'Arial',
  },
  body: {
    paddingHorizontal: 24,
    paddingTop:        20,
    paddingBottom:     8,
  },
  // Notes
  notesWrap: {
    borderTopWidth:  1,
    borderTopColor:  C.borderLight,
    paddingHorizontal: 24,
    paddingVertical:   16,
  },
  notesLabel: {
    fontSize:        12,
    fontWeight:      '700',
    color:           C.textMuted,
    textTransform:   'uppercase',
    letterSpacing:   0.5,
    marginBottom:    8,
    fontFamily:      'Arial',
  },
  notesInput: {
    backgroundColor: '#fefce8',
    borderWidth:     1,
    borderColor:     '#fbbf24',
    borderRadius:    8,
    paddingHorizontal: 14,
    paddingVertical:   10,
    fontSize:          14,
    color:             C.text,
    minHeight:          80,
    textAlignVertical:  'top',
    fontFamily:         'Arial',
  },
});

const tb = StyleSheet.create({
  wrap: {
    borderTopWidth:  1,
    borderTopColor:  C.borderLight,
    paddingTop:      4,
  },
  // Section sub-header
  sectionHeader: {
    paddingHorizontal: 24,
    paddingVertical:    12,
    backgroundColor:    C.bg,
  },
  sectionTitle: {
    fontSize:        12,
    fontWeight:      '700',
    color:           C.textMutedLg,
    textTransform:   'uppercase',
    letterSpacing:   0.5,
    fontFamily:      'Arial',
  },
  rows: {
    paddingHorizontal: 24,
    paddingTop:        8,
    paddingBottom:     0,
    gap: 0,
  },
  // Breakdown row — .breakdown-row
  row: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    paddingHorizontal: 16,
    paddingVertical:   12,
    backgroundColor:   C.bg,
    borderRadius:       8,
    marginBottom:       8,
  },
  rowHighlight: {
    backgroundColor: C.yellowBg,
    borderWidth:     2,
    borderColor:     C.yellow,
  },
  rowLabel: {
    fontSize:   14,
    fontWeight: '500',
    color:      C.textMuted,
    flex:       1,
    fontFamily: 'Arial',
  },
  rowLabelHL: {
    color:      '#92400e',
    fontWeight: '700',
  },
  rowValue: {
    fontSize:   16,
    fontWeight: '700',
    color:      C.text,
    fontFamily: 'Arial',
  },
  rowValueHL: {
    color: '#92400e',
  },
  divider: {
    height:          2,
    backgroundColor: '#e5e7eb',
    marginVertical:   8,
  },
  // Contract total section — .contract-total-section
  totalSection: {
    marginHorizontal: 24,
    marginVertical:   16,
    backgroundColor:  C.greenBg,
    borderWidth:      3,
    borderColor:      C.greenBorder,
    borderRadius:     12,
    padding:          24,
    alignItems:       'center',
    shadowColor:      '#22c55e',
    shadowOffset:     {width: 0, height: 4},
    shadowOpacity:    0.15,
    shadowRadius:     12,
    elevation:         3,
  },
  // .total-label
  totalLabel: {
    fontSize:        14,
    fontWeight:      '700',
    color:           C.greenDarkest,
    textTransform:   'uppercase',
    letterSpacing:   1,
    marginBottom:    8,
    fontFamily:      'Arial',
  },
  // .total-amount — 42px, 800 weight
  totalAmount: {
    fontSize:   42,
    fontWeight: '800',
    color:      C.greenDark,
    marginBottom: 6,
    fontFamily: 'Arial',
  },
  // .total-breakdown
  totalSub: {
    fontSize:   13,
    fontWeight: '500',
    color:      '#047857',
    opacity:    0.85,
    fontFamily: 'Arial',
  },
});
