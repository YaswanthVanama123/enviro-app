

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
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {biginCompanyApi} from '../../../../services/api/endpoints/biginCompany.api';
import {
  BiginCompany,
  FetchStatus,
  CompanyStats,
  LocationTypeStatus,
  formatCompanyDate,
  formatAddress,
} from '../../types/biginCompany.types';
import {Colors} from '../../../../theme/colors';

export function BiginCompaniesSection() {
  const [companies, setCompanies] = useState<BiginCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchStatus, setFetchStatus] = useState<FetchStatus | null>(null);
  const [stats, setStats] = useState<CompanyStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [stateFilter, setStateFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [ltStatus, setLtStatus] = useState<LocationTypeStatus | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<BiginCompany | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    total: 0,
    skip: 0,
    limit: 30,
    hasMore: false,
  });

  const loadCompanies = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true);
      }
      const skip = reset ? 0 : pagination.skip;

      const result = await biginCompanyApi.getAll({
        search: searchTerm || undefined,
        city: cityFilter || undefined,
        state: stateFilter || undefined,
        owner: ownerFilter || undefined,
        industry: industryFilter || undefined,
        limit: pagination.limit,
        skip,
      });

      if (result) {
        if (reset) {
          setCompanies(result.data);
        } else {
          setCompanies(prev => [...prev, ...result.data]);
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
    [searchTerm, cityFilter, stateFilter, ownerFilter, industryFilter, pagination.limit, pagination.skip],
  );

  const loadStats = useCallback(async () => {
    const result = await biginCompanyApi.getStats();
    if (result) {
      setStats(result);
    }
  }, []);

  const loadFetchStatus = useCallback(async () => {
    const result = await biginCompanyApi.getFetchStatus();
    if (result) {
      setFetchStatus(result);
    }
  }, []);

  useEffect(() => {
    loadCompanies(true);
    loadStats();
    loadFetchStatus();
    biginCompanyApi.getLocationTypeStatus().then(setLtStatus);
  }, []);

  useEffect(() => {
    if (!ltStatus?.isRunning) {
      return;
    }
    const interval = setInterval(async () => {
      const s = await biginCompanyApi.getLocationTypeStatus();
      setLtStatus(s);
      if (s && !s.isRunning) {
        clearInterval(interval);
        loadCompanies(true);
        loadStats();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [ltStatus?.isRunning]);

  const handleDetectLocationTypes = async () => {
    const result = await biginCompanyApi.refreshLocationTypes();
    if (result?.data) {
      setLtStatus(result.data);
    } else {
      const s = await biginCompanyApi.getLocationTypeStatus();
      setLtStatus(s);
    }
  };

  useEffect(() => {
    if (fetchStatus?.isRunning) {
      const interval = setInterval(() => {
        loadFetchStatus();
      }, 2000);
      return () => clearInterval(interval);
    } else if (fetchStatus?.lastFetchResult === 'success') {
      loadCompanies(true);
      loadStats();
    }
  }, [fetchStatus?.isRunning, fetchStatus?.lastFetchResult]);

  const handleFetch = async () => {
    const result = await biginCompanyApi.startFetch();
    if (result) {
      loadFetchStatus();
    }
  };

  const handleSearch = () => {
    loadCompanies(true);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadCompanies(true);
    loadStats();
    loadFetchStatus();
  };

  const applyFilters = () => {
    setShowFilters(false);
    loadCompanies(true);
  };

  const clearFilters = () => {
    setCityFilter('');
    setStateFilter('');
    setOwnerFilter('');
    setIndustryFilter('');
    setShowFilters(false);
    loadCompanies(true);
  };

  const handleLoadMore = () => {
    if (!loading && pagination.hasMore) {
      loadCompanies(false);
    }
  };

  const renderStatCard = (
    label: string,
    value: number,
    icon: string,
    color: string,
    bgColor: string,
  ) => (
    <View style={[styles.statCard, {backgroundColor: bgColor}]}>
      <View style={[styles.statIcon, {backgroundColor: color + '20'}]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, {color}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  const renderCompanyItem = ({item}: {item: BiginCompany}) => (
    <TouchableOpacity
      style={styles.companyItem}
      onPress={() => setSelectedCompany(item)}
      activeOpacity={0.7}>
      <View style={styles.companyHeader}>
        <View style={styles.companyNameRow}>
          <Ionicons name="business-outline" size={16} color="#6366f1" />
          <Text style={styles.companyName} numberOfLines={1}>{item.companyName}</Text>
        </View>
        {item.industry && (
          <View style={styles.industryBadge}>
            <Text style={styles.industryText}>{item.industry}</Text>
          </View>
        )}
      </View>
      <View style={styles.companyBody}>
        {item.phone && (
          <View style={styles.companyDetail}>
            <Ionicons name="call-outline" size={12} color="#64748b" />
            <Text style={styles.companyDetailText}>{item.phone}</Text>
          </View>
        )}
        {item.city && (
          <View style={styles.companyDetail}>
            <Ionicons name="location-outline" size={12} color="#64748b" />
            <Text style={styles.companyDetailText}>{item.city}{item.state ? `, ${item.state}` : ''}</Text>
          </View>
        )}
      </View>
      {item.owner && (
        <View style={styles.companyOwnerRow}>
          <Ionicons name="person-outline" size={12} color="#94a3b8" />
          <Text style={styles.companyOwnerText}>{item.owner}</Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={Colors.primary} />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="business-outline" size={48} color="#94a3b8" />
        <Text style={styles.emptyTitle}>No Companies Found</Text>
        <Text style={styles.emptyText}>
          Tap "Fetch Companies" to sync companies from your Bigin account.
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bigin Companies</Text>
          <Text style={styles.subtitle}>View and sync companies from Zoho Bigin</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[
              styles.fetchBtn,
              fetchStatus?.isRunning && styles.fetchBtnRunning,
            ]}
            onPress={handleFetch}
            disabled={fetchStatus?.isRunning}
            activeOpacity={0.8}>
            {fetchStatus?.isRunning ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.fetchBtnText}>
                  {fetchStatus.progress}%
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="sync-outline" size={16} color="#fff" />
                <Text style={styles.fetchBtnText}>Fetch</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.detectBtn, ltStatus?.isRunning && styles.detectBtnRunning]}
            onPress={handleDetectLocationTypes}
            disabled={!!ltStatus?.isRunning}
            activeOpacity={0.8}>
            {ltStatus?.isRunning ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="git-branch-outline" size={16} color="#fff" />
            )}
            <Text style={styles.fetchBtnText}>
              {ltStatus?.isRunning ? 'Detecting…' : 'Detect'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {}
      <View style={styles.statsGrid}>
        {renderStatCard(
          'Total',
          stats?.total || 0,
          'business',
          '#6366f1',
          '#eef2ff',
        )}
        {renderStatCard(
          'Cities',
          stats?.uniqueCities || 0,
          'location',
          '#0891b2',
          '#ecfeff',
        )}
        {renderStatCard(
          'States',
          stats?.uniqueStates || 0,
          'map',
          '#059669',
          '#ecfdf5',
        )}
        {renderStatCard(
          'Owners',
          stats?.uniqueOwners || 0,
          'people',
          '#d97706',
          '#fef3c7',
        )}
      </View>

      {}
      {fetchStatus?.isRunning && (
        <View style={styles.fetchStatusBanner}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {width: `${fetchStatus.progress}%`},
              ]}
            />
          </View>
          <Text style={styles.progressText}>{fetchStatus.message}</Text>
        </View>
      )}

      {}
      {fetchStatus && !fetchStatus.isRunning && fetchStatus.lastFetchAt && (
        <View style={styles.syncInfoBanner}>
          <View style={styles.syncInfoRow}>
            <Text style={styles.syncInfoLabel}>Last Sync:</Text>
            <Text style={styles.syncInfoValue}>{formatCompanyDate(fetchStatus.lastFetchAt)}</Text>
            {fetchStatus.lastFetchResult && (
              <View style={[
                styles.syncResultBadge,
                {backgroundColor: fetchStatus.lastFetchResult === 'success' ? '#dcfce7' : '#fee2e2'}
              ]}>
                <Text style={[
                  styles.syncResultText,
                  {color: fetchStatus.lastFetchResult === 'success' ? '#059669' : '#dc2626'}
                ]}>
                  {fetchStatus.lastFetchResult === 'success' ? 'Success' : 'Failed'}
                </Text>
              </View>
            )}
          </View>
          {fetchStatus.totalCompanies > 0 && (
            <Text style={styles.syncCompanyCount}>{fetchStatus.totalCompanies} companies stored</Text>
          )}
        </View>
      )}

      {}
      {ltStatus && (ltStatus.isRunning || ltStatus.finishedAt) && (
        <View style={styles.ltStatusBox}>
          <View style={styles.ltStatusRow}>
            <Text style={styles.ltStatusMsg} numberOfLines={1}>
              {ltStatus.message || 'Detecting new vs existing locations…'}
            </Text>
            <Text style={styles.ltStatusMeta}>
              {ltStatus.processed}/{ltStatus.total}
              {ltStatus.total
                ? ` (${Math.round((ltStatus.processed / ltStatus.total) * 100)}%)`
                : ''}
              {` · ${ltStatus.markedExisting} existing`}
              {ltStatus.failed ? ` · ${ltStatus.failed} failed` : ''}
            </Text>
          </View>
          <View style={styles.ltProgressBar}>
            <View
              style={[
                styles.ltProgressFill,
                {
                  width: `${ltStatus.total ? Math.round((ltStatus.processed / ltStatus.total) * 100) : 0}%`,
                  backgroundColor: ltStatus.isRunning ? '#2563eb' : '#059669',
                },
              ]}
            />
          </View>
        </View>
      )}

      {}
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
          style={styles.filterBtn}
          onPress={() => setShowFilters(true)}
          activeOpacity={0.8}>
          <Ionicons name="options-outline" size={18} color="#64748b" />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={handleSearch}
          activeOpacity={0.8}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {}
      {(cityFilter || stateFilter || ownerFilter || industryFilter) && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersLabel}>Filters:</Text>
          {cityFilter && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{cityFilter}</Text>
              <TouchableOpacity onPress={() => { setCityFilter(''); loadCompanies(true); }}>
                <Ionicons name="close-circle" size={14} color="#6366f1" />
              </TouchableOpacity>
            </View>
          )}
          {stateFilter && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{stateFilter}</Text>
              <TouchableOpacity onPress={() => { setStateFilter(''); loadCompanies(true); }}>
                <Ionicons name="close-circle" size={14} color="#6366f1" />
              </TouchableOpacity>
            </View>
          )}
          {ownerFilter && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{ownerFilter}</Text>
              <TouchableOpacity onPress={() => { setOwnerFilter(''); loadCompanies(true); }}>
                <Ionicons name="close-circle" size={14} color="#6366f1" />
              </TouchableOpacity>
            </View>
          )}
          {industryFilter && (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{industryFilter}</Text>
              <TouchableOpacity onPress={() => { setIndustryFilter(''); loadCompanies(true); }}>
                <Ionicons name="close-circle" size={14} color="#6366f1" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {}
      <Text style={styles.resultsCount}>{pagination.total} companies found</Text>

      {}
      <FlatList
        data={companies}
        renderItem={renderCompanyItem}
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

      {}
      <Modal
        visible={!!selectedCompany}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedCompany(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>{selectedCompany?.companyName}</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedCompany(null)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          {selectedCompany && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Bigin ID</Text>
                <Text style={[styles.detailValue, styles.monoText]}>{selectedCompany.biginId || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Company Name</Text>
                <Text style={styles.detailValue}>{selectedCompany.companyName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Phone</Text>
                <Text style={styles.detailValue}>{selectedCompany.phone || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Email</Text>
                <Text style={styles.detailValue}>{selectedCompany.email || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Website</Text>
                <Text style={[styles.detailValue, selectedCompany.website && styles.linkText]}>
                  {selectedCompany.website || '-'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Industry</Text>
                <Text style={styles.detailValue}>{selectedCompany.industry || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Account Type</Text>
                <Text style={styles.detailValue}>{selectedCompany.accountType || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Owner</Text>
                <Text style={styles.detailValue}>{selectedCompany.owner || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Owner Email</Text>
                <Text style={styles.detailValue}>{selectedCompany.ownerEmail || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>New Location</Text>
                <Text style={styles.detailValue}>
                  {selectedCompany.isExistingLocation === undefined
                    ? '-'
                    : selectedCompany.isExistingLocation
                    ? 'False'
                    : 'True'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Address</Text>
                <Text style={styles.detailValue}>{formatAddress(selectedCompany)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pipeline</Text>
                <Text style={styles.detailValue}>{selectedCompany.pipeline || '-'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Stage</Text>
                <Text style={styles.detailValue}>{selectedCompany.stage || '-'}</Text>
              </View>
              {selectedCompany.description && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Description</Text>
                  <Text style={styles.detailValue}>{selectedCompany.description}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Last Synced</Text>
                <Text style={styles.detailValue}>{formatCompanyDate(selectedCompany.lastSyncedAt)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Created At</Text>
                <Text style={styles.detailValue}>{formatCompanyDate(selectedCompany.createdAt)}</Text>
              </View>
              {selectedCompany.rawData &&
                Object.keys(selectedCompany.rawData).length > 0 && (
                  <View style={styles.rawDataSection}>
                    <Text style={styles.detailLabel}>Raw Data</Text>
                    <Text style={[styles.detailValue, styles.monoText, styles.rawDataText]}>
                      {JSON.stringify(selectedCompany.rawData, null, 2)}
                    </Text>
                  </View>
                )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {}
      <Modal
        visible={showFilters}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilters(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filter Companies</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.filterModalBody}>
            <Text style={styles.filterSectionTitle}>City</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterOption, !cityFilter && styles.filterOptionSelected]}
                onPress={() => setCityFilter('')}>
                <Text style={[styles.filterOptionText, !cityFilter && styles.filterOptionTextSelected]}>All Cities</Text>
              </TouchableOpacity>
              {stats?.cities?.slice(0, 10).map(city => (
                <TouchableOpacity
                  key={city}
                  style={[styles.filterOption, cityFilter === city && styles.filterOptionSelected]}
                  onPress={() => setCityFilter(city)}>
                  <Text style={[styles.filterOptionText, cityFilter === city && styles.filterOptionTextSelected]}>{city}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>State</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterOption, !stateFilter && styles.filterOptionSelected]}
                onPress={() => setStateFilter('')}>
                <Text style={[styles.filterOptionText, !stateFilter && styles.filterOptionTextSelected]}>All States</Text>
              </TouchableOpacity>
              {stats?.states?.map(state => (
                <TouchableOpacity
                  key={state}
                  style={[styles.filterOption, stateFilter === state && styles.filterOptionSelected]}
                  onPress={() => setStateFilter(state)}>
                  <Text style={[styles.filterOptionText, stateFilter === state && styles.filterOptionTextSelected]}>{state}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Owner</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterOption, !ownerFilter && styles.filterOptionSelected]}
                onPress={() => setOwnerFilter('')}>
                <Text style={[styles.filterOptionText, !ownerFilter && styles.filterOptionTextSelected]}>All Owners</Text>
              </TouchableOpacity>
              {stats?.owners?.map(owner => (
                <TouchableOpacity
                  key={owner}
                  style={[styles.filterOption, ownerFilter === owner && styles.filterOptionSelected]}
                  onPress={() => setOwnerFilter(owner)}>
                  <Text style={[styles.filterOptionText, ownerFilter === owner && styles.filterOptionTextSelected]}>{owner}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Industry</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterOption, !industryFilter && styles.filterOptionSelected]}
                onPress={() => setIndustryFilter('')}>
                <Text style={[styles.filterOptionText, !industryFilter && styles.filterOptionTextSelected]}>All Industries</Text>
              </TouchableOpacity>
              {stats?.industries?.map(industry => (
                <TouchableOpacity
                  key={industry}
                  style={[styles.filterOption, industryFilter === industry && styles.filterOptionSelected]}
                  onPress={() => setIndustryFilter(industry)}>
                  <Text style={[styles.filterOptionText, industryFilter === industry && styles.filterOptionTextSelected]}>{industry}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.filterActions}>
              <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters}>
                <Text style={styles.clearFiltersBtnText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyFiltersBtn} onPress={applyFilters}>
                <Text style={styles.applyFiltersBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
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
  fetchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#6366f1',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0891b2',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  detectBtnRunning: {
    backgroundColor: '#64748b',
  },
  ltStatusBox: {
    marginHorizontal: 12,
    marginBottom: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    backgroundColor: '#f9fafb',
  },
  ltStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  ltStatusMsg: {
    flex: 1,
    fontSize: 12,
    color: '#475569',
  },
  ltStatusMeta: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
  },
  ltProgressBar: {
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
    height: 8,
    overflow: 'hidden',
  },
  ltProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  rawDataSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 6,
  },
  rawDataText: {
    fontSize: 11,
    color: '#475569',
  },
  fetchBtnRunning: {
    backgroundColor: '#059669',
  },
  fetchBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  statsGrid: {
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
    fontSize: 20,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  fetchStatusBanner: {
    backgroundColor: '#eef2ff',
    padding: 12,
    marginHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
  },
  syncInfoBanner: {
    backgroundColor: '#f8fafc',
    padding: 10,
    marginHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  syncInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncInfoLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  syncInfoValue: {
    fontSize: 12,
    color: Colors.text,
  },
  syncResultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  syncResultText: {
    fontSize: 11,
    fontWeight: '600',
  },
  syncCompanyCount: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 4,
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
  filterBtn: {
    backgroundColor: Colors.surface,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
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
  activeFilters: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 8,
    flexWrap: 'wrap',
    gap: 6,
  },
  activeFiltersLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    gap: 4,
  },
  filterChipText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
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
  companyItem: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  companyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  companyNameRow: {
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
  industryBadge: {
    backgroundColor: '#f5f3ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    marginLeft: 8,
  },
  industryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#7c3aed',
  },
  companyBody: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 4,
  },
  companyDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  companyDetailText: {
    fontSize: 12,
    color: '#64748b',
  },
  companyOwnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  companyOwnerText: {
    fontSize: 11,
    color: '#94a3b8',
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
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    color: Colors.text,
  },
  monoText: {
    fontFamily: 'monospace',
    fontSize: 13,
    backgroundColor: '#f1f5f9',
    padding: 6,
    borderRadius: 4,
    overflow: 'hidden',
  },
  linkText: {
    color: '#3b82f6',
  },
  filterModalBody: {
    padding: 16,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
    marginTop: 16,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  filterOptionSelected: {
    backgroundColor: '#eef2ff',
    borderColor: '#6366f1',
  },
  filterOptionText: {
    fontSize: 13,
    color: '#64748b',
  },
  filterOptionTextSelected: {
    color: '#6366f1',
    fontWeight: '600',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  clearFiltersBtn: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  clearFiltersBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  applyFiltersBtn: {
    flex: 1,
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyFiltersBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

export default BiginCompaniesSection;
