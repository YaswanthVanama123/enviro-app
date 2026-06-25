import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  useGlobalCommission,
  GlobalCommissionResult,
  formatCurrency,
} from '../../hooks/useServiceCommission';
import {AccountTypeCache} from '../../hooks/useAccountTypeDetection';
import {useQuotaContext, QuotaLevel} from '../../context/QuotaContext';
import {type ResolvedCommissionRules} from '../../../admin/types/commission.types';
import {AccountType} from '../../../../services/api/endpoints/accountType.api';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  Anchor: '#fbbf24',
  Bread5: '#34d399',
  Bread15: '#60a5fa',
  Pit: '#f87171',
};

const QUOTA_LEVEL_CONFIG: Record<QuotaLevel, {label: string; color: string; bgColor: string}> = {
  below: {label: 'Below Quota', color: '#dc2626', bgColor: '#fee2e2'},
  above: {label: 'Above Quota', color: '#059669', bgColor: '#d1fae5'},
  double: {label: 'Double Quota', color: '#7c3aed', bgColor: '#ede9fe'},
};

const QUOTA_TIER_COLORS: Record<'below' | 'above' | 'double', string> = {
  below: '#dc2626',
  above: '#059669',
  double: '#7c3aed',
};

interface GlobalCommissionSummaryProps {
  services: Record<string, any>;
  accountTypeCache: AccountTypeCache;
  contractMonths?: number;
  priorQuotaCredit?: number;
  rulesOverride?: ResolvedCommissionRules | null;
  isNewLocation?: boolean;
  priorFarRedline?: number;
  priorFarGreenline?: number;
  showDetectButton?: boolean;
  isDetecting?: boolean;
  isCompanyMapped?: boolean;
  isRouteStarMapped?: boolean;
  error?: string | null;
  onDetect?: () => void;
  addedToPayroll?: boolean;
  payrollPeriodLabel?: string;
}

function DetailRow({label, value, bold, color}: {label: string; value: string; bold?: boolean; color?: string}) {
  return (
    <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 3, gap: 8}}>
      <Text style={{fontSize: FontSize.xs, color: Colors.gray600, flex: 1, fontWeight: bold ? '700' : '400'}}>{label}</Text>
      <Text style={{fontSize: FontSize.xs, color: color || Colors.gray800, fontWeight: bold ? '700' : '500', textAlign: 'right'}}>{value}</Text>
    </View>
  );
}

export function GlobalCommissionSummary({
  services,
  accountTypeCache,
  contractMonths = 12,
  priorQuotaCredit,
  rulesOverride = null,
  isNewLocation = true,
  priorFarRedline = 0,
  priorFarGreenline = 0,
  showDetectButton = true,
  isDetecting = false,
  isCompanyMapped = false,
  isRouteStarMapped = false,
  error = null,
  onDetect,
  addedToPayroll = false,
  payrollPeriodLabel,
}: GlobalCommissionSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  const {quotaLevel, baseCommissionRate, quotaLevelData, isLoading: quotaLoading} = useQuotaContext();
  const commissionRate = baseCommissionRate;
  const quotaConfig = QUOTA_LEVEL_CONFIG[quotaLevel];

  const global = useGlobalCommission({
    services,
    accountTypeCache,
    commissionRate,
    contractMonths,
    priorQuotaCredit: priorQuotaCredit ?? quotaLevelData?.actualSales ?? 0,
    rulesOverride,
    isNewLocation,
    priorFarRedline,
    priorFarGreenline,
  });

  const displayGroups = global.groups.map(g => ({...g, serviceName: g.serviceNames.join(', ')}));
  const quotaLevelRate =
    global.commissionTierBreakdown.find(t => t.level === quotaLevel)?.rate ?? commissionRate;

  if (global.serviceCount === 0) {
    return null;
  }

  // Commission is only calculated / shown / saved when connected to Bigin.
  if (!isCompanyMapped) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="cash-outline" size={16} color="#059669" />
            <Text style={styles.title}>Commission Summary</Text>
          </View>
          {showDetectButton && onDetect && (
            <TouchableOpacity
              style={[styles.detectButton, isDetecting && styles.detectButtonDisabled]}
              onPress={onDetect}
              disabled={isDetecting}>
              {isDetecting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.detectButtonText}>Connecting…</Text>
                </>
              ) : (
                <>
                  <Ionicons name="sync-outline" size={14} color="#ffffff" />
                  <Text style={styles.detectButtonText}>Connect</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={14} color="#92400e" />
            <Text style={styles.infoText}>Please connect to Bigin to show the commission details.</Text>
          </View>
        </View>
        {error && (
          <View style={styles.errorBox}>
            <View style={styles.errorRow}>
            <Ionicons name="warning" size={14} color="#991b1b" />
            <Text style={[styles.errorText, styles.infoTextFlex]}>{error}</Text>
          </View>
          </View>
        )}
      </View>
    );
  }

  // Commission/quota only count once this Bigin company is mapped to a RouteStar
  // customer. Until then, don't calculate anything — prompt to map.
  if (!isRouteStarMapped) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="cash-outline" size={16} color="#059669" />
            <Text style={styles.title}>Commission Summary</Text>
          </View>
        </View>
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={14} color="#92400e" />
            <Text style={[styles.infoText, styles.infoTextFlex]}>
              This company isn't mapped to a RouteStar customer yet. Map it under Company
              Mapping to calculate commission and count it toward quota.
            </Text>
          </View>
        </View>
        {error && (
          <View style={styles.errorBox}>
            <View style={styles.errorRow}>
            <Ionicons name="warning" size={14} color="#991b1b" />
            <Text style={[styles.errorText, styles.infoTextFlex]}>{error}</Text>
          </View>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {addedToPayroll ? (
        <View style={{backgroundColor: '#ede9fe', borderColor: '#c4b5fd', borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 6}}>
          <Ionicons name="lock-closed" size={14} color="#5b21b6" />
          <Text style={{color: '#5b21b6', fontSize: FontSize.xs, fontWeight: '700', flex: 1}}>
            This agreement is already in payroll{payrollPeriodLabel ? ` (${payrollPeriodLabel})` : ''}. Changing it now will not change the payroll amount.
          </Text>
        </View>
      ) : null}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="cash-outline" size={16} color="#059669" />
          <Text style={styles.title}>Commission Summary</Text>
          {}
          <View
            style={[
              styles.quotaBadge,
              {backgroundColor: quotaConfig.bgColor},
            ]}>
            <Text style={[styles.quotaBadgeText, {color: quotaConfig.color}]}>
              {quotaConfig.label} ({quotaLevelRate}%)
            </Text>
          </View>
          {!global.hasDetectedServices && isCompanyMapped && (
            <Text style={styles.needsDetection}>(Detection needed)</Text>
          )}
        </View>

        {showDetectButton && isCompanyMapped && onDetect && (
          <TouchableOpacity
            style={[styles.detectButton, isDetecting && styles.detectButtonDisabled]}
            onPress={onDetect}
            disabled={isDetecting}>
            {isDetecting ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.detectButtonText}>Detecting...</Text>
              </>
            ) : (
              <>
                <Ionicons name="sync-outline" size={14} color="#ffffff" />
                <Text style={styles.detectButtonText}>Detect</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <View style={styles.errorRow}>
            <Ionicons name="warning" size={14} color="#991b1b" />
            <Text style={[styles.errorText, styles.infoTextFlex]}>{error}</Text>
          </View>
        </View>
      )}

      {!isCompanyMapped && (
        <View style={styles.infoBox}>
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={14} color="#92400e" />
            <Text style={[styles.infoText, styles.infoTextFlex]}>
              Connect to Bigin to detect account types
            </Text>
          </View>
        </View>
      )}

      <View style={styles.totalsRow}>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>PER VISIT</Text>
          <Text style={styles.totalValue}>
            {global.formatted.totalPerVisitCommission}
          </Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>ANNUAL</Text>
          <Text style={styles.totalValue}>
            {global.formatted.totalAnnualCommission}
          </Text>
        </View>
      </View>

      {global.quotaTierBreakdown.length > 0 && (
        <View style={styles.quotaTiers}>
          <Text style={styles.quotaTiersTitle}>Quota Tier Breakdown</Text>
          <Text style={styles.quotaTiersNote}>
            This agreement adds {formatCurrency(global.totalQuotaCredit)} of quota credit on top of{' '}
            {formatCurrency(global.priorQuotaCredit)} already earned this week (weekly target{' '}
            {formatCurrency(global.quotaTarget)}). Split across rate tiers:
          </Text>
          {global.quotaTierBreakdown
            .filter(tier => tier.quotaCredit > 0)
            .map(tier => (
              <View key={tier.level} style={styles.quotaTierRow}>
                <Text
                  style={[
                    styles.quotaTierLabel,
                    {color: QUOTA_TIER_COLORS[tier.level]},
                  ]}>
                  {tier.label} @ {tier.rate}%
                </Text>
                <Text style={styles.quotaTierValue}>
                  {formatCurrency(tier.quotaCredit)} × {tier.rate}% ={' '}
                  {formatCurrency(tier.commission)}
                </Text>
              </View>
            ))}
        </View>
      )}

      {global.commissionTierBreakdown.length > 0 && (
        <View style={styles.quotaTiers}>
          <Text style={styles.quotaTiersTitle}>Commission Tier Breakdown</Text>
          <Text style={styles.quotaTiersNote}>
            Commission is charged on commissionable revenue, each tier at its rate ×
            agreement multiplier ({global.agreementMultiplier}%), then summed:
          </Text>
          {global.commissionTierBreakdown
            .filter(tier => tier.base > 0)
            .map(tier => (
              <View key={tier.level} style={styles.quotaTierRow}>
                <Text
                  style={[
                    styles.quotaTierLabel,
                    {color: QUOTA_TIER_COLORS[tier.level]},
                  ]}>
                  {tier.label} @ {tier.effectiveRate.toFixed(2)}%
                </Text>
                <Text style={styles.quotaTierValue}>
                  {formatCurrency(tier.base)} × {tier.effectiveRate.toFixed(2)}% ={' '}
                  {formatCurrency(tier.commission)}
                </Text>
              </View>
            ))}
          <View style={styles.quotaTierRow}>
            <Text style={[styles.quotaTierLabel, {fontWeight: '700'}]}>Final Commission</Text>
            <Text style={[styles.quotaTierValue, {fontWeight: '700'}]}>
              {global.formatted.totalAnnualCommission}
            </Text>
          </View>
        </View>
      )}

      {global.services.length > 0 && (
        <View style={styles.servicesSection}>
          <TouchableOpacity
            style={styles.expandHeader}
            onPress={() => setExpanded(!expanded)}>
            <Text style={styles.serviceCount}>
              {global.serviceCount} service{global.serviceCount !== 1 ? 's' : ''}{' '}
              included
            </Text>
            <Text style={styles.expandText}>
              {expanded ? '▲ Hide' : '▼ Show'}
            </Text>
          </TouchableOpacity>

          {expanded && (
            <View style={styles.servicesList}>
              {displayGroups.map((service, idx) => {
                const ft = service.farTiers;
                return (
                <View key={idx} style={{borderBottomWidth: 1, borderBottomColor: Colors.gray100, paddingVertical: Spacing.sm}}>
                  <View style={styles.serviceNameRow}>
                    <View
                      style={[
                        styles.accountTypeDot,
                        {
                          backgroundColor: service.accountType
                            ? ACCOUNT_TYPE_COLORS[service.accountType]
                            : Colors.gray300,
                        },
                      ]}
                    />
                    <Text style={styles.serviceName}>
                      {service.serviceName
                        .replace(/([A-Z])/g, ' $1')
                        .trim()}
                    </Text>
                    {service.accountType && (
                      <Text style={styles.serviceType}>
                        ({service.accountType})
                      </Text>
                    )}
                    <View style={{flex: 1}} />
                    <Text style={styles.serviceCommissionValue}>
                      ${service.perVisitCommission.toFixed(2)}/visit
                    </Text>
                  </View>

                  <View style={{marginTop: 6}}>
                    <Text style={{fontSize: FontSize.xs - 1, fontWeight: '700', color: Colors.gray500, marginTop: 6, marginBottom: 2}}>REVENUE CALCULATION</Text>
                    {ft ? (
                      <>
                        <DetailRow label="Original Per-Visit (Redline):" value={formatCurrency(ft.originalPerVisit)} />
                        <DetailRow label="Current Per-Visit:" value={formatCurrency(ft.currentPerVisit)} />
                        <DetailRow label="Price Ratio (Current ÷ Redline):" value={`${(ft.priceRatio * 100).toFixed(1)}%`} />
                        <DetailRow label="Pricing Tier:" value={service.pricingTierLabel} bold />
                        <DetailRow label="Pricing Multiplier:" value={`${service.pricingMultiplier.toFixed(2)}×`} color={service.pricingMultiplier > 1 ? '#059669' : undefined} />
                        {service.pricingMultiplier !== 1 && (
                          <DetailRow label={`Adjusted Per-Visit (${formatCurrency(ft.currentPerVisit)} × ${service.pricingMultiplier.toFixed(2)}×):`} value={formatCurrency(ft.adjustedPerVisit)} />
                        )}
                        <DetailRow label="Prior Same-Location Per-Visit:" value={formatCurrency(ft.priorPerVisit)} />
                        <DetailRow label="Combined Per-Visit (prior + current):" value={formatCurrency(ft.combinedPerVisit)} bold />
                        <DetailRow label={`${formatCurrency(0)}–${formatCurrency(ft.pitThreshold)} (no commission):`} value={`${formatCurrency(0)}/visit`} color="#dc2626" />
                        {ft.anchorThreshold > ft.pitThreshold && (
                          <DetailRow label={`${formatCurrency(ft.pitThreshold)}–${formatCurrency(ft.anchorThreshold)} (normal):`} value={`${formatCurrency(ft.normalPerVisit)}/visit`} />
                        )}
                        <DetailRow label={`Above ${formatCurrency(ft.anchorThreshold)} (150%):`} value={`${formatCurrency(ft.anchorPerVisit)} × 1.5 = ${formatCurrency(ft.anchorPerVisit * 1.5)}/visit`} color="#059669" />
                        <DetailRow label="Commissionable Per-Visit:" value={formatCurrency(ft.commissionablePerVisit)} bold />
                        <DetailRow label={`Annual Commissionable (${formatCurrency(ft.commissionablePerVisit)} × ${service.visitsPerYear} visits):`} value={formatCurrency(service.commissionableRevenue)} />
                      </>
                    ) : (
                      <>
                        <DetailRow label="Original Annual (Redline):" value={formatCurrency(service.annualOriginalRevenue)} />
                        <DetailRow label="Current Annual Revenue:" value={formatCurrency(service.perVisitRevenue)} />
                        <DetailRow label="Price Ratio (Current ÷ Redline):" value={`${(service.priceRatio * 100).toFixed(1)}%`} />
                        <DetailRow label="Pricing Tier:" value={service.pricingTierLabel} bold />
                        {service.revenueDeduction > 0 && (
                          <DetailRow label={`Account Type Deduction (${service.accountType}):`} value={`-${formatCurrency(service.revenueDeduction)}`} color="#dc2626" />
                        )}
                        <DetailRow label="Commissionable Revenue:" value={formatCurrency(service.commissionableRevenue)} bold />
                      </>
                    )}
                    <Text style={{fontSize: FontSize.xs - 1, fontWeight: '700', color: Colors.gray500, marginTop: 8, marginBottom: 2}}>COMMISSION CALCULATION</Text>
                    <DetailRow label={`Annual Commission (@ ${global.effectiveCommissionRate.toFixed(2)}%):`} value={formatCurrency(service.annualCommission)} bold color="#059669" />
                    <DetailRow label={`Per-Visit Commission (÷ ${service.visitsPerYear} visits):`} value={formatCurrency(service.perVisitCommission)} />
                    <DetailRow label="Weekly Commission (÷ 52 weeks):" value={formatCurrency(service.weeklyCommission)} />
                  </View>
                </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      <Text style={styles.rateNote}>
        Commission rate: {quotaLevelRate}% ({quotaConfig.label})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  icon: {
    fontSize: FontSize.md,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray700,
  },
  needsDetection: {
    fontSize: FontSize.xs,
    color: '#f59e0b',
  },
  quotaBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
  },
  quotaBadgeText: {
    fontSize: FontSize.xs - 1,
    fontWeight: '600',
  },
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#3b82f6',
    borderRadius: Radius.sm,
  },
  detectButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  detectButtonIcon: {
    fontSize: FontSize.sm,
  },
  detectButtonText: {
    fontSize: FontSize.xs,
    color: '#ffffff',
    fontWeight: '500',
  },
  errorBox: {
    padding: Spacing.sm,
    backgroundColor: '#fee2e2',
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: '#991b1b',
  },
  infoBox: {
    padding: Spacing.sm,
    backgroundColor: '#fef3c7',
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  infoText: {
    fontSize: FontSize.xs,
    color: '#92400e',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 4,
  },
  infoTextFlex: {
    flex: 1,
  },
  totalsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  quotaTiers: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: '#f8fafc',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quotaTiersTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primaryDark,
    marginBottom: 4,
  },
  quotaTiersNote: {
    fontSize: FontSize.xs,
    color: '#64748b',
    marginBottom: Spacing.sm,
  },
  quotaTierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  quotaTierLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  quotaTierValue: {
    fontSize: FontSize.xs,
    color: '#334155',
  },
  totalItem: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: FontSize.xs - 1,
    color: Colors.gray500,
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#059669',
  },
  servicesSection: {
    marginTop: Spacing.md,
  },
  expandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  serviceCount: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
  },
  expandText: {
    fontSize: FontSize.xs - 1,
    color: Colors.gray400,
  },
  servicesList: {
    marginTop: Spacing.sm,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  serviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  accountTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  serviceName: {
    fontSize: FontSize.sm,
    color: Colors.gray700,
    textTransform: 'capitalize',
  },
  serviceType: {
    fontSize: FontSize.xs - 1,
    color: Colors.gray400,
  },
  serviceCommission: {
    alignItems: 'flex-end',
  },
  serviceCommissionValue: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: '#059669',
  },
  serviceCommissionAnnual: {
    fontSize: FontSize.xs - 1,
    color: Colors.gray500,
  },
  rateNote: {
    marginTop: Spacing.md,
    fontSize: FontSize.xs - 1,
    color: Colors.gray400,
    textAlign: 'right',
  },
});

export default GlobalCommissionSummary;
