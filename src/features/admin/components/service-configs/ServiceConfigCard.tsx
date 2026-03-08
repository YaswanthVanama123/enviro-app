import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, Platform} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {ServiceConfig} from '../../../../services/api/endpoints/pricing.api';
import {timeAgo} from '../../utils/pricing.utils';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

interface ServiceConfigCardProps {
  config: ServiceConfig;
  onEdit: (c: ServiceConfig) => void;
}

export function ServiceConfigCard({config, onEdit}: ServiceConfigCardProps) {
  return (
    <View style={styles.serviceCard}>
      {/* Title row */}
      <View style={styles.serviceCardTitleRow}>
        <Text style={styles.serviceCardName} numberOfLines={1}>
          {config.label || config.serviceId}
        </Text>
        <View style={[styles.activeBadge, !config.isActive && styles.inactiveBadge]}>
          <View style={[styles.activeDot, !config.isActive && styles.inactiveDot]} />
          <Text style={[styles.activeBadgeText, !config.isActive && styles.inactiveBadgeText]}>
            {config.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>

      {/* ID + version row */}
      <View style={styles.serviceCardMeta}>
        <Text style={styles.serviceCardId}>{config.serviceId}</Text>
        {config.version ? (
          <View style={styles.versionBadge}>
            <Text style={styles.versionBadgeText}>v{config.version}</Text>
          </View>
        ) : null}
        {config.updatedAt && (
          <Text style={styles.serviceCardUpdated}>{timeAgo(config.updatedAt)}</Text>
        )}
      </View>

      {/* Description */}
      {config.description ? (
        <Text style={styles.serviceCardDesc} numberOfLines={2}>
          {config.description}
        </Text>
      ) : null}

      {/* Tags */}
      {config.tags && config.tags.length > 0 && (
        <View style={styles.serviceCardTags}>
          {config.tags.map(tag => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagChipText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Edit button */}
      <TouchableOpacity
        style={styles.editConfigBtn}
        onPress={() => onEdit(config)}
        activeOpacity={0.7}>
        <Ionicons name="create-outline" size={14} color="#fff" />
        <Text style={styles.editConfigBtnText}>Edit Configuration</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  serviceCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 6,
  },
  serviceCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  serviceCardName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    flex: 1,
  },
  serviceCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  serviceCardId: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  versionBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  versionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1d4ed8',
  },
  serviceCardUpdated: {
    fontSize: 10,
    color: Colors.textMuted,
    marginLeft: 'auto' as any,
  },
  serviceCardDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  serviceCardTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 2,
  },
  tagChip: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  tagChipText: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  editConfigBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
    paddingVertical: 9,
    borderRadius: Radius.md,
    backgroundColor: '#2563eb',
  },
  editConfigBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#d1fae5',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  inactiveBadge: {
    backgroundColor: '#f1f5f9',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  inactiveDot: {
    backgroundColor: '#9ca3af',
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#065f46',
  },
  inactiveBadgeText: {
    color: '#6b7280',
  },
});
