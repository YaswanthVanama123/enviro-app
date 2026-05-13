import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Linking,
  Share,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  agreementsApi,
  SavedFileGroup,
  SavedFileListItem,
  FileType,
  getFileDownloadUrl,
} from '../../../services/api/endpoints/agreements.api';
import {adminApi, UserListItem} from '../../../services/api/endpoints/admin.api';
import {apiClient} from '../../../services/api/client';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';
import {ConfirmModal, InfoModal} from '../../../shared/components/ui/AppModal';
import {BiginUploadModal} from '../../agreements/components/BiginUploadModal';
import {BiginTaskModal} from '../../agreements/components/BiginTaskModal';

interface EmployeeWithAgreements {
  user: UserListItem;
  agreements: SavedFileGroup[];
  agreementCount: number;
  fileCount: number;
}

function timeAgo(iso: string): string {
  if (!iso) return '—';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  const m = Math.floor(days / 30);
  if (m === 1) return '1 month ago';
  if (m < 12) return `${m} months ago`;
  return `${Math.floor(m / 12)}y ago`;
}

function formatFileSize(bytes: number): string {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

interface StatusCfg {label: string; bg: string; text: string; dot: string; border?: string}

const STATUS_MAP: Record<string, StatusCfg> = {
  draft:            {label: 'Draft',             bg: '#f9fafb', text: '#374151', dot: '#9ca3af', border: '#d1d5db'},
  saved:            {label: 'Saved',             bg: '#e0f2fe', text: '#075985', dot: '#0ea5e9'},
  in_progress:      {label: 'In Progress',       bg: '#fff7ed', text: '#c2410c', dot: '#f97316'},
  pending_approval: {label: 'Pending',           bg: '#fef3c7', text: '#92400e', dot: '#f59e0b'},
  approved_salesman:{label: 'Approved',          bg: '#d1fae5', text: '#065f46', dot: '#10b981'},
  approved_admin:   {label: 'Approved by Admin', bg: '#064e3b', text: '#ffffff', dot: '#6ee7b7'},
  finalized:        {label: 'Finalized',         bg: Colors.primaryLight, text: Colors.primaryDark, dot: Colors.primary},
  active:           {label: 'Active',            bg: '#d1fae5', text: '#065f46', dot: '#10b981'},
  completed:        {label: 'Completed',         bg: '#d1fae5', text: '#065f46', dot: '#10b981'},
  uploaded:         {label: 'Uploaded',          bg: '#1d4ed8', text: '#ffffff', dot: '#93c5fd'},
};

function getStatusCfg(key: string | null | undefined): StatusCfg {
  if (!key) return {label: 'Draft', bg: '#f9fafb', text: '#374151', dot: '#9ca3af', border: '#d1d5db'};
  return STATUS_MAP[key] ?? {label: key, bg: '#f3f4f6', text: '#374151', dot: '#9ca3af', border: '#d1d5db'};
}

function FileBadge({status}: {status: string | null | undefined}) {
  const cfg = getStatusCfg(status);
  return (
    <View style={[styles.fileBadge, {backgroundColor: cfg.bg}, cfg.border ? {borderWidth: 1, borderColor: cfg.border} : null]}>
      <View style={[styles.fileBadgeDot, {backgroundColor: cfg.dot}]} />
      <Text style={[styles.fileBadgeText, {color: cfg.text}]}>{cfg.label}</Text>
    </View>
  );
}

interface FileRowProps {
  file: SavedFileListItem;
  agreement: SavedFileGroup;
  onRefresh?: () => void;
}

function FileRow({file, agreement, onRefresh}: FileRowProps) {
  const [showNoPdf, setShowNoPdf] = useState(false);
  const [showBiginModal, setShowBiginModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);

  const fileUrl = getFileDownloadUrl(file, apiClient.getToken());

  const handleView = useCallback(async () => {
    if (!fileUrl) {
      setShowNoPdf(true);
      return;
    }
    const supported = await Linking.canOpenURL(fileUrl);
    if (supported) {
      await Linking.openURL(fileUrl);
    } else {
      setShowNoPdf(true);
    }
  }, [fileUrl]);

  const handleDownload = useCallback(async () => {
    if (!fileUrl) {
      setShowNoPdf(true);
      return;
    }
    await Linking.openURL(fileUrl);
  }, [fileUrl]);

  const handleEmail = useCallback(async () => {
    const name = file.title || file.fileName;
    if (fileUrl) {
      await Share.share({
        title: name,
        message: `${name}\n${fileUrl}`,
        url: fileUrl,
      });
    } else {
      await Share.share({title: name, message: name});
    }
  }, [file, fileUrl]);

  const iconColor = file.fileType === 'main_pdf' ? Colors.primary :
                    file.fileType === 'version_pdf' ? '#1d4ed8' : '#16a34a';
  const iconBg = file.fileType === 'main_pdf' ? Colors.primaryLight :
                 file.fileType === 'version_pdf' ? '#dbeafe' : '#dcfce7';

  return (
    <View style={styles.fileRow}>
      <View style={[styles.fileIconBox, {backgroundColor: iconBg}]}>
        <Ionicons name="document-text" size={14} color={iconColor} />
      </View>

      <View style={styles.fileMeta}>
        <Text style={styles.fileName} numberOfLines={1}>{file.title || file.fileName}</Text>
        <View style={styles.fileSubRow}>
          <FileBadge status={file.status} />
          <Text style={styles.fileMetaSep}>·</Text>
          <Text style={styles.fileMetaSize}>{formatFileSize(file.fileSize)}</Text>
        </View>
      </View>

      <View style={styles.fileActionsGrid}>
        {file.hasPdf && (
          <>
            <TouchableOpacity onPress={handleView} style={styles.fileActionIconBtn}>
              <Ionicons name="eye-outline" size={12} color="#2563eb" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDownload} style={styles.fileActionIconBtn}>
              <Ionicons name="download-outline" size={12} color="#16a34a" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEmail} style={styles.fileActionIconBtn}>
              <Ionicons name="mail-outline" size={12} color="#7c3aed" />
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity onPress={() => setShowBiginModal(true)} style={styles.fileActionIconBtn}>
          <Ionicons name="cloud-upload-outline" size={12} color="#ea580c" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setShowTaskModal(true)} style={styles.fileActionIconBtn}>
          <Ionicons name="checkbox-outline" size={12} color="#16a34a" />
        </TouchableOpacity>
      </View>

      <InfoModal
        visible={showNoPdf}
        icon="document-outline"
        iconColor={Colors.textMuted}
        iconBg="#f1f5f9"
        title="No PDF Available"
        subtitle="This file has no PDF attached yet."
        onClose={() => setShowNoPdf(false)}
      />

      <BiginUploadModal
        visible={showBiginModal}
        agreementId={agreement.id}
        agreementTitle={agreement.agreementTitle}
        onClose={() => setShowBiginModal(false)}
        onSuccess={() => {
          setShowBiginModal(false);
          onRefresh?.();
        }}
      />

      <BiginTaskModal
        visible={showTaskModal}
        agreementId={agreement.id}
        agreementTitle={agreement.agreementTitle}
        onClose={() => setShowTaskModal(false)}
        onSuccess={() => {
          setShowTaskModal(false);
          onRefresh?.();
        }}
      />
    </View>
  );
}

interface AgreementRowProps {
  agreement: SavedFileGroup;
  onRefresh: () => void;
}

function AgreementRow({agreement, onRefresh}: AgreementRowProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.agreementCard}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setExpanded(p => !p)}
        style={styles.agreementHeader}>
        <View style={[styles.agreementIcon, expanded && styles.agreementIconOpen]}>
          <Ionicons
            name={expanded ? 'folder-open' : 'folder'}
            size={16}
            color="#f59e0b"
          />
        </View>
        <View style={styles.agreementInfo}>
          <Text style={styles.agreementTitle} numberOfLines={1}>
            {agreement.agreementTitle}
          </Text>
          <Text style={styles.agreementMeta}>
            {agreement.fileCount} {agreement.fileCount === 1 ? 'file' : 'files'} · {timeAgo(agreement.latestUpdate)}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={expanded ? Colors.primary : Colors.textMuted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.filesContainer}>
          {agreement.files.length === 0 ? (
            <Text style={styles.noFilesText}>No files</Text>
          ) : (
            agreement.files.map((file, idx) => (
              <View key={file.id}>
                <FileRow file={file} agreement={agreement} onRefresh={onRefresh} />
                {idx < agreement.files.length - 1 && <View style={styles.fileDivider} />}
              </View>
            ))
          )}
        </View>
      )}
    </View>
  );
}

interface EmployeeCardProps {
  employee: EmployeeWithAgreements;
  onRefresh: () => void;
}

function EmployeeCard({employee, onRefresh}: EmployeeCardProps) {
  const [expanded, setExpanded] = useState(false);

  const initials = (employee.user.fullName || employee.user.username)
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <View style={styles.card}>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setExpanded(p => !p)}
        style={styles.cardHeader}>
        <View style={[styles.avatar, employee.user.role === 'admin' && styles.avatarAdmin]}>
          <Text style={[styles.avatarText, employee.user.role === 'admin' && styles.avatarTextAdmin]}>
            {initials}
          </Text>
        </View>
        <View style={styles.cardInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.cardTitle} numberOfLines={1}>
              {employee.user.fullName || employee.user.username}
            </Text>
            <View style={[styles.roleBadge, employee.user.role === 'admin' && styles.roleBadgeAdmin]}>
              <Text style={[styles.roleBadgeText, employee.user.role === 'admin' && styles.roleBadgeTextAdmin]}>
                {employee.user.role === 'admin' ? 'Admin' : 'Employee'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>
            {employee.agreementCount} {employee.agreementCount === 1 ? 'agreement' : 'agreements'} · {employee.fileCount} {employee.fileCount === 1 ? 'file' : 'files'}
          </Text>
          {employee.user.lastLoginAt && (
            <Text style={styles.lastLogin}>
              Last active: {timeAgo(employee.user.lastLoginAt)}
            </Text>
          )}
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={expanded ? Colors.primary : Colors.textMuted}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.agreementsContainer}>
          <View style={styles.agreementsHeader}>
            <Ionicons name="documents-outline" size={12} color={Colors.textMuted} />
            <Text style={styles.agreementsHeaderText}>Agreements</Text>
          </View>
          {employee.agreements.length === 0 ? (
            <Text style={styles.noAgreementsText}>No agreements created by this user</Text>
          ) : (
            employee.agreements.map(agreement => (
              <AgreementRow key={agreement.id} agreement={agreement} onRefresh={onRefresh} />
            ))
          )}
        </View>
      )}
    </View>
  );
}

export function EmployeeAgreementsScreen() {
  const insets = useSafeAreaInsets();
  const [employees, setEmployees] = useState<EmployeeWithAgreements[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      // Fetch users and agreements in parallel
      const [usersResult, agreementsResult] = await Promise.all([
        adminApi.listUsers(),
        agreementsApi.getGrouped({
          page: 1,
          limit: 500,
          status: 'all',
          search: '',
          includeDeleted: false,
        }),
      ]);

      const users = usersResult?.users ?? [];
      const agreements = agreementsResult?.groups ?? [];

      // Group agreements by creator
      const employeeMap = new Map<string, EmployeeWithAgreements>();

      // Initialize all users
      users.forEach(user => {
        employeeMap.set(user.username.toLowerCase(), {
          user,
          agreements: [],
          agreementCount: 0,
          fileCount: 0,
        });
        if (user.fullName) {
          employeeMap.set(user.fullName.toLowerCase(), {
            user,
            agreements: [],
            agreementCount: 0,
            fileCount: 0,
          });
        }
      });

      // Assign agreements to creators
      agreements.forEach(agreement => {
        const mainFile = agreement.files.find(f => f.fileType === 'main_pdf');
        const createdBy = mainFile?.createdBy || agreement.files[0]?.createdBy;

        if (createdBy) {
          const key = createdBy.toLowerCase();
          const existing = employeeMap.get(key);
          if (existing) {
            existing.agreements.push(agreement);
            existing.agreementCount++;
            existing.fileCount += agreement.fileCount;
          }
        }
      });

      // Deduplicate and collect unique employees
      const seen = new Set<string>();
      const employeeList: EmployeeWithAgreements[] = [];

      users.forEach(user => {
        if (!seen.has(user.id)) {
          seen.add(user.id);
          const byUsername = employeeMap.get(user.username.toLowerCase());
          const byFullName = user.fullName ? employeeMap.get(user.fullName.toLowerCase()) : null;

          // Merge agreements from both keys
          const mergedAgreements = new Map<string, SavedFileGroup>();
          byUsername?.agreements.forEach(a => mergedAgreements.set(a.id, a));
          byFullName?.agreements.forEach(a => mergedAgreements.set(a.id, a));

          const agreements = Array.from(mergedAgreements.values());
          employeeList.push({
            user,
            agreements,
            agreementCount: agreements.length,
            fileCount: agreements.reduce((sum, a) => sum + a.fileCount, 0),
          });
        }
      });

      // Sort by agreement count descending
      employeeList.sort((a, b) => b.agreementCount - a.agreementCount);

      setEmployees(employeeList);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredEmployees = employees.filter(e => {
    const query = searchQuery.toLowerCase();
    return (
      e.user.username.toLowerCase().includes(query) ||
      (e.user.fullName?.toLowerCase().includes(query) ?? false) ||
      (e.user.email?.toLowerCase().includes(query) ?? false)
    );
  });

  const totalAgreements = employees.reduce((s, e) => s + e.agreementCount, 0);
  const totalFiles = employees.reduce((s, e) => s + e.fileCount, 0);

  const renderItem = useCallback(
    ({item}: {item: EmployeeWithAgreements}) => (
      <EmployeeCard employee={item} onRefresh={() => fetchData(true)} />
    ),
    [fetchData]
  );

  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Employee Agreements</Text>
        <Text style={styles.headerSubtitle}>Browse agreements by employee</Text>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search employees..."
            placeholderTextColor={Colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Stats */}
      {!loading && (
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="people-outline" size={14} color={Colors.primary} />
            <Text style={styles.statValue}>{employees.length}</Text>
            <Text style={styles.statLabel}>Users</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="documents-outline" size={14} color="#16a34a" />
            <Text style={styles.statValue}>{totalAgreements}</Text>
            <Text style={styles.statLabel}>Agreements</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="document-text-outline" size={14} color="#2563eb" />
            <Text style={styles.statValue}>{totalFiles}</Text>
            <Text style={styles.statLabel}>Files</Text>
          </View>
        </View>
      )}

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading employees...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredEmployees}
          keyExtractor={item => item.user.id}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={52} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No Results' : 'No Employees'}
              </Text>
              <Text style={styles.emptySub}>
                {searchQuery
                  ? 'Try a different search term'
                  : 'Employee data will appear here'}
              </Text>
            </View>
          }
          contentContainerStyle={[
            styles.listContent,
            {paddingBottom: insets.bottom + 16},
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchData(true)}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
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
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    padding: 0,
  },

  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.md,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statValue: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  statDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
  listContent: {
    paddingTop: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  emptySub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Employee card styles
  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarAdmin: {
    backgroundColor: '#fef3c7',
  },
  avatarText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#0369a1',
  },
  avatarTextAdmin: {
    color: '#92400e',
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  roleBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    backgroundColor: '#dbeafe',
  },
  roleBadgeAdmin: {
    backgroundColor: '#fef3c7',
  },
  roleBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  roleBadgeTextAdmin: {
    color: '#92400e',
  },
  cardMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  lastLogin: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Agreements container
  agreementsContainer: {
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  agreementsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#f1f5f9',
  },
  agreementsHeaderText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  noAgreementsText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    paddingVertical: Spacing.md,
  },

  // Agreement row styles
  agreementCard: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  agreementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  agreementIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  agreementIconOpen: {
    backgroundColor: '#fef3c7',
  },
  agreementInfo: {
    flex: 1,
    minWidth: 0,
  },
  agreementTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  agreementMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },

  // Files container
  filesContainer: {
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  noFilesText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    paddingVertical: Spacing.sm,
  },
  fileDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.md + 28,
  },

  // File row styles
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  fileIconBox: {
    width: 26,
    height: 26,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  fileMeta: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fileSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  fileMetaSep: {
    color: Colors.textMuted,
    fontSize: 9,
  },
  fileMetaSize: {
    fontSize: 9,
    color: Colors.textMuted,
  },
  fileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
    gap: 3,
  },
  fileBadgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  fileBadgeText: {
    fontSize: 9,
    fontWeight: '600',
  },
  fileActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 3,
    flexShrink: 0,
  },
  fileActionIconBtn: {
    width: 24,
    height: 24,
    borderRadius: Radius.xs,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
