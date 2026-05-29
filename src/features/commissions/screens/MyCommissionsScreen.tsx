import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  quotaLevel?: string | null;
}

interface CommissionData {
  rate: number;
  weekly: number;
  monthly: number;
  annual: number;
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
  totalWeeklyCommission: number;
  totalMonthlyCommission: number;
  totalAnnualCommission: number;
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

// Time period filter options
type TimePeriod = 'all' | 'weekly' | '14days' | 'monthly' | 'quarterly' | 'annually' | 'custom';

const TIME_PERIOD_OPTIONS: {key: TimePeriod; label: string}[] = [
  {key: 'all', label: 'All Time'},
  {key: 'weekly', label: 'This Week'},
  {key: '14days', label: '14 Days'},
  {key: 'monthly', label: 'This Month'},
  {key: 'quarterly', label: 'Quarter'},
  {key: 'annually', label: 'This Year'},
  {key: 'custom', label: 'Custom'},
];

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPercent(value: number): string {
  return value.toFixed(2);
}

// Helper to format quota level for display
function formatQuotaLevel(quotaLevel: string | null | undefined): string {
  if (!quotaLevel) return '';
  const level = quotaLevel.toLowerCase();
  switch (level) {
    case 'below':
      return 'Below Quota (3%)';
    case 'above':
      return 'Above Quota (6%)';
    case 'double':
      return 'Double Quota (9%)';
    default:
      return quotaLevel.charAt(0).toUpperCase() + quotaLevel.slice(1);
  }
}

// Helper to get quota level color
function getQuotaLevelStyle(quotaLevel: string | null | undefined): {bg: string; text: string} {
  if (!quotaLevel) return {bg: '#f3f4f6', text: '#6b7280'};
  const level = quotaLevel.toLowerCase();
  switch (level) {
    case 'below':
      return {bg: '#fef3c7', text: '#b45309'};
    case 'above':
      return {bg: '#dcfce7', text: '#16a34a'};
    case 'double':
      return {bg: '#dbeafe', text: '#2563eb'};
    default:
      return {bg: '#f3f4f6', text: '#6b7280'};
  }
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

function formatDateShort(date: Date | null): string {
  if (!date) return 'Select';
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: '2-digit',
  });
}

// Helper to check if a date falls within the time period
function isWithinTimePeriod(
  dateStr: string | null,
  period: TimePeriod,
  customStartDate: Date | null,
  customEndDate: Date | null,
): boolean {
  if (period === 'all') return true;
  if (!dateStr) return false;

  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (period) {
    case 'weekly': {
      const startOfWeek = new Date(startOfToday);
      startOfWeek.setDate(startOfToday.getDate() - startOfToday.getDay());
      return date >= startOfWeek;
    }
    case '14days': {
      const fourteenDaysAgo = new Date(startOfToday);
      fourteenDaysAgo.setDate(startOfToday.getDate() - 14);
      return date >= fourteenDaysAgo;
    }
    case 'monthly': {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      return date >= startOfMonth;
    }
    case 'quarterly': {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const startOfQuarter = new Date(now.getFullYear(), currentQuarter * 3, 1);
      return date >= startOfQuarter;
    }
    case 'annually': {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      return date >= startOfYear;
    }
    case 'custom': {
      if (!customStartDate && !customEndDate) return true;
      const endOfDay = customEndDate
        ? new Date(customEndDate.getFullYear(), customEndDate.getMonth(), customEndDate.getDate(), 23, 59, 59)
        : null;

      if (customStartDate && endOfDay) {
        return date >= customStartDate && date <= endOfDay;
      } else if (customStartDate) {
        return date >= customStartDate;
      } else if (endOfDay) {
        return date <= endOfDay;
      }
      return true;
    }
    default:
      return true;
  }
}

export function MyCommissionsScreen() {
  const {adminUser} = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<CommissionsResponse | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Date picker state
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

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

  // Time-filtered commissions (without status filter) for status counts
  const timeFilteredCommissions = useMemo(() => {
    if (!data?.commissions) return [];

    return data.commissions.filter(c => {
      const dateToCheck = c.startDate || c.createdAt;
      return isWithinTimePeriod(dateToCheck, timePeriod, customStartDate, customEndDate);
    });
  }, [data?.commissions, timePeriod, customStartDate, customEndDate]);

  // Filtered commissions (with both status and time filter)
  const filteredCommissions = useMemo(() => {
    if (!data?.commissions) return [];

    return data.commissions.filter(c => {
      // Filter by status
      let statusMatch = true;
      if (statusFilter !== 'all') {
        if (statusFilter === 'approved') {
          statusMatch = c.status === 'approved_salesman' || c.status === 'approved_admin';
        } else {
          statusMatch = c.status === statusFilter;
        }
      }

      // Filter by time period
      const dateToCheck = c.startDate || c.createdAt;
      const timeMatch = isWithinTimePeriod(dateToCheck, timePeriod, customStartDate, customEndDate);

      return statusMatch && timeMatch;
    });
  }, [data?.commissions, statusFilter, timePeriod, customStartDate, customEndDate]);

  // Calculate status counts from time-filtered commissions
  const filteredByStatus = useMemo(() => {
    const counts: Record<string, {count: number; commission: number}> = {
      draft: {count: 0, commission: 0},
      saved: {count: 0, commission: 0},
      pending: {count: 0, commission: 0},
      approved: {count: 0, commission: 0},
      active: {count: 0, commission: 0},
    };

    timeFilteredCommissions.forEach(agreement => {
      const commission = agreement.commission || {};
      const annualCommission = commission.annual ?? (commission.monthly ? commission.monthly * 12 : 0);

      let statusKey = 'draft';
      if (agreement.status === 'saved') statusKey = 'saved';
      else if (agreement.status === 'pending_approval') statusKey = 'pending';
      else if (agreement.status === 'approved_salesman' || agreement.status === 'approved_admin')
        statusKey = 'approved';
      else if (agreement.status === 'active' || agreement.status === 'finalized') statusKey = 'active';

      counts[statusKey].count += 1;
      counts[statusKey].commission += annualCommission;
    });

    return counts;
  }, [timeFilteredCommissions]);

  // Calculate filtered totals
  const filteredTotals = useMemo(() => {
    let totalAnnualCommission = 0;
    let totalMonthlyCommission = 0;
    let totalContractValue = 0;
    let totalRateSum = 0;
    let agreementsWithRate = 0;

    filteredCommissions.forEach(agreement => {
      const commission = agreement.commission || {};
      const annualCommission = commission.annual ?? (commission.monthly ? commission.monthly * 12 : 0);
      const monthlyCommission = commission.monthly ?? 0;
      const rate = commission.rate ?? 0;

      totalAnnualCommission += annualCommission;
      totalMonthlyCommission += monthlyCommission;
      totalContractValue += agreement.contractValue || 0;

      if (rate > 0) {
        totalRateSum += rate;
        agreementsWithRate++;
      }
    });

    return {
      totalAgreements: filteredCommissions.length,
      totalAnnualCommission,
      totalMonthlyCommission,
      totalContractValue,
      averageCommissionRate: agreementsWithRate > 0 ? totalRateSum / agreementsWithRate : 0,
    };
  }, [filteredCommissions]);

  const handleStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setCustomStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) {
      setCustomEndDate(selectedDate);
    }
  };

  const clearDateRange = () => {
    setCustomStartDate(null);
    setCustomEndDate(null);
  };

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

        {/* Time Period Filter */}
        <View style={styles.timeFilterSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.timeFilterTabs}>
              {TIME_PERIOD_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.key}
                  style={[styles.timeTab, timePeriod === option.key && styles.timeTabActive]}
                  onPress={() => setTimePeriod(option.key)}>
                  <Text
                    style={[
                      styles.timeTabText,
                      timePeriod === option.key && styles.timeTabTextActive,
                    ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Custom Date Range */}
          {timePeriod === 'custom' && (
            <View style={styles.dateRangeContainer}>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowStartPicker(true)}>
                <Text style={styles.datePickerLabel}>From</Text>
                <Text style={styles.datePickerValue}>{formatDateShort(customStartDate)}</Text>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>

              <Text style={styles.dateRangeSeparator}>to</Text>

              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowEndPicker(true)}>
                <Text style={styles.datePickerLabel}>To</Text>
                <Text style={styles.datePickerValue}>{formatDateShort(customEndDate)}</Text>
                <Ionicons name="calendar-outline" size={18} color={Colors.primary} />
              </TouchableOpacity>

              {(customStartDate || customEndDate) && (
                <TouchableOpacity style={styles.clearDateBtn} onPress={clearDateRange}>
                  <Ionicons name="close-circle" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Date Pickers */}
        {showStartPicker && (
          <DateTimePicker
            value={customStartDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleStartDateChange}
          />
        )}
        {showEndPicker && (
          <DateTimePicker
            value={customEndDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleEndDateChange}
          />
        )}

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
            <View style={styles.summaryIconPrimary}>
              <Text style={styles.summaryIconText}>$</Text>
            </View>
            <View style={styles.summaryContent}>
              <Text style={styles.summaryLabelPrimary}>Annual Commission</Text>
              <Text style={styles.summaryValuePrimary}>
                {formatMoney(filteredTotals.totalAnnualCommission)}
              </Text>
            </View>
          </View>

          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, styles.summaryCardSmall]}>
              <Text style={styles.summaryLabelSmall}>Monthly</Text>
              <Text style={styles.summaryValueSmall}>
                {formatMoney(filteredTotals.totalMonthlyCommission)}
              </Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryCardSmall]}>
              <Text style={styles.summaryLabelSmall}>Agreements</Text>
              <Text style={styles.summaryValueSmall}>{filteredTotals.totalAgreements}</Text>
            </View>
            <View style={[styles.summaryCard, styles.summaryCardSmall]}>
              <Text style={styles.summaryLabelSmall}>Avg Rate</Text>
              <Text style={styles.summaryValueSmall}>
                {formatPercent(filteredTotals.averageCommissionRate)}%
              </Text>
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
                  All ({timeFilteredCommissions.length})
                </Text>
              </TouchableOpacity>
              {Object.entries(filteredByStatus).map(
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
                      <Text
                        style={[
                          styles.filterChipAmount,
                          statusFilter === key && styles.filterChipAmountActive,
                        ]}>
                        {formatMoney(value.commission)}
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
              const commission = agreement.commission || {};
              const annualCommission =
                commission.annual ?? (commission.monthly ? commission.monthly * 12 : 0);
              const rate = commission.rate ?? 0;
              const monthly = commission.monthly ?? 0;
              const breakdown = commission.breakdown || {};

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
                      <Text style={styles.amountLabel}>Annual</Text>
                      <Text style={styles.amountValue}>{formatMoney(annualCommission)}</Text>
                      <View style={styles.rateBadge}>
                        <Text style={styles.rateBadgeText}>{formatPercent(rate)}%</Text>
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
                          Base Rate ({breakdown.agreementTerm || `${agreement.contractMonths}mo`})
                        </Text>
                        <Text style={styles.breakdownValue}>
                          {formatPercent(breakdown.baseRate ?? rate)}%
                        </Text>
                      </View>

                      {breakdown.quotaLevel && (
                        <View style={[styles.breakdownItem, {backgroundColor: getQuotaLevelStyle(breakdown.quotaLevel).bg}]}>
                          <Text style={styles.breakdownLabel}>Quota Level</Text>
                          <Text style={[styles.breakdownValue, {color: getQuotaLevelStyle(breakdown.quotaLevel).text}]}>
                            {formatQuotaLevel(breakdown.quotaLevel)}
                          </Text>
                        </View>
                      )}

                      <View style={styles.breakdownItem}>
                        <Text style={styles.breakdownLabel}>Agreement Multiplier</Text>
                        <Text style={styles.breakdownValue}>
                          {formatPercent(breakdown.multiplier ?? 100)}%
                        </Text>
                      </View>

                      {(breakdown.accountTypeAdjustment ?? 0) !== 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>Account Type Adjustment</Text>
                          <Text
                            style={[
                              styles.breakdownValue,
                              (breakdown.accountTypeAdjustment ?? 0) < 0
                                ? styles.deduction
                                : styles.bonus,
                            ]}>
                            {(breakdown.accountTypeAdjustment ?? 0) > 0 ? '+' : ''}
                            {formatPercent(breakdown.accountTypeAdjustment ?? 0)}%
                          </Text>
                        </View>
                      )}

                      {(breakdown.greenlineBonus ?? 0) > 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>Greenline Bonus</Text>
                          <Text style={[styles.breakdownValue, styles.bonus]}>
                            +{formatPercent(breakdown.greenlineBonus ?? 0)}%
                          </Text>
                        </View>
                      )}

                      {(breakdown.insideSalesDeduction ?? 0) !== 0 && (
                        <View style={styles.breakdownItem}>
                          <Text style={styles.breakdownLabel}>Inside Sales Deduction</Text>
                          <Text style={[styles.breakdownValue, styles.deduction]}>
                            {formatPercent(breakdown.insideSalesDeduction ?? 0)}%
                          </Text>
                        </View>
                      )}

                      <View style={[styles.breakdownItem, styles.breakdownItemTotal]}>
                        <Text style={styles.breakdownLabelTotal}>Final Rate</Text>
                        <Text style={styles.breakdownValueTotal}>{formatPercent(rate)}%</Text>
                      </View>

                      <View style={[styles.breakdownItem, styles.breakdownItemTotal]}>
                        <Text style={styles.breakdownLabelTotal}>Monthly Commission</Text>
                        <Text style={styles.breakdownValueTotal}>{formatMoney(monthly)}</Text>
                      </View>

                      <View style={[styles.breakdownItem, styles.breakdownItemTotal]}>
                        <Text style={styles.breakdownLabelTotal}>Annual Commission</Text>
                        <Text style={styles.breakdownValueTotal}>
                          {formatMoney(annualCommission)}
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
  // Time Filter Styles
  timeFilterSection: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
  },
  timeFilterTabs: {
    flexDirection: 'row',
    gap: Spacing.xs,
    paddingRight: Spacing.lg,
  },
  timeTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  timeTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeTabText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  timeTabTextActive: {
    color: '#fff',
  },
  // Date Range Styles
  dateRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    padding: Spacing.sm,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  datePickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: '#f9fafb',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  datePickerLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  datePickerValue: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  dateRangeSeparator: {
    fontSize: FontSize.sm,
    color: '#6b7280',
  },
  clearDateBtn: {
    padding: Spacing.xs,
  },
  summaryGrid: {
    paddingHorizontal: Spacing.lg,
    marginTop: Spacing.md,
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
  filterChipAmount: {
    fontSize: 10,
    color: '#9ca3af',
    marginTop: 2,
  },
  filterChipAmountActive: {
    color: 'rgba(255,255,255,0.8)',
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
