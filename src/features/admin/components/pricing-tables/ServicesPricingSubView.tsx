import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, TouchableOpacity, FlatList, RefreshControl, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {ServiceConfig} from '../../../../services/api/endpoints/pricing.api';
import {flattenConfig} from '../../utils/pricing.utils';
import {ServiceDetailsModal} from './ServiceDetailsModal';
import {SkeletonRow} from '../pricing-shared/SkeletonRow';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

interface ServicesPricingSubViewProps {
  configs: ServiceConfig[];
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}

export function ServicesPricingSubView({
  configs,
  loading,
  onRefresh,
  refreshing,
}: ServicesPricingSubViewProps) {
  const [activeService, setActiveService] = useState<string>('');
  const [modalVisible, setModalVisible] = useState(false);

  useEffect(() => {
    if (configs.length && !activeService) {
      setActiveService(configs[0]._id ?? configs[0].serviceId);
    }
  }, [configs, activeService]);

  if (loading) {
    return (
      <View style={styles.sectionShell}>
        <View style={styles.familyTabBarSkeleton} />
        {[1,2,3,4,5,6].map(i => <SkeletonRow key={i} />)}
      </View>
    );
  }

  if (!configs.length) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="settings-outline" size={44} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>No service pricing</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={onRefresh}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const current = configs.find(c => (c._id ?? c.serviceId) === activeService) ?? configs[0];
  const configRows = flattenConfig(current.config);
  const serviceKey = current._id ?? current.serviceId;

  return (
    <View style={styles.sectionShell}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.familyTabBar}
        contentContainerStyle={styles.familyTabBarContent}>
        {configs.map(c => {
          const key = c._id ?? c.serviceId;
          const isActive = key === activeService;
          return (
            <TouchableOpacity
              key={key}
              style={[styles.familyTab, isActive && styles.familyTabActive]}
              onPress={() => setActiveService(key)}
              activeOpacity={0.7}>
              <Text style={[styles.familyTabText, isActive && styles.familyTabTextActive]}>
                {c.label || c.serviceId}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        key={serviceKey}
        data={configRows}
        keyExtractor={(_, i) => String(i)}
        renderItem={({item}) => (
          <View style={styles.configFieldRow}>
            <Text style={styles.configFieldLabel}>{item.label}</Text>
            <Text style={styles.configFieldValue}>{item.value}</Text>
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          <View style={styles.servicePricingHeader}>
            <View style={styles.servicePricingHeaderLeft}>
              <Text style={styles.servicePricingName}>{current.label || current.serviceId}</Text>
              {current.version ? (
                <Text style={styles.servicePricingVersion}>v {current.version}</Text>
              ) : null}
            </View>
            <View style={styles.servicePricingHeaderRight}>
              <View style={[styles.activeBadge, !current.isActive && styles.inactiveBadge]}>
                <View style={[styles.activeDot, !current.isActive && styles.inactiveDot]} />
                <Text style={[styles.activeBadgeText, !current.isActive && styles.inactiveBadgeText]}>
                  {current.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.viewAllFieldsBtn}
                onPress={() => setModalVisible(true)}
                activeOpacity={0.7}>
                <Ionicons name="list-outline" size={14} color={Colors.primary} />
                <Text style={styles.viewAllFieldsText}>View All Fields</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptySub}>No pricing fields configured for this service.</Text>
          </View>
        }
        contentContainerStyle={{paddingBottom: 40}}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      />

      <ServiceDetailsModal
        visible={modalVisible}
        config={current}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionShell: {flex: 1},
  familyTabBarSkeleton: {
    height: 42,
    backgroundColor: '#e5e7eb',
  },
  familyTabBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    maxHeight: 42,
  },
  familyTabBarContent: {
    paddingHorizontal: Spacing.md,
    gap: 4,
    alignItems: 'center',
    paddingVertical: 5,
  },
  familyTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  familyTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  familyTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  familyTabTextActive: {
    color: '#fff',
  },
  servicePricingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  servicePricingHeaderLeft: {gap: 2},
  servicePricingHeaderRight: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  servicePricingName: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  servicePricingVersion: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontStyle: 'italic',
  },
  viewAllFieldsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary + '40',
    backgroundColor: Colors.primaryLight,
  },
  viewAllFieldsText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
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
  configFieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 11,
    backgroundColor: Colors.surface,
  },
  configFieldLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
    marginRight: Spacing.md,
  },
  configFieldValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 32,
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
    lineHeight: 20,
  },
  retryBtn: {
    marginTop: Spacing.md,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.lg,
  },
  retryText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
});
