/**
 * Bigin Audit Section
 * Mobile component for viewing audit logs from Zoho Bigin
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

export function BiginAuditSection() {
  const [logs, setLogs] = useState<BiginAuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [scrapeStatus, setScrapeStatus] = useState<ScrapeStatus | null>(null);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  // Load audit logs
  const loadLogs = useCallback(
    async (reset = false) => {
      if (reset) {
        setLoading(true);
      }
      const skip = reset ? 0 : pagination.skip;

      const result = await biginAuditApi.getAll({
        search: searchTerm || undefined,
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
    [searchTerm, pagination.limit, pagination.skip],
  );

  // Load stats
  const loadStats = useCallback(async () => {
    const result = await biginAuditApi.getStats();
    if (result) {
      setStats(result);
    }
  }, []);

  // Load scrape status
  const loadScrapeStatus = useCallback(async () => {
    const result = await biginAuditApi.getScrapeStatus();
    if (result) {
      setScrapeStatus(result);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadLogs(true);
    loadStats();
    loadScrapeStatus();
  }, []);

  // Poll scrape status when scraping
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

  // Handle scrape
  const handleScrape = async () => {
    const result = await biginAuditApi.startScrape();
    if (result) {
      loadScrapeStatus();
    }
  };

  // Handle search
  const handleSearch = () => {
    loadLogs(true);
  };

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    loadLogs(true);
    loadStats();
    loadScrapeStatus();
  };

  // Handle CSV upload
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

  // Close upload modal
  const closeUploadModal = () => {
    setShowUploadModal(false);
    setUploadResult(null);
  };

  // Load more
  const handleLoadMore = () => {
    if (!loading && pagination.hasMore) {
      loadLogs(false);
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
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={[styles.statValue, {color}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  // Render log item
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
      {/* Header */}
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

      {/* Stats */}
      <View style={styles.statsGrid}>
        {renderStatCard(
          'Total',
          stats?.total || 0,
          'document-text',
          '#7c3aed',
          '#f5f3ff',
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
      </View>

      {/* Scrape Status */}
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
            placeholder="Search logs..."
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
      <Text style={styles.resultsCount}>{pagination.total} logs found</Text>

      {/* Logs List */}
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

      {/* Log Detail Modal */}
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

      {/* Upload Modal */}
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
    backgroundColor: '#7c3aed',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  scrapeBtnRunning: {
    backgroundColor: '#059669',
  },
  scrapeBtnText: {
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
    backgroundColor: '#7c3aed',
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
    backgroundColor: '#3b82f6',
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
});

export default BiginAuditSection;
