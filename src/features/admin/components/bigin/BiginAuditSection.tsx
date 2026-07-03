

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
import DocumentPicker, {
  DocumentPickerResponse,
} from 'react-native-document-picker';
import {biginAuditApi} from '../../../../services/api/endpoints/biginAudit.api';
import {
  BiginAuditLog,
  ScrapeStatus,
  AuditStats,
  getActionColor,
  getActionBackgroundColor,
  formatAuditDate,
} from '../../types/biginAudit.types';
import {Colors} from '../../../../theme/colors';

function formatBytes(bytes: number): string {
  if (!bytes) {return '0 B';}
  if (bytes < 1024) {return `${bytes} B`;}
  if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`;}
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function BiginAuditSection() {
  const [logs, setLogs] = useState<BiginAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus | null>(null);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showDeleteAllModal, setShowDeleteAllModal] = useState(false);
  const [showDeleteUnnecessaryModal, setShowDeleteUnnecessaryModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<BiginAuditLog | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    totalRows: number;
    saved: number;
    skipped: number;
    errors: number;
  } | null>(null);
  const [pagination, setPagination] = useState({
    total: 0,
    skip: 0,
    limit: 30,
    hasMore: false,
  });

  const loadLogs = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true);
      }
      const skip = reset ? 0 : pagination.skip;

      const result = await biginAuditApi.getAll({
        search: searchTerm || undefined,
        user: userFilter || undefined,
        action: actionFilter || undefined,
        module: moduleFilter || undefined,
        limit: pagination.limit,
        skip,
      });

      if (result) {
        if (reset) {
          setLogs(result.data);
        } else {
          setLogs(prev => [...prev, ...result.data]);
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
    [searchTerm, userFilter, actionFilter, moduleFilter, pagination.limit, pagination.skip],
  );

  const loadStats = useCallback(async () => {
    const result = await biginAuditApi.getStats();
    if (result) {
      setStats(result);
    }
  }, []);

  const loadScrapeStatus = useCallback(async () => {
    const result = await biginAuditApi.getScrapeStatus();
    if (result) {
      setScrapeStatus(result);
    }
  }, []);

  useEffect(() => {
    loadLogs(true);
    loadStats();
    loadScrapeStatus();
  }, []);

  useEffect(() => {
    if (scrapeStatus?.isRunning) {
      const interval = setInterval(() => {
        loadScrapeStatus();
      }, 2000);
      return () => clearInterval(interval);
    } else if (scrapeStatus?.lastScrapeResult === 'success') {
      loadLogs(true);
      loadStats();
    }
  }, [scrapeStatus?.isRunning, scrapeStatus?.lastScrapeResult]);

  const handleScrape = async () => {
    const result = await biginAuditApi.startScrape();
    if (result) {
      loadScrapeStatus();
    }
  };

  const handleSearch = () => {
    loadLogs(true);
  };

  const applyFilters = () => {
    setShowFilters(false);
    loadLogs(true);
  };

  const clearFilters = () => {
    setUserFilter('');
    setActionFilter('');
    setModuleFilter('');
    setShowFilters(false);
    loadLogs(true);
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    const result = await biginAuditApi.deleteAll();
    setDeleting(false);
    setShowDeleteAllModal(false);
    if (result?.success) {
      Alert.alert('Deleted', `Removed ${result.data?.deletedCount ?? 'all'} audit logs.`);
      loadLogs(true);
      loadStats();
    } else {
      Alert.alert('Delete Failed', 'Could not delete audit logs. Please try again.');
    }
  };

  const handleDeleteUnnecessary = async () => {
    setDeleting(true);
    const result = await biginAuditApi.deleteUnnecessary();
    setDeleting(false);
    setShowDeleteUnnecessaryModal(false);
    if (result?.success) {
      Alert.alert('Cleaned Up', `Removed ${result.data?.deletedCount ?? 0} unnecessary logs.`);
      loadLogs(true);
      loadStats();
    } else {
      Alert.alert('Delete Failed', 'Could not delete unnecessary logs. Please try again.');
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadLogs(true);
    loadStats();
    loadScrapeStatus();
  };

  const handleUploadCsv = async () => {
    try {
      const result = await DocumentPicker.pick({
        type: [DocumentPicker.types.allFiles],
        copyTo: 'cachesDirectory',
      });

      const file = result[0] as DocumentPickerResponse;
      if (!file.name?.toLowerCase().endsWith('.csv')) {
        Alert.alert('Invalid File', 'Please select a CSV file');
        return;
      }

      setUploading(true);
      setUploadResult(null);

      const fileUri = file.fileCopyUri || file.uri;
      const uploadResponse = await biginAuditApi.uploadCsv(
        fileUri,
        file.name || 'audit_logs.csv',
      );

      if (uploadResponse?.success && uploadResponse.data) {
        setUploadResult(uploadResponse.data);
        loadLogs(true);
        loadStats();
      } else {
        Alert.alert('Upload Failed', 'Failed to upload CSV file. Please try again.');
      }
    } catch (err) {
      if (!DocumentPicker.isCancel(err)) {
        console.error('Upload error:', err);
        Alert.alert('Error', 'An error occurred while uploading the file');
      }
    } finally {
      setUploading(false);
    }
  };

  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadResult(null);
  };

  const handleLoadMore = () => {
    if (!loading && pagination.hasMore) {
      loadLogs(false);
    }
  };

  const renderStatCard = (
    label: string,
    value: number | string,
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

  const renderLogItem = ({item}: {item: BiginAuditLog}) => (
    <TouchableOpacity
      style={styles.logItem}
      onPress={() => setSelectedLog(item)}
      activeOpacity={0.7}>
      <View style={styles.logHeader}>
        <View style={styles.logUserRow}>
          <Ionicons name="person-outline" size={14} color="#64748b" />
          <Text style={styles.logUser}>{item.user}</Text>
        </View>
        <Text style={styles.logTimestamp}>{formatAuditDate(item.timestamp)}</Text>
      </View>
      <View style={styles.logBody}>
        <View
          style={[
            styles.actionBadge,
            {backgroundColor: getActionBackgroundColor(item.action)},
          ]}>
          <Text style={[styles.actionText, {color: getActionColor(item.action)}]}>
            {item.action}
          </Text>
        </View>
        {item.module && <Text style={styles.logModule}>{item.module}</Text>}
      </View>
      {item.recordName && (
        <Text style={styles.logRecord} numberOfLines={1}>
          {item.recordName}
        </Text>
      )}
      {item.details && (
        <Text style={styles.logDetails} numberOfLines={2}>
          {item.details}
        </Text>
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
        <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
        <Text style={styles.emptyTitle}>No Audit Logs Found</Text>
        <Text style={styles.emptyText}>
          Tap "Fetch Logs" to scrape audit history from Bigin
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Bigin Audit History</Text>
          <Text style={styles.subtitle}>View audit logs from Zoho Bigin</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => setShowUploadModal(true)}
            activeOpacity={0.8}>
            <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteUnnecessaryBtn}
            onPress={() => setShowDeleteUnnecessaryModal(true)}
            activeOpacity={0.8}>
            <Ionicons name="funnel-outline" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteAllBtn}
            onPress={() => setShowDeleteAllModal(true)}
            activeOpacity={0.8}>
            <Ionicons name="trash-outline" size={16} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.scrapeBtn,
              scrapeStatus?.isRunning && styles.scrapeBtnRunning,
            ]}
            onPress={handleScrape}
            disabled={scrapeStatus?.isRunning}
            activeOpacity={0.8}>
            {scrapeStatus?.isRunning ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.scrapeBtnText}>
                  {scrapeStatus.progress}%
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="sync-outline" size={16} color="#fff" />
                <Text style={styles.scrapeBtnText}>Fetch Logs</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.statsScroll}
        contentContainerStyle={styles.statsGrid}>
        {renderStatCard(
          'Total',
          stats?.total || 0,
          'document-text',
          '#c00000',
          '#fdeaea',
        )}
        {renderStatCard(
          'Storage',
          formatBytes(stats?.storageSize || 0),
          'server-outline',
          '#c026d3',
          '#fdf4ff',
        )}
        {renderStatCard(
          '24 Hours',
          stats?.last24Hours || 0,
          'time-outline',
          '#d97706',
          '#fef3c7',
        )}
        {renderStatCard(
          '7 Days',
          stats?.last7Days || 0,
          'calendar-outline',
          '#059669',
          '#ecfdf5',
        )}
        {renderStatCard(
          'Users',
          stats?.uniqueUsers || 0,
          'people-outline',
          '#2563eb',
          '#eff6ff',
        )}
      </ScrollView>

      {}
      {scrapeStatus?.isRunning && (
        <View style={styles.scrapeStatusBanner}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {width: `${scrapeStatus.progress}%`},
              ]}
            />
          </View>
          <Text style={styles.progressText}>{scrapeStatus.message}</Text>
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
            placeholder="Search logs..."
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
      {(userFilter || actionFilter || moduleFilter) && (
        <View style={styles.activeFilters}>
          <Text style={styles.activeFiltersLabel}>Filters:</Text>
          {userFilter ? (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{userFilter}</Text>
              <TouchableOpacity onPress={() => { setUserFilter(''); loadLogs(true); }}>
                <Ionicons name="close-circle" size={14} color="#6366f1" />
              </TouchableOpacity>
            </View>
          ) : null}
          {actionFilter ? (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{actionFilter}</Text>
              <TouchableOpacity onPress={() => { setActionFilter(''); loadLogs(true); }}>
                <Ionicons name="close-circle" size={14} color="#6366f1" />
              </TouchableOpacity>
            </View>
          ) : null}
          {moduleFilter ? (
            <View style={styles.filterChip}>
              <Text style={styles.filterChipText}>{moduleFilter}</Text>
              <TouchableOpacity onPress={() => { setModuleFilter(''); loadLogs(true); }}>
                <Ionicons name="close-circle" size={14} color="#6366f1" />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      )}

      {}
      <Text style={styles.resultsCount}>{pagination.total} logs found</Text>

      {}
      <FlatList
        data={logs}
        renderItem={renderLogItem}
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
        visible={!!selectedLog}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedLog(null)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Audit Log Details</Text>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setSelectedLog(null)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          {selectedLog && (
            <ScrollView style={styles.modalBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Timestamp</Text>
                <Text style={styles.detailValue}>
                  {formatAuditDate(selectedLog.timestamp)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>User</Text>
                <Text style={styles.detailValue}>{selectedLog.user}</Text>
              </View>
              {selectedLog.userEmail && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Email</Text>
                  <Text style={styles.detailValue}>{selectedLog.userEmail}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Action</Text>
                <View
                  style={[
                    styles.actionBadge,
                    {backgroundColor: getActionBackgroundColor(selectedLog.action)},
                  ]}>
                  <Text
                    style={[
                      styles.actionText,
                      {color: getActionColor(selectedLog.action)},
                    ]}>
                    {selectedLog.action}
                  </Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Module</Text>
                <Text style={styles.detailValue}>
                  {selectedLog.module || '-'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Record</Text>
                <Text style={styles.detailValue}>
                  {selectedLog.recordName || '-'}
                </Text>
              </View>
              {selectedLog.recordId && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Record ID</Text>
                  <Text style={[styles.detailValue, styles.monoText]}>
                    {selectedLog.recordId}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>IP Address</Text>
                <Text style={styles.detailValue}>
                  {selectedLog.ipAddress || '-'}
                </Text>
              </View>
              {selectedLog.details && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Details</Text>
                  <Text style={styles.detailValue}>{selectedLog.details}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Scraped At</Text>
                <Text style={styles.detailValue}>
                  {formatAuditDate(selectedLog.scrapedAt)}
                </Text>
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>

      {}
      <Modal
        visible={showUploadModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeUploadModal}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Upload CSV File</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={closeUploadModal}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <View style={styles.uploadModalBody}>
            <View style={styles.uploadInstructions}>
              <Ionicons name="information-circle-outline" size={24} color="#3b82f6" />
              <Text style={styles.uploadInstructionsText}>
                Upload a CSV file exported from Zoho Bigin. The file should contain the following columns:
              </Text>
            </View>
            <View style={styles.csvColumns}>
              <Text style={styles.csvColumnText}>Done By, Action, Module, Record Name,</Text>
              <Text style={styles.csvColumnText}>Related Module, Related Name, Account Name,</Text>
              <Text style={styles.csvColumnText}>Audited Time, Pipeline</Text>
            </View>

            {uploadResult && (
              <View style={styles.uploadResultCard}>
                <View style={styles.uploadResultHeader}>
                  <Ionicons name="checkmark-circle" size={24} color="#059669" />
                  <Text style={styles.uploadResultTitle}>Upload Complete</Text>
                </View>
                <View style={styles.uploadResultStats}>
                  <View style={styles.uploadResultStat}>
                    <Text style={styles.uploadStatValue}>{uploadResult.totalRows}</Text>
                    <Text style={styles.uploadStatLabel}>Total Rows</Text>
                  </View>
                  <View style={styles.uploadResultStat}>
                    <Text style={[styles.uploadStatValue, {color: '#059669'}]}>{uploadResult.saved}</Text>
                    <Text style={styles.uploadStatLabel}>Saved</Text>
                  </View>
                  <View style={styles.uploadResultStat}>
                    <Text style={[styles.uploadStatValue, {color: '#d97706'}]}>{uploadResult.skipped}</Text>
                    <Text style={styles.uploadStatLabel}>Skipped</Text>
                  </View>
                  <View style={styles.uploadResultStat}>
                    <Text style={[styles.uploadStatValue, {color: '#dc2626'}]}>{uploadResult.errors}</Text>
                    <Text style={styles.uploadStatLabel}>Errors</Text>
                  </View>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.selectFileBtn, uploading && styles.selectFileBtnDisabled]}
              onPress={handleUploadCsv}
              disabled={uploading}
              activeOpacity={0.8}>
              {uploading ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.selectFileBtnText}>Uploading...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="document-attach-outline" size={20} color="#fff" />
                  <Text style={styles.selectFileBtnText}>Select CSV File</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
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
            <Text style={styles.modalTitle}>Filter Logs</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setShowFilters(false)}>
              <Ionicons name="close" size={24} color="#64748b" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalBody}>
            <Text style={styles.filterSectionTitle}>User</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterOption, !userFilter && styles.filterOptionSelected]}
                onPress={() => setUserFilter('')}>
                <Text style={[styles.filterOptionText, !userFilter && styles.filterOptionTextSelected]}>All Users</Text>
              </TouchableOpacity>
              {stats?.users?.map(u => (
                <TouchableOpacity
                  key={u}
                  style={[styles.filterOption, userFilter === u && styles.filterOptionSelected]}
                  onPress={() => setUserFilter(u)}>
                  <Text style={[styles.filterOptionText, userFilter === u && styles.filterOptionTextSelected]}>{u}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Action</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterOption, !actionFilter && styles.filterOptionSelected]}
                onPress={() => setActionFilter('')}>
                <Text style={[styles.filterOptionText, !actionFilter && styles.filterOptionTextSelected]}>All Actions</Text>
              </TouchableOpacity>
              {stats?.actions?.map(a => (
                <TouchableOpacity
                  key={a}
                  style={[styles.filterOption, actionFilter === a && styles.filterOptionSelected]}
                  onPress={() => setActionFilter(a)}>
                  <Text style={[styles.filterOptionText, actionFilter === a && styles.filterOptionTextSelected]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.filterSectionTitle}>Module</Text>
            <View style={styles.filterOptions}>
              <TouchableOpacity
                style={[styles.filterOption, !moduleFilter && styles.filterOptionSelected]}
                onPress={() => setModuleFilter('')}>
                <Text style={[styles.filterOptionText, !moduleFilter && styles.filterOptionTextSelected]}>All Modules</Text>
              </TouchableOpacity>
              {stats?.modules?.map(m => (
                <TouchableOpacity
                  key={m}
                  style={[styles.filterOption, moduleFilter === m && styles.filterOptionSelected]}
                  onPress={() => setModuleFilter(m)}>
                  <Text style={[styles.filterOptionText, moduleFilter === m && styles.filterOptionTextSelected]}>{m}</Text>
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

      {}
      <Modal
        visible={showDeleteAllModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDeleteAllModal(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={[styles.confirmIcon, {backgroundColor: '#fee2e2'}]}>
              <Ionicons name="warning-outline" size={28} color="#dc2626" />
            </View>
            <Text style={styles.confirmTitle}>Delete All Audit Logs?</Text>
            <Text style={styles.confirmText}>
              This permanently removes every audit log from the database. This action cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowDeleteAllModal(false)}
                disabled={deleting}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteBtn, {backgroundColor: '#dc2626'}]}
                onPress={handleDeleteAll}
                disabled={deleting}>
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Yes, Delete All</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {}
      <Modal
        visible={showDeleteUnnecessaryModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowDeleteUnnecessaryModal(false)}>
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={[styles.confirmIcon, {backgroundColor: '#fef3c7'}]}>
              <Ionicons name="funnel-outline" size={28} color="#d97706" />
            </View>
            <Text style={styles.confirmTitle}>Delete Unnecessary Logs?</Text>
            <Text style={styles.confirmText}>
              This removes audit logs that are not linked to agreements or inside-sales checks, keeping only the ones you need. This cannot be undone.
            </Text>
            <View style={styles.confirmActions}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowDeleteUnnecessaryModal(false)}
                disabled={deleting}>
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmDeleteBtn, {backgroundColor: '#d97706'}]}
                onPress={handleDeleteUnnecessary}
                disabled={deleting}>
                {deleting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.confirmDeleteText}>Delete Unnecessary</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
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
  scrapeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#c00000',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scrapeBtnRunning: {
    backgroundColor: '#a00000',
  },
  scrapeBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  deleteAllBtn: {
    backgroundColor: '#dc2626',
    padding: 10,
    borderRadius: 8,
  },
  deleteUnnecessaryBtn: {
    backgroundColor: '#d97706',
    padding: 10,
    borderRadius: 8,
  },
  statsScroll: {
    flexGrow: 0,
    flexShrink: 0,
  },
  statsGrid: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
  },
  statCard: {
    width: 110,
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
  scrapeStatusBanner: {
    backgroundColor: '#f5f3ff',
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
    backgroundColor: '#c00000',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 6,
    textAlign: 'center',
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
  logItem: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  logUser: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  logTimestamp: {
    fontSize: 11,
    color: '#94a3b8',
  },
  logBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  actionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  logModule: {
    fontSize: 12,
    color: '#64748b',
  },
  logRecord: {
    fontSize: 13,
    color: Colors.text,
    marginTop: 4,
  },
  logDetails: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadBtn: {
    backgroundColor: '#10b981',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadModalBody: {
    padding: 20,
    flex: 1,
  },
  uploadInstructions: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    padding: 14,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
    alignItems: 'flex-start',
  },
  uploadInstructionsText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  csvColumns: {
    backgroundColor: '#f1f5f9',
    padding: 14,
    borderRadius: 10,
    marginBottom: 20,
  },
  csvColumnText: {
    fontSize: 12,
    color: '#475569',
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  uploadResultCard: {
    backgroundColor: '#ecfdf5',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  uploadResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  uploadResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#059669',
  },
  uploadResultStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  uploadResultStat: {
    alignItems: 'center',
  },
  uploadStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  uploadStatLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  selectFileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#7c3aed',
    paddingVertical: 16,
    borderRadius: 12,
  },
  selectFileBtnDisabled: {
    backgroundColor: '#a78bfa',
  },
  selectFileBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  filterBtn: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  activeFilters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 6,
  },
  activeFiltersLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  filterChipText: {
    fontSize: 12,
    color: '#4338ca',
    fontWeight: '600',
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 16,
    marginBottom: 8,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  filterOptionSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterOptionText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  filterOptionTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  filterActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 40,
  },
  clearFiltersBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  clearFiltersBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  applyFiltersBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  applyFiltersBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  confirmIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  confirmTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmText: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  confirmActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmDeleteText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});

export default BiginAuditSection;
