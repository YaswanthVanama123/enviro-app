/**
 * Company Mapping Section
 * Mobile component for mapping Bigin Companies to RouteStar Customers
 */

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {companyMappingApi} from '../../../../services/api/endpoints/companyMapping.api';
import {
  CompanyMapping,
  MappingStats,
  RouteStarCustomerOption,
  MappingFilterTab,
  getMappingStatusColor,
  getMappingStatusBgColor,
} from '../../types/companyMapping.types';
import {Colors} from '../../../../theme/colors';

export function CompanyMappingSection() {
  const [mappings, setMappings] = useState<CompanyMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<MappingStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<MappingFilterTab>('all');
  const [pagination, setPagination] = useState({
    total: 0,
    skip: 0,
    limit: 30,
    hasMore: false,
  });

  // Picker modal states
  const [showPicker, setShowPicker] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<CompanyMapping | null>(null);
  const [routeStarOptions, setRouteStarOptions] = useState<RouteStarCustomerOption[]>([]);
  const [pickerSearch, setPickerSearch] = useState('');
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Initialize state
  const [initializing, setInitializing] = useState(false);

  // Load mappings
  const loadMappings = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true);
      }
      const skip = reset ? 0 : pagination.skip;

      const result = await companyMappingApi.getAll({
        search: searchTerm || undefined,
        status: activeTab,
        limit: pagination.limit,
        skip,
      });

      if (result) {
        if (reset) {
          setMappings(result.data);
        } else {
          setMappings(prev => [...prev, ...result.data]);
        }
        setPagination({
          total: result.pagination.total,
          skip: result.pagination.skip + result.data.length,
          limit: result.pagination.limit,
          hasMore: result.pagination.hasMore,
        });
      }
      setLoading(false);
      setRefreshing(false);
    },
    [searchTerm, activeTab, pagination.limit, pagination.skip],
  );

  // Load stats
  const loadStats = useCallback(async () => {
    const result = await companyMappingApi.getStats();
    if (result) {
      setStats(result);
    }
  }, []);

  // Load RouteStar options
  const loadRouteStarOptions = useCallback(async (search?: string) => {
    setLoadingOptions(true);
    const result = await companyMappingApi.getAvailableRouteStarCustomers(search, true);
    if (result) {
      setRouteStarOptions(result);
    }
    setLoadingOptions(false);
  }, []);

  // Initial load
  useEffect(() => {
    loadMappings(true);
    loadStats();
  }, []);

  // Reload when tab changes
  useEffect(() => {
    loadMappings(true);
  }, [activeTab]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadMappings(true);
    loadStats();
  };

  // Handle search
  const handleSearch = () => {
    loadMappings(true);
  };

  // Handle tab change
  const handleTabChange = (tab: MappingFilterTab) => {
    setActiveTab(tab);
  };

  // Handle initialize
  const handleInitialize = async () => {
    Alert.alert(
      'Initialize Mappings',
      'This will create mapping records for all Bigin companies. Continue?',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Initialize',
          onPress: async () => {
            setInitializing(true);
            const result = await companyMappingApi.initialize();
            if (result) {
              Alert.alert(
                'Success',
                `Created ${result.created} new mappings, skipped ${result.skipped} existing`,
              );
              loadMappings(true);
              loadStats();
            }
            setInitializing(false);
          },
        },
      ],
    );
  };

  // Handle open picker
  const handleOpenPicker = (mapping: CompanyMapping) => {
    setSelectedMapping(mapping);
    setPickerSearch('');
    setShowPicker(true);
    loadRouteStarOptions();
  };

  // Handle picker search
  const handlePickerSearch = (value: string) => {
    setPickerSearch(value);
    loadRouteStarOptions(value);
  };

  // Handle select customer
  const handleSelectCustomer = async (customer: RouteStarCustomerOption | null) => {
    if (!selectedMapping) return;

    const result = await companyMappingApi.saveMapping(
      selectedMapping.biginId,
      customer?.routeStarId || null,
    );

    if (result) {
      // Update local state
      setMappings(prev =>
        prev.map(m =>
          m._id === selectedMapping._id
            ? {
                ...m,
                routeStarId: customer?.routeStarId || null,
                routeStarCustomerName: customer?.name || null,
                routeStarCompany: customer?.company || null,
                routeStarCity: customer?.city || null,
                mappingStatus: customer ? 'mapped' : 'unmapped',
              }
            : m,
        ),
      );
      loadStats();
    }

    setShowPicker(false);
    setSelectedMapping(null);
  };

  // Load more
  const handleLoadMore = () => {
    if (!loading && pagination.hasMore) {
      loadMappings(false);
    }
  };

  // Render stat card
  const renderStatCard = (
    label: string,
    value: number,
    icon: string,
    color: string,
    bgColor: string,
  ) => (
    <View style={[styles.statCard, {backgroundColor: bgColor}]}>
      <View style={[styles.statIcon, {backgroundColor: color + '20'}]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, {color}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  // Render mapping card
  const renderMappingCard = ({item}: {item: CompanyMapping}) => (
    <TouchableOpacity
      style={styles.mappingCard}
      onPress={() => handleOpenPicker(item)}
      activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={styles.companyInfo}>
          <Ionicons name="business-outline" size={16} color="#6366f1" />
          <Text style={styles.companyName} numberOfLines={1}>
            {item.biginCompanyName}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {backgroundColor: getMappingStatusBgColor(item.mappingStatus)},
          ]}>
          <Text
            style={[
              styles.statusText,
              {color: getMappingStatusColor(item.mappingStatus)},
            ]}>
            {item.mappingStatus === 'mapped' ? 'Mapped' : 'Unmapped'}
          </Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        {item.biginPhone && (
          <View style={styles.detailRow}>
            <Ionicons name="call-outline" size={12} color="#64748b" />
            <Text style={styles.detailText}>{item.biginPhone}</Text>
          </View>
        )}
        {item.biginCity && (
          <View style={styles.detailRow}>
            <Ionicons name="location-outline" size={12} color="#64748b" />
            <Text style={styles.detailText}>
              {item.biginCity}
              {item.biginState ? `, ${item.biginState}` : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.mappingSection}>
        <Text style={styles.mappingLabel}>RouteStar Customer:</Text>
        <View style={styles.mappingValue}>
          <Text
            style={[
              styles.mappingText,
              !item.routeStarCustomerName && styles.mappingPlaceholder,
            ]}
            numberOfLines={1}>
            {item.routeStarCustomerName || 'Tap to select...'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color="#94a3b8" />
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render footer
  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  // Render empty
  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="link-outline" size={48} color="#94a3b8" />
        <Text style={styles.emptyTitle}>No Mappings Found</Text>
        <Text style={styles.emptyText}>
          Tap "Initialize" to create mapping records from Bigin companies.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Company Mapping</Text>
          <Text style={styles.subtitle}>
            Map Bigin Companies to RouteStar
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.initBtn, initializing && styles.initBtnDisabled]}
          onPress={handleInitialize}
          disabled={initializing}
          activeOpacity={0.8}>
          {initializing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="add-circle-outline" size={16} color="#fff" />
          )}
          <Text style={styles.initBtnText}>Initialize</Text>
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {renderStatCard('Total', stats?.total || 0, 'link', '#6366f1', '#eef2ff')}
        {renderStatCard('Mapped', stats?.mapped || 0, 'checkmark-circle', '#059669', '#ecfdf5')}
        {renderStatCard('Unmapped', stats?.unmapped || 0, 'alert-circle', '#dc2626', '#fee2e2')}
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'all' && styles.tabActive]}
          onPress={() => handleTabChange('all')}>
          <Text style={[styles.tabText, activeTab === 'all' && styles.tabTextActive]}>
            All
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'mapped' && styles.tabActive]}
          onPress={() => handleTabChange('mapped')}>
          <Text style={[styles.tabText, activeTab === 'mapped' && styles.tabTextActive]}>
            Mapped
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'unmapped' && styles.tabActive]}
          onPress={() => handleTabChange('unmapped')}>
          <Text style={[styles.tabText, activeTab === 'unmapped' && styles.tabTextActive]}>
            Unmapped
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons
            name="search-outline"
            size={18}
            color="#94a3b8"
            style={styles.searchIcon}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search companies..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={handleSearch}
          activeOpacity={0.8}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Results count */}
      <Text style={styles.resultsCount}>{pagination.total} mappings found</Text>

      {/* Mappings List */}
      <FlatList
        data={mappings}
        renderItem={renderMappingCard}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
      />

      {/* RouteStar Picker Modal */}
      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowPicker(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select RouteStar Customer</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowPicker(false)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>

          {selectedMapping && (
            <View style={styles.selectedCompanyInfo}>
              <Text style={styles.selectedCompanyLabel}>Mapping for:</Text>
              <Text style={styles.selectedCompanyName}>
                {selectedMapping.biginCompanyName}
              </Text>
            </View>
          )}

          <View style={styles.pickerSearchRow}>
            <View style={styles.pickerSearchWrap}>
              <Ionicons name="search-outline" size={18} color="#94a3b8" />
              <TextInput
                style={styles.pickerSearchInput}
                placeholder="Search customers..."
                placeholderTextColor="#94a3b8"
                value={pickerSearch}
                onChangeText={handlePickerSearch}
                autoFocus
              />
            </View>
          </View>

          {selectedMapping?.mappingStatus === 'mapped' && (
            <TouchableOpacity
              style={styles.clearMappingBtn}
              onPress={() => handleSelectCustomer(null)}>
              <Ionicons name="close-circle-outline" size={20} color="#dc2626" />
              <Text style={styles.clearMappingText}>Clear Mapping</Text>
            </TouchableOpacity>
          )}

          <ScrollView style={styles.optionsList}>
            {loadingOptions ? (
              <View style={styles.optionsLoading}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.optionsLoadingText}>Loading...</Text>
              </View>
            ) : routeStarOptions.length === 0 ? (
              <View style={styles.optionsEmpty}>
                <Text style={styles.optionsEmptyText}>No customers found</Text>
              </View>
            ) : (
              routeStarOptions.map(customer => (
                <TouchableOpacity
                  key={customer._id}
                  style={[
                    styles.optionItem,
                    selectedMapping?.routeStarId === customer.routeStarId &&
                      styles.optionItemSelected,
                  ]}
                  onPress={() => handleSelectCustomer(customer)}>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionName}>{customer.name}</Text>
                    <View style={styles.optionDetails}>
                      {customer.company && (
                        <Text style={styles.optionDetail}>{customer.company}</Text>
                      )}
                      {customer.city && (
                        <Text style={styles.optionDetail}>
                          {customer.city}
                          {customer.state ? `, ${customer.state}` : ''}
                        </Text>
                      )}
                    </View>
                  </View>
                  {selectedMapping?.routeStarId === customer.routeStarId && (
                    <Ionicons name="checkmark-circle" size={22} color="#059669" />
                  )}
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  initBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366f1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  initBtnDisabled: {
    backgroundColor: '#a5b4fc',
  },
  initBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
  },
  tabActive: {
    backgroundColor: '#6366f1',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748b',
  },
  tabTextActive: {
    color: '#fff',
  },
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchIcon: {
    paddingLeft: 12,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  searchBtn: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  resultsCount: {
    fontSize: 12,
    color: '#64748b',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  listContent: {
    padding: 12,
    paddingTop: 0,
  },
  mappingCard: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  companyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  companyName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardDetails: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 10,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  detailText: {
    fontSize: 12,
    color: '#64748b',
  },
  mappingSection: {
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  mappingLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
  },
  mappingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  mappingText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  mappingPlaceholder: {
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  footerLoader: {
    paddingVertical: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  selectedCompanyInfo: {
    padding: 14,
    backgroundColor: '#eef2ff',
    borderBottomWidth: 1,
    borderBottomColor: '#c7d2fe',
  },
  selectedCompanyLabel: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 2,
  },
  selectedCompanyName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6366f1',
  },
  pickerSearchRow: {
    padding: 12,
  },
  pickerSearchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
  },
  pickerSearchInput: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
  },
  clearMappingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    marginHorizontal: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
  },
  clearMappingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#dc2626',
  },
  optionsList: {
    flex: 1,
  },
  optionsLoading: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  optionsLoadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 8,
  },
  optionsEmpty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  optionsEmptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  optionItemSelected: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  optionDetails: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 2,
  },
  optionDetail: {
    fontSize: 12,
    color: '#64748b',
  },
});

export default CompanyMappingSection;
