import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors, Spacing, Radius, FontSize} from '../../../theme';
import {quotaApi, agreementApi} from '../../../services/api/endpoints/quota.api';
import {useAuth} from '../../admin/context/AdminAuthContext';
import type {
  QuotaStatusResponse,
  QuotaPeriod,
  Agreement,
} from '../../admin/types/quota.types';
import {
  getQuotaLevelColor,
  getQuotaLevelBgColor,
  getQuotaCommissionRate,
  formatCurrency,
  formatPercentage,
  getAgreementTermLabel,
  getAgreementStatusColor,
  getAgreementStatusBgColor,
} from '../../admin/types/quota.types';

type PeriodType = 'monthly' | 'quarterly' | 'annual';

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function MyQuotaScreen() {
  const {user} = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatusResponse | null>(null);
  const [quotaHistory, setQuotaHistory] = useState<QuotaPeriod[]>([]);
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [expandedAgreementId, setExpandedAgreementId] = useState<string | null>(null);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (!user?.username) {
      setError('Please log in to view your quota');
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [statusResult, historyResult] = await Promise.all([
        quotaApi.getStatus(user.username, {periodType}),
        quotaApi.getHistory(user.username, 6),
      ]);

      setQuotaStatus(statusResult);
      setQuotaHistory(historyResult || []);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quota data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.username, periodType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getQuotaLevelLabel = (level: 'below' | 'above' | 'double'): string => {
    switch (level) {
      case 'double':
        return 'Double Quota';
      case 'above':
        return 'Above Quota';
      case 'below':
        return 'Below Quota';
      default:
        return level;
    }
  };

  const getProgressPercentage = (actual: number, target: number): number => {
    if (target <= 0) return 0;
    return Math.min((actual / target) * 100, 200); 
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading quota data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.error}>
          <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!quotaStatus) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.empty}>
          <Ionicons name="trending-up-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Quota Data</Text>
          <Text style={styles.emptyText}>
            Your quota information is not available yet.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const progressPercent = getProgressPercentage(
    quotaStatus.quota.actual,
    quotaStatus.quota.target
  );
  const quotaLevelColor = getQuotaLevelColor(quotaStatus.quota.level);
  const quotaLevelBg = getQuotaLevelBgColor(quotaStatus.quota.level);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            colors={[Colors.primary]}
          />
        }>
        {}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.iconBox}>
              <Ionicons name="trending-up" size={24} color={Colors.primary} />
            </View>
            <View style={styles.titleContent}>
              <Text style={styles.title}>My Quota</Text>
              <Text style={styles.subtitle}>
                {quotaStatus.salesPerson.name}
              </Text>
            </View>
          </View>
        </View>

        {}
        <View style={styles.periodToggle}>
          {(['monthly', 'quarterly', 'annual'] as PeriodType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.periodBtn,
                periodType === type && styles.periodBtnActive,
              ]}
              onPress={() => setPeriodType(type)}>
              <Text
                style={[
                  styles.periodBtnText,
                  periodType === type && styles.periodBtnTextActive,
                ]}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {}
        <View style={styles.quotaCard}>
          <View style={styles.periodLabel}>
            <Text style={styles.periodLabelText}>{quotaStatus.period.label}</Text>
            <Text style={styles.periodDates}>
              {formatDate(quotaStatus.period.start)} - {formatDate(quotaStatus.period.end)}
            </Text>
          </View>

          {}
          <View style={styles.progressSection}>
            <View style={[styles.quotaLevelBadge, {backgroundColor: quotaLevelBg}]}>
              <Ionicons
                name={
                  quotaStatus.quota.level === 'double'
                    ? 'trophy'
                    : quotaStatus.quota.level === 'above'
                    ? 'arrow-up-circle'
                    : 'arrow-down-circle'
                }
                size={20}
                color={quotaLevelColor}
              />
              <Text style={[styles.quotaLevelText, {color: quotaLevelColor}]}>
                {getQuotaLevelLabel(quotaStatus.quota.level)}
              </Text>
            </View>

            <Text style={styles.percentageMain}>
              {formatPercentage(quotaStatus.quota.percentage)}
            </Text>
            <Text style={styles.percentageLabel}>of quota</Text>

            {}
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(progressPercent, 100)}%`,
                    backgroundColor: quotaLevelColor,
                  },
                ]}
              />
              {}
              <View style={styles.progressMarker100} />
              {}
              {progressPercent > 100 && (
                <View
                  style={[
                    styles.progressFillDouble,
                    {
                      width: `${Math.min(progressPercent - 100, 100)}%`,
                      backgroundColor: '#16a34a',
                    },
                  ]}
                />
              )}
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>0%</Text>
              <Text style={styles.progressLabel}>100%</Text>
              <Text style={styles.progressLabel}>200%</Text>
            </View>
          </View>

          {}
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Target</Text>
              <Text style={styles.statValue}>
                {formatCurrency(quotaStatus.quota.target)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Actual</Text>
              <Text style={[styles.statValue, {color: quotaLevelColor}]}>
                {formatCurrency(quotaStatus.quota.actual)}
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Commission Rate</Text>
              <Text style={[styles.statValue, styles.statValueHighlight]}>
                {quotaStatus.quota.commissionRate}%
              </Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Earned</Text>
              <Text style={[styles.statValue, {color: '#16a34a'}]}>
                {formatCurrency(quotaStatus.commission.earned)}
              </Text>
            </View>
          </View>
        </View>

        {}
        <View style={styles.progressCard}>
          <Text style={styles.cardTitle}>Progress to Next Tier</Text>

          {quotaStatus.quota.level !== 'double' && (
            <>
              {quotaStatus.quota.level === 'below' && (
                <View style={styles.tierProgress}>
                  <View style={styles.tierInfo}>
                    <View style={[styles.tierBadge, {backgroundColor: '#dbeafe'}]}>
                      <Ionicons name="arrow-up" size={14} color="#2563eb" />
                      <Text style={[styles.tierBadgeText, {color: '#2563eb'}]}>
                        Above Quota (6%)
                      </Text>
                    </View>
                    <Text style={styles.tierAmount}>
                      {formatCurrency(quotaStatus.progress.toReachQuota)} more needed
                    </Text>
                  </View>
                  <View style={styles.tierProgressBar}>
                    <View
                      style={[
                        styles.tierProgressFill,
                        {
                          width: `${Math.min(
                            (quotaStatus.quota.actual / quotaStatus.quota.target) * 100,
                            100
                          )}%`,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}

              <View style={styles.tierProgress}>
                <View style={styles.tierInfo}>
                  <View style={[styles.tierBadge, {backgroundColor: '#dcfce7'}]}>
                    <Ionicons name="trophy" size={14} color="#16a34a" />
                    <Text style={[styles.tierBadgeText, {color: '#16a34a'}]}>
                      Double Quota (9%)
                    </Text>
                  </View>
                  <Text style={styles.tierAmount}>
                    {formatCurrency(quotaStatus.progress.toReachDouble)} more needed
                  </Text>
                </View>
                <View style={styles.tierProgressBar}>
                  <View
                    style={[
                      styles.tierProgressFill,
                      {
                        width: `${Math.min(
                          (quotaStatus.quota.actual / (quotaStatus.quota.target * 2)) * 100,
                          100
                        )}%`,
                        backgroundColor: '#16a34a',
                      },
                    ]}
                  />
                </View>
              </View>
            </>
          )}

          {quotaStatus.quota.level === 'double' && (
            <View style={styles.achievedBanner}>
              <Ionicons name="trophy" size={32} color="#16a34a" />
              <Text style={styles.achievedText}>
                Congratulations! You've reached Double Quota!
              </Text>
              <Text style={styles.achievedSubtext}>
                Earning 9% commission rate
              </Text>
            </View>
          )}
        </View>

        {/* Agreement Stats */}
        <View style={styles.statsCard}>
          <Text style={styles.cardTitle}>Agreement Stats</Text>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statBoxValue}>
                {quotaStatus.progress.agreementCount}
              </Text>
              <Text style={styles.statBoxLabel}>Total</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statBoxValue, {color: '#2563eb'}]}>
                {quotaStatus.progress.newBusinessCount}
              </Text>
              <Text style={styles.statBoxLabel}>New Business</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statBoxValue, {color: '#8b5cf6'}]}>
                {quotaStatus.progress.renewalCount}
              </Text>
              <Text style={styles.statBoxLabel}>Renewals</Text>
            </View>
          </View>
        </View>

        {/* Recent Agreements */}
        {quotaStatus.recentAgreements && quotaStatus.recentAgreements.length > 0 && (
          <View style={styles.recentSection}>
            <Text style={styles.cardTitle}>Recent Agreements</Text>
            {quotaStatus.recentAgreements.map((agreement) => (
              <TouchableOpacity
                key={agreement._id}
                style={styles.agreementCard}
                activeOpacity={0.7}
                onPress={() =>
                  setExpandedAgreementId(
                    expandedAgreementId === agreement._id ? null : agreement._id
                  )
                }>
                <View style={styles.agreementHeader}>
                  <View style={styles.agreementInfo}>
                    <Text style={styles.agreementTitle} numberOfLines={1}>
                      {agreement.customer.name}
                    </Text>
                    <View style={styles.agreementMeta}>
                      <View
                        style={[
                          styles.statusBadge,
                          {backgroundColor: getAgreementStatusBgColor(agreement.status)},
                        ]}>
                        <Text
                          style={[
                            styles.statusBadgeText,
                            {color: getAgreementStatusColor(agreement.status)},
                          ]}>
                          {agreement.status}
                        </Text>
                      </View>
                      <Text style={styles.metaSep}>.</Text>
                      <Text style={styles.metaText}>
                        {getAgreementTermLabel(agreement.agreementTerm)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.agreementValue}>
                    <Text style={styles.agreementValueText}>
                      {formatCurrency(agreement.monthlyValue)}/mo
                    </Text>
                  </View>
                </View>

                {expandedAgreementId === agreement._id && (
                  <View style={styles.agreementDetails}>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Contract Value</Text>
                      <Text style={styles.detailValue}>
                        {formatCurrency(agreement.totalContractValue)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Account Type</Text>
                      <Text style={styles.detailValue}>{agreement.accountType}</Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Commission</Text>
                      <Text style={[styles.detailValue, {color: '#16a34a'}]}>
                        {formatCurrency(agreement.commission.totalCommission)}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Signed Date</Text>
                      <Text style={styles.detailValue}>
                        {formatDate(agreement.signedDate)}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quota History */}
        {quotaHistory.length > 0 && (
          <View style={styles.historySection}>
            <Text style={styles.cardTitle}>Quota History</Text>
            {quotaHistory.map((period) => (
              <View key={period._id} style={styles.historyCard}>
                <View style={styles.historyHeader}>
                  <Text style={styles.historyPeriod}>{period.periodLabel}</Text>
                  <View
                    style={[
                      styles.historyBadge,
                      {backgroundColor: getQuotaLevelBgColor(period.quotaLevel)},
                    ]}>
                    <Text
                      style={[
                        styles.historyBadgeText,
                        {color: getQuotaLevelColor(period.quotaLevel)},
                      ]}>
                      {formatPercentage(period.quotaPercentage)}
                    </Text>
                  </View>
                </View>
                <View style={styles.historyStats}>
                  <View style={styles.historyStat}>
                    <Text style={styles.historyStatLabel}>Sales</Text>
                    <Text style={styles.historyStatValue}>
                      {formatCurrency(period.actualSales)}
                    </Text>
                  </View>
                  <View style={styles.historyStat}>
                    <Text style={styles.historyStatLabel}>Target</Text>
                    <Text style={styles.historyStatValue}>
                      {formatCurrency(period.quotaTarget)}
                    </Text>
                  </View>
                  <View style={styles.historyStat}>
                    <Text style={styles.historyStatLabel}>Commission</Text>
                    <Text style={[styles.historyStatValue, {color: '#16a34a'}]}>
                      {formatCurrency(period.totalCommissionEarned)}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{height: 100}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scroll: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#dc2626',
    marginTop: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  retryBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  periodToggle: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  periodBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  periodBtnActive: {
    backgroundColor: Colors.primary,
  },
  periodBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  periodBtnTextActive: {
    color: '#fff',
  },
  quotaCard: {
    backgroundColor: '#fff',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  periodLabel: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  periodLabelText: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  periodDates: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  progressSection: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  quotaLevelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  quotaLevelText: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  percentageMain: {
    fontSize: 48,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  percentageLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: -4,
  },
  progressBar: {
    width: '100%',
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 6,
    marginTop: Spacing.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressFillDouble: {
    position: 'absolute',
    left: '50%',
    height: '100%',
  },
  progressMarker100: {
    position: 'absolute',
    left: '50%',
    top: -2,
    width: 2,
    height: 16,
    backgroundColor: '#374151',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
  },
  progressLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  statItem: {
    width: '48%',
    backgroundColor: '#f9fafb',
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: 4,
  },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statValueHighlight: {
    color: Colors.primary,
  },
  progressCard: {
    backgroundColor: '#fff',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  tierProgress: {
    marginBottom: Spacing.md,
  },
  tierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  tierBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  tierAmount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  tierProgressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  tierProgressFill: {
    height: '100%',
    backgroundColor: '#2563eb',
    borderRadius: 3,
  },
  achievedBanner: {
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: '#dcfce7',
    borderRadius: Radius.md,
  },
  achievedText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#16a34a',
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  achievedSubtext: {
    fontSize: FontSize.sm,
    color: '#059669',
    marginTop: 4,
  },
  statsCard: {
    backgroundColor: '#fff',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#f9fafb',
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statBoxValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statBoxLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  recentSection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  agreementCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: Spacing.sm,
    overflow: 'hidden',
  },
  agreementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
  },
  agreementInfo: {
    flex: 1,
  },
  agreementTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  agreementMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  metaSep: {
    color: '#d1d5db',
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  agreementValue: {
    alignItems: 'flex-end',
  },
  agreementValueText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  agreementDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: Spacing.md,
    backgroundColor: '#fafafa',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
  detailLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  detailValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  historySection: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  historyPeriod: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  historyBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  historyBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  historyStats: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  historyStat: {
    flex: 1,
  },
  historyStatLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  historyStatValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});

export default MyQuotaScreen;
