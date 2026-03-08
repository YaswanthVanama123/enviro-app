import React, {useState, useCallback, useEffect} from 'react';
import {View, Text, ScrollView, FlatList, RefreshControl, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {TouchableOpacity} from 'react-native';
import {pricingApi, ServiceConfig} from '../../../../services/api/endpoints/pricing.api';
import {ServiceConfigCard} from './ServiceConfigCard';
import {EditServiceConfigModal} from './EditServiceConfigModal';
import {SkeletonRow} from '../pricing-shared/SkeletonRow';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

export function ServiceConfigsSection() {
  const [configs, setConfigs] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceConfig | null>(null);
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {setRefreshing(true);} else {setLoading(true);}
    const data = await pricingApi.getAllServiceConfigs();
    setConfigs(data ?? []);
    if (isRefresh) {setRefreshing(false);} else {setLoading(false);}
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaved = useCallback((updated: ServiceConfig) => {
    setConfigs(prev => prev.map(c => c._id === updated._id ? updated : c));
  }, []);

  if (loading) {
    return (
      <ScrollView style={styles.sectionShell} contentContainerStyle={styles.serviceCardsList}>
        {[1,2,3,4].map(i => (
          <View key={i} style={styles.serviceCardSkeleton}>
            <View style={{flex: 1, gap: 8}}>
              <View style={[styles.skeletonLine, {width: '55%', height: 14}]} />
              <View style={[styles.skeletonLine, {width: '35%', height: 11}]} />
              <View style={[styles.skeletonLine, {width: '80%', height: 11}]} />
            </View>
            <View style={[styles.skeletonLine, {width: 52, height: 20}]} />
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <>
      <FlatList
        data={configs}
        keyExtractor={c => c._id}
        renderItem={({item}) => <ServiceConfigCard config={item} onEdit={setEditTarget} />}
        ListHeaderComponent={
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>
              {configs.length} service{configs.length !== 1 ? 's' : ''} configured
            </Text>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="settings-outline" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No service configs</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        }
        contentContainerStyle={styles.serviceCardsList}
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
      <EditServiceConfigModal
        visible={editTarget !== null}
        config={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={handleSaved}
      />
    </>
  );
}

const styles = StyleSheet.create({
  sectionShell: {flex: 1},
  serviceCardsList: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 40,
    gap: Spacing.sm,
  },
  serviceCardSkeleton: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  skeletonLine: {
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },
  sectionHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionHeaderText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
