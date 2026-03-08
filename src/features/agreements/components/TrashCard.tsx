import React, {useState, useCallback} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  SavedFileGroup,
  SavedFileListItem,
  FileType,
} from '../../../services/api/endpoints/agreements.api';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';
import {ConfirmModal} from '../../../shared/components/ui/AppModal';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(iso: string | null | undefined): string {
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

const FILE_TYPE_LABEL: Record<FileType, string> = {
  main_pdf: 'Main',
  version_pdf: 'Version',
  attached_pdf: 'Attached',
  version_log: 'Log',
};

const FILE_TYPE_COLORS: Record<FileType, {bg: string; text: string}> = {
  main_pdf:     {bg: '#fef2f2', text: Colors.primary},
  version_pdf:  {bg: '#dbeafe', text: '#1d4ed8'},
  attached_pdf: {bg: '#dcfce7', text: '#16a34a'},
  version_log:  {bg: '#fef3c7', text: '#92400e'},
};

// ─── TrashFileRow ─────────────────────────────────────────────────────────────

interface TrashFileRowProps {
  file: SavedFileListItem;
  onRestore: (file: SavedFileListItem) => void;
  onPermanentDelete: (file: SavedFileListItem) => void;
}

function TrashFileRow({file, onRestore, onPermanentDelete}: TrashFileRowProps) {
  const typeColors = FILE_TYPE_COLORS[file.fileType] ?? FILE_TYPE_COLORS.main_pdf;
  const typeLabel = FILE_TYPE_LABEL[file.fileType] ?? file.fileType;

  return (
    <View style={styles.fileRow}>
      {/* Type tag + name */}
      <View style={[styles.fileTypeTag, {backgroundColor: typeColors.bg}]}>
        <Text style={[styles.fileTypeTagText, {color: typeColors.text}]}>{typeLabel}</Text>
      </View>
      <View style={styles.fileMeta}>
        <Text style={styles.fileName} numberOfLines={1}>
          {file.title || file.fileName}
        </Text>
        {file.deletedAt ? (
          <Text style={styles.fileDeletedAt}>deleted {timeAgo(file.deletedAt)}</Text>
        ) : null}
      </View>

      {/* File-level icon buttons */}
      <TouchableOpacity
        style={[styles.fileIconBtn, styles.fileIconBtnGreen]}
        onPress={() => onRestore(file)}
        hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
        <Ionicons name="refresh-outline" size={14} color="#16a34a" />
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.fileIconBtn, styles.fileIconBtnRed]}
        onPress={() => onPermanentDelete(file)}
        hitSlop={{top: 6, bottom: 6, left: 6, right: 6}}>
        <Ionicons name="trash-outline" size={13} color="#ef4444" />
      </TouchableOpacity>
    </View>
  );
}

// ─── TrashCard ────────────────────────────────────────────────────────────────

export interface TrashCardProps {
  agreement: SavedFileGroup;
  onRestore: (id: string) => Promise<boolean>;
  onRestoreFile: (fileId: string, agreementId: string, fileType: FileType) => Promise<boolean>;
  onPermanentDelete: (id: string) => Promise<boolean>;
  onPermanentDeleteFile: (fileId: string, agreementId: string, fileType: FileType) => Promise<boolean>;
}

export function TrashCard({
  agreement,
  onRestore,
  onRestoreFile,
  onPermanentDelete,
  onPermanentDeleteFile,
}: TrashCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Agreement-level confirm modals
  const [showDeleteAgreement, setShowDeleteAgreement] = useState(false);

  // File-level confirm modals
  const [fileToDelete, setFileToDelete] = useState<SavedFileListItem | null>(null);

  const handleRestoreAgreement = useCallback(() => {
    onRestore(agreement.id);
  }, [agreement.id, onRestore]);

  const handleDeleteAgreement = useCallback(() => {
    setShowDeleteAgreement(true);
  }, []);

  const handleRestoreFile = useCallback(
    (file: SavedFileListItem) => {
      onRestoreFile(file.id, agreement.id, file.fileType);
    },
    [agreement.id, onRestoreFile],
  );

  const handlePermanentDeleteFile = useCallback((file: SavedFileListItem) => {
    setFileToDelete(file);
  }, []);

  return (
    <View style={styles.card}>
      {/* ── Header row ── */}
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setExpanded(p => !p)}
        style={styles.cardHeader}>
        <View style={[styles.folderBox, expanded && styles.folderBoxOpen]}>
          <Ionicons name={expanded ? 'folder-open' : 'folder'} size={20} color="#9ca3af" />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {agreement.agreementTitle}
          </Text>
          <Text style={styles.cardMeta}>
            {agreement.fileCount} {agreement.fileCount === 1 ? 'file' : 'files'}
            {'  ·  '}
            deleted {timeAgo(agreement.deletedAt)}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={16}
          color={expanded ? Colors.primary : Colors.textMuted}
        />
      </TouchableOpacity>

      {/* ── Action buttons row ── */}
      <View style={styles.cardActions}>
        <TouchableOpacity
          style={styles.restoreBtn}
          onPress={handleRestoreAgreement}>
          <Ionicons name="refresh-outline" size={13} color="#16a34a" />
          <Text style={styles.restoreBtnText}>Restore</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteForeverBtn}
          onPress={handleDeleteAgreement}>
          <Ionicons name="trash-outline" size={13} color="#ef4444" />
          <Text style={styles.deleteForeverBtnText}>Delete Forever</Text>
        </TouchableOpacity>
      </View>

      {/* ── Expanded file list ── */}
      {expanded && (
        <View style={styles.fileListBlock}>
          <View style={styles.fileListHeader}>
            <Ionicons name="document-text-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.fileListHeaderText}>
              {agreement.files.length} {agreement.files.length === 1 ? 'file' : 'files'}
            </Text>
          </View>
          {agreement.files.length === 0 ? (
            <Text style={styles.noFilesText}>No files</Text>
          ) : (
            agreement.files.map((file, idx) => (
              <View key={file.id}>
                <TrashFileRow
                  file={file}
                  onRestore={handleRestoreFile}
                  onPermanentDelete={handlePermanentDeleteFile}
                />
                {idx < agreement.files.length - 1 && (
                  <View style={styles.fileRowDivider} />
                )}
              </View>
            ))
          )}
        </View>
      )}

      {/* ── Delete agreement forever confirm ── */}
      <ConfirmModal
        visible={showDeleteAgreement}
        icon="trash-outline"
        iconColor="#ef4444"
        iconBg="#fef2f2"
        title="Delete Forever?"
        subtitle={`"${agreement.agreementTitle}" and all its files will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete Forever"
        confirmColor="#ef4444"
        onConfirm={() => {
          setShowDeleteAgreement(false);
          onPermanentDelete(agreement.id);
        }}
        onCancel={() => setShowDeleteAgreement(false)}
      />

      {/* ── Delete file forever confirm ── */}
      <ConfirmModal
        visible={fileToDelete !== null}
        icon="trash-outline"
        iconColor="#ef4444"
        iconBg="#fef2f2"
        title="Delete Forever?"
        subtitle={
          fileToDelete
            ? `"${fileToDelete.title || fileToDelete.fileName}" will be permanently removed. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete Forever"
        confirmColor="#ef4444"
        onConfirm={() => {
          if (fileToDelete) {
            onPermanentDeleteFile(fileToDelete.id, agreement.id, fileToDelete.fileType);
          }
          setFileToDelete(null);
        }}
        onCancel={() => setFileToDelete(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },

  // Header
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  folderBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  folderBoxOpen: {backgroundColor: '#e5e7eb'},
  cardInfo: {flex: 1, minWidth: 0},
  cardTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardMeta: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Action buttons
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  restoreBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a',
  },
  deleteForeverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
    marginLeft: 'auto',
  },
  deleteForeverBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ef4444',
  },

  // File list block
  fileListBlock: {
    backgroundColor: '#f8fafc',
    borderTopWidth: 2,
    borderTopColor: Colors.border,
  },
  fileListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: '#f1f5f9',
  },
  fileListHeaderText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textMuted,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  noFilesText: {
    textAlign: 'center',
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    paddingVertical: Spacing.lg,
  },

  // File rows
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#f8fafc',
    gap: Spacing.sm,
  },
  fileTypeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    flexShrink: 0,
  },
  fileTypeTagText: {
    fontSize: 10,
    fontWeight: '700',
  },
  fileMeta: {
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fileDeletedAt: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  fileIconBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  fileIconBtnGreen: {
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
  },
  fileIconBtnRed: {
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
  },
  fileRowDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: Spacing.lg,
  },
});
