import React, {useState, useEffect, useCallback, useRef, useMemo} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  agreementsApi,
  SavedFileGroup,
  SavedFileListItem,
  AgreementStatus,
  FileType,
} from '../../../services/api/endpoints/agreements.api';
import {ConfirmModal} from '../../../shared/components/ui/AppModal';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  if (!iso) {return '—';}
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) {return 'today';}
  if (days === 1) {return '1 day ago';}
  if (days < 30) {return `${days} days ago`;}
  const m = Math.floor(days / 30);
  if (m === 1) {return '1 month ago';}
  if (m < 12) {return `${m} months ago`;}
  return `${Math.floor(m / 12)}y ago`;
}

function fileTypeLabel(ft: FileType, vn?: number): string {
  if (ft === 'main_pdf')     {return 'Main PDF';}
  if (ft === 'version_pdf')  {return `Version ${vn ?? ''}`;}
  if (ft === 'attached_pdf') {return 'Attached';}
  return 'Log';
}
function fileTypeColor(ft: FileType): string {
  if (ft === 'version_pdf')  {return '#8b5cf6';}
  if (ft === 'attached_pdf') {return '#10b981';}
  return '#2563eb';
}

async function updateFileStatus(
  file: SavedFileListItem,
  status: AgreementStatus,
): Promise<boolean> {
  if (file.fileType === 'version_pdf') {
    return agreementsApi.updateVersionStatus(file.id, status);
  }
  if (file.fileType === 'attached_pdf') {
    return agreementsApi.updateAttachedFileStatus(file.id, status);
  }
  // main_pdf — use the agreement-level endpoint
  const agreementId = file.agreementId ?? file.id;
  return agreementsApi.updateAgreementStatus(agreementId, status);
}

// ─── Status pill ──────────────────────────────────────────────────────────────

const STATUS_META: Record<string, {label: string; bg: string; color: string; dot: string}> = {
  pending_approval:   {label: 'Pending Approval',     bg: '#fef3c7', color: '#92400e', dot: '#f59e0b'},
  approved_salesman:  {label: 'Approved by Salesman', bg: '#dbeafe', color: '#1e40af', dot: '#3b82f6'},
  approved_admin:     {label: 'Approved by Admin',    bg: '#d1fae5', color: '#065f46', dot: '#10b981'},
  draft:              {label: 'Draft',                bg: '#f3f4f6', color: '#374151', dot: '#9ca3af'},
};

function StatusPill({status}: {status: string}) {
  const m = STATUS_META[status] ?? STATUS_META.draft;
  return (
    <View style={[styles.statusPill, {backgroundColor: m.bg}]}>
      <View style={[styles.statusDot, {backgroundColor: m.dot}]} />
      <Text style={[styles.statusPillText, {color: m.color}]} numberOfLines={1}>
        {m.label}
      </Text>
    </View>
  );
}

// ─── File row ─────────────────────────────────────────────────────────────────

interface FileRowProps {
  file: SavedFileListItem;
  selected: boolean;
  onToggleSelect: () => void;
  onApprove: () => void;
  onReturn: () => void;
  updating: boolean;
}

function FileRow({file, selected, onToggleSelect, onApprove, onReturn, updating}: FileRowProps) {
  const color = fileTypeColor(file.fileType);
  const label = fileTypeLabel(file.fileType, file.versionNumber);
  return (
    <View style={styles.fileRow}>
      {/* Indent line */}
      <View style={styles.fileIndentLine} />

      {/* Checkbox */}
      <TouchableOpacity
        onPress={onToggleSelect}
        style={[styles.checkbox, selected && styles.checkboxChecked]}
        hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
        {selected && <Ionicons name="checkmark" size={11} color="#fff" />}
      </TouchableOpacity>

      {/* Doc icon */}
      <View style={[styles.fileIcon, {backgroundColor: color + '20'}]}>
        <Ionicons name="document-text" size={14} color={color} />
      </View>

      {/* Info */}
      <View style={styles.fileInfo}>
        <Text style={styles.fileName} numberOfLines={1}>
          {file.title || file.fileName}
        </Text>
        <View style={styles.fileMetaRow}>
          <View style={[styles.fileTypeTag, {backgroundColor: color + '18'}]}>
            <Text style={[styles.fileTypeTagText, {color}]}>{label}</Text>
          </View>
          <Text style={styles.fileUpdated}>{timeAgo(file.updatedAt)}</Text>
        </View>
        <StatusPill status={file.status} />
      </View>

      {/* Actions */}
      {updating ? (
        <ActivityIndicator size="small" color={Colors.primary} style={{marginLeft: 4}} />
      ) : (
        <View style={styles.fileActions}>
          <TouchableOpacity
            style={[styles.fileActionBtn, styles.fileActionApprove]}
            onPress={onApprove}
            hitSlop={{top: 6, bottom: 6, left: 4, right: 4}}>
            <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.fileActionBtn, styles.fileActionReturn]}
            onPress={onReturn}
            hitSlop={{top: 6, bottom: 6, left: 4, right: 4}}>
            <Ionicons name="close-circle" size={16} color="#92400e" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// ─── Agreement row ────────────────────────────────────────────────────────────

interface AgreementRowProps {
  agreement: SavedFileGroup;
  expanded: boolean;
  allSelected: boolean;
  onToggleExpand: () => void;
  onToggleSelectAll: () => void;
  onFileToggleSelect: (fileId: string) => void;
  selectedFileIds: Set<string>;
  onApproveFile: (file: SavedFileListItem) => void;
  onReturnFile: (file: SavedFileListItem) => void;
  updatingFileId: string | null;
}

function AgreementRow({
  agreement,
  expanded,
  allSelected,
  onToggleExpand,
  onToggleSelectAll,
  onFileToggleSelect,
  selectedFileIds,
  onApproveFile,
  onReturnFile,
  updatingFileId,
}: AgreementRowProps) {
  return (
    <View style={styles.agreementBlock}>
      {/* Agreement header row */}
      <View style={styles.agreementRow}>
        {/* Checkbox */}
        <TouchableOpacity
          onPress={onToggleSelectAll}
          style={[styles.checkbox, allSelected && styles.checkboxChecked]}
          hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
          {allSelected && <Ionicons name="checkmark" size={11} color="#fff" />}
        </TouchableOpacity>

        {/* Folder + expand */}
        <TouchableOpacity
          style={styles.agreementHeaderTap}
          activeOpacity={0.7}
          onPress={onToggleExpand}>
          <Ionicons name={expanded ? 'folder-open' : 'folder'} size={18} color="#f59e0b" />
          <Ionicons
            name={expanded ? 'chevron-down' : 'chevron-forward'}
            size={13}
            color={Colors.textMuted}
          />
          <View style={styles.agreementTitleBlock}>
            <Text style={styles.agreementTitle} numberOfLines={1}>
              {agreement.agreementTitle}
            </Text>
            <Text style={styles.agreementFilesCount}>
              {agreement.fileCount} {agreement.fileCount === 1 ? 'file' : 'files'}
            </Text>
          </View>
        </TouchableOpacity>

        {/* Type + updated (right side) */}
        <View style={styles.agreementRight}>
          <Text style={styles.agreementType}>Agreement</Text>
          <Text style={styles.agreementUpdated}>{timeAgo(agreement.latestUpdate)}</Text>
        </View>
      </View>

      {/* File rows */}
      {expanded && agreement.files.map((file, idx) => (
        <View key={file.id}>
          <FileRow
            file={file}
            selected={selectedFileIds.has(file.id)}
            onToggleSelect={() => onFileToggleSelect(file.id)}
            onApprove={() => onApproveFile(file)}
            onReturn={() => onReturnFile(file)}
            updating={updatingFileId === file.id}
          />
          {idx < agreement.files.length - 1 && (
            <View style={styles.fileDivider} />
          )}
        </View>
      ))}
    </View>
  );
}

// ─── Approval Status strip ────────────────────────────────────────────────────

interface StatusStripProps {
  pending: number;
  salesman: number;
  admin: number;
  total: number;
}

function StatusStrip({pending, salesman, admin, total}: StatusStripProps) {
  return (
    <View style={styles.statusStrip}>
      <Text style={styles.statusStripTitle}>Approval Status</Text>
      <View style={styles.statusStripRow}>
        <View style={styles.statusStripItem}>
          <View style={[styles.statusStripDot, {backgroundColor: '#f59e0b'}]} />
          <Text style={styles.statusStripLabel}>Pending</Text>
          <Text style={[styles.statusStripCount, {color: '#92400e'}]}>{pending}</Text>
        </View>
        <View style={styles.statusStripDivider} />
        <View style={styles.statusStripItem}>
          <View style={[styles.statusStripDot, {backgroundColor: '#3b82f6'}]} />
          <Text style={styles.statusStripLabel}>Salesman</Text>
          <Text style={[styles.statusStripCount, {color: '#1e40af'}]}>{salesman}</Text>
        </View>
        <View style={styles.statusStripDivider} />
        <View style={styles.statusStripItem}>
          <View style={[styles.statusStripDot, {backgroundColor: '#10b981'}]} />
          <Text style={styles.statusStripLabel}>Admin</Text>
          <Text style={[styles.statusStripCount, {color: '#065f46'}]}>{admin}</Text>
        </View>
        <View style={styles.statusStripDivider} />
        <View style={styles.statusStripItem}>
          <Ionicons name="documents-outline" size={12} color={Colors.textMuted} />
          <Text style={styles.statusStripLabel}>Total</Text>
          <Text style={[styles.statusStripCount, {color: Colors.textPrimary}]}>{total}</Text>
        </View>
      </View>
    </View>
  );
}

// ─── ApprovalDocumentsScreen ──────────────────────────────────────────────────

export function ApprovalDocumentsScreen() {
  const insets = useSafeAreaInsets();

  // All data from API (unfiltered)
  const [allAgreements, setAllAgreements] = useState<SavedFileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Expand / select state
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Per-file updating
  const [updatingFileId, setUpdatingFileId] = useState<string | null>(null);

  // Confirm modals
  const [confirmFile, setConfirmFile] = useState<{file: SavedFileListItem; action: 'approve' | 'return'} | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Client-side filtered list ─────────────────────────────────────────────
  const agreements = useMemo(() => {
    if (!searchQuery.trim()) {return allAgreements;}
    const q = searchQuery.toLowerCase();
    return allAgreements.filter(ag =>
      ag.agreementTitle.toLowerCase().includes(q) ||
      ag.files.some(f => (f.title || f.fileName).toLowerCase().includes(q)),
    );
  }, [allAgreements, searchQuery]);

  // ── Approval status counts (computed from all data, not filtered) ─────────
  const statusCounts = useMemo(() => {
    let pending = 0, salesman = 0, admin = 0, total = 0;
    allAgreements.forEach(ag => {
      ag.files.forEach(f => {
        total++;
        if (f.status === 'pending_approval')  {pending++;}
        if (f.status === 'approved_salesman') {salesman++;}
        if (f.status === 'approved_admin')    {admin++;}
      });
    });
    return {pending, salesman, admin, total};
  }, [allAgreements]);

  const totalAgreements = allAgreements.length;
  const totalFiles = useMemo(
    () => allAgreements.reduce((acc, ag) => acc + ag.fileCount, 0),
    [allAgreements],
  );

  // ── Fetch ────────────────────────────────────────────────────────────────

  const fetchData = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) {setRefreshing(true);}
    else {setLoading(true);}
    setApiError(null);

    const result = await agreementsApi.getApprovalDocumentsGrouped();

    if (isRefresh) {setRefreshing(false);}
    else {setLoading(false);}

    if (result) {
      setAllAgreements(result.groups ?? []);
    } else {
      setAllAgreements([]);
      setApiError('Could not load approval documents.');
    }
  }, []);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const onSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchTimer.current) {clearTimeout(searchTimer.current);}
    searchTimer.current = setTimeout(() => {
      setSelectedFileIds(new Set());
    }, 400);
  }, []);

  const refresh = useCallback(() => {
    setSelectedFileIds(new Set());
    setExpandedIds(new Set());
    setSearchQuery('');
    fetchData(true);
  }, [fetchData]);

  // ── Select helpers ───────────────────────────────────────────────────────

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleFileSelect = useCallback((fileId: string) => {
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      next.has(fileId) ? next.delete(fileId) : next.add(fileId);
      return next;
    });
  }, []);

  const toggleAgreementSelectAll = useCallback(
    (agreement: SavedFileGroup) => {
      const fileIds = agreement.files.map(f => f.id);
      const allSel = fileIds.every(id => selectedFileIds.has(id));
      setSelectedFileIds(prev => {
        const next = new Set(prev);
        fileIds.forEach(id => (allSel ? next.delete(id) : next.add(id)));
        return next;
      });
    },
    [selectedFileIds],
  );

  // ── Remove file from local state after status change ─────────────────────

  const removeFileFromState = useCallback((fileId: string) => {
    setAllAgreements(prev =>
      prev.reduce<SavedFileGroup[]>((acc, ag) => {
        const files = ag.files.filter(f => f.id !== fileId);
        if (files.length > 0) {
          acc.push({...ag, files, fileCount: files.length});
        }
        return acc;
      }, []),
    );
    setSelectedFileIds(prev => {
      const next = new Set(prev);
      next.delete(fileId);
      return next;
    });
  }, []);

  // ── Per-file approve / return ────────────────────────────────────────────

  const doFileAction = useCallback(
    async (file: SavedFileListItem, action: 'approve' | 'return') => {
      const status: AgreementStatus =
        action === 'approve' ? 'approved_admin' : 'pending_approval';
      setUpdatingFileId(file.id);
      const ok = await updateFileStatus(file, status);
      if (ok) {removeFileFromState(file.id);}
      setUpdatingFileId(null);
    },
    [removeFileFromState],
  );

  // ── Bulk approve ─────────────────────────────────────────────────────────

  const doBulkApprove = useCallback(async () => {
    const allFiles = allAgreements.flatMap(ag => ag.files);
    const toApprove = allFiles.filter(f => selectedFileIds.has(f.id));
    for (const file of toApprove) {
      setUpdatingFileId(file.id);
      const ok = await updateFileStatus(file, 'approved_admin');
      if (ok) {removeFileFromState(file.id);}
    }
    setUpdatingFileId(null);
    setSelectedFileIds(new Set());
  }, [allAgreements, selectedFileIds, removeFileFromState]);

  const selectedCount = selectedFileIds.size;

  // ── Render item ──────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({item}: {item: SavedFileGroup}) => {
      const fileIds = item.files.map(f => f.id);
      const allSel = fileIds.length > 0 && fileIds.every(id => selectedFileIds.has(id));
      return (
        <AgreementRow
          agreement={item}
          expanded={expandedIds.has(item.id)}
          allSelected={allSel}
          onToggleExpand={() => toggleExpand(item.id)}
          onToggleSelectAll={() => toggleAgreementSelectAll(item)}
          onFileToggleSelect={toggleFileSelect}
          selectedFileIds={selectedFileIds}
          onApproveFile={f => setConfirmFile({file: f, action: 'approve'})}
          onReturnFile={f => setConfirmFile({file: f, action: 'return'})}
          updatingFileId={updatingFileId}
        />
      );
    },
    [expandedIds, selectedFileIds, updatingFileId, toggleExpand, toggleAgreementSelectAll, toggleFileSelect],
  );

  // ── List header ──────────────────────────────────────────────────────────

  const ListHeader = (
    <View>
      {/* Stats + Approve Selected bar */}
      {!loading && (
        <View style={styles.statsBar}>
          <View style={styles.statsBarLeft}>
            <Text style={styles.statsText}>
              <Text style={styles.statsNum}>{totalAgreements}</Text>
              {' agreements  ·  '}
              <Text style={styles.statsNum}>{totalFiles}</Text>
              {' files pending'}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.approveSelectedBtn, selectedCount === 0 && styles.approveSelectedBtnDisabled]}
            onPress={() => selectedCount > 0 && setConfirmBulk(true)}
            disabled={selectedCount === 0}>
            <Ionicons name="checkmark-done" size={14} color={selectedCount > 0 ? '#fff' : Colors.textMuted} />
            <Text style={[styles.approveSelectedText, selectedCount === 0 && {color: Colors.textMuted}]}>
              Approve Selected ({selectedCount})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Approval Status strip */}
      {!loading && (
        <StatusStrip
          pending={statusCounts.pending}
          salesman={statusCounts.salesman}
          admin={statusCounts.admin}
          total={statusCounts.total}
        />
      )}

      {/* Column header */}
      {!loading && agreements.length > 0 && (
        <View style={styles.columnHeader}>
          <View style={styles.columnCheckboxPlaceholder} />
          <Text style={[styles.columnLabel, {flex: 1}]}>Agreement / File Name</Text>
          <Text style={[styles.columnLabel, {width: 60}]}>Updated</Text>
          <Text style={[styles.columnLabel, {width: 48, textAlign: 'right'}]}>Actions</Text>
        </View>
      )}
    </View>
  );

  const ListFooter = null;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      {/* Sticky search */}
      <View style={styles.stickyTop}>
        <View style={styles.searchContainer}>
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color={Colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search agreements..."
              placeholderTextColor={Colors.textMuted}
              value={searchQuery}
              onChangeText={onSearch}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
            />
          </View>
        </View>
      </View>

      {/* Skeleton */}
      {loading && agreements.length === 0 ? (
        <View style={styles.skeletonList}>
          <View style={styles.skeletonStatsBar} />
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} style={styles.skeletonRow}>
              <View style={styles.skeletonBox} />
              <View style={styles.skeletonBox} />
              <View style={styles.skeletonMeta}>
                <View style={[styles.skeletonLine, {width: '60%'}]} />
                <View style={[styles.skeletonLine, {width: '35%', marginTop: 5}]} />
              </View>
              <View style={[styles.skeletonLine, {width: 50}]} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={agreements}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              {apiError ? (
                <>
                  <Ionicons name="warning-outline" size={52} color={Colors.statusPending} />
                  <Text style={styles.emptyTitle}>Connection Error</Text>
                  <Text style={styles.emptySub}>{apiError}</Text>
                  <TouchableOpacity style={styles.retryBtn} onPress={refresh}>
                    <Text style={styles.retryText}>Try Again</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={52} color="#10b981" />
                  <Text style={styles.emptyTitle}>All Caught Up</Text>
                  <Text style={styles.emptySub}>
                    {searchQuery ? 'No results for your search' : 'No documents pending approval'}
                  </Text>
                </>
              )}
            </View>
          }
          ListFooterComponent={ListFooter}
          contentContainerStyle={[
            styles.listContent,
            {paddingBottom: insets.bottom + 16},
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={refresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          onEndReachedThreshold={0.3}
        />
      )}

      {/* Per-file confirm */}
      <ConfirmModal
        visible={confirmFile !== null}
        icon={confirmFile?.action === 'approve' ? 'checkmark-circle-outline' : 'refresh-outline'}
        iconColor={confirmFile?.action === 'approve' ? '#16a34a' : '#92400e'}
        iconBg={confirmFile?.action === 'approve' ? '#f0fdf4' : '#fef3c7'}
        title={confirmFile?.action === 'approve' ? 'Approve Document?' : 'Return for Revision?'}
        subtitle={
          confirmFile?.action === 'approve'
            ? `Approve "${confirmFile?.file.title || confirmFile?.file.fileName}"? Status will be set to Approved by Admin.`
            : `Return "${confirmFile?.file.title || confirmFile?.file.fileName}" to Pending Approval?`
        }
        confirmLabel={confirmFile?.action === 'approve' ? 'Approve' : 'Return'}
        confirmColor={confirmFile?.action === 'approve' ? '#16a34a' : '#d97706'}
        onConfirm={() => {
          const cf = confirmFile;
          setConfirmFile(null);
          if (cf) {doFileAction(cf.file, cf.action);}
        }}
        onCancel={() => setConfirmFile(null)}
      />

      {/* Bulk approve confirm */}
      <ConfirmModal
        visible={confirmBulk}
        icon="checkmark-done-outline"
        iconColor="#16a34a"
        iconBg="#f0fdf4"
        title="Approve Selected?"
        subtitle={`Approve ${selectedCount} selected ${selectedCount === 1 ? 'file' : 'files'}? Status will be set to Approved by Admin.`}
        confirmLabel={`Approve ${selectedCount}`}
        confirmColor="#16a34a"
        onConfirm={() => {
          setConfirmBulk(false);
          doBulkApprove();
        }}
        onCancel={() => setConfirmBulk(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SKELETON_BG = '#e5e7eb';

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},

  // Sticky top bar
  stickyTop: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },

  // Search
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, padding: 0},

  // Stats + Approve Selected bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  statsBarLeft: {flex: 1},
  statsText: {fontSize: FontSize.xs, color: Colors.textMuted},
  statsNum: {fontWeight: '700', color: Colors.textPrimary},
  approveSelectedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.lg,
    backgroundColor: '#16a34a',
  },
  approveSelectedBtnDisabled: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  approveSelectedText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },

  // Approval status strip
  statusStrip: {
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  statusStripTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusStripRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusStripItem: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  statusStripDot: {width: 8, height: 8, borderRadius: 4},
  statusStripLabel: {fontSize: 10, color: Colors.textMuted, fontWeight: '500'},
  statusStripCount: {fontSize: FontSize.md, fontWeight: '800'},
  statusStripDivider: {width: 1, height: 32, backgroundColor: Colors.border},

  // Column header
  columnHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    backgroundColor: '#f1f5f9',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.sm,
  },
  columnCheckboxPlaceholder: {width: 18},
  columnLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // List
  listContent: {paddingTop: 0},

  // Agreement block
  agreementBlock: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    overflow: 'hidden',
  },
  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  agreementHeaderTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minWidth: 0,
  },
  agreementTitleBlock: {flex: 1, minWidth: 0},
  agreementTitle: {fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary},
  agreementFilesCount: {fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1},
  agreementRight: {alignItems: 'flex-end', gap: 2, flexShrink: 0},
  agreementType: {fontSize: 10, color: Colors.textMuted, fontWeight: '500'},
  agreementUpdated: {fontSize: 10, color: Colors.textMuted},

  // Checkbox
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },

  // File row
  fileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingLeft: Spacing.lg + 16,
    paddingVertical: Spacing.sm,
    backgroundColor: '#f8f9fa',
    gap: Spacing.sm,
  },
  fileIndentLine: {
    width: 2,
    alignSelf: 'stretch',
    backgroundColor: '#e2e8f0',
    borderRadius: 1,
    flexShrink: 0,
  },
  fileIcon: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  fileInfo: {flex: 1, minWidth: 0, gap: 3},
  fileName: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary},
  fileMetaRow: {flexDirection: 'row', alignItems: 'center', gap: 6},
  fileTypeTag: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Radius.xs,
  },
  fileTypeTagText: {fontSize: 10, fontWeight: '700'},
  fileUpdated: {fontSize: 10, color: Colors.textMuted},
  fileActions: {
    flexDirection: 'column',
    gap: 4,
    flexShrink: 0,
    marginTop: 2,
  },
  fileActionBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  fileActionApprove: {borderColor: '#bbf7d0', backgroundColor: '#f0fdf4'},
  fileActionReturn:  {borderColor: '#fde68a', backgroundColor: '#fffbeb'},
  fileDivider: {height: 1, backgroundColor: Colors.borderLight, marginLeft: Spacing.lg},

  // Status pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
  },
  statusDot: {width: 6, height: 6, borderRadius: 3},
  statusPillText: {fontSize: 10, fontWeight: '600', maxWidth: 140},

  // Load more
  loadMoreBtn: {
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#fecaca',
    alignItems: 'center',
  },
  loadMoreText: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.primary},

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: Spacing.xxxl,
    gap: Spacing.sm,
  },
  emptyTitle: {fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.sm},
  emptySub: {fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', lineHeight: 20},
  retryBtn: {
    marginTop: Spacing.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  retryText: {color: Colors.textWhite, fontSize: FontSize.md, fontWeight: '600'},

  // Skeleton
  skeletonList: {flex: 1},
  skeletonSearch: {height: 44, backgroundColor: SKELETON_BG, borderRadius: Radius.lg},
  skeletonStatsBar: {
    height: 36,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    backgroundColor: SKELETON_BG,
    borderRadius: Radius.md,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  skeletonBox: {width: 20, height: 20, backgroundColor: SKELETON_BG, borderRadius: Radius.xs, flexShrink: 0},
  skeletonMeta: {flex: 1},
  skeletonLine: {height: 12, backgroundColor: SKELETON_BG, borderRadius: Radius.xs},
});
