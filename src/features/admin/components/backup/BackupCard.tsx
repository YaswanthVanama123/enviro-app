import React from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {PricingBackup} from '../../../../services/api/endpoints/pricing.api';
import {getTriggerLabel, getTriggerColor, formatDate, formatFileSize} from '../../utils/pricing.utils';
import {bStyles} from './backup.styles';

interface BackupCardProps {
  backup: PricingBackup;
  onRestore: (b: PricingBackup) => void;
  onViewDetails: (b: PricingBackup) => void;
}

export function BackupCard({backup, onRestore, onViewDetails}: BackupCardProps) {
  const triggerColor = getTriggerColor(backup.backupTrigger);
  const daysAgo = backup.firstChangeTimestamp || backup.createdAt
    ? Math.floor((Date.now() - new Date(backup.firstChangeTimestamp ?? backup.createdAt).getTime()) / 86400000)
    : null;
  const hasBeenRestored = backup.restorationInfo?.hasBeenRestored;
  const counts = backup.snapshotMetadata?.documentCounts;

  return (
    <View style={bStyles.card}>
      {/* Header row */}
      <View style={bStyles.cardHeader}>
        <View style={bStyles.cardIconBox}>
          <Ionicons name="save-outline" size={18} color="#3b82f6" />
        </View>
        <View style={bStyles.cardTitle}>
          <Text style={bStyles.cardChangeDay}>{backup.changeDay || backup.changeDayId}</Text>
          <Text style={bStyles.cardDaysAgo}>
            {daysAgo === null ? formatDate(backup.createdAt) : daysAgo === 0 ? 'Today' : `${daysAgo}d ago`}
          </Text>
        </View>
        {backup.backupTrigger ? (
          <View style={[bStyles.triggerBadge, {backgroundColor: triggerColor + '20', borderColor: triggerColor + '50'}]}>
            <Text style={[bStyles.triggerBadgeText, {color: triggerColor}]}>{getTriggerLabel(backup.backupTrigger)}</Text>
          </View>
        ) : null}
      </View>

      {/* Data summary */}
      {counts ? (
        <View style={bStyles.cardCounts}>
          {counts.priceFixCount !== undefined && (
            <View style={bStyles.countBadge}>
              <Ionicons name="pricetag-outline" size={11} color="#2563eb" />
              <Text style={bStyles.countBadgeText}>{counts.priceFixCount} PriceFix</Text>
            </View>
          )}
          {counts.productCatalogCount !== undefined && (
            <View style={bStyles.countBadge}>
              <Ionicons name="cube-outline" size={11} color="#7c3aed" />
              <Text style={bStyles.countBadgeText}>{counts.productCatalogCount} Products</Text>
            </View>
          )}
          {counts.serviceConfigCount !== undefined && (
            <View style={bStyles.countBadge}>
              <Ionicons name="settings-outline" size={11} color="#0891b2" />
              <Text style={bStyles.countBadgeText}>{counts.serviceConfigCount} Services</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={bStyles.cardCounts}>
          {backup.serviceConfigsCount !== undefined && (
            <View style={bStyles.countBadge}>
              <Text style={bStyles.countBadgeText}>{backup.serviceConfigsCount} services</Text>
            </View>
          )}
          {backup.productFamiliesCount !== undefined && (
            <View style={bStyles.countBadge}>
              <Text style={bStyles.countBadgeText}>{backup.productFamiliesCount} families</Text>
            </View>
          )}
          {backup.totalProducts !== undefined && (
            <View style={bStyles.countBadge}>
              <Text style={bStyles.countBadgeText}>{backup.totalProducts} products</Text>
            </View>
          )}
        </View>
      )}

      {/* Size + status row */}
      <View style={bStyles.cardMeta}>
        {backup.snapshotMetadata?.compressedSize !== undefined && (
          <Text style={bStyles.cardSize}>{formatFileSize(backup.snapshotMetadata.compressedSize)}</Text>
        )}
        {backup.snapshotMetadata?.compressionRatio !== undefined && (
          <Text style={bStyles.cardCompression}>· {Math.round(backup.snapshotMetadata.compressionRatio * 100)}% compressed</Text>
        )}
        <View style={{flex: 1}} />
        <View style={[bStyles.statusBadge, hasBeenRestored ? bStyles.statusRestored : bStyles.statusAvailable]}>
          <Text style={[bStyles.statusBadgeText, {color: hasBeenRestored ? '#d97706' : '#16a34a'}]}>
            {hasBeenRestored ? 'Restored' : 'Available'}
          </Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={bStyles.cardActions}>
        <TouchableOpacity style={bStyles.detailsBtn} onPress={() => onViewDetails(backup)}>
          <Ionicons name="information-circle-outline" size={14} color="#2563eb" />
          <Text style={bStyles.detailsBtnText}>View Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={bStyles.restoreActionBtn} onPress={() => onRestore(backup)}>
          <Ionicons name="refresh-outline" size={14} color="#7c3aed" />
          <Text style={bStyles.restoreActionBtnText}>{hasBeenRestored ? 'Restore Again' : 'Restore'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
