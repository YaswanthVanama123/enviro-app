

import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Modal,
  FlatList,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  mapDistanceApi,
  RouteStarCustomerOption,
  MapDistanceResult,
  MapDistanceStats,
  SyncStatusResponse,
} from '../../../services/api/endpoints/mapDistance.api';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';

type ViewMode = 'fetch' | 'stats' | 'history';

export function MapDistanceScreen() {
  const [viewMode, setViewMode] = useState<ViewMode>('fetch');
  const [refreshing, setRefreshing] = useState(false);

  const [customers, setCustomers] = useState<RouteStarCustomerOption[]>([]);
  const [selectedCustomer, setSelectedCustomer] =
    useState<RouteStarCustomerOption | null>(null);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const [results, setResults] = useState<MapDistanceResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastFetchedCustomer, setLastFetchedCustomer] = useState<string | null>(
    null,
  );
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const [syncStatus, setSyncStatus] = useState<SyncStatusResponse>({
    isRunning: false,
    isInterrupted: false,
    isPaused: false,
    job: null,
  });
  const [stats, setStats] = useState<MapDistanceStats | null>(null);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadCustomers();
    loadStats();
    checkSyncStatus();
  }, []);

  useEffect(() => {
    if (syncStatus.isRunning) {
      pollIntervalRef.current = setInterval(() => {
        checkSyncStatus();
      }, 3000);
    } else if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
      loadStats();

      if (
        syncStatus.job?.jobType === 'single_fetch' &&
        syncStatus.job?.status === 'completed'
      ) {
        if (syncStatus.job.fetchedData && syncStatus.job.fetchedData.length > 0) {
          setResults(syncStatus.job.fetchedData);
          setLastFetchedCustomer(
            syncStatus.job.currentCustomerName || 'Customer',
          );
          setFetchedAt(
            syncStatus.job.completedAt || new Date().toISOString(),
          );
        }
      }
    }

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, [syncStatus.isRunning, syncStatus.job?.status]);

  const loadCustomers = async () => {
    setLoadingCustomers(true);
    const data = await mapDistanceApi.getCustomers();
    setCustomers(data);
    setLoadingCustomers(false);
  };

  const loadStats = async () => {
    const data = await mapDistanceApi.getStats();
    setStats(data);
  };

  const checkSyncStatus = async () => {
    const status = await mapDistanceApi.getSyncStatus();
    const wasRunning = syncStatus.isRunning;
    const isNowRunning = status.isRunning;

    setSyncStatus(status);

    if (wasRunning && !isNowRunning && status.job) {
      if (
        status.job.jobType === 'single_fetch' &&
        status.job.status === 'completed'
      ) {
        if (status.job.fetchedData && status.job.fetchedData.length > 0) {
          setResults(status.job.fetchedData);
          setLastFetchedCustomer(status.job.currentCustomerName || 'Customer');
          setFetchedAt(status.job.completedAt || new Date().toISOString());
        } else {
          setResults([]);
          setLastFetchedCustomer(status.job.currentCustomerName || 'Customer');
        }
      }
      loadStats();
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadCustomers(), loadStats(), checkSyncStatus()]);
    setRefreshing(false);
  };

  const handleFetchDistance = async () => {
    if (!selectedCustomer) return;

    setError(null);
    setResults([]);
    setLastFetchedCustomer(null);

    const response = await mapDistanceApi.fetchDistance(selectedCustomer.name);

    if (response.success) {
      checkSyncStatus();
    } else {
      setError(response.error || 'Failed to start fetch');
    }
  };

  const handleStartSync = async () => {
    setError(null);
    const result = await mapDistanceApi.startSync();
    if (result.success) {
      checkSyncStatus();
    } else {
      setError(result.error || 'Failed to start sync');
    }
  };

  const handleStartUpdateSync = async () => {
    setError(null);
    const result = await mapDistanceApi.startUpdateSync();
    if (result.success) {
      checkSyncStatus();
    } else {
      setError(result.error || 'Failed to start update sync');
    }
  };

  const handleCancelSync = async () => {
    const result = await mapDistanceApi.cancelSync();
    if (result.success) {
      checkSyncStatus();
    }
  };

  const handlePauseSync = async () => {
    const result = await mapDistanceApi.pauseSync();
    if (result.success) {
      checkSyncStatus();
    } else {
      setError(result.error || 'Failed to pause sync');
    }
  };

  const filteredCustomers = customers.filter(
    c =>
      c.name.toLowerCase().includes(pickerSearch.toLowerCase()) ||
      c.company?.toLowerCase().includes(pickerSearch.toLowerCase()),
  );

  // "Update All Data" covers every active customer, including ones never synced,
  // so the target is the active count when the server reports it.
  const updateTargetCount = stats
    ? stats.activeCustomers ?? stats.customersWithData
    : 0;
  const missingCount = stats?.customersMissingData ?? 0;

  const formatDate = (iso: string): string => {
    if (!iso) return '—';
    const date = new Date(iso);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="map-outline" size={24} color={Colors.primary} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Map Distance</Text>
            <Text style={styles.headerSubtitle}>
              Fetch distance data from RouteStar
            </Text>
          </View>
        </View>
      </View>

      {}
      <View style={styles.tabBar}>
        {(['fetch', 'stats'] as ViewMode[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, viewMode === tab && styles.tabActive]}
            onPress={() => setViewMode(tab)}>
            <Ionicons
              name={tab === 'fetch' ? 'search-outline' : 'stats-chart-outline'}
              size={16}
              color={viewMode === tab ? Colors.primary : Colors.textMuted}
            />
            <Text
              style={[
                styles.tabText,
                viewMode === tab && styles.tabTextActive,
              ]}>
              {tab === 'fetch' ? 'Fetch' : 'Stats'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[Colors.primary]}
          />
        }>
        {viewMode === 'fetch' && (
          <View style={styles.section}>
            {}
            {syncStatus.isRunning && syncStatus.job && (
              <View style={styles.syncBanner}>
                <ActivityIndicator size="small" color="#fff" />
                <View style={styles.syncInfo}>
                  <Text style={styles.syncTitle}>
                    {syncStatus.job.jobType === 'full_sync'
                      ? 'Full Sync Running'
                      : 'Fetching Distance'}
                  </Text>
                  <Text style={styles.syncSubtitle}>
                    {syncStatus.job.currentCustomerName ||
                      `${syncStatus.job.processedCustomers}/${syncStatus.job.totalCustomers}`}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={
                    syncStatus.job.jobType === 'full_sync'
                      ? handlePauseSync
                      : handleCancelSync
                  }
                  style={styles.syncCancelBtn}>
                  <Ionicons
                    name={
                      syncStatus.job.jobType === 'full_sync'
                        ? 'pause'
                        : 'close'
                    }
                    size={18}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            )}

            {}
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Select RouteStar Customer</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowPicker(true)}
                disabled={loadingCustomers || syncStatus.isRunning}>
                {loadingCustomers ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  <>
                    <Ionicons
                      name="business-outline"
                      size={18}
                      color={Colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.pickerText,
                        !selectedCustomer && styles.pickerPlaceholder,
                      ]}
                      numberOfLines={1}>
                      {selectedCustomer?.name || 'Select a customer...'}
                    </Text>
                    <Ionicons
                      name="chevron-down"
                      size={18}
                      color={Colors.textMuted}
                    />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.fetchButton,
                  (!selectedCustomer || syncStatus.isRunning) &&
                    styles.fetchButtonDisabled,
                ]}
                onPress={handleFetchDistance}
                disabled={!selectedCustomer || syncStatus.isRunning}>
                {syncStatus.isRunning &&
                syncStatus.job?.jobType === 'single_fetch' ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="locate-outline" size={18} color="#fff" />
                    <Text style={styles.fetchButtonText}>Get Distance</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {}
            {error && (
              <View style={styles.errorCard}>
                <Ionicons name="alert-circle" size={20} color="#dc2626" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {}
            {results.length > 0 && (
              <View style={styles.resultsCard}>
                <View style={styles.resultsHeader}>
                  <Ionicons name="location" size={18} color="#16a34a" />
                  <Text style={styles.resultsTitle}>
                    Distance to {lastFetchedCustomer}
                  </Text>
                </View>
                {fetchedAt && (
                  <Text style={styles.resultsFetchedAt}>
                    Fetched {formatDate(fetchedAt)}
                  </Text>
                )}

                {results.map((result, idx) => (
                  <View key={idx} style={styles.resultRow}>
                    <View style={styles.resultInfo}>
                      <Text style={styles.resultLocation}>
                        {result.locationName}
                      </Text>
                      <Text style={styles.resultAddress}>{result.address}</Text>
                    </View>
                    <View style={styles.resultValues}>
                      <Text style={styles.resultDistance}>{result.distance}</Text>
                      <Text style={styles.resultDuration}>{result.duration}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Full Distance Sync</Text>
              <Text style={styles.cardDescription}>
                Sync distance data for all RouteStar customers. This may take
                several minutes.
              </Text>
              <TouchableOpacity
                style={[
                  styles.syncButton,
                  syncStatus.isRunning && styles.syncButtonDisabled,
                ]}
                onPress={handleStartSync}
                disabled={syncStatus.isRunning}>
                <Ionicons name="sync-outline" size={18} color="#fff" />
                <Text style={styles.syncButtonText}>Start Full Sync</Text>
              </TouchableOpacity>
            </View>

            {}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Update Distance Data</Text>
              <Text style={styles.cardDescription}>
                Refresh stored records for every active customer. Customers that
                have never been synced are picked up too.
              </Text>
              {missingCount > 0 && (
                <View style={styles.missingBanner}>
                  <Ionicons name="alert-circle-outline" size={14} color="#b45309" />
                  <Text style={styles.missingBannerText}>
                    {missingCount.toLocaleString()} customer
                    {missingCount === 1 ? '' : 's'} never synced — this run will
                    backfill them.
                  </Text>
                </View>
              )}
              <TouchableOpacity
                style={[
                  styles.updateButton,
                  (syncStatus.isRunning || updateTargetCount === 0) &&
                    styles.syncButtonDisabled,
                ]}
                onPress={handleStartUpdateSync}
                disabled={syncStatus.isRunning || updateTargetCount === 0}>
                <Ionicons name="refresh-outline" size={18} color="#fff" />
                <Text style={styles.syncButtonText}>
                  {updateTargetCount > 0
                    ? `Update All Data (${updateTargetCount.toLocaleString()} customers)`
                    : 'No Data to Update'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {viewMode === 'stats' && (
          <View style={styles.section}>
            {stats ? (
              <>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <View style={styles.statIcon}>
                      <Ionicons name="documents" size={20} color="#2563eb" />
                    </View>
                    <Text style={styles.statValue}>
                      {stats.totalRecords.toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>Total Records</Text>
                  </View>

                  <View style={styles.statCard}>
                    <View
                      style={[styles.statIcon, {backgroundColor: '#dcfce7'}]}>
                      <Ionicons name="people" size={20} color="#16a34a" />
                    </View>
                    <Text style={styles.statValue}>
                      {stats.customersWithData.toLocaleString()}
                    </Text>
                    <Text style={styles.statLabel}>Customers with Data</Text>
                  </View>

                  {missingCount > 0 && (
                    <View style={styles.statCard}>
                      <View
                        style={[styles.statIcon, {backgroundColor: '#fef3c7'}]}>
                        <Ionicons name="alert-circle" size={20} color="#d97706" />
                      </View>
                      <Text style={[styles.statValue, {color: '#d97706'}]}>
                        {missingCount.toLocaleString()}
                      </Text>
                      <Text style={styles.statLabel}>Never Synced</Text>
                    </View>
                  )}

                  <View style={styles.statCard}>
                    <View
                      style={[styles.statIcon, {backgroundColor: '#fef3c7'}]}>
                      <Ionicons name="server" size={20} color="#f59e0b" />
                    </View>
                    <Text style={styles.statValue}>
                      {stats.storageSizeFormatted || 'N/A'}
                    </Text>
                    <Text style={styles.statLabel}>Storage Size</Text>
                  </View>
                </View>

                {stats.lastSyncAt && (
                  <View style={styles.lastSyncCard}>
                    <Ionicons name="time-outline" size={16} color={Colors.textMuted} />
                    <Text style={styles.lastSyncText}>
                      Last sync: {formatDate(stats.lastSyncAt)}
                    </Text>
                  </View>
                )}
              </>
            ) : (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading stats...</Text>
              </View>
            )}
          </View>
        )}

        <View style={{height: 100}} />
      </ScrollView>

      {}
      <Modal visible={showPicker} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Customer</Text>
              <TouchableOpacity onPress={() => setShowPicker(false)}>
                <Ionicons name="close" size={24} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalSearch}>
              <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search customers..."
                placeholderTextColor={Colors.textMuted}
                value={pickerSearch}
                onChangeText={setPickerSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {pickerSearch.length > 0 && (
                <TouchableOpacity onPress={() => setPickerSearch('')}>
                  <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={filteredCustomers}
              keyExtractor={item => item._id}
              renderItem={({item}) => (
                <TouchableOpacity
                  style={[
                    styles.customerItem,
                    selectedCustomer?._id === item._id &&
                      styles.customerItemSelected,
                  ]}
                  onPress={() => {
                    setSelectedCustomer(item);
                    setShowPicker(false);
                    setPickerSearch('');
                  }}>
                  <View style={styles.customerInfo}>
                    <Text style={styles.customerName}>{item.name}</Text>
                    <Text style={styles.customerMeta}>
                      {[item.company, item.city, item.state]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  </View>
                  {selectedCustomer?._id === item._id && (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={Colors.primary}
                    />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyList}>
                  <Text style={styles.emptyText}>
                    {pickerSearch
                      ? 'No customers found'
                      : 'No customers available'}
                  </Text>
                </View>
              }
              contentContainerStyle={styles.customerList}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.background,
  },
  tabActive: {
    backgroundColor: Colors.primaryLight,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  syncInfo: {
    flex: 1,
  },
  syncTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
  syncSubtitle: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  syncCancelBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
  },
  cardLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  cardDescription: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pickerText: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  pickerPlaceholder: {
    color: Colors.textMuted,
  },
  fetchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  fetchButtonDisabled: {
    opacity: 0.6,
  },
  fetchButtonText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  syncButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  syncButtonDisabled: {
    opacity: 0.6,
  },
  updateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  missingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  missingBannerText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: '#b45309',
    lineHeight: 17,
  },
  syncButtonText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  errorText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: '#dc2626',
  },
  resultsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    padding: Spacing.lg,
  },
  resultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  resultsTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#16a34a',
  },
  resultsFetchedAt: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  resultInfo: {
    flex: 1,
  },
  resultLocation: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  resultAddress: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  resultValues: {
    alignItems: 'flex-end',
  },
  resultDistance: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#2563eb',
  },
  resultDuration: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },
  lastSyncCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  lastSyncText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    padding: 0,
  },
  customerList: {
    paddingBottom: Spacing.xxxl,
  },
  customerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  customerItemSelected: {
    backgroundColor: Colors.primaryLight,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  customerMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: Spacing.xxxl,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
});

export default MapDistanceScreen;
