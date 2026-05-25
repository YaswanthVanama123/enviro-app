import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
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
  const [isExplanationExpanded, setIsExplanationExpanded] = useState(false);

  // Helper to get step number accounting for optional steps
  const getStepNumber = (baseStep: number) => {
    if (breakdown.revenueDeduction > 0 || breakdown.anchorBonus > 0) {
      return baseStep;
    }
    return baseStep - 1;
  };

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

      {/* Expandable Explanation Section */}
      <View style={styles.explanationContainer}>
        <TouchableOpacity
          style={styles.explanationHeader}
          onPress={() => setIsExplanationExpanded(!isExplanationExpanded)}
          activeOpacity={0.7}>
          <View style={styles.explanationHeaderLeft}>
            <Text style={styles.explanationIcon}>💡</Text>
            <Text style={styles.explanationHeaderText}>
              How is my commission calculated?
            </Text>
          </View>
          <Ionicons
            name={isExplanationExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color="#64748b"
          />
        </TouchableOpacity>

        {isExplanationExpanded && (
          <View style={styles.explanationContent}>
            <Text style={styles.explanationTitle}>
              Here's how your commission was calculated:
            </Text>

            {/* Step 1: Revenue */}
            <View style={styles.explanationStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <Text style={styles.stepText}>
                <Text style={styles.stepBold}>Monthly Revenue:</Text> Your agreement generates{' '}
                <Text style={styles.stepHighlight}>{formatCurrency(breakdown.originalRevenue)}</Text> in monthly revenue.
              </Text>
            </View>

            {/* Step 2: Account Type Adjustments (if applicable) */}
            {(breakdown.revenueDeduction > 0 || breakdown.anchorBonus > 0) && (
              <View style={styles.explanationStep}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <Text style={styles.stepText}>
                  <Text style={styles.stepBold}>Account Type ({result.accountType}):</Text>{' '}
                  {breakdown.revenueDeduction > 0 && (
                    <>A deduction of <Text style={styles.stepNegative}>-{formatCurrency(breakdown.revenueDeduction)}</Text> is applied because {result.accountType} accounts have a base amount not eligible for commission. </>
                  )}
                  {breakdown.anchorBonus > 0 && (
                    <>As an Anchor account, you receive a <Text style={styles.stepPositive}>150% bonus</Text> on revenue above $200, adding <Text style={styles.stepPositive}>+{formatCurrency(breakdown.anchorBonus)}</Text>. </>
                  )}
                  This makes your <Text style={styles.stepBold}>commissionable revenue {formatCurrency(breakdown.commissionableRevenue)}</Text>.
                </Text>
              </View>
            )}

            {/* Step 3: Base Rate */}
            <View style={styles.explanationStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{getStepNumber(3)}</Text>
              </View>
              <Text style={styles.stepText}>
                <Text style={styles.stepBold}>Base Rate:</Text> Your quota status is{' '}
                <Text style={styles.stepHighlight}>
                  {result.quotaLevel === 'double' ? 'Double Quota' : result.quotaLevel === 'above' ? 'Above Quota' : 'Below Quota'}
                </Text>, which gives you a base commission rate of{' '}
                <Text style={styles.stepHighlight}>{formatPercentage(breakdown.baseRate)}</Text>.
                {breakdown.insideSalesDeduction !== 0 && (
                  <> Since this is an inside sales deal, <Text style={styles.stepNegative}>-3%</Text> is deducted, bringing your effective rate to <Text style={styles.stepHighlight}>{formatPercentage(breakdown.effectiveRate)}</Text>.</>
                )}
              </Text>
            </View>

            {/* Step 4: Agreement Multiplier */}
            <View style={styles.explanationStep}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{getStepNumber(4)}</Text>
              </View>
              <Text style={styles.stepText}>
                <Text style={styles.stepBold}>Agreement Term:</Text> This is a{' '}
                <Text style={styles.stepHighlight}>{result.agreementTerm}</Text> agreement with a{' '}
                <Text style={styles.stepHighlight}>{breakdown.agreementMultiplier}%</Text> multiplier.
                {breakdown.agreementMultiplier > 100 && (
                  <> Longer agreements reward you with higher commission multipliers!</>
                )}
              </Text>
            </View>

            {/* Final Calculation Box */}
            <View style={styles.finalCalculation}>
              <Text style={styles.finalCalculationTitle}>Final Calculation:</Text>
              <Text style={styles.finalCalculationText}>
                {formatCurrency(breakdown.commissionableRevenue)} × {formatPercentage(breakdown.finalCommissionRate)} ={' '}
                <Text style={styles.finalCalculationBold}>{formatCurrency(result.perVisitCommission)}</Text> per month
              </Text>
              <Text style={styles.finalCalculationText}>
                {formatCurrency(result.perVisitCommission)} × 12 months ={' '}
                <Text style={styles.finalCalculationBold}>{formatCurrency(result.annualCommission)}</Text> annually
              </Text>
              {result.contractMonths > 12 && (
                <Text style={styles.finalCalculationText}>
                  {formatCurrency(result.monthlyCommission)} × {result.contractMonths} months ={' '}
                  <Text style={styles.finalCalculationBold}>{formatCurrency(result.contractCommission)}</Text> total
                </Text>
              )}
            </View>

            {/* Tips Box */}
            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>💡 Tips to earn more commission:</Text>
              {result.quotaLevel === 'below' && (
                <Text style={styles.tipItem}>• Reach your sales quota to increase your base rate to 6% or 9%</Text>
              )}
              {breakdown.agreementMultiplier < 135 && (
                <Text style={styles.tipItem}>• Sell longer term agreements (3-year = 135% multiplier)</Text>
              )}
              {breakdown.insideSalesDeduction !== 0 && (
                <Text style={styles.tipItem}>• Outside sales deals don't have the 3% inside sales deduction</Text>
              )}
              <Text style={styles.tipItem}>• Anchor accounts give 150% bonus on revenue above $200</Text>
            </View>
          </View>
        )}
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
  // Explanation Section Styles
  explanationContainer: {
    borderTopWidth: 1,
    borderTopColor: '#d1fae5',
    paddingTop: Spacing.md,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: Spacing.md,
  },
  explanationHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  explanationIcon: {
    fontSize: 16,
  },
  explanationHeaderText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#334155',
  },
  explanationContent: {
    marginTop: Spacing.md,
    backgroundColor: '#f0f9ff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#bae6fd',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  explanationTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: Spacing.xs,
  },
  explanationStep: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  stepNumber: {
    backgroundColor: '#0ea5e9',
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  stepText: {
    flex: 1,
    fontSize: FontSize.xs,
    lineHeight: 18,
    color: '#0c4a6e',
  },
  stepBold: {
    fontWeight: '700',
  },
  stepHighlight: {
    fontWeight: '700',
    color: '#0369a1',
  },
  stepPositive: {
    fontWeight: '700',
    color: '#16a34a',
  },
  stepNegative: {
    fontWeight: '700',
    color: '#dc2626',
  },
  finalCalculation: {
    marginTop: Spacing.xs,
    backgroundColor: '#dcfce7',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#86efac',
    padding: Spacing.md,
    gap: 4,
  },
  finalCalculationTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#166534',
  },
  finalCalculationText: {
    fontSize: FontSize.xs,
    color: '#15803d',
    lineHeight: 18,
  },
  finalCalculationBold: {
    fontWeight: '700',
  },
  tipsBox: {
    marginTop: Spacing.xs,
    backgroundColor: '#fef3c7',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#fcd34d',
    padding: Spacing.md,
    gap: 4,
  },
  tipsTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#92400e',
    marginBottom: 4,
  },
  tipItem: {
    fontSize: FontSize.xs,
    color: '#92400e',
    lineHeight: 18,
  },
});
