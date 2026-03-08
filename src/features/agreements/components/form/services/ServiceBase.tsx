/**
 * Shared service form base component.
 * Each service form wraps this for consistent layout.
 */
import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ActivityIndicator} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../../../../theme/colors';
import {Spacing, Radius} from '../../../../../theme/spacing';
import {FontSize} from '../../../../../theme/typography';
import {FREQ_OPTIONS, FREQ_LABELS} from '../../../../../services/api/endpoints/form.api';
import {DropdownRow, DollarRow, FormDivider, NumberRow, ToggleRow, CalcRow} from '../FormUI';

// ─── Re-export common stuff for service forms ─────────────────────────────────
export {DropdownRow, DollarRow, FormDivider, NumberRow, ToggleRow, CalcRow, FREQ_OPTIONS, FREQ_LABELS};

// ─── Service Card wrapper ─────────────────────────────────────────────────────

interface ServiceCardProps {
  serviceId: string;
  displayName: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  onRemove: () => void;
  loading?: boolean;
  children: React.ReactNode;
}

export function ServiceCard({serviceId, displayName, icon, iconColor, iconBg, onRemove, loading, children}: ServiceCardProps) {
  return (
    <View style={sc.card}>
      {/* Header */}
      <View style={sc.header}>
        <View style={[sc.iconBox, {backgroundColor: iconBg}]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={sc.title}>{displayName}</Text>
        <TouchableOpacity style={sc.removeBtn} onPress={onRemove}>
          <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={sc.loading}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={sc.loadingText}>Loading pricing...</Text>
        </View>
      )}

      {!loading && <View style={sc.body}>{children}</View>}
    </View>
  );
}

// ─── Totals block (shown at bottom of each service form) ─────────────────────

interface TotalsBlockProps {
  frequency: string;
  perVisit: number;
  firstMonth?: number;
  monthlyRecurring?: number;
  contractMonths: number;
  contractTotal: number;
}

export function TotalsBlock({frequency, perVisit, firstMonth, monthlyRecurring, contractMonths, contractTotal}: TotalsBlockProps) {
  const isOneTime = frequency === 'oneTime';
  const isVisitBased = ['bimonthly', 'quarterly', 'biannual', 'annual'].includes(frequency);

  return (
    <View style={tb.container}>
      <View style={tb.header}>
        <Text style={tb.headerText}>Pricing Summary</Text>
      </View>
      {isOneTime ? (
        <DollarRow label="Total Price" value={perVisit} highlight />
      ) : (
        <>
          <DollarRow label={isVisitBased ? 'Recurring Visit Total' : 'Per Visit Total'} value={perVisit} />
          {!isVisitBased && firstMonth !== undefined && (
            <DollarRow label="First Month Total" value={firstMonth} />
          )}
          {!isVisitBased && monthlyRecurring !== undefined && (
            <DollarRow label="Monthly Recurring" value={monthlyRecurring} />
          )}
          <FormDivider />
          <DollarRow label={`Contract Total (${contractMonths} mo)`} value={contractTotal} highlight />
        </>
      )}
    </View>
  );
}

// ─── Calc totals helper ───────────────────────────────────────────────────────

export function calcTotals(perVisitBase: number, frequency: string, contractMonths: number) {
  const mult = getFreqMultiplier(frequency);
  const isOneTime = frequency === 'oneTime';
  const isVisitBased = ['bimonthly', 'quarterly', 'biannual', 'annual'].includes(frequency);

  const perVisit = perVisitBase;
  const monthlyRecurring = isOneTime ? 0 : perVisit * mult;
  const firstMonth = isOneTime ? 0 : perVisit * mult; // simplified: first month = monthly
  const contractTotal = isOneTime ? perVisit : monthlyRecurring * contractMonths;

  return {perVisit, firstMonth, monthlyRecurring, contractTotal};
}

export function getFreqMultiplier(frequency: string): number {
  const map: Record<string, number> = {
    weekly: 4.33, biweekly: 2.165, twicePerMonth: 2.0, monthly: 1.0,
    bimonthly: 0.5, quarterly: 0.33, biannual: 0.17, annual: 1 / 12,
  };
  return map[frequency] ?? 1.0;
}

const sc = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  removeBtn: {
    padding: Spacing.xs,
  },
  loading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.lg,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  body: {},
});

const tb = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: '#f8fafc',
  },
  headerText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
