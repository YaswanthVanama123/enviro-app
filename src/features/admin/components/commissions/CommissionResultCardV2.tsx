import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';
import type {CommissionCalculationResultV2} from '../../types/commission.types';
import {
  formatCurrency,
  formatPercentage,
  getPricingTierColor,
} from '../../types/commission.types';

interface CommissionResultCardV2Props {
  result: CommissionCalculationResultV2;
}

export function CommissionResultCardV2({result}: CommissionResultCardV2Props) {
  const {breakdown} = result;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Commission Result</Text>

      {/* Main Results */}
      <View style={styles.mainResults}>
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Final Rate</Text>
          <Text style={[styles.resultValue, styles.rateValue]}>
            {formatPercentage(breakdown.finalCommissionRate)}
          </Text>
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Per Visit</Text>
          <Text style={styles.resultValue}>
            {formatCurrency(result.perVisitCommission)}
          </Text>
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Contract</Text>
          <Text style={styles.resultValue}>
            {formatCurrency(result.totalCommission)}
          </Text>
        </View>
      </View>

      {/* Pricing Tier Badge */}
      <View style={[styles.tierBadge, {backgroundColor: getPricingTierColor(breakdown.pricingTier) + '15'}]}>
        <Text style={[styles.tierLabel, {color: getPricingTierColor(breakdown.pricingTier)}]}>
          {breakdown.pricingTier}
        </Text>
        <Text style={styles.tierValue}>
          {breakdown.priceRatio.toFixed(2)}x Redline = {breakdown.pricingMultiplier}x Quota Credit
        </Text>
        {breakdown.requiresApproval && (
          <Text style={styles.tierWarning}>Requires Approval</Text>
        )}
      </View>

      {/* Breakdown */}
      <View style={styles.breakdown}>
        <Text style={styles.breakdownTitle}>Calculation Breakdown</Text>

        {/* Revenue Section */}
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>Revenue</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Per-Visit Revenue</Text>
            <Text style={styles.breakdownValue}>
              {formatCurrency(breakdown.originalRevenue)}
            </Text>
          </View>

          {breakdown.revenueDeduction > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Account Type Deduction ({result.accountType})
              </Text>
              <Text style={[styles.breakdownValue, styles.negative]}>
                -{formatCurrency(breakdown.revenueDeduction)}
              </Text>
            </View>
          )}

          {breakdown.anchorBonus > 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>
                Anchor 150% Bonus ({'>'}$200)
              </Text>
              <Text style={[styles.breakdownValue, styles.positive]}>
                +{formatCurrency(breakdown.anchorBonus)}
              </Text>
            </View>
          )}

          <View style={[styles.breakdownRow, styles.subtotalRow]}>
            <Text style={[styles.breakdownLabel, styles.subtotalLabel]}>
              Commissionable Revenue
            </Text>
            <Text style={[styles.breakdownValue, styles.subtotalValue]}>
              {formatCurrency(breakdown.commissionableRevenue)}
            </Text>
          </View>
        </View>

        {/* Quota Credit Section */}
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>Quota Credit</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Revenue × {breakdown.pricingMultiplier}x Multiplier
            </Text>
            <Text style={styles.breakdownValue}>
              {formatCurrency(breakdown.revenueWithPricingMultiplier)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              × {breakdown.visitsPerYear} Visits/Year
            </Text>
            <Text style={styles.breakdownValue}>
              {formatCurrency(breakdown.annualQuotaCredit)}/yr
            </Text>
          </View>
        </View>

        {/* Commission Rate Section */}
        <View style={styles.breakdownSection}>
          <Text style={styles.sectionTitle}>Commission Rate</Text>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Base Rate ({result.quotaLevel})
            </Text>
            <Text style={[styles.breakdownValue, styles.positive]}>
              {formatPercentage(breakdown.baseRate)}
            </Text>
          </View>

          {breakdown.insideSalesDeduction !== 0 && (
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Inside Sales Deduction</Text>
              <Text style={[styles.breakdownValue, styles.negative]}>
                {formatPercentage(breakdown.insideSalesDeduction)}
              </Text>
            </View>
          )}

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Effective Rate</Text>
            <Text style={styles.breakdownValue}>
              {formatPercentage(breakdown.effectiveRate)}
            </Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Agreement ({result.agreementTerm})
            </Text>
            <Text style={styles.breakdownValue}>
              ×{breakdown.agreementMultiplier}%
            </Text>
          </View>

          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text style={[styles.breakdownLabel, styles.totalLabel]}>
              Final Commission Rate
            </Text>
            <Text style={[styles.breakdownValue, styles.totalValue]}>
              {formatPercentage(breakdown.finalCommissionRate)}
            </Text>
          </View>
        </View>
      </View>

      {/* Commission Amounts */}
      <View style={styles.amounts}>
        <Text style={styles.amountsTitle}>Commission Amounts</Text>

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Per Visit</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(result.perVisitCommission)}
          </Text>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Monthly</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(result.monthlyCommission)}
          </Text>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Annual</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(result.annualCommission)}
          </Text>
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Contract ({result.contractMonths} mo)</Text>
          <Text style={styles.amountValue}>
            {formatCurrency(result.contractCommission)}
          </Text>
        </View>

        {result.renewalBonus > 0 && (
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Renewal Bonus ({breakdown.renewalBonusRate}%)</Text>
            <Text style={[styles.amountValue, styles.positive]}>
              +{formatCurrency(result.renewalBonus)}
            </Text>
          </View>
        )}

        <View style={[styles.amountRow, styles.totalAmountRow]}>
          <Text style={styles.totalAmountLabel}>Total Commission</Text>
          <Text style={styles.totalAmountValue}>
            {formatCurrency(result.totalCommission)}
          </Text>
        </View>
      </View>

      {/* Formula */}
      <View style={styles.formula}>
        <Text style={styles.formulaText}>
          <Text style={styles.formulaBold}>Formula: </Text>
          {formatCurrency(breakdown.commissionableRevenue)} × {formatPercentage(breakdown.finalCommissionRate)} ={' '}
          <Text style={styles.formulaBold}>{formatCurrency(result.perVisitCommission)}</Text>/visit
        </Text>
        <Text style={styles.formulaText}>
          <Text style={styles.formulaBold}>Rules Version: </Text>
          {result.rulesVersion}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0fdf4',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#86efac',
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#166534',
  },
  mainResults: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  resultCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#d1fae5',
    padding: Spacing.md,
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  resultValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#166534',
  },
  rateValue: {
    color: Colors.primary,
  },
  tierBadge: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  tierLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  tierValue: {
    fontSize: FontSize.xs,
    color: '#6b7280',
    marginTop: 2,
  },
  tierWarning: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: '#dc2626',
    marginTop: 4,
  },
  breakdown: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#d1fae5',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  breakdownTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#374151',
    marginBottom: Spacing.xs,
  },
  breakdownSection: {
    gap: Spacing.xs,
    paddingTop: Spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: '#9ca3af',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  breakdownLabel: {
    fontSize: FontSize.xs,
    color: '#6b7280',
    flex: 1,
  },
  breakdownValue: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: '#111827',
  },
  positive: {
    color: '#059669',
  },
  negative: {
    color: '#dc2626',
  },
  subtotalRow: {
    backgroundColor: '#e0f2fe',
    marginTop: Spacing.xs,
  },
  subtotalLabel: {
    fontWeight: '600',
    color: '#0369a1',
  },
  subtotalValue: {
    color: '#0369a1',
  },
  totalRow: {
    backgroundColor: '#dcfce7',
    marginTop: Spacing.xs,
  },
  totalLabel: {
    fontWeight: '700',
    color: '#166534',
  },
  totalValue: {
    fontWeight: '700',
    color: '#166534',
  },
  amounts: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#d1fae5',
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  amountsTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#374151',
    marginBottom: Spacing.xs,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  amountLabel: {
    fontSize: FontSize.sm,
    color: '#6b7280',
  },
  amountValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#111827',
  },
  totalAmountRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: Spacing.xs,
    paddingTop: Spacing.sm,
  },
  totalAmountLabel: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#166534',
  },
  totalAmountValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#166534',
  },
  formula: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#d1fae5',
    padding: Spacing.md,
    gap: 4,
  },
  formulaText: {
    fontSize: FontSize.xs,
    color: '#166534',
    lineHeight: 18,
  },
  formulaBold: {
    fontWeight: '700',
  },
});
