import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  quotaApi,
  salesPersonApi,
} from '../../../../services/api/endpoints/quota.api';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';
import type {
  SalesPerson,
  QuotaStatusResponse,
  LeaderboardEntry,
} from '../../types/quota.types';
import {
  formatCurrency,
  formatPercentage,
  getQuotaLevelColor,
  getQuotaLevelBgColor,
  getQuotaCommissionRate,
  getAgreementStatusColor,
  getAgreementStatusBgColor,
} from '../../types/quota.types';
import {
  getAccountTypeColor,
  getAccountTypeBgColor,
} from '../../types/accountType.types';

type SubTab = 'dashboard' | 'leaderboard';

export function QuotaSection() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<SubTab>('dashboard');
  const [refreshing, setRefreshing] = useState(false);

  // Data state
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null);
  const [quotaStatus, setQuotaStatus] = useState<QuotaStatusResponse | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Picker state
  const [showPersonPicker, setShowPersonPicker] = useState(false);

  // Load sales persons
  useEffect(() => {
    const loadSalesPersons = async () => {
      const result = await salesPersonApi.getAll({active: true});
      if (result) {
        setSalesPersons(result.data);
        if (result.data.length > 0 && !selectedPersonId) {
          setSelectedPersonId(result.data[0].employeeId);
        }
      }
    };
    loadSalesPersons();
  }, []);

  // Load data when person or tab changes
  const loadData = useCallback(async () => {
    if (!selectedPersonId) return;

    setLoading(true);
    setError(null);

    try {
      if (activeTab === 'dashboard') {
        const status = await quotaApi.getStatus(selectedPersonId, {
          periodType: 'monthly',
        });
        if (status) {
          setQuotaStatus(status);
        } else {
          setError('Failed to load quota status');
        }
      } else if (activeTab === 'leaderboard') {
        const result = await quotaApi.getLeaderboard({periodType: 'monthly'});
        if (result) {
          setLeaderboard(result.leaderboard);
        }
      }
    } catch (err) {
      setError('Failed to load data');
    }

    setLoading(false);
  }, [selectedPersonId, activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const selectedPerson = salesPersons.find(sp => sp.employeeId === selectedPersonId);

  const renderDashboard = () => {
    if (!quotaStatus) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No quota data available</Text>
        </View>
      );
    }

    const progressWidth = Math.min(quotaStatus.quota.percentage, 100);

    return (
      <View style={styles.dashboardContainer}>
        {/* Quota Progress Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{quotaStatus.period.label}</Text>

          <View style={styles.quotaAmounts}>
            <Text style={styles.quotaActual}>
              {formatCurrency(quotaStatus.quota.actual)}
            </Text>
            <Text style={styles.quotaDivider}>/</Text>
            <Text style={styles.quotaTarget}>
              {formatCurrency(quotaStatus.quota.target)}
            </Text>
          </View>

          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progressWidth}%`,
                  backgroundColor: getQuotaLevelColor(quotaStatus.quota.level),
                },
              ]}
            />
          </View>

          <View style={styles.quotaLevelRow}>
            <View
              style={[
                styles.quotaLevelBadge,
                {backgroundColor: getQuotaLevelBgColor(quotaStatus.quota.level)},
              ]}>
              <Text
                style={[
                  styles.quotaLevelText,
                  {color: getQuotaLevelColor(quotaStatus.quota.level)},
                ]}>
                {quotaStatus.quota.level.toUpperCase()} QUOTA
              </Text>
            </View>
            <Text style={styles.commissionRate}>
              {getQuotaCommissionRate(quotaStatus.quota.level)}% rate
            </Text>
          </View>

          <Text style={styles.quotaPercentage}>
            {formatPercentage(quotaStatus.quota.percentage)} of quota
          </Text>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Agreements</Text>
            <Text style={styles.statValue}>
              {quotaStatus.progress.agreementCount}
            </Text>
            <Text style={styles.statNote}>
              {quotaStatus.progress.newBusinessCount} new,{' '}
              {quotaStatus.progress.renewalCount} renewals
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Commission</Text>
            <Text style={styles.statValue}>
              {formatCurrency(quotaStatus.commission.earned)}
            </Text>
            <Text style={styles.statNote}>This month</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>To Quota</Text>
            <Text style={styles.statValue}>
              {formatCurrency(quotaStatus.progress.toReachQuota)}
            </Text>
            <Text style={styles.statNote}>Remaining</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statLabel}>To Double</Text>
            <Text style={styles.statValue}>
              {formatCurrency(quotaStatus.progress.toReachDouble)}
            </Text>
            <Text style={styles.statNote}>For 9% rate</Text>
          </View>
        </View>

        {/* Recent Agreements */}
        {quotaStatus.recentAgreements.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recent Agreements</Text>
            {quotaStatus.recentAgreements.slice(0, 3).map(agreement => (
              <View key={agreement._id} style={styles.agreementRow}>
                <View style={styles.agreementInfo}>
                  <Text style={styles.agreementCustomer}>
                    {agreement.customer.name}
                  </Text>
                  <Text style={styles.agreementMeta}>
                    {formatCurrency(agreement.monthlyValue)}/mo •{' '}
                    {agreement.accountType}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    {
                      backgroundColor: getAgreementStatusBgColor(
                        agreement.status,
                      ),
                    },
                  ]}>
                  <Text
                    style={[
                      styles.statusText,
                      {color: getAgreementStatusColor(agreement.status)},
                    ]}>
                    {agreement.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  const renderLeaderboard = () => {
    if (leaderboard.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="trophy-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyText}>No leaderboard data</Text>
        </View>
      );
    }

    return (
      <View style={styles.leaderboardContainer}>
        {leaderboard.map(entry => (
          <View
            key={entry.salesPersonId}
            style={[
              styles.leaderboardRow,
              entry.salesPersonId === selectedPersonId && styles.leaderboardHighlighted,
            ]}>
            <View style={styles.rankContainer}>
              {entry.rank <= 3 ? (
                <View
                  style={[
                    styles.rankBadge,
                    entry.rank === 1 && styles.rankGold,
                    entry.rank === 2 && styles.rankSilver,
                    entry.rank === 3 && styles.rankBronze,
                  ]}>
                  <Text style={styles.rankBadgeText}>{entry.rank}</Text>
                </View>
              ) : (
                <Text style={styles.rankText}>{entry.rank}</Text>
              )}
            </View>

            <View style={styles.leaderboardInfo}>
              <Text style={styles.leaderboardName}>{entry.salesPersonName}</Text>
              <Text style={styles.leaderboardMeta}>
                {entry.agreementCount} deals •{' '}
                {formatCurrency(entry.totalCommission)} earned
              </Text>
            </View>

            <View style={styles.leaderboardStats}>
              <Text style={styles.leaderboardSales}>
                {formatCurrency(entry.actualSales)}
              </Text>
              <View
                style={[
                  styles.quotaBadgeSmall,
                  {backgroundColor: getQuotaLevelBgColor(entry.quotaLevel)},
                ]}>
                <Text
                  style={[
                    styles.quotaBadgeText,
                    {color: getQuotaLevelColor(entry.quotaLevel)},
                  ]}>
                  {formatPercentage(entry.quotaPercentage)}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {paddingBottom: insets.bottom + 24},
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Quota Tracking</Text>
        <Text style={styles.subtitle}>
          Track sales performance and agreements
        </Text>
      </View>

      {/* Person Selector */}
      <TouchableOpacity
        style={styles.personSelector}
        onPress={() => setShowPersonPicker(!showPersonPicker)}>
        <Ionicons name="person-outline" size={20} color={Colors.textMuted} />
        <Text style={styles.personName}>
          {selectedPerson?.name || 'Select Sales Person'}
        </Text>
        <Ionicons
          name={showPersonPicker ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={Colors.textMuted}
        />
      </TouchableOpacity>

      {showPersonPicker && (
        <View style={styles.pickerDropdown}>
          {salesPersons.map(sp => (
            <TouchableOpacity
              key={sp.employeeId}
              style={[
                styles.pickerOption,
                sp.employeeId === selectedPersonId && styles.pickerOptionSelected,
              ]}
              onPress={() => {
                setSelectedPersonId(sp.employeeId);
                setShowPersonPicker(false);
              }}>
              <Text
                style={[
                  styles.pickerOptionText,
                  sp.employeeId === selectedPersonId &&
                    styles.pickerOptionTextSelected,
                ]}>
                {sp.name}
              </Text>
              {sp.employeeId === selectedPersonId && (
                <Ionicons name="checkmark" size={18} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'dashboard' && styles.tabActive]}
          onPress={() => setActiveTab('dashboard')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'dashboard' && styles.tabTextActive,
            ]}>
            Dashboard
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'leaderboard' && styles.tabActive]}
          onPress={() => setActiveTab('leaderboard')}>
          <Text
            style={[
              styles.tabText,
              activeTab === 'leaderboard' && styles.tabTextActive,
            ]}>
            Leaderboard
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadData}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {activeTab === 'dashboard' && renderDashboard()}
          {activeTab === 'leaderboard' && renderLeaderboard()}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  content: {padding: Spacing.lg, gap: Spacing.md},
  header: {marginBottom: Spacing.sm},
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 4,
  },
  personSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  personName: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  pickerDropdown: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginTop: -Spacing.sm,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pickerOptionSelected: {
    backgroundColor: Colors.primaryLight,
  },
  pickerOptionText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  pickerOptionTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    borderRadius: Radius.sm,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: '#fff',
  },
  dashboardContainer: {gap: Spacing.md},
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  quotaAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: Spacing.md,
  },
  quotaActual: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  quotaDivider: {
    fontSize: 20,
    color: Colors.textMuted,
  },
  quotaTarget: {
    fontSize: 18,
    color: Colors.textMuted,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: Colors.borderLight,
    borderRadius: 6,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
  quotaLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  quotaLevelBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  quotaLevelText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  commissionRate: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  quotaPercentage: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'right',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
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
  statNote: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  agreementInfo: {flex: 1},
  agreementCustomer: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  agreementMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  agreementsList: {gap: Spacing.sm},
  agreementCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  agreementHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  agreementNumber: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  agreementCustomerName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  agreementDetails: {gap: 4},
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  detailLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    width: 70,
  },
  detailValue: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  accountTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  accountTypeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  agreementFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  footerText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  footerDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  leaderboardContainer: {gap: Spacing.xs},
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  leaderboardHighlighted: {
    backgroundColor: '#eff6ff',
    borderColor: Colors.primary,
  },
  rankContainer: {width: 32, alignItems: 'center'},
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankGold: {backgroundColor: '#fef3c7'},
  rankSilver: {backgroundColor: '#e5e7eb'},
  rankBronze: {backgroundColor: '#fed7aa'},
  rankBadgeText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#78716c',
  },
  rankText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  leaderboardInfo: {flex: 1},
  leaderboardName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  leaderboardMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  leaderboardStats: {alignItems: 'flex-end'},
  leaderboardSales: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  quotaBadgeSmall: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  quotaBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  loadingState: {
    padding: 60,
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  errorState: {
    padding: 60,
    alignItems: 'center',
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: '#dc2626',
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  retryText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },
  emptyState: {
    padding: 60,
    alignItems: 'center',
    gap: Spacing.md,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
});
