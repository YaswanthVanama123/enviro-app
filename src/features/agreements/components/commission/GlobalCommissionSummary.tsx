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
  formatCurrency,
} from '../../hooks/useServiceCommission';
import {AccountTypeCache} from '../../hooks/useAccountTypeDetection';
import {useQuotaContext, QuotaLevel} from '../../context/QuotaContext';
import {type ResolvedCommissionRules} from '../../../admin/types/commission.types';
import {AccountType} from '../../../../services/api/endpoints/accountType.api';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

const ACCOUNT_TYPE_COLORS: Record<AccountType, {bg: string; text: string}> = {
  Anchor: {bg: '#fef3c7', text: '#92400e'},
  Bread5: {bg: '#d1fae5', text: '#065f46'},
  Bread15: {bg: '#dbeafe', text: '#1e40af'},
  Pit: {bg: '#fee2e2', text: '#991b1b'},
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

const TERM_LABEL: Record<string, string> = {
  '3-year': '3-year',
  '1-year': '1-year',
  'MTM-with-install': 'month-to-month',
};

const ACCOUNT_EXPLANATION: Record<AccountType, string> = {
  Anchor: 'High-value account ($200+/visit). No deduction + 150% bonus on excess revenue.',
  Bread5: 'Within 5 min drive to anchor. $50 revenue deduction applied.',
  Bread15: '5-15 min drive to anchor. $75 revenue deduction applied.',
  Pit: 'Over 15 min drive to anchor (Pit). First $100/visit earns no commission, $100–$200 at normal rate, and revenue above $200 earns a 150% anchor bonus (Greenline: 150% above $100).',
};

function fmtMoney(n: number): string {
  return new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', maximumFractionDigits: 0}).format(n || 0);
}
const fmtMoney2 = formatCurrency;

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
  onNewLocationChange?: (value: boolean) => void;
  addedToPayroll?: boolean;
  payrollPeriodLabel?: string;
  embedded?: boolean;
}

function Row({
  label,
  value,
  bold,
  valueColor,
  total,
}: {
  label: string;
  value: string;
  bold?: boolean;
  valueColor?: string;
  total?: boolean;
}) {
  return (
    <View style={[styles.detailRow, total && styles.detailTotalRow]}>
      <Text style={[styles.detailLabel, (bold || total) && styles.detailLabelBold]}>{label}</Text>
      <Text
        style={[
          styles.detailValue,
          (bold || total) && styles.detailValueBold,
          valueColor ? {color: valueColor} : null,
        ]}>
        {value}
      </Text>
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
  onNewLocationChange,
  addedToPayroll = false,
  payrollPeriodLabel,
  embedded = false,
}: GlobalCommissionSummaryProps) {
  const [expanded, setExpanded] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Record<number, boolean>>({});

  const {quotaLevel, baseCommissionRate, quotaLevelData} = useQuotaContext();
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

  const contractYears = contractMonths / 12;
  const contractYearsLabel = Number.isInteger(contractYears) ? String(contractYears) : contractYears.toFixed(1);
  const termLabel = TERM_LABEL[global.agreementTerm] || global.agreementTerm;
  const quotaLabel = quotaConfig.label;
  const quotaLevelRate =
    global.commissionTierBreakdown.find(t => t.level === quotaLevel)?.rate ?? commissionRate;
  const blendedQuotaRate =
    global.agreementMultiplier > 0
      ? global.effectiveCommissionRate / (global.agreementMultiplier / 100)
      : global.effectiveCommissionRate;
  const hasCommissionTiers = global.commissionTierBreakdown.some(t => t.base > 0);
  const totalWeekly = global.groups.reduce((s, g) => s + (g.weeklyCommission || 0), 0);

  const displayItems = global.groups.map(g => ({...g, serviceName: g.serviceNames.join(', ')}));

  const toggleService = (i: number) =>
    setExpandedServices(prev => ({...prev, [i]: !prev[i]}));

  if (global.serviceCount === 0) {
    return null;
  }

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
                  <Text style={styles.detectButtonText}>Connect to Bigin</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.warnBox}>
          <Text style={styles.warnText}>Please connect to Bigin to calculate commission.</Text>
        </View>
        {error && (
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, styles.infoTextFlex]}>{error}</Text>
          </View>
        )}
      </View>
    );
  }

  if (!isRouteStarMapped) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="cash-outline" size={16} color="#059669" />
            <Text style={styles.title}>Commission Summary</Text>
          </View>
        </View>
        <View style={styles.warnBox}>
          <Text style={[styles.warnText, styles.infoTextFlex]}>
            This company isn't mapped to a RouteStar customer yet. Map it under Pricing Details →
            Company Mapping to calculate commission and count it toward quota.
          </Text>
        </View>
        {error && (
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, styles.infoTextFlex]}>{error}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, embedded && styles.containerEmbedded]}>
      {addedToPayroll && (
        <View style={styles.payrollLock}>
          <Ionicons name="lock-closed" size={14} color="#5b21b6" />
          <Text style={styles.payrollLockText}>
            This agreement is already in payroll{payrollPeriodLabel ? ` (${payrollPeriodLabel})` : ''}. Changing it now will not change the payroll amount.
          </Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Commission Summary</Text>
          <Text style={styles.serviceCountText}>
            ({global.serviceCount} {global.serviceCount === 1 ? 'service' : 'services'})
          </Text>
          <View style={[styles.quotaBadge, {backgroundColor: quotaConfig.bgColor}]}>
            <Text style={[styles.quotaBadgeText, {color: quotaConfig.color}]}>
              {quotaLabel} ({quotaLevelRate}%)
            </Text>
          </View>
        </View>
        {showDetectButton && onDetect && !isDetecting && (
          <TouchableOpacity style={styles.detectButton} onPress={onDetect}>
            <Ionicons name="sync-outline" size={14} color="#ffffff" />
            <Text style={styles.detectButtonText}>Re-detect</Text>
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={[styles.errorText, styles.infoTextFlex]}>{error}</Text>
        </View>
      )}

      {/* Location type */}
      <View style={styles.locBlock}>
        <Text style={styles.locLabel}>Location type</Text>
        <View style={styles.segment}>
          <TouchableOpacity
            style={[styles.segmentBtn, isNewLocation && styles.segmentBtnActive]}
            activeOpacity={onNewLocationChange ? 0.7 : 1}
            onPress={() => onNewLocationChange?.(true)}>
            <Ionicons
              name="sparkles-outline"
              size={14}
              color={isNewLocation ? '#fff' : Colors.gray500}
            />
            <Text style={[styles.segmentText, isNewLocation && styles.segmentTextActive]}>
              New Location
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segmentBtn, !isNewLocation && styles.segmentBtnActive]}
            activeOpacity={onNewLocationChange ? 0.7 : 1}
            onPress={() => onNewLocationChange?.(false)}>
            <Ionicons
              name="business-outline"
              size={14}
              color={!isNewLocation ? '#fff' : Colors.gray500}
            />
            <Text style={[styles.segmentText, !isNewLocation && styles.segmentTextActive]}>
              Existing Location
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.locHint}>
          {isNewLocation
            ? 'Brand-new account — per-visit deductions apply for Pit/Bread account types.'
            : 'Converting an existing account (e.g. a Pit becoming an Anchor) — commission is paid on the full value with no per-visit deduction.'}
        </Text>
      </View>

      {/* Totals */}
      <View style={styles.totals}>
        {/* <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Weekly</Text>
          <Text style={styles.totalValue}>{fmtMoney2(totalWeekly)}</Text>
        </View> */}
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>Annual</Text>
          <Text style={styles.totalValue}>{global.formatted.totalAnnualCommission}</Text>
        </View>
        <View style={{flex: 1}} />
        <TouchableOpacity style={styles.toggleBtn} onPress={() => setExpanded(!expanded)}>
          <Text style={styles.toggleBtnText}>{expanded ? 'Hide Details' : 'Show Details'}</Text>
          <Text style={styles.toggleBtnCaret}>{expanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>
      </View>

      {/* Quota Tier Breakdown */}
      {global.quotaTierBreakdown.length > 0 && (
        <View style={styles.quotaTiers}>
          <Text style={styles.quotaTiersTitle}>Quota Tier Breakdown</Text>
          <Text style={styles.quotaTiersNote}>
            This agreement adds {fmtMoney(global.totalQuotaCredit)} of quota credit on top of{' '}
            {fmtMoney(global.priorQuotaCredit)} already earned this week (weekly target{' '}
            {fmtMoney(global.quotaTarget)}). It is split across rate tiers as:
          </Text>
          {global.quotaTierBreakdown
            .filter(tier => tier.quotaCredit > 0)
            .map(tier => (
              <View key={tier.level} style={styles.quotaTierRow}>
                <Text style={[styles.quotaTierLabel, {color: QUOTA_TIER_COLORS[tier.level]}]}>
                  {tier.label} @ {tier.rate}%
                </Text>
                <Text style={styles.quotaTierValue}>
                  {fmtMoney(tier.quotaCredit)} × {tier.rate}% = {fmtMoney(tier.commission)}
                </Text>
              </View>
            ))}
        </View>
      )}

      {/* Expanded — service breakdown */}
      {expanded && (
        <View style={styles.expanded}>
          <Text style={styles.breakdownTitle}>Service Breakdown</Text>

          {displayItems.map((service, index) => {
            const colors = service.accountType
              ? ACCOUNT_TYPE_COLORS[service.accountType]
              : {bg: '#f3f4f6', text: '#6b7280'};
            const serviceTiers = (service.commissionTiers || []).filter(t => t.base > 0);
            const hasServiceTiers = serviceTiers.length > 0;
            const isOpen = expandedServices[index] || false;
            const ft = service.farTiers;

            return (
              <View key={index} style={styles.serviceRow}>
                <TouchableOpacity style={styles.serviceRowHeader} onPress={() => toggleService(index)}>
                  <View style={styles.serviceNameLine}>
                    <Ionicons name={isOpen ? 'chevron-down' : 'chevron-forward'} size={14} color="#6b7280" />
                    <Text style={styles.serviceRowName}>{service.serviceName}</Text>
                  </View>
                  <View style={styles.serviceMetaLine}>
                    <View style={styles.serviceMetaLeft}>
                      {service.accountType && (
                        <View style={[styles.serviceBadge, {backgroundColor: colors.bg}]}>
                          <Text style={[styles.serviceBadgeText, {color: colors.text}]}>{service.accountType}</Text>
                        </View>
                      )}
                      <Text style={styles.serviceFreq}>{service.frequencyLabel}</Text>
                    </View>
                    <View style={styles.serviceCommissions}>
                      {/* <View style={styles.serviceCommItem}>
                        <Text style={styles.serviceCommLabel}>Weekly</Text>
                        <Text style={styles.serviceCommValue}>{fmtMoney2(service.weeklyCommission)}</Text>
                      </View> */}
                      <View style={styles.serviceCommItem}>
                        <Text style={styles.serviceCommLabel}>Annual</Text>
                        <Text style={styles.serviceCommValue}>{fmtMoney2(service.annualCommission)}</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>

                {isOpen && (
                  <View style={styles.serviceDetails}>
                    {/* Revenue Calculation */}
                    <Text style={styles.sectionTitle}>Revenue Calculation</Text>
                    <Row label={`Full Contract Revenue (${contractMonths} mo):`} value={fmtMoney2(service.perVisitRevenue * contractYears)} bold />
                    <Row label={`Annual Revenue (Contract ÷ ${contractYearsLabel} yr):`} value={fmtMoney2(service.perVisitRevenue)} valueColor="#059669" />
                    <Text style={styles.note}>
                      Commission is calculated on a 1-year basis, so the full {contractMonths}-month contract revenue is divided by {contractYearsLabel} to get the annual amount used below.
                    </Text>

                    {ft ? (
                      <>
                        <Row label="Original Per-Visit (Redline):" value={fmtMoney2(ft.originalPerVisit)} />
                        <Row label="Current Per-Visit:" value={fmtMoney2(ft.currentPerVisit)} />
                        <Row label="Price Ratio (Current ÷ Redline):" value={`${(ft.priceRatio * 100).toFixed(1)}%`} />
                        <Row label="Pricing Tier:" value={service.pricingTierLabel} bold />
                        <Row label="Pricing Multiplier:" value={`${service.pricingMultiplier.toFixed(2)}×`} valueColor={service.pricingMultiplier > 1 ? '#059669' : service.pricingMultiplier < 1 ? '#dc2626' : undefined} />
                        {service.pricingMultiplier !== 1 && (
                          <Row label={`Adjusted Per-Visit (${fmtMoney2(ft.currentPerVisit)} × ${service.pricingMultiplier.toFixed(2)}×):`} value={fmtMoney2(ft.adjustedPerVisit)} />
                        )}
                        {ft.priorPerVisit >= 0 && (
                          <Row label="Prior Same-Location Per-Visit:" value={fmtMoney2(ft.priorPerVisit)} />
                        )}
                        <Row label="Combined Per-Visit (prior + current):" value={fmtMoney2(ft.combinedPerVisit)} bold />
                        <Row label={`${fmtMoney2(0)}–${fmtMoney2(ft.pitThreshold)} (no commission):`} value={`${fmtMoney2(0)}/visit`} valueColor="#dc2626" />
                        {ft.anchorThreshold > ft.pitThreshold && (
                          <Row label={`${fmtMoney2(ft.pitThreshold)}–${fmtMoney2(ft.anchorThreshold)} (normal):`} value={`${fmtMoney2(ft.normalPerVisit)}/visit`} />
                        )}
                        <Row label={`Above ${fmtMoney2(ft.anchorThreshold)} (150%):`} value={`${fmtMoney2(ft.anchorPerVisit)} × 1.5 = ${fmtMoney2(ft.anchorPerVisit * 1.5)}/visit`} valueColor="#059669" />
                        <Row label="Commissionable Per-Visit:" value={fmtMoney2(ft.commissionablePerVisit)} total />
                        <Row label={`Annual Commissionable (${fmtMoney2(ft.commissionablePerVisit)} × ${service.visitsPerYear} visits):`} value={fmtMoney2(service.commissionableRevenue)} />
                      </>
                    ) : (
                      <>
                        <Row label="Original Annual (Redline):" value={fmtMoney2(service.annualOriginalRevenue)} />
                        <Row label="Current Annual Revenue:" value={fmtMoney2(service.perVisitRevenue)} />
                        <Row label="Price Ratio (Current ÷ Redline):" value={`${(service.priceRatio * 100).toFixed(1)}%`} />
                        <Row label="Pricing Tier:" value={service.pricingTierLabel} bold />
                        <Row label="Pricing Multiplier:" value={`${service.pricingMultiplier.toFixed(2)}×`} valueColor={service.pricingMultiplier > 1 ? '#059669' : service.pricingMultiplier < 1 ? '#dc2626' : undefined} />
                        {service.pricingMultiplier !== 1 && (
                          <Row label={`Adjusted Annual (${fmtMoney2(service.perVisitRevenue)} × ${service.pricingMultiplier.toFixed(2)}×):`} value={fmtMoney2(service.perVisitRevenue * service.pricingMultiplier)} />
                        )}
                        {service.revenueDeduction > 0 && (
                          <Row
                            label={`Account Type Deduction (${service.accountType}: ${fmtMoney(service.visitsPerYear > 0 ? service.revenueDeduction / service.visitsPerYear : 0)}/visit × ${service.visitsPerYear} visits):`}
                            value={`-${fmtMoney2(service.revenueDeduction)}`}
                            valueColor="#dc2626"
                          />
                        )}
                        {service.anchorBonus > 0 && (
                          <Row label="Anchor Bonus (150% on excess over $200):" value={`+$${service.anchorBonus.toFixed(2)}`} valueColor="#059669" />
                        )}
                        <Row label="Commissionable Revenue:" value={fmtMoney2(service.commissionableRevenue)} total />
                      </>
                    )}

                    {/* Commission Rate Calculation */}
                    <Text style={styles.sectionTitle}>Commission Rate Calculation</Text>
                    {hasServiceTiers ? (
                      serviceTiers.map(tier => (
                        <Row
                          key={tier.level}
                          label={`${QUOTA_LEVEL_CONFIG[tier.level].label} Rate:`}
                          value={`${tier.rate}% × ${global.agreementMultiplier}% = ${tier.effectiveRate.toFixed(2)}%`}
                          valueColor={QUOTA_TIER_COLORS[tier.level]}
                        />
                      ))
                    ) : (
                      <>
                        <Row label={`Base Commission Rate (${quotaLabel}):`} value={`${commissionRate}%`} valueColor={quotaConfig.color} />
                        <Row label={`Effective Rate (${commissionRate}% × ${global.agreementMultiplier}%):`} value={`${global.effectiveCommissionRate.toFixed(2)}%`} valueColor="#1d4ed8" total />
                      </>
                    )}
                    <View style={styles.multiplierNote}>
                      <Text style={styles.multiplierNoteText}>
                        The {global.agreementMultiplier}% multiplier is applied because this is a {termLabel} agreement.
                      </Text>
                    </View>

                    {/* Commission Calculation */}
                    <Text style={styles.sectionTitle}>Commission Calculation</Text>
                    {hasServiceTiers ? (
                      serviceTiers.map(tier => (
                        <Row
                          key={tier.level}
                          label={`${QUOTA_LEVEL_CONFIG[tier.level].label} (${fmtMoney(tier.quotaCredit ?? 0)} quota credit @ ${tier.effectiveRate.toFixed(2)}%):`}
                          value={fmtMoney(tier.commission)}
                          valueColor={QUOTA_TIER_COLORS[tier.level]}
                        />
                      ))
                    ) : (
                      <Row
                        label={`Per-Visit Commission (${fmtMoney2(service.commissionableRevenue)} × ${global.effectiveCommissionRate.toFixed(2)}%):`}
                        value={fmtMoney2(service.perVisitCommission)}
                        valueColor="#059669"
                      />
                    )}
                    <Row
                      label={hasServiceTiers ? 'Annual Commission (sum of tiers):' : 'Annual Commission:'}
                      value={fmtMoney2(service.annualCommission)}
                      valueColor="#059669"
                      total
                    />

                    {/* Account type explanation */}
                    {service.accountType && (
                      <View style={[styles.accountInfo, {backgroundColor: colors.bg}]}>
                        <Text style={[styles.accountInfoTitle, {color: colors.text}]}>
                          Account Type: {service.accountType}
                        </Text>
                        <Text style={[styles.accountInfoText, {color: colors.text}]}>
                          {ACCOUNT_EXPLANATION[service.accountType]}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })}

          <Text style={styles.rateFooter}>
            Rate: {blendedQuotaRate.toFixed(2)}% × {global.agreementMultiplier}% = {global.effectiveCommissionRate.toFixed(2)}%
          </Text>
        </View>
      )}

      {!expanded && (
        <Text style={styles.rateFooter}>
          Rate: {blendedQuotaRate.toFixed(2)}% × {global.agreementMultiplier}% = {global.effectiveCommissionRate.toFixed(2)}%
        </Text>
      )}
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
  containerEmbedded: {
    borderWidth: 0,
    borderRadius: 0,
    padding: 0,
    marginTop: 0,
  },
  payrollLock: {
    backgroundColor: '#ede9fe',
    borderColor: '#c4b5fd',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  payrollLockText: {color: '#5b21b6', fontSize: FontSize.xs, fontWeight: '700', flex: 1},
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  titleRow: {flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, flexWrap: 'wrap'},
  title: {fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray800},
  serviceCountText: {fontSize: FontSize.xs, color: Colors.gray500},
  quotaBadge: {paddingVertical: 2, paddingHorizontal: 8, borderRadius: Radius.sm},
  quotaBadgeText: {fontSize: FontSize.xs - 1, fontWeight: '700'},
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#3b82f6',
    borderRadius: Radius.sm,
  },
  detectButtonDisabled: {backgroundColor: Colors.gray400},
  detectButtonText: {fontSize: FontSize.xs, color: '#ffffff', fontWeight: '600'},
  warnBox: {padding: Spacing.sm, backgroundColor: '#fef3c7', borderRadius: Radius.sm, marginBottom: Spacing.sm},
  warnText: {fontSize: FontSize.xs, color: '#92400e'},
  errorBox: {padding: Spacing.sm, backgroundColor: '#fee2e2', borderRadius: Radius.sm, marginBottom: Spacing.sm},
  errorText: {fontSize: FontSize.xs, color: '#991b1b'},
  infoTextFlex: {flex: 1},
  locBlock: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  locLabel: {
    fontSize: FontSize.xs - 1,
    fontWeight: '700',
    color: Colors.gray500,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 6,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: Radius.md,
    padding: 3,
    gap: 3,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: Radius.sm,
  },
  segmentBtnActive: {
    backgroundColor: Colors.primary,
  },
  segmentText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray600,
  },
  segmentTextActive: {
    color: '#fff',
  },
  locHint: {
    fontSize: FontSize.xs,
    color: '#6b7280',
    lineHeight: 15,
    marginTop: 6,
  },
  totals: {flexDirection: 'row', alignItems: 'center', gap: Spacing.lg, marginVertical: Spacing.sm},
  totalItem: {alignItems: 'flex-start'},
  totalLabel: {fontSize: FontSize.xs - 1, color: Colors.gray500, letterSpacing: 0.3},
  totalValue: {fontSize: FontSize.lg, fontWeight: '700', color: '#059669'},
  toggleBtn: {flexDirection: 'row', alignItems: 'center', gap: 4},
  toggleBtnText: {fontSize: FontSize.xs, fontWeight: '600', color: Colors.primary},
  toggleBtnCaret: {fontSize: 9, color: Colors.primary},
  quotaTiers: {
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: '#f8fafc',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  quotaTiersTitle: {fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray800, marginBottom: 4},
  quotaTiersNote: {fontSize: FontSize.xs, color: '#64748b', marginBottom: Spacing.sm, lineHeight: 15},
  quotaTierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    borderStyle: 'dashed',
    gap: 8,
  },
  quotaTierLabel: {fontSize: FontSize.xs, fontWeight: '700'},
  quotaTierValue: {fontSize: FontSize.xs, color: '#334155', textAlign: 'right'},
  expanded: {marginTop: Spacing.sm},
  breakdownTitle: {fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray800, marginBottom: Spacing.sm},
  serviceRow: {
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  serviceRowHeader: {
    padding: Spacing.sm,
    backgroundColor: '#f9fafb',
    gap: 8,
  },
  serviceNameLine: {flexDirection: 'row', alignItems: 'center', gap: 6},
  serviceRowName: {flex: 1, fontSize: FontSize.sm, fontWeight: '700', color: Colors.gray800},
  serviceMetaLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingLeft: 20,
  },
  serviceMetaLeft: {flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, flexWrap: 'wrap'},
  serviceBadge: {paddingVertical: 1, paddingHorizontal: 6, borderRadius: 4},
  serviceBadgeText: {fontSize: FontSize.xs - 1, fontWeight: '700'},
  serviceFreq: {fontSize: FontSize.xs - 1, color: Colors.gray500},
  serviceCommissions: {flexDirection: 'row', gap: Spacing.md},
  serviceCommItem: {alignItems: 'flex-end'},
  serviceCommLabel: {fontSize: FontSize.xs - 1, color: Colors.gray500},
  serviceCommValue: {fontSize: FontSize.xs, fontWeight: '700', color: '#059669'},
  serviceDetails: {paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, backgroundColor: '#ffffff'},
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.gray700,
    marginTop: Spacing.sm,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 3,
    gap: 8,
  },
  detailTotalRow: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    marginTop: 2,
    paddingTop: 5,
  },
  detailLabel: {fontSize: FontSize.xs, color: '#6b7280', flex: 1},
  detailLabelBold: {fontWeight: '700', color: '#374151'},
  detailValue: {fontSize: FontSize.xs, color: '#1f2937', fontWeight: '500', textAlign: 'right'},
  detailValueBold: {fontWeight: '700'},
  note: {fontSize: FontSize.xs, color: '#6b7280', lineHeight: 15, marginVertical: 4},
  multiplierNote: {
    marginTop: Spacing.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
    borderRadius: 9999,
    alignSelf: 'flex-start',
  },
  multiplierNoteText: {fontSize: FontSize.xs, fontWeight: '600', color: '#1d4ed8', lineHeight: 16},
  accountInfo: {marginTop: Spacing.sm, padding: Spacing.sm, borderRadius: Radius.sm},
  accountInfoTitle: {fontSize: FontSize.xs, fontWeight: '700', marginBottom: 2},
  accountInfoText: {fontSize: FontSize.xs, lineHeight: 15},
  rateFooter: {
    marginTop: Spacing.md,
    fontSize: FontSize.xs,
    color: Colors.gray500,
    textAlign: 'right',
    fontWeight: '600',
  },
});

export default GlobalCommissionSummary;
