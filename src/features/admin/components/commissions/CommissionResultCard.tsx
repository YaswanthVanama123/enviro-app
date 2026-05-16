import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';
import type {CommissionCalculationResult} from '../../types/commission.types';

interface CommissionResultCardProps {
  result: CommissionCalculationResult;
}

export function CommissionResultCard({result}: CommissionResultCardProps) {
  const {
    breakdown,
    effectiveBaseRate,
    finalCommissionRate,
    monthlyCommission,
    annualCommission,
    input,
  } = result;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercent = (value: number, showSign = false) => {
    const sign = showSign && value > 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Commission Result</Text>

      {/* Main Results */}
      <View style={styles.mainResults}>
        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Final Rate</Text>
          <Text style={[styles.resultValue, styles.rateValue]}>
            {formatPercent(finalCommissionRate)}
          </Text>
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Monthly</Text>
          <Text style={styles.resultValue}>
            {formatCurrency(monthlyCommission)}
          </Text>
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>Annual</Text>
          <Text style={styles.resultValue}>
            {formatCurrency(annualCommission)}
          </Text>
        </View>
      </View>

      {/* Breakdown */}
      <View style={styles.breakdown}>
        <Text style={styles.breakdownTitle}>Calculation Breakdown</Text>

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>
            Base Rate ({input.quotaLevel})
          </Text>
          <Text style={[styles.breakdownValue, styles.positive]}>
            {formatPercent(breakdown.baseRate)}
          </Text>
        </View>

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>
            Agreement ({input.agreementTerm})
          </Text>
          <Text style={styles.breakdownValue}>
            ×{breakdown.agreementMultiplier}%
          </Text>
        </View>

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>
            Account Type ({input.accountType})
          </Text>
          <Text
            style={[
              styles.breakdownValue,
              breakdown.accountTypeAdjustment < 0
                ? styles.negative
                : styles.neutral,
            ]}>
            {formatPercent(breakdown.accountTypeAdjustment, true)}
          </Text>
        </View>

        <View style={styles.breakdownRow}>
          <Text style={styles.breakdownLabel}>
            Pricing ({input.pricingLine})
          </Text>
          <Text
            style={[
              styles.breakdownValue,
              breakdown.greenlineBonus > 0 ? styles.positive : styles.neutral,
            ]}>
            {formatPercent(breakdown.greenlineBonus, true)}
          </Text>
        </View>

        {input.businessType === 'renewal' && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>
              Renewal ({input.yearsAsCustomer}+ yrs)
            </Text>
            <Text
              style={[
                styles.breakdownValue,
                breakdown.renewalBonus > 0 ? styles.positive : styles.neutral,
              ]}>
              {formatPercent(breakdown.renewalBonus, true)}
            </Text>
          </View>
        )}

        {input.isInsideSales && (
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Inside Sales</Text>
            <Text style={[styles.breakdownValue, styles.negative]}>
              {formatPercent(breakdown.insideSalesDeduction, true)}
            </Text>
          </View>
        )}

        <View style={[styles.breakdownRow, styles.breakdownTotal]}>
          <Text style={[styles.breakdownLabel, styles.breakdownTotalLabel]}>
            Effective Base Rate
          </Text>
          <Text style={[styles.breakdownValue, styles.breakdownTotalValue]}>
            {formatPercent(effectiveBaseRate)}
          </Text>
        </View>
      </View>

      {/* Formula */}
      <View style={styles.formula}>
        <Text style={styles.formulaText}>
          <Text style={styles.formulaBold}>Formula: </Text>
          {formatPercent(effectiveBaseRate)} × {breakdown.agreementMultiplier}% ={' '}
          <Text style={styles.formulaBold}>{formatPercent(finalCommissionRate)}</Text>
        </Text>
        <Text style={styles.formulaText}>
          <Text style={styles.formulaBold}>Monthly: </Text>
          {formatCurrency(input.monthlyValue)} × {formatPercent(finalCommissionRate)} ={' '}
          <Text style={styles.formulaBold}>{formatCurrency(monthlyCommission)}</Text>
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
  breakdown: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#d1fae5',
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  breakdownTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#374151',
    marginBottom: Spacing.xs,
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
  neutral: {
    color: '#6b7280',
  },
  breakdownTotal: {
    backgroundColor: '#e0f2fe',
    marginTop: Spacing.xs,
  },
  breakdownTotalLabel: {
    fontWeight: '600',
    color: '#0369a1',
  },
  breakdownTotalValue: {
    color: '#0369a1',
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
