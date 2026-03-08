import React, {useState, useCallback, useEffect} from 'react';
import {View, Text, ScrollView, TouchableOpacity, RefreshControl, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {pricingApi, ProductCatalog} from '../../../../services/api/endpoints/pricing.api';
import {FamilyCard} from './FamilyCard';
import {AddProductModal} from './AddProductModal';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

export function ProductCatalogSection() {
  const [catalog, setCatalog] = useState<ProductCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {setRefreshing(true);} else {setLoading(true);}
    const data = await pricingApi.getProductCatalog();
    setCatalog(data);
    if (isRefresh) {setRefreshing(false);} else {setLoading(false);}
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const families = catalog?.families ?? [];
  const totalProducts = families.reduce((acc, f) => acc + f.products.length, 0);

  const [addTarget, setAddTarget] = useState<{key: string; label: string} | null>(null);

  const handleAddProduct = useCallback((familyKey: string) => {
    const family = families.find(f => f.key === familyKey);
    if (family) {setAddTarget({key: familyKey, label: family.label});}
  }, [families]);

  if (loading) {
    return (
      <View style={styles.sectionShell}>
        {[1,2,3,4].map(i => (
          <View key={i} style={styles.familyCardSkeleton}>
            <View style={styles.skeletonIcon} />
            <View style={{flex: 1, gap: 6}}>
              <View style={[styles.skeletonLine, {width: '55%'}]} />
              <View style={[styles.skeletonLine, {width: '30%'}]} />
            </View>
          </View>
        ))}
      </View>
    );
  }

  return (
    <>
    <ScrollView
      contentContainerStyle={[styles.catalogScroll, {paddingBottom: 40}]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => fetchData(true)}
          tintColor={Colors.primary}
          colors={[Colors.primary]}
        />
      }>
      {/* Summary strip */}
      <View style={styles.catalogSummary}>
        <View style={styles.catalogSummaryItem}>
          <Text style={styles.catalogSummaryNum}>{families.length}</Text>
          <Text style={styles.catalogSummaryLabel}>Families</Text>
        </View>
        <View style={styles.catalogSummaryDivider} />
        <View style={styles.catalogSummaryItem}>
          <Text style={styles.catalogSummaryNum}>{totalProducts}</Text>
          <Text style={styles.catalogSummaryLabel}>Products</Text>
        </View>
        {catalog?.version && (
          <>
            <View style={styles.catalogSummaryDivider} />
            <View style={styles.catalogSummaryItem}>
              <Text style={[styles.catalogSummaryNum, {fontSize: FontSize.xs}]} numberOfLines={1}>
                {catalog.version}
              </Text>
              <Text style={styles.catalogSummaryLabel}>Version</Text>
            </View>
          </>
        )}
      </View>

      {/* Family cards */}
      {families.map(f => (
        <FamilyCard key={f.key} family={f} onAddProduct={handleAddProduct} />
      ))}

      {families.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="cube-outline" size={44} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No catalog data</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchData()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
    <AddProductModal
      visible={addTarget !== null}
      familyKey={addTarget?.key ?? ''}
      familyLabel={addTarget?.label ?? ''}
      onClose={() => setAddTarget(null)}
      onAdded={() => fetchData(true)}
    />
    </>
  );
}

const styles = StyleSheet.create({
  sectionShell: {flex: 1},
  catalogScroll: {
    paddingTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  catalogSummary: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: Spacing.md,
    marginBottom: 4,
  },
  catalogSummaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  catalogSummaryNum: {
    fontSize: FontSize.lg,
    fontWeight: '800',
    color: Colors.textPrimary,
  },
  catalogSummaryLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  catalogSummaryDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
    alignSelf: 'center',
  },
  familyCardSkeleton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  skeletonIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    flexShrink: 0,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
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
