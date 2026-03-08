import React from 'react';
import {View, Text, Modal, ScrollView, TouchableOpacity} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {PricingBackup} from '../../../../services/api/endpoints/pricing.api';
import {getTriggerLabel, getTriggerColor, formatDate, formatFileSize} from '../../utils/pricing.utils';
import {bStyles} from './backup.styles';
import {Colors} from '../../../../theme/colors';
import {FontSize} from '../../../../theme/typography';

interface BackupDetailsModalProps {
  backup: PricingBackup;
  onClose: () => void;
}

export function BackupDetailsModal({backup, onClose}: BackupDetailsModalProps) {
  const triggerColor = getTriggerColor(backup.backupTrigger);
  const counts = backup.snapshotMetadata?.documentCounts;
  const sizes = backup.snapshotMetadata;
  const restoration = backup.restorationInfo;

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={bStyles.sheet}>
        <View style={[bStyles.sheetHeader, {backgroundColor: '#1e40af'}]}>
          <View style={{flex: 1}}>
            <Text style={[bStyles.sheetTitle, {color: '#fff'}]}>{backup.changeDay || backup.changeDayId}</Text>
            <Text style={{fontSize: FontSize.xs, color: 'rgba(255,255,255,0.7)', marginTop: 2}}>
              {getTriggerLabel(backup.backupTrigger)} · {formatDate(backup.createdAt)}
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Ionicons name="close" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={bStyles.sheetContent} showsVerticalScrollIndicator={false}>
          {backup.backupTrigger && (
            <View style={[bStyles.triggerBadge, {alignSelf: 'flex-start', backgroundColor: triggerColor + '20', borderColor: triggerColor + '50'}]}>
              <Text style={[bStyles.triggerBadgeText, {color: triggerColor}]}>{getTriggerLabel(backup.backupTrigger)}</Text>
            </View>
          )}

          <View style={bStyles.sectionBox}>
            <Text style={bStyles.boxTitle}>Overview</Text>
            <View style={bStyles.infoRow}>
              <Text style={bStyles.infoRowLabel}>Change Day</Text>
              <Text style={bStyles.infoRowValue}>{backup.changeDay || backup.changeDayId}</Text>
            </View>
            <View style={bStyles.infoRow}>
              <Text style={bStyles.infoRowLabel}>Created</Text>
              <Text style={bStyles.infoRowValue}>{formatDate(backup.createdAt)}</Text>
            </View>
            {backup.changedBy && (
              <View style={bStyles.infoRow}>
                <Text style={bStyles.infoRowLabel}>Created By</Text>
                <Text style={bStyles.infoRowValue}>{backup.changedBy.username || backup.changedBy.email}</Text>
              </View>
            )}
            {backup.changeContext?.changeDescription ? (
              <View style={bStyles.infoRow}>
                <Text style={bStyles.infoRowLabel}>Description</Text>
                <Text style={[bStyles.infoRowValue, {flex: 1}]}>{backup.changeContext.changeDescription}</Text>
              </View>
            ) : null}
          </View>

          {counts ? (
            <View style={bStyles.sectionBox}>
              <Text style={bStyles.boxTitle}>Data Snapshot</Text>
              <View style={bStyles.infoRow}>
                <Text style={bStyles.infoRowLabel}>PriceFix Records</Text>
                <Text style={bStyles.infoRowValue}>{counts.priceFixCount ?? '—'}</Text>
              </View>
              <View style={bStyles.infoRow}>
                <Text style={bStyles.infoRowLabel}>Product Catalog</Text>
                <Text style={bStyles.infoRowValue}>{counts.productCatalogCount ?? '—'}</Text>
              </View>
              <View style={bStyles.infoRow}>
                <Text style={bStyles.infoRowLabel}>Service Configs</Text>
                <Text style={bStyles.infoRowValue}>{counts.serviceConfigCount ?? '—'}</Text>
              </View>
            </View>
          ) : null}

          {sizes && (sizes.originalSize !== undefined || sizes.compressedSize !== undefined) ? (
            <View style={bStyles.sectionBox}>
              <Text style={bStyles.boxTitle}>Storage</Text>
              {sizes.originalSize !== undefined && (
                <View style={bStyles.infoRow}>
                  <Text style={bStyles.infoRowLabel}>Original Size</Text>
                  <Text style={bStyles.infoRowValue}>{formatFileSize(sizes.originalSize)}</Text>
                </View>
              )}
              {sizes.compressedSize !== undefined && (
                <View style={bStyles.infoRow}>
                  <Text style={bStyles.infoRowLabel}>Compressed</Text>
                  <Text style={bStyles.infoRowValue}>{formatFileSize(sizes.compressedSize)}</Text>
                </View>
              )}
              {sizes.compressionRatio !== undefined && (
                <View style={bStyles.infoRow}>
                  <Text style={bStyles.infoRowLabel}>Compression</Text>
                  <Text style={[bStyles.infoRowValue, {color: '#16a34a'}]}>{Math.round(sizes.compressionRatio * 100)}%</Text>
                </View>
              )}
            </View>
          ) : null}

          {restoration ? (
            <View style={bStyles.sectionBox}>
              <Text style={bStyles.boxTitle}>Restoration History</Text>
              <View style={bStyles.infoRow}>
                <Text style={bStyles.infoRowLabel}>Has Been Restored</Text>
                <Text style={[bStyles.infoRowValue, {color: restoration.hasBeenRestored ? '#d97706' : '#6b7280'}]}>
                  {restoration.hasBeenRestored ? 'Yes' : 'No'}
                </Text>
              </View>
              {restoration.hasBeenRestored && restoration.lastRestoredAt && (
                <View style={bStyles.infoRow}>
                  <Text style={bStyles.infoRowLabel}>Last Restored</Text>
                  <Text style={bStyles.infoRowValue}>{formatDate(restoration.lastRestoredAt)}</Text>
                </View>
              )}
              {restoration.restoredBy ? (
                <View style={bStyles.infoRow}>
                  <Text style={bStyles.infoRowLabel}>Restored By</Text>
                  <Text style={bStyles.infoRowValue}>{restoration.restoredBy.username || restoration.restoredBy.email}</Text>
                </View>
              ) : null}
              {restoration.restorationNotes ? (
                <View style={bStyles.infoRow}>
                  <Text style={bStyles.infoRowLabel}>Notes</Text>
                  <Text style={[bStyles.infoRowValue, {flex: 1}]}>{restoration.restorationNotes}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </ScrollView>

        <View style={bStyles.sheetFooter}>
          <TouchableOpacity style={[bStyles.sheetCancelBtn, {flex: 1}]} onPress={onClose}>
            <Text style={[bStyles.sheetCancelBtnText, {textAlign: 'center'}]}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
