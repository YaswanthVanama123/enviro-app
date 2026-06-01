import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  Modal,
  Linking,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {routestarCustomersApi} from '../../../../services/api/endpoints/routestarCustomers.api';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';
import type {
  RouteStarCustomer,
  CustomerSyncStatus,
  CustomerStats,
} from '../../types/routestarCustomer.types';
import {
  getCustomerStatusColor,
  getCustomerStatusBgColor,
  getSyncResultColor,
  getSyncResultBgColor,
  formatPhoneNumber,
  getFullAddress,
} from '../../types/routestarCustomer.types';

export function RouteStarCustomersSection() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);

  const [customers, setCustomers] = useState<RouteStarCustomer[]>([]);
  const [stats, setStats] = useState<CustomerStats | null>(null);
  const [syncStatus, setSyncStatus] = useState<CustomerSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [pagination, setPagination] = useState({total: 0, skip: 0, limit: 20});

  const [selectedCustomer, setSelectedCustomer] = useState<RouteStarCustomer | null>(null);
  const [showStateFilter, setShowStateFilter] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await routestarCustomersApi.getAll({
        search: searchTerm || undefined,
        state: stateFilter || undefined,
        isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
        limit: pagination.limit,
        skip: pagination.skip,
      });

      if (result) {
        setCustomers(result.data);
        setPagination(prev => ({...prev, total: result.pagination.total}));
      } else {
        setError('Failed to load customers');
      }
    } catch (err) {
      setError('Failed to load customers');
    }

    setLoading(false);
  }, [searchTerm, stateFilter, activeFilter, pagination.limit, pagination.skip]);

  const loadStats = useCallback(async () => {
    const result = await routestarCustomersApi.getStats();
    if (result) {
      setStats(result);
    }
  }, []);

  const loadSyncStatus = useCallback(async () => {
    const result = await routestarCustomersApi.getSyncStatus();
    if (result) {
      setSyncStatus(result);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
    loadStats();
    loadSyncStatus();
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (syncStatus?.isRunning) {
      const interval = setInterval(() => {
        loadSyncStatus();
      }, 2000);
      return () => clearInterval(interval);
    } else if (syncStatus?.lastSyncResult === 'success') {
      
      loadCustomers();
      loadStats();
    }
  }, [syncStatus?.isRunning, syncStatus?.lastSyncResult, loadSyncStatus]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadCustomers(), loadStats(), loadSyncStatus()]);
    setRefreshing(false);
  }, [loadCustomers, loadStats, loadSyncStatus]);

  const handleSync = async () => {
    const result = await routestarCustomersApi.startSync();
    if (result) {
      loadSyncStatus();
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({...prev, skip: 0}));
    loadCustomers();
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  const renderCustomerCard = (customer: RouteStarCustomer) => (
    <TouchableOpacity
      key={customer._id}
      style={[styles.customerCard, !customer.isActive && styles.customerCardInactive]}
      onPress={() => setSelectedCustomer(customer)}>
      <View style={styles.customerHeader}>
        <Text style={styles.customerName} numberOfLines={1}>
          {customer.name}
        </Text>
        <View
          style={[
            styles.statusBadge,
            {backgroundColor: getCustomerStatusBgColor(customer.isActive)},
          ]}>
          <Text
            style={[
              styles.statusText,
              {color: getCustomerStatusColor(customer.isActive)},
            ]}>
            {customer.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {customer.company && (
        <Text style={styles.customerCompany}>{customer.company}</Text>
      )}

      <View style={styles.customerDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={14} color={Colors.textMuted} />
          <Text style={styles.detailText} numberOfLines={1}>
            {customer.city && customer.state
              ? `${customer.city}, ${customer.state}`
              : customer.address || '-'}
          </Text>
        </View>

        {customer.phone && (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.detailText}>
              {formatPhoneNumber(customer.phone)}
            </Text>
          </View>
        )}

        {customer.onRoute && (
          <View style={styles.detailRow}>
            <Ionicons name="navigate-outline" size={14} color={Colors.textMuted} />
            <Text style={styles.detailText}>Route: {customer.onRoute}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderCustomerModal = () => {
    if (!selectedCustomer) return null;

    return (
      <Modal
        visible={true}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCustomer(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedCustomer.name}</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedCustomer(null)}>
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View
              style={[
                styles.statusBadgeLarge,
                {backgroundColor: getCustomerStatusBgColor(selectedCustomer.isActive)},
              ]}>
              <Text
                style={[
                  styles.statusTextLarge,
                  {color: getCustomerStatusColor(selectedCustomer.isActive)},
                ]}>
                {selectedCustomer.isActive ? 'Active Customer' : 'Inactive Customer'}
              </Text>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Contact Information</Text>

              {selectedCustomer.company && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Company</Text>
                  <Text style={styles.modalDetailValue}>{selectedCustomer.company}</Text>
                </View>
              )}

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Address</Text>
                <Text style={styles.modalDetailValue}>
                  {getFullAddress(selectedCustomer)}
                </Text>
              </View>

              {selectedCustomer.phone && (
                <TouchableOpacity
                  style={styles.modalDetailRow}
                  onPress={() => Linking.openURL(`tel:${selectedCustomer.phone}`)}>
                  <Text style={styles.modalDetailLabel}>Phone</Text>
                  <Text style={[styles.modalDetailValue, styles.linkText]}>
                    {formatPhoneNumber(selectedCustomer.phone)}
                  </Text>
                </TouchableOpacity>
              )}

              {selectedCustomer.email && (
                <TouchableOpacity
                  style={styles.modalDetailRow}
                  onPress={() => Linking.openURL(`mailto:${selectedCustomer.email}`)}>
                  <Text style={styles.modalDetailLabel}>Email</Text>
                  <Text style={[styles.modalDetailValue, styles.linkText]}>
                    {selectedCustomer.email}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Account Details</Text>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>RouteStar ID</Text>
                <Text style={[styles.modalDetailValue, styles.monoText]}>
                  {selectedCustomer.routeStarId}
                </Text>
              </View>

              {selectedCustomer.onRoute && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Route</Text>
                  <Text style={styles.modalDetailValue}>{selectedCustomer.onRoute}</Text>
                </View>
              )}

              {selectedCustomer.grouping && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Grouping</Text>
                  <Text style={styles.modalDetailValue}>{selectedCustomer.grouping}</Text>
                </View>
              )}

              {selectedCustomer.salesRep && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Sales Rep</Text>
                  <Text style={styles.modalDetailValue}>{selectedCustomer.salesRep}</Text>
                </View>
              )}

              {selectedCustomer.customerType && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Customer Type</Text>
                  <Text style={styles.modalDetailValue}>
                    {selectedCustomer.customerType}
                  </Text>
                </View>
              )}

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Balance</Text>
                <Text style={styles.modalDetailValue}>
                  ${selectedCustomer.balance.toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={styles.sectionTitle}>Sync Information</Text>

              <View style={styles.modalDetailRow}>
                <Text style={styles.modalDetailLabel}>Last Synced</Text>
                <Text style={styles.modalDetailValue}>
                  {formatDate(selectedCustomer.lastSyncedAt)}
                </Text>
              </View>

              {selectedCustomer.createdInRouteStar && (
                <View style={styles.modalDetailRow}>
                  <Text style={styles.modalDetailLabel}>Created in RouteStar</Text>
                  <Text style={styles.modalDetailValue}>
                    {selectedCustomer.createdInRouteStar}
                  </Text>
                </View>
              )}
            </View>

            {selectedCustomer.detailUrl && (
              <TouchableOpacity
                style={styles.externalLinkBtn}
                onPress={() => Linking.openURL(selectedCustomer.detailUrl)}>
                <Ionicons name="open-outline" size={18} color="#fff" />
                <Text style={styles.externalLinkText}>Open in RouteStar</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, {paddingBottom: insets.bottom + 24}]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {}
      <View style={styles.header}>
        <Text style={styles.title}>RouteStar Customers</Text>
        <Text style={styles.subtitle}>Sync and manage customers from RouteStar</Text>
      </View>

      {}
      <TouchableOpacity
        style={[styles.syncBtn, syncStatus?.isRunning && styles.syncBtnDisabled]}
        onPress={handleSync}
        disabled={syncStatus?.isRunning}>
        {syncStatus?.isRunning ? (
          <>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.syncBtnText}>
              Syncing... {syncStatus.progress}%
            </Text>
          </>
        ) : (
          <>
            <Ionicons name="sync-outline" size={20} color="#fff" />
            <Text style={styles.syncBtnText}>Sync from RouteStar</Text>
          </>
        )}
      </TouchableOpacity>

      {}
      {syncStatus && (
        <View style={styles.syncStatusCard}>
          <View style={styles.syncStatusRow}>
            <Text style={styles.syncStatusLabel}>Last Sync:</Text>
            <Text style={styles.syncStatusTime}>
              {formatDate(syncStatus.lastSyncAt)}
            </Text>
          </View>
          {syncStatus.lastSyncResult && (
            <View
              style={[
                styles.syncResultBadge,
                {backgroundColor: getSyncResultBgColor(syncStatus.lastSyncResult)},
              ]}>
              <Text
                style={[
                  styles.syncResultText,
                  {color: getSyncResultColor(syncStatus.lastSyncResult)},
                ]}>
                {syncStatus.lastSyncResult === 'success'
                  ? 'Success'
                  : syncStatus.lastSyncResult === 'partial'
                  ? 'Partial'
                  : 'Failed'}
              </Text>
            </View>
          )}
          {syncStatus.isRunning && syncStatus.message && (
            <Text style={styles.syncMessage}>{syncStatus.message}</Text>
          )}
        </View>
      )}

      {}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.total || 0}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, {color: '#16a34a'}]}>
            {stats?.active || 0}
          </Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, {color: '#dc2626'}]}>
            {stats?.inactive || 0}
          </Text>
          <Text style={styles.statLabel}>Inactive</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.uniqueStates || 0}</Text>
          <Text style={styles.statLabel}>States</Text>
        </View>
      </View>

      {}
      <View style={styles.filtersContainer}>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search customers..."
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Ionicons name="search" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setShowStateFilter(!showStateFilter)}>
            <Text style={styles.filterBtnText}>
              {stateFilter || 'All States'}
            </Text>
            <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.activeFilterGroup}>
            {['all', 'active', 'inactive'].map(filter => (
              <TouchableOpacity
                key={filter}
                style={[
                  styles.activeFilterBtn,
                  activeFilter === filter && styles.activeFilterBtnActive,
                ]}
                onPress={() => {
                  setActiveFilter(filter as 'all' | 'active' | 'inactive');
                  setPagination(prev => ({...prev, skip: 0}));
                }}>
                <Text
                  style={[
                    styles.activeFilterText,
                    activeFilter === filter && styles.activeFilterTextActive,
                  ]}>
                  {filter.charAt(0).toUpperCase() + filter.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {showStateFilter && stats?.states && (
          <View style={styles.stateFilterDropdown}>
            <TouchableOpacity
              style={styles.stateOption}
              onPress={() => {
                setStateFilter('');
                setShowStateFilter(false);
                setPagination(prev => ({...prev, skip: 0}));
              }}>
              <Text style={styles.stateOptionText}>All States</Text>
              {!stateFilter && (
                <Ionicons name="checkmark" size={18} color={Colors.primary} />
              )}
            </TouchableOpacity>
            {stats.states.map(state => (
              <TouchableOpacity
                key={state}
                style={styles.stateOption}
                onPress={() => {
                  setStateFilter(state);
                  setShowStateFilter(false);
                  setPagination(prev => ({...prev, skip: 0}));
                }}>
                <Text style={styles.stateOptionText}>{state}</Text>
                {stateFilter === state && (
                  <Ionicons name="checkmark" size={18} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={styles.resultsCount}>
          {pagination.total} customers found
        </Text>
      </View>

      {}
      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading customers...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorState}>
          <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadCustomers}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : customers.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No Customers Found</Text>
          <Text style={styles.emptyText}>
            Click "Sync from RouteStar" to fetch customers.
          </Text>
        </View>
      ) : (
        <View style={styles.customersList}>
          {customers.map(renderCustomerCard)}

          {}
          {pagination.total > pagination.limit && (
            <View style={styles.pagination}>
              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  pagination.skip === 0 && styles.pageBtnDisabled,
                ]}
                onPress={() =>
                  setPagination(prev => ({
                    ...prev,
                    skip: Math.max(0, prev.skip - prev.limit),
                  }))
                }
                disabled={pagination.skip === 0}>
                <Text style={styles.pageBtnText}>Previous</Text>
              </TouchableOpacity>

              <Text style={styles.pageInfo}>
                {pagination.skip + 1} -{' '}
                {Math.min(pagination.skip + pagination.limit, pagination.total)} of{' '}
                {pagination.total}
              </Text>

              <TouchableOpacity
                style={[
                  styles.pageBtn,
                  pagination.skip + pagination.limit >= pagination.total &&
                    styles.pageBtnDisabled,
                ]}
                onPress={() =>
                  setPagination(prev => ({...prev, skip: prev.skip + prev.limit}))
                }
                disabled={pagination.skip + pagination.limit >= pagination.total}>
                <Text style={styles.pageBtnText}>Next</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {}
      {renderCustomerModal()}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  content: {padding: Spacing.lg, gap: Spacing.md},
  header: {marginBottom: Spacing.xs},
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
  syncBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  syncBtnDisabled: {
    backgroundColor: Colors.textMuted,
  },
  syncBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
  syncStatusCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  syncStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  syncStatusLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  syncStatusTime: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  syncResultBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    marginTop: 4,
  },
  syncResultText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  syncMessage: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  filtersContainer: {gap: Spacing.sm},
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.xs,
  },
  filterBtnText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  activeFilterGroup: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  activeFilterBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  activeFilterBtnActive: {
    backgroundColor: Colors.primary,
  },
  activeFilterText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  activeFilterTextActive: {
    color: '#fff',
  },
  stateFilterDropdown: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    maxHeight: 200,
  },
  stateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  stateOptionText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  resultsCount: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'right',
  },
  customersList: {gap: Spacing.sm},
  customerCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  customerCardInactive: {
    opacity: 0.7,
  },
  customerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  customerName: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  statusText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  customerCompany: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.xs,
  },
  customerDetails: {gap: 4},
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pageBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.sm,
  },
  pageBtnDisabled: {
    backgroundColor: Colors.borderLight,
  },
  pageBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#fff',
  },
  pageInfo: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
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
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  closeBtn: {
    padding: Spacing.xs,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  statusBadgeLarge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  statusTextLarge: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  detailSection: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
    paddingBottom: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalDetailLabel: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    width: '35%',
  },
  modalDetailValue: {
    flex: 1,
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  linkText: {
    color: Colors.primary,
  },
  monoText: {
    fontFamily: 'monospace',
  },
  externalLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
    marginTop: Spacing.lg,
  },
  externalLinkText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#fff',
  },
});

export default RouteStarCustomersSection;
