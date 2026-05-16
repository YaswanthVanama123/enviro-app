import React, {useState, useEffect, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Dimensions,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import {agreementsApi} from '../../../services/api/endpoints/agreements.api';
import {Colors, Spacing, Radius, FontSize} from '../../../theme';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface StatusCounts {
  draft: number;
  saved: number;
  pending_approval: number;
  approved: number;
  active: number;
}

interface EmployeeSummary {
  username: string;
  totalAgreements: number;
  statusCounts: StatusCounts;
  totalMonthlyCommission: number;
  totalContractCommission: number;
  totalContractValue: number;
  averageCommissionRate: number;
}

interface GrandTotals {
  totalEmployees: number;
  totalAgreements: number;
  totalMonthlyCommission: number;
  totalContractCommission: number;
  totalContractValue: number;
}

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

export function AdminCommissionsScreen({navigation}: {navigation?: any}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [employeesData, setEmployeesData] = useState<{
    grandTotals: GrandTotals;
    employees: EmployeeSummary[];
  } | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [employeeCommissions, setEmployeeCommissions] = useState<{
    totals: CommissionTotals;
    byStatus: Record<string, StatusSummary>;
    commissions: AgreementCommission[];
  } | null>(null);
  const [employeeLoading, setEmployeeLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchEmployees();
  }, []);

  async function fetchEmployees(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      const response = await agreementsApi.getAllEmployeesCommissions();
      if (response?.success) {
        setEmployeesData({
          grandTotals: response.grandTotals,
          employees: response.employees,
        });
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employees commissions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  async function fetchEmployeeCommissions(username: string) {
    try {
      setEmployeeLoading(true);
      setError(null);
      setSelectedEmployee(username);
      const response = await agreementsApi.getEmployeeCommissions(username);
      if (response?.success) {
        setEmployeeCommissions({
          totals: response.totals,
          byStatus: response.byStatus,
          commissions: response.commissions,
        });
      }
      setStatusFilter('all');
      setExpandedId(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch employee commissions');
    } finally {
      setEmployeeLoading(false);
    }
  }

  function goBackToEmployees() {
    setSelectedEmployee(null);
    setEmployeeCommissions(null);
    setStatusFilter('all');
    setExpandedId(null);
  }

  const filteredEmployees = useMemo(() => {
    if (!employeesData?.employees) return [];
    if (!searchQuery.trim()) return employeesData.employees;
    const q = searchQuery.toLowerCase();
    return employeesData.employees.filter(e =>
      e.username.toLowerCase().includes(q),
    );
  }, [employeesData?.employees, searchQuery]);

  const filteredCommissions = useMemo(() => {
    if (!employeeCommissions?.commissions) return [];
    if (statusFilter === 'all') return employeeCommissions.commissions;
    return employeeCommissions.commissions.filter(c => {
      if (statusFilter === 'approved') {
        return (
          c.status === 'approved_salesman' || c.status === 'approved_admin'
        );
      }
      return c.status === statusFilter;
    });
  }, [employeeCommissions?.commissions, statusFilter]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading employee commissions...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error && !selectedEmployee) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle-outline" size={48} color={Colors.primary} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchEmployees()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Employee Detail View
  if (selectedEmployee) {
    if (employeeLoading) {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>
              Loading commissions for {selectedEmployee}...
            </Text>
          </View>
        </SafeAreaView>
      );
    }

    if (!employeeCommissions) {
      return (
        <SafeAreaView style={styles.safe}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No commission data found.</Text>
            <TouchableOpacity style={styles.backBtn} onPress={goBackToEmployees}>
              <Icon name="arrow-back" size={20} color="#fff" />
              <Text style={styles.backBtnText}>Back to Employees</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={goBackToEmployees}>
            <Icon name="arrow-back" size={20} color="#fff" />
            <Text style={styles.backBtnText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{selectedEmployee}'s Commissions</Text>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Summary Cards */}
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
              <Text style={[styles.summaryIcon, styles.summaryIconPrimary]}>$</Text>
              <View style={styles.summaryContent}>
                <Text style={[styles.summaryLabel, styles.summaryLabelPrimary]}>
                  Total Commission
                </Text>
                <Text style={[styles.summaryValue, styles.summaryValuePrimary]}>
                  {formatMoney(employeeCommissions.totals.totalContractCommission)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>#</Text>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Agreements</Text>
                <Text style={styles.summaryValue}>
                  {employeeCommissions.totals.totalAgreements}
                </Text>
              </View>
            </View>
          </View>

          {/* Status Filter */}
          <View style={styles.filterSection}>
            <Text style={styles.sectionTitle}>Filter by Status</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterChips}>
                <TouchableOpacity
                  style={[
                    styles.filterChip,
                    statusFilter === 'all' && styles.filterChipActive,
                  ]}
                  onPress={() => setStatusFilter('all')}>
                  <Text
                    style={[
                      styles.filterChipText,
                      statusFilter === 'all' && styles.filterChipTextActive,
                    ]}>
                    All ({employeeCommissions.totals.totalAgreements})
                  </Text>
                </TouchableOpacity>
                {Object.entries(employeeCommissions.byStatus).map(
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
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No agreements found.</Text>
              </View>
            ) : (
              filteredCommissions.map(agreement => {
                const statusStyle =
                  STATUS_COLORS[agreement.status] || STATUS_COLORS.draft;
                const isExpanded = expandedId === agreement.id;

                return (
                  <TouchableOpacity
                    key={agreement.id}
                    style={[styles.agreementCard, isExpanded && styles.agreementCardExpanded]}
                    onPress={() => setExpandedId(isExpanded ? null : agreement.id)}
                    activeOpacity={0.7}>
                    <View style={styles.agreementHeader}>
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
                            <Text style={[styles.statusText, {color: statusStyle.text}]}>
                              {STATUS_LABELS[agreement.status] || agreement.status}
                            </Text>
                          </View>
                          <Text style={styles.metaText}>
                            {agreement.contractMonths} mo
                          </Text>
                          <Text style={styles.metaText}>
                            {formatDate(agreement.createdAt)}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.agreementAmounts}>
                        <Text style={styles.amountLabel}>Commission</Text>
                        <Text style={styles.commissionValue}>
                          {formatMoney(agreement.commission.total)}
                        </Text>
                        <View style={styles.rateBadge}>
                          <Text style={styles.rateText}>
                            {agreement.commission.rate}%
                          </Text>
                        </View>
                      </View>

                      <Icon
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#94a3b8"
                      />
                    </View>

                    {isExpanded && (
                      <View style={styles.agreementDetails}>
                        <Text style={styles.breakdownTitle}>Commission Breakdown</Text>
                        <View style={styles.breakdownGrid}>
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
                            <Text style={styles.breakdownLabel}>Multiplier</Text>
                            <Text style={styles.breakdownValue}>
                              {agreement.commission.breakdown.multiplier}%
                            </Text>
                          </View>
                          <View style={[styles.breakdownItem, styles.breakdownItemTotal]}>
                            <Text style={styles.breakdownLabelTotal}>Final Rate</Text>
                            <Text style={styles.breakdownValueTotal}>
                              {agreement.commission.rate}%
                            </Text>
                          </View>
                          <View style={[styles.breakdownItem, styles.breakdownItemTotal]}>
                            <Text style={styles.breakdownLabelTotal}>
                              Total Commission
                            </Text>
                            <Text style={styles.breakdownValueTotal}>
                              {formatMoney(agreement.commission.total)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Employee List View
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation?.goBack()}>
          <Icon name="arrow-back" size={20} color="#fff" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Employee Commissions</Text>
        <View style={styles.adminBadge}>
          <Text style={styles.adminBadgeText}>Admin</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchEmployees(true)}
            tintColor={Colors.primary}
          />
        }>
        {/* Grand Totals */}
        {employeesData && (
          <View style={styles.summaryGrid}>
            <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
              <Text style={[styles.summaryIcon, styles.summaryIconPrimary]}>$</Text>
              <View style={styles.summaryContent}>
                <Text style={[styles.summaryLabel, styles.summaryLabelPrimary]}>
                  Total Commissions
                </Text>
                <Text style={[styles.summaryValue, styles.summaryValuePrimary]}>
                  {formatMoney(employeesData.grandTotals.totalContractCommission)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View style={styles.summaryIconBox}>
                <Icon name="people-outline" size={20} color={Colors.primary} />
              </View>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Employees</Text>
                <Text style={styles.summaryValue}>
                  {employeesData.grandTotals.totalEmployees}
                </Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryIcon}>#</Text>
              <View style={styles.summaryContent}>
                <Text style={styles.summaryLabel}>Agreements</Text>
                <Text style={styles.summaryValue}>
                  {employeesData.grandTotals.totalAgreements}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Search */}
        <View style={styles.searchSection}>
          <View style={styles.searchInputContainer}>
            <Icon name="search" size={20} color="#94a3b8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search employees..."
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={20} color="#94a3b8" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Employee List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Employees ({filteredEmployees.length})</Text>

          {filteredEmployees.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No employees found.</Text>
            </View>
          ) : (
            filteredEmployees.map(employee => (
              <TouchableOpacity
                key={employee.username}
                style={styles.employeeCard}
                onPress={() => fetchEmployeeCommissions(employee.username)}
                activeOpacity={0.7}>
                <View style={styles.employeeHeader}>
                  <View style={styles.employeeAvatar}>
                    <Text style={styles.employeeAvatarText}>
                      {employee.username.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>{employee.username}</Text>
                    <Text style={styles.employeeAgreements}>
                      {employee.totalAgreements} agreement
                      {employee.totalAgreements !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Icon name="chevron-forward" size={20} color="#94a3b8" />
                </View>

                <View style={styles.employeeStats}>
                  <View style={styles.employeeStat}>
                    <Text style={styles.statLabel}>Total Commission</Text>
                    <Text style={styles.statValueCommission}>
                      {formatMoney(employee.totalContractCommission)}
                    </Text>
                  </View>
                  <View style={styles.employeeStat}>
                    <Text style={styles.statLabel}>Contract Value</Text>
                    <Text style={styles.statValue}>
                      {formatMoney(employee.totalContractValue)}
                    </Text>
                  </View>
                </View>

                <View style={styles.statusRow}>
                  {employee.statusCounts.draft > 0 && (
                    <View style={[styles.miniBadge, styles.miniBadgeDraft]}>
                      <Text style={styles.miniBadgeText}>
                        {employee.statusCounts.draft} Draft
                      </Text>
                    </View>
                  )}
                  {employee.statusCounts.saved > 0 && (
                    <View style={[styles.miniBadge, styles.miniBadgeSaved]}>
                      <Text style={styles.miniBadgeTextBlue}>
                        {employee.statusCounts.saved} Saved
                      </Text>
                    </View>
                  )}
                  {employee.statusCounts.approved > 0 && (
                    <View style={[styles.miniBadge, styles.miniBadgeApproved]}>
                      <Text style={styles.miniBadgeTextGreen}>
                        {employee.statusCounts.approved} Approved
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: '#64748b',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.md,
    color: '#64748b',
    textAlign: 'center',
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: FontSize.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.md,
    gap: 4,
  },
  backBtnText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  adminBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
  },
  adminBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2 - 1,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryCardPrimary: {
    backgroundColor: Colors.primary,
    flex: 2,
    minWidth: SCREEN_WIDTH - Spacing.lg * 2,
  },
  summaryIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#fef2f2',
    borderRadius: Radius.md,
    textAlign: 'center',
    lineHeight: 40,
    fontSize: FontSize.lg,
    color: Colors.primary,
    overflow: 'hidden',
  },
  summaryIconBox: {
    width: 40,
    height: 40,
    backgroundColor: '#fef2f2',
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconPrimary: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    color: '#fff',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryLabelPrimary: {
    color: 'rgba(255,255,255,0.8)',
  },
  summaryValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#1e293b',
  },
  summaryValuePrimary: {
    color: '#fff',
  },
  searchSection: {
    marginBottom: Spacing.lg,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: '#1e293b',
  },
  listSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: Spacing.md,
  },
  emptyState: {
    backgroundColor: '#fff',
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: '#64748b',
    fontSize: FontSize.sm,
  },
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  employeeAvatar: {
    width: 44,
    height: 44,
    backgroundColor: Colors.primary,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  employeeAvatarText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  employeeInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  employeeName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#1e293b',
  },
  employeeAgreements: {
    fontSize: FontSize.xs,
    color: '#64748b',
  },
  employeeStats: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    marginBottom: Spacing.sm,
  },
  employeeStat: {
    flex: 1,
  },
  statLabel: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: '500',
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#1e293b',
  },
  statValueCommission: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#16a34a',
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  miniBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  miniBadgeDraft: {
    backgroundColor: '#f3f4f6',
  },
  miniBadgeSaved: {
    backgroundColor: '#dbeafe',
  },
  miniBadgeApproved: {
    backgroundColor: '#d1fae5',
  },
  miniBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
  },
  miniBadgeTextBlue: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1d4ed8',
  },
  miniBadgeTextGreen: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46',
  },
  filterSection: {
    marginBottom: Spacing.lg,
  },
  filterChips: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: '#fff',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    color: '#475569',
  },
  filterChipTextActive: {
    color: '#fff',
  },
  agreementCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  agreementCardExpanded: {
    borderWidth: 1,
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
  },
  agreementTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  agreementMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  metaText: {
    fontSize: 11,
    color: '#64748b',
  },
  agreementAmounts: {
    alignItems: 'flex-end',
  },
  amountLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },
  commissionValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#16a34a',
  },
  rateBadge: {
    backgroundColor: '#dcfce7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  rateText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#16a34a',
  },
  agreementDetails: {
    backgroundColor: '#f8fafc',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  breakdownTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#475569',
    marginBottom: Spacing.sm,
  },
  breakdownGrid: {
    gap: Spacing.xs,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
  },
  breakdownItemTotal: {
    backgroundColor: '#fef2f2',
  },
  breakdownLabel: {
    fontSize: FontSize.xs,
    color: '#64748b',
  },
  breakdownValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#1e293b',
  },
  breakdownLabelTotal: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '500',
  },
  breakdownValueTotal: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.primary,
  },
});
