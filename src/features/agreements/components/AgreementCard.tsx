import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Share,
  Modal,
  ActivityIndicator,
} from 'react-native';
import DocumentPicker, {types} from 'react-native-document-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  SavedFileGroup,
  SavedFileListItem,
  FileType,
  agreementsApi,
  getFileDownloadUrl,
} from '../../../services/api/endpoints/agreements.api';
import {apiClient} from '../../../services/api/client';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';
import {ConfirmModal, InfoModal, OptionsModal} from '../../../shared/components/ui/AppModal';
import {BiginUploadModal} from './BiginUploadModal';

interface TimelineStatus {
  label: string;
  daysText: string;
  color: string;
  bg: string;
  dot: string;
}

function calcTimelineStatus(
  startDate: string | null | undefined,
  contractMonths: number | null | undefined,
): TimelineStatus | null {
  if (!startDate || !contractMonths) {return null;}
  const start = new Date(startDate);
  if (isNaN(start.getTime())) {return null;}
  const end = new Date(start);
  end.setMonth(end.getMonth() + contractMonths);
  const now = new Date();

  if (now < start) {
    const d = Math.round((start.getTime() - now.getTime()) / 86400000);
    return {label: 'Yet to Start', daysText: `starts in ${d}d`, color: '#92400e', bg: '#fef3c7', dot: '#f59e0b'};
  }
  if (now > end) {
    const d = Math.round((now.getTime() - end.getTime()) / 86400000);
    return {label: 'Inactive', daysText: `ended ${d}d ago`, color: '#991b1b', bg: '#fef2f2', dot: '#ef4444'};
  }
  const d = Math.round((end.getTime() - now.getTime()) / 86400000);
  return {label: 'Active', daysText: `${d} days left`, color: '#065f46', bg: '#d1fae5', dot: '#10b981'};
}

interface FileIconCfg {
  name: string;
  color: string;
  bg: string;
}

const FILE_ICON: Record<FileType, FileIconCfg> = {
  main_pdf:     {name: 'document-text',      color: Colors.primary, bg: Colors.primaryLight},
  version_pdf:  {name: 'document-text',      color: '#1d4ed8',      bg: '#dbeafe'},
  attached_pdf: {name: 'document',           color: '#16a34a',      bg: '#dcfce7'},
  version_log:  {name: 'receipt-outline',    color: '#92400e',      bg: '#fef3c7'},
};

interface FileTag {label: string; bg: string; text: string}

function getFileTag(file: SavedFileListItem): FileTag {
  if (file.fileType === 'version_pdf') {
    return {label: `Version ${file.versionNumber ?? ''}`, bg: '#fff7ed', text: '#c2410c'};
  }
  if (file.fileType === 'version_log') {
    return {label: `Log v${file.versionNumber ?? 1}`, bg: '#fefce8', text: '#854d0e'};
  }
  if (file.fileType === 'attached_pdf') {
    return {label: 'Attached', bg: '#f3f4f6', text: '#374151'};
  }
  return {label: '', bg: '', text: ''};
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
  attached:         {label: 'Attached',          bg: '#f3f4f6', text: '#374151', dot: '#9ca3af', border: '#d1d5db'},
  archived:         {label: 'Archived',          bg: '#f9fafb', text: '#4b5563', dot: '#9ca3af', border: '#d1d5db'},
};

function getStatusCfg(key: string | null | undefined): StatusCfg {
  if (!key) {return {label: 'Draft', bg: '#f9fafb', text: '#374151', dot: '#9ca3af', border: '#d1d5db'};}
  return STATUS_MAP[key] ?? {label: key, bg: '#f3f4f6', text: '#374151', dot: '#9ca3af', border: '#d1d5db'};
}

function formatFileSize(bytes: number): string {
  if (!bytes) {return '—';}
  if (bytes < 1024) {return `${bytes} B`;}
  if (bytes < 1048576) {return `${(bytes / 1024).toFixed(1)} KB`;}
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

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
  onDelete: (file: SavedFileListItem) => void;
}

function FileRow({file, onDelete}: FileRowProps) {
  const [showNoPdf, setShowNoPdf] = useState(false);
  const [showCannotOpen, setShowCannotOpen] = useState(false);

  const iconCfg = FILE_ICON[file.fileType] ?? FILE_ICON.main_pdf;
  const tag = getFileTag(file);

  const fileUrl = getFileDownloadUrl(file, apiClient.getToken());

  const handleDelete = useCallback(() => onDelete(file), [file, onDelete]);

  const handleView = useCallback(async () => {
    if (!fileUrl) {
      setShowNoPdf(true);
      return;
    }
    const supported = await Linking.canOpenURL(fileUrl);
    if (supported) {
      await Linking.openURL(fileUrl);
    } else {
      setShowCannotOpen(true);
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

  return (
    <View style={styles.fileRow}>
      <View style={[styles.fileIconBox, {backgroundColor: iconCfg.bg}]}>
        <Ionicons name={iconCfg.name} size={16} color={iconCfg.color} />
      </View>

      <View style={styles.fileMeta}>
        <View style={styles.fileNameRow}>
          <Text style={styles.fileName} numberOfLines={1}>{file.title || file.fileName}</Text>
          {tag.label ? (
            <View style={[styles.fileTag, {backgroundColor: tag.bg}]}>
              <Text style={[styles.fileTagText, {color: tag.text}]}>{tag.label}</Text>
            </View>
          ) : null}
        </View>
        <View style={styles.fileSubRow}>
          {file.fileType === 'version_log' ? (
            <View style={[styles.fileBadge, {backgroundColor: '#f0f9ff', borderWidth: 1, borderColor: '#bae6fd'}]}>
              <View style={[styles.fileBadgeDot, {backgroundColor: '#38bdf8'}]} />
              <Text style={[styles.fileBadgeText, {color: '#0369a1'}]}>Change Log</Text>
            </View>
          ) : (
            <FileBadge status={file.status} />
          )}
          <Text style={styles.fileMetaSep}>·</Text>
          <Text style={styles.fileMetaSize}>{formatFileSize(file.fileSize)}</Text>
          {file.fileType === 'version_pdf' && file.isLatestVersion && (
            <>
              <Text style={styles.fileMetaSep}>·</Text>
              <View style={styles.latestTag}>
                <Text style={styles.latestTagText}>Latest</Text>
              </View>
            </>
          )}
        </View>
      </View>

      <View style={styles.fileActionsGrid}>
        {file.hasPdf && (
          <>
            <TouchableOpacity onPress={handleView} style={styles.fileActionIconBtn} hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}>
              <Ionicons name="eye-outline" size={14} color="#2563eb" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDownload} style={styles.fileActionIconBtn} hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}>
              <Ionicons name="download-outline" size={14} color="#16a34a" />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleEmail} style={styles.fileActionIconBtn} hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}>
              <Ionicons name="mail-outline" size={14} color="#7c3aed" />
            </TouchableOpacity>
          </>
        )}
        <TouchableOpacity onPress={handleDelete} style={[styles.fileActionIconBtn, styles.fileDeleteIconBtn]} hitSlop={{top: 4, bottom: 4, left: 4, right: 4}}>
          <Ionicons name="trash-outline" size={13} color={Colors.primary} />
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

      <InfoModal
        visible={showCannotOpen}
        icon="alert-circle-outline"
        iconColor="#f59e0b"
        iconBg="#fef3c7"
        title="Cannot Open File"
        subtitle="Unable to open this file on your device."
        onClose={() => setShowCannotOpen(false)}
      />
    </View>
  );
}

export interface AgreementCardProps {
  agreement: SavedFileGroup;
  onDelete: (agreement: SavedFileGroup) => void;
  onDeleteFile: (fileId: string, agreementId: string, fileType: FileType) => void;
  onRefresh?: () => void;
}

export function AgreementCard({agreement, onDelete, onDeleteFile, onRefresh}: AgreementCardProps) {
  const [expanded, setExpanded] = useState(false);

  const [showCalendar, setShowCalendar] = useState(false);

  const [showBiginModal, setShowBiginModal] = useState(false);

  const [showAddOptions, setShowAddOptions] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ok: boolean; name?: string} | null>(null);

  const [fileToDelete, setFileToDelete] = useState<SavedFileListItem | null>(null);
  const [showDeleteAgreement, setShowDeleteAgreement] = useState(false);

  const timeline = calcTimelineStatus(agreement.startDate, agreement.contractMonths);

  const handleDeleteFile = useCallback((file: SavedFileListItem) => {
    setFileToDelete(file);
  }, []);

  const handleDeleteAgreement = useCallback(() => {
    setShowDeleteAgreement(true);
  }, []);

  const handleCalendar = useCallback(() => setShowCalendar(true), []);

  const handleBegin = useCallback(() => {
    setShowBiginModal(true);
  }, []);

  const handleAdd = useCallback(() => {
    setShowAddOptions(true);
  }, []);

  const handlePickAndUpload = useCallback(async () => {
    try {
      const results = await DocumentPicker.pick({
        type: [types.pdf, types.images, types.docx, types.plainText],
        allowMultiSelection: false,
      });
      const file = results[0];
      setUploading(true);
      const ok = await agreementsApi.uploadAttachment(agreement.id, {
        uri: file.uri,
        name: file.name ?? 'document.pdf',
        type: file.type ?? 'application/pdf',
      });
      setUploading(false);
      if (ok) {
        onRefresh?.();
      }
      setUploadResult({ok, name: file.name ?? undefined});
    } catch (err: any) {
      setUploading(false);
      if (!DocumentPicker.isCancel(err)) {
        setUploadResult({ok: false});
      }
    }
  }, [agreement.id, onRefresh]);

  const startDateFormatted = agreement.startDate
    ? new Date(agreement.startDate).toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})
    : null;
  const endDate = (() => {
    if (!agreement.startDate || !agreement.contractMonths) {return null;}
    const d = new Date(agreement.startDate);
    d.setMonth(d.getMonth() + agreement.contractMonths);
    return d.toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'});
  })();

  return (
    <View style={styles.card}>

      <View style={styles.topBlock}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => setExpanded(p => !p)}
          style={styles.cardHeader}>
          <View style={[styles.folderBox, expanded && styles.folderBoxOpen]}>
            <Ionicons name={expanded ? 'folder-open' : 'folder'} size={22} color="#f59e0b" />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle} numberOfLines={1}>{agreement.agreementTitle}</Text>
            <Text style={styles.cardMeta}>
              {agreement.fileCount} {agreement.fileCount === 1 ? 'file' : 'files'}{'  ·  '}{timeAgo(agreement.latestUpdate)}
            </Text>
            {timeline ? (
              <View style={styles.timelineRow}>
                <View style={[styles.timelineBadge, {backgroundColor: timeline.bg}]}>
                  <View style={[styles.timelineDot, {backgroundColor: timeline.dot}]} />
                  <Text style={[styles.timelineLabel, {color: timeline.color}]}>{timeline.label}</Text>
                </View>
                <Text style={[styles.timelineDaysText, {color: timeline.color}]}>· {timeline.daysText}</Text>
              </View>
            ) : agreement.agreementStatus ? (
              <FileBadge status={agreement.agreementStatus} />
            ) : null}
          </View>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={expanded ? Colors.primary : Colors.textMuted}
          />
        </TouchableOpacity>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.cardActionIconBtn} onPress={handleCalendar}>
            <Ionicons name="calendar-outline" size={15} color={Colors.textSecondary} />
          </TouchableOpacity>

          <View style={styles.cardActionDivider} />

          <TouchableOpacity
            style={styles.beginBtn}
            onPress={handleBegin}>
            <Ionicons name="play-circle-outline" size={13} color="#fff" />
            <Text style={styles.beginBtnText}>Begin</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.addBtn} onPress={handleAdd} disabled={uploading}>
            {uploading
              ? <ActivityIndicator size="small" color={Colors.textSecondary} style={{width: 14, height: 14}} />
              : <Ionicons name="add" size={14} color={Colors.textSecondary} />}
            <Text style={styles.addBtnText}>{uploading ? 'Uploading...' : 'Add'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.deleteCardBtn} onPress={handleDeleteAgreement}>
            <Ionicons name="trash-outline" size={13} color={Colors.primary} />
            <Text style={styles.deleteCardBtnText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>

      {expanded && (
        <View style={styles.fileListBlock}>
          <View style={styles.fileListHeader}>
            <Ionicons name="document-text-outline" size={13} color={Colors.textMuted} />
            <Text style={styles.fileListHeaderText}>
              {agreement.files.length} {agreement.files.length === 1 ? 'file' : 'files'}
            </Text>
          </View>
          {agreement.files.length === 0 ? (
            <Text style={styles.noFilesText}>No files in this agreement</Text>
          ) : (
            agreement.files.map((file, idx) => (
              <View key={file.id}>
                <FileRow file={file} onDelete={handleDeleteFile} />
                {idx < agreement.files.length - 1 && <View style={styles.fileRowDivider} />}
              </View>
            ))
          )}
        </View>
      )}

      <Modal visible={showCalendar} transparent animationType="fade" onRequestClose={() => setShowCalendar(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowCalendar(false)}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Ionicons name="calendar" size={18} color={Colors.primary} />
              <Text style={styles.modalTitle}>Agreement Dates</Text>
              <TouchableOpacity onPress={() => setShowCalendar(false)}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalBody}>
              {startDateFormatted ? (
                <>
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Start Date</Text>
                    <Text style={styles.dateValue}>{startDateFormatted}</Text>
                  </View>
                  <View style={styles.dateDivider} />
                  <View style={styles.dateRow}>
                    <Text style={styles.dateLabel}>Duration</Text>
                    <Text style={styles.dateValue}>{agreement.contractMonths} months</Text>
                  </View>
                  {endDate && (
                    <>
                      <View style={styles.dateDivider} />
                      <View style={styles.dateRow}>
                        <Text style={styles.dateLabel}>End Date</Text>
                        <Text style={styles.dateValue}>{endDate}</Text>
                      </View>
                    </>
                  )}
                  {timeline && (
                    <>
                      <View style={styles.dateDivider} />
                      <View style={styles.dateRow}>
                        <Text style={styles.dateLabel}>Status</Text>
                        <View style={[styles.timelineBadge, {backgroundColor: timeline.bg}]}>
                          <View style={[styles.timelineDot, {backgroundColor: timeline.dot}]} />
                          <Text style={[styles.timelineLabel, {color: timeline.color}]}>
                            {timeline.label} · {timeline.daysText}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}
                </>
              ) : (
                <Text style={styles.noDateText}>No date information available for this agreement.</Text>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <ConfirmModal
        visible={fileToDelete !== null}
        icon="trash-outline"
        iconColor="#ef4444"
        iconBg="#fef2f2"
        title="Delete File"
        subtitle={fileToDelete ? `Move "${fileToDelete.title || fileToDelete.fileName}" to trash?` : ''}
        confirmLabel="Move to Trash"
        confirmColor="#ef4444"
        onConfirm={() => {
          if (fileToDelete) {
            onDeleteFile(fileToDelete.id, agreement.id, fileToDelete.fileType);
          }
          setFileToDelete(null);
        }}
        onCancel={() => setFileToDelete(null)}
      />

      <ConfirmModal
        visible={showDeleteAgreement}
        icon="trash-outline"
        iconColor="#ef4444"
        iconBg="#fef2f2"
        title="Delete Agreement"
        subtitle={`Move "${agreement.agreementTitle}" and all its files to trash?`}
        confirmLabel="Move to Trash"
        confirmColor="#ef4444"
        onConfirm={() => {
          setShowDeleteAgreement(false);
          onDelete(agreement);
        }}
        onCancel={() => setShowDeleteAgreement(false)}
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

      <OptionsModal
        visible={showAddOptions}
        title={`Add to Agreement`}
        subtitle={agreement.agreementTitle}
        options={[
          {
            label: 'Upload Document',
            icon: 'cloud-upload-outline',
            iconColor: '#2563eb',
            onPress: handlePickAndUpload,
          },
          {
            label: 'Attach from Files',
            icon: 'attach-outline',
            iconColor: '#7c3aed',
            onPress: handlePickAndUpload,
          },
        ]}
        onCancel={() => setShowAddOptions(false)}
      />

      <InfoModal
        visible={uploadResult !== null}
        icon={uploadResult?.ok ? 'checkmark-circle' : 'alert-circle'}
        iconColor={uploadResult?.ok ? '#16a34a' : '#ef4444'}
        iconBg={uploadResult?.ok ? '#f0fdf4' : '#fef2f2'}
        title={uploadResult?.ok ? 'File Uploaded' : 'Upload Failed'}
        subtitle={
          uploadResult?.ok
            ? `"${uploadResult.name ?? 'File'}" was attached successfully.`
            : 'Failed to upload the file. Please try again.'
        }
        onClose={() => setUploadResult(null)}
      />
    </View>
  );
}

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

  topBlock: {
    backgroundColor: Colors.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
    gap: Spacing.md,
  },
  folderBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  folderBoxOpen: {backgroundColor: '#fef3c7'},
  cardInfo: {flex: 1, minWidth: 0},
  cardTitle: {fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary},
  cardMeta: {fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2},
  timelineRow: {flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs, gap: 4, flexWrap: 'wrap'},
  timelineBadge: {flexDirection: 'row', alignItems: 'center', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 3, gap: 4},
  timelineDot: {width: 6, height: 6, borderRadius: 3},
  timelineLabel: {fontSize: FontSize.xs, fontWeight: '700'},
  timelineDaysText: {fontSize: FontSize.xs, fontWeight: '500'},

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
  cardActionIconBtn: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  cardActionDivider: {
    width: 1,
    height: 18,
    backgroundColor: Colors.borderLight,
    marginHorizontal: 2,
  },
  beginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    backgroundColor: '#ea580c',
  },
  beginBtnText: {fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.2},
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#f8fafc',
  },
  addBtnText: {fontSize: 11, fontWeight: '600', color: Colors.textSecondary},
  deleteCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
    marginLeft: 'auto',
  },
  deleteCardBtnText: {fontSize: 11, fontWeight: '600', color: Colors.primary},

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
  divider: {height: 1, backgroundColor: Colors.border},
  noFilesText: {textAlign: 'center', color: Colors.textMuted, fontSize: FontSize.sm, paddingVertical: Spacing.lg},

  fileRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#f8fafc',
    gap: Spacing.sm,
  },
  fileIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  fileMeta: {flex: 1, minWidth: 0},
  fileNameRow: {flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap'},
  fileName: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary, flexShrink: 1},
  fileSubRow: {flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 4, flexWrap: 'wrap'},
  fileMetaSep: {color: Colors.textMuted, fontSize: FontSize.xs},
  fileMetaSize: {fontSize: FontSize.xs, color: Colors.textMuted},

  fileTag: {paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.xs},
  fileTagText: {fontSize: 10, fontWeight: '700'},

  fileBadge: {flexDirection: 'row', alignItems: 'center', borderRadius: Radius.full, paddingHorizontal: 7, paddingVertical: 2, gap: 4},
  fileBadgeDot: {width: 5, height: 5, borderRadius: 2.5},
  fileBadgeText: {fontSize: 10, fontWeight: '600'},

  latestTag: {backgroundColor: Colors.greenLight, borderRadius: Radius.full, paddingHorizontal: 5, paddingVertical: 1},
  latestTagText: {fontSize: 9, fontWeight: '700', color: Colors.greenDark},

  fileActionBtn: {paddingLeft: Spacing.xs, paddingTop: 4},
  fileRowDivider: {height: 1, backgroundColor: Colors.border, marginLeft: Spacing.lg + 32 + Spacing.sm},

  fileActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
    flexShrink: 0,
    alignSelf: 'center',
  },
  fileActionIconBtn: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileActionIconBtnDisabled: {
    width: 0,
    height: 0,
  },
  fileDeleteIconBtn: {
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
  },

  trashBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: Radius.md,
    backgroundColor: '#fff5f5',
  },
  trashBtnText: {fontSize: FontSize.sm, color: Colors.primary, fontWeight: '500'},

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {flex: 1, fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary},
  modalBody: {padding: Spacing.lg, gap: Spacing.sm},
  dateRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md},
  dateLabel: {fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500'},
  dateValue: {fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600', textAlign: 'right', flex: 1},
  dateDivider: {height: 1, backgroundColor: Colors.borderLight},
  noDateText: {fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', paddingVertical: Spacing.md},
});
