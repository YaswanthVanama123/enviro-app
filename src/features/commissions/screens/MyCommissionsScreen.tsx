import React, {useState, useEffect, useMemo} from 'react';
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
import {agreementsApi} from '../../../services/api/endpoints/agreements.api';
import {useAdminAuth} from '../../admin/context/AdminAuthContext';

interface CommissionBreakdown {
  baseRate: number;
  agreementTerm: string;
  multiplier: number;
  accountTypeAdjustment: number;
  greenlineBonus: number;
  insideSalesDeduction: number;
}

interface CommissionData {
  rate: number;
  monthly: number;
  total: number;
  breakdown: CommissionBreakdown;
}

interface AgreementCommission {
  id: string;
  title: string;
  status: string;
  createdAt: string;
  startDate: string | null;
  contractMonths: number;
  monthlyValue: number;
  contractValue: number;
  commission: CommissionData;
}

interface CommissionTotals {
  totalAgreements: number;
  totalMonthlyCommission: number;
  totalContractCommission: number;
  totalContractValue: number;
  averageCommissionRate: number;
}

interface StatusSummary {
  count: number;
  commission: number;
}

interface CommissionsResponse {
  success: boolean;
  user: string;
  totals: CommissionTotals;
  byStatus: {
    draft: StatusSummary;
    saved: StatusSummary;
    pending: StatusSummary;
    approved: StatusSummary;
    active: StatusSummary;
  };
  commissions: AgreementCommission[];
}

const STATUS_COLORS: Record<string, {bg: string; text: string}> = {
  draft: {bg: '#f3f4f6', text: '#6b7280'},
  saved: {bg: '#dbeafe', text: '#1d4ed8'},
  pending_approval: {bg: '#fef3c7', text: '#92400e'},
  approved_salesman: {bg: '#d1fae5', text: '#065f46'},
  approved_admin: {bg: '#064e3b', text: '#ffffff'},
  active: {bg: '#dcfce7', text: '#16a34a'},
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  saved: 'Saved',
  pending_approval: 'Pending',
  approved_salesman: 'Approved',
  approved_admin: 'Admin Approved',
  active: 'Active',
};

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function MyCommissionsScreen() {
  const {adminUser} = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CommissionsResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const response = await agreementsApi.getUserCommissions();
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch commissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCommissions = useMemo(() => {
    if (!data?.commissions) return [];
    if (statusFilter === 'all') return data.commissions;
    return data.commissions.filter(c => {
      if (statusFilter === 'approved') {
        return c.status === 'approved_salesman' || c.status === 'approved_admin';
      }
      return c.status === statusFilter;
    });
  }, [data?.commissions, statusFilter]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading commissions...</Text>
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

  if (!data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.empty}>
          <Ionicons name="calculator-outline" size={48} color="#9ca3af" />
          <Text style={styles.emptyTitle}>No Data</Text>
          <Text style={styles.emptyText}>No commission data available.</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.iconBox}>
              <Ionicons name="calculator" size={24} color={Colors.primary} />
            </View>
            <View style={styles.titleContent}>
              <Text style={styles.title}>My Commissions</Text>
              <Text style={styles.subtitle}>
                {adminUser?.fullName || adminUser?.username || data.user}
              </Text>
            </View>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
            <View style={styles.summaryIconPrimary}>
              <Text style={styles.summaryIconText}>$</Text>
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabelPrimary}>Total Commission</Text>
              <Text style={styles.summaryValuePrimary}>
                {formatMoney(data.totals.totalContractCommission)}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, styles.summaryCardSmall]}>
              <Text style={styles.summaryLabelSmall}>Monthly</Text>
              <Text style={styles.summaryValueSmall}>
                {formatMoney(data.totals.totalMonthlyCommission)}
              </Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryCardSmall]}>
              <Text style={styles.summaryLabelSmall}>Agreements</Text>
              <Text style={styles.summaryValueSmall}>{data.totals.totalAgreements}</Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryCardSmall]}>
              <Text style={styles.summaryLabelSmall}>Avg Rate</Text>
              <Text style={styles.summaryValueSmall}>{data.totals.averageCommissionRate}%</Text>
            </View>
          </View>
        </View>

        {/* Status Filters */}
        <View style={styles.filterSection}>
          <Text style={styles.sectionTitle}>Filter by Status</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.filterChips}>
              <TouchableOpacity
                style={[styles.filterChip, statusFilter === 'all' && styles.filterChipActive]}
                onPress={() => setStatusFilter('all')}>
                <Text
                  style={[
                    styles.filterChipText,
                    statusFilter === 'all' && styles.filterChipTextActive,
                  ]}>
                  All ({data.totals.totalAgreements})
                </Text>
              </TouchableOpacity>
              {Object.entries(data.byStatus).map(
                ([key, value]) =>
                  value.count > 0 && (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.filterChip,
                        statusFilter === key && styles.filterChipActive,
                      ]}
                      onPress={() => setStatusFilter(key)}>
                      <Text
                        style={[
                          styles.filterChipText,
                          statusFilter === key && styles.filterChipTextActive,
                        ]}>
                        {key.charAt(0).toUpperCase() + key.slice(1)} ({value.count})
                      </Text>
                    </TouchableOpacity>
                  ),
              )}
            </View>
          </ScrollView>
        </View>

        {/* Agreements List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>
            Agreements ({filteredCommissions.length})
          </Text>

          {filteredCommissions.length === 0 ? (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>No agreements found for this filter.</Text>
            </View>
          ) : (
            filteredCommissions.map(agreement => {
              const statusStyle = STATUS_COLORS[agreement.status] || STATUS_COLORS.draft;
              const isExpanded = expandedId === agreement.id;

              return (
                <View
                  key={agreement.id}
                  style={[styles.agreementCard, isExpanded && styles.agreementCardExpanded]}>
                  <TouchableOpacity
                    style={styles.agreementHeader}
                    activeOpacity={0.7}
                    onPress={() => setExpandedId(isExpanded ? null : agreement.id)}>
                    <View style={styles.agreementInfo}>
                      <Text style={styles.agreementTitle} numberOfLines={1}>
                        {agreement.title}
                      </Text>
                      <View style={styles.agreementMeta}>
                        <View
                          style={[
                            styles.statusBadge,
                            {backgroundColor: statusStyle.bg},
                          ]}>
                          <Text style={[styles.statusBadgeText, {color: statusStyle.text}]}>
                            {STATUS_LABELS[agreement.status] || agreement.status}
                          </Text>
                        </View>
                        <Text style={styles.metaSep}>·</Text>
                        <Text style={styles.metaText}>{agreement.contractMonths}mo</Text>
                        <Text style={styles.metaSep}>·</Text>
                        <Text style={styles.metaText}>{formatDate(agreement.createdAt)}</Text>
                      </View>
                    </View>

                    <View style={styles.agreementAmounts}>
                      <Text style={styles.amountLabel}>Commission</Text>
                      <Text style={styles.amountValue}>
                        {formatMoney(agreement.commission.total)}
                      </Text>
                      <View style={styles.rateBadge}>
                        <Text style={styles.rateBadgeText}>{agreement.commission.rate}%</Text>
                      </View>
                    </View>

                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color={isExpanded ? Colors.primary : '#9ca3af'}
                    />
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.agreementDetails}>
                      <Text style={styles.detailsTitle}>Commission Breakdown</Text>

                      <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>Monthly Value</Text>
                        <Text style={styles.breakdownValue}>
                          {formatMoney(agreement.monthlyValue)}
                        </Text>
                      </View>

                      <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>
                          Base Rate ({agreement.commission.breakdown.agreementTerm})
                        </Text>
                        <Text style={styles.breakdownValue}>
                          {agreement.commission.breakdown.baseRate}%
                        </Text>
                      </View>

                      <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>Agreement Multiplier</Text>
                        <Text style={styles.breakdownValue}>
                          {agreement.commission.breakdown.multiplier}%
                        </Text>
                      </View>

                      {agreement.commission.breakdown.accountTypeAdjustment !== 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>Account Type Adjustment</Text>
                          <Text
                            style={[
                              styles.breakdownValue,
                              agreement.commission.breakdown.accountTypeAdjustment < 0
                                ? styles.deduction
                                : styles.bonus,
                            ]}>
                            {agreement.commission.breakdown.accountTypeAdjustment > 0
                              ? '+'
                              : ''}
                            {agreement.commission.breakdown.accountTypeAdjustment}%
                          </Text>
                        </View>
                      )}

                      {agreement.commission.breakdown.greenlineBonus > 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>Greenline Bonus</Text>
                          <Text style={[styles.breakdownValue, styles.bonus]}>
                            +{agreement.commission.breakdown.greenlineBonus}%
                          </Text>
                        </View>
                      )}

                      {agreement.commission.breakdown.insideSalesDeduction !== 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>Inside Sales Deduction</Text>
                          <Text style={[styles.breakdownValue, styles.deduction]}>
                            {agreement.commission.breakdown.insideSalesDeduction}%
                          </Text>
                        </View>
                      )}

                      <View style={[styles.breakdownItem, styles.breakdownItemTotal]}>
                        <Text style={styles.breakdownLabelTotal}>Final Rate</Text>
                        <Text style={styles.breakdownValueTotal}>{agreement.commission.rate}%</Text>
                      </View>

                      <View style={[styles.breakdownItem, styles.breakdownItemTotal]}>
                        <Text style={styles.breakdownLabelTotal}>Monthly Commission</Text>
                        <Text style={styles.breakdownValueTotal}>
                          {formatMoney(agreement.commission.monthly)}
                        </Text>
                      </View>

                      <View style={[styles.breakdownItem, styles.breakdownItemTotal]}>
                        <Text style={styles.breakdownLabelTotal}>Contract Total</Text>
                        <Text style={styles.breakdownValueTotal}>
                          {formatMoney(agreement.commission.total)}
                        </Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

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
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
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
  summaryGrid: {
    paddingHorizontal: Spacing.lg,
    marginTop: -Spacing.lg,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryCardPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  summaryIconPrimary: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.primary,
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabelPrimary: {
    fontSize: FontSize.xs,
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryValuePrimary: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  summaryCardSmall: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  summaryLabelSmall: {
    fontSize: FontSize.xs,
    color: '#6b7280',
    marginBottom: 4,
  },
  summaryValueSmall: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  filterSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  filterChips: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingRight: Spacing.lg,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  listSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.lg,
  },
  noResults: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  noResultsText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
  agreementCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  agreementCardExpanded: {
    borderColor: Colors.primary,
  },
  agreementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  agreementInfo: {
    flex: 1,
    minWidth: 0,
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
    flexWrap: 'wrap',
    gap: 4,
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  metaSep: {
    color: '#d1d5db',
    fontSize: FontSize.xs,
  },
  metaText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  agreementAmounts: {
    alignItems: 'flex-end',
    gap: 2,
  },
  amountLabel: {
    fontSize: 10,
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  amountValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#16a34a',
  },
  rateBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  rateBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#16a34a',
  },
  agreementDetails: {
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    padding: Spacing.md,
    backgroundColor: '#fafafa',
  },
  detailsTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    backgroundColor: '#fff',
    borderRadius: Radius.sm,
    marginBottom: 4,
  },
  breakdownLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  breakdownValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  bonus: {
    color: '#16a34a',
  },
  deduction: {
    color: '#dc2626',
  },
  breakdownItemTotal: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  breakdownLabelTotal: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  breakdownValueTotal: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
});

export default MyCommissionsScreen;
