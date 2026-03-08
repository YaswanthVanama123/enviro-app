import React, {useState, useCallback, useEffect, useRef} from 'react';
import {View, Text, ScrollView, TouchableOpacity, FlatList, RefreshControl, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  pricingApi,
  ProductCatalog,
  ServiceConfig,
} from '../../../../services/api/endpoints/pricing.api';
import {ProductRow} from './ProductRow';
import {ServicesPricingSubView} from './ServicesPricingSubView';
import {SkeletonRow} from '../pricing-shared/SkeletonRow';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

type PricingSubTab = 'products' | 'services';

export function PricingTablesSection() {
  const [subTab, setSubTab] = useState<PricingSubTab>('products');

  // Products state
  const [catalog, setCatalog] = useState<ProductCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogRefreshing, setCatalogRefreshing] = useState(false);
  const [activeFamily, setActiveFamily] = useState<string>('');

  // Services state
  const [serviceConfigs, setServiceConfigs] = useState<ServiceConfig[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesRefreshing, setServicesRefreshing] = useState(false);
  const servicesLoaded = useRef(false);

  // Load catalog on mount
  const fetchCatalog = useCallback(async (isRefresh = false) => {
    if (isRefresh) {setCatalogRefreshing(true);} else {setCatalogLoading(true);}
    const data = await pricingApi.getProductCatalog();
    if (data) {
      setCatalog(data);
      setActiveFamily(prev => prev || (data.families?.[0]?.key ?? ''));
    }
    if (isRefresh) {setCatalogRefreshing(false);} else {setCatalogLoading(false);}
  }, []);

  useEffect(() => {
    fetchCatalog();
  }, [fetchCatalog]);

  // Lazy-load services when switching to services sub-tab
  const fetchServices = useCallback(async (isRefresh = false) => {
    if (isRefresh) {setServicesRefreshing(true);} else {setServicesLoading(true);}
    const data = await pricingApi.getServicePricing();
    setServiceConfigs(data);
    if (isRefresh) {setServicesRefreshing(false);} else {setServicesLoading(false);}
  }, []);

  const handleSubTab = useCallback((tab: PricingSubTab) => {
    setSubTab(tab);
    if (tab === 'services' && !servicesLoaded.current) {
      servicesLoaded.current = true;
      fetchServices();
    }
  }, [fetchServices]);

  const families = catalog?.families ?? [];
  const currentFamily = families.find(f => f.key === activeFamily);
  const products = currentFamily?.products ?? [];

  return (
    <View style={styles.sectionShell}>
      {/* Products / Services toggle */}
      <View style={styles.subTabToggle}>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'products' && styles.subTabBtnActive]}
          onPress={() => handleSubTab('products')}
          activeOpacity={0.7}>
          <Ionicons
            name="cube-outline"
            size={13}
            color={subTab === 'products' ? Colors.primary : Colors.textMuted}
          />
          <Text style={[styles.subTabBtnText, subTab === 'products' && styles.subTabBtnTextActive]}>
            Products
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTabBtn, subTab === 'services' && styles.subTabBtnActive]}
          onPress={() => handleSubTab('services')}
          activeOpacity={0.7}>
          <Ionicons
            name="settings-outline"
            size={13}
            color={subTab === 'services' ? Colors.primary : Colors.textMuted}
          />
          <Text style={[styles.subTabBtnText, subTab === 'services' && styles.subTabBtnTextActive]}>
            Services
          </Text>
        </TouchableOpacity>
      </View>

      {/* Products sub-view */}
      {subTab === 'products' && (
        <>
          {catalogLoading ? (
            <>
              <View style={styles.familyTabBarSkeleton} />
              {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
            </>
          ) : !catalog || families.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="pricetag-outline" size={44} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No pricing data</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => fetchCatalog()}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.familyTabBar}
                contentContainerStyle={styles.familyTabBarContent}>
                {families.map(f => (
                  <TouchableOpacity
                    key={f.key}
                    style={[styles.familyTab, f.key === activeFamily && styles.familyTabActive]}
                    onPress={() => setActiveFamily(f.key)}
                    activeOpacity={0.7}>
                    <Text style={[styles.familyTabText, f.key === activeFamily && styles.familyTabTextActive]}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <FlatList
                data={products}
                keyExtractor={p => p.key}
                renderItem={({item}) => <ProductRow product={item} />}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListHeaderComponent={
                  <View style={styles.familyHeader}>
                    <Text style={styles.familyHeaderTitle}>
                      {currentFamily?.label} ({products.length} products)
                    </Text>
                  </View>
                }
                ListEmptyComponent={
                  <View style={styles.emptyState}>
                    <Text style={styles.emptySub}>No products in this category.</Text>
                  </View>
                }
                contentContainerStyle={{paddingBottom: 40}}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={catalogRefreshing}
                    onRefresh={() => fetchCatalog(true)}
                    tintColor={Colors.primary}
                    colors={[Colors.primary]}
                  />
                }
              />
            </>
          )}
        </>
      )}

      {/* Services sub-view */}
      {subTab === 'services' && (
        <ServicesPricingSubView
          configs={serviceConfigs}
          loading={servicesLoading}
          refreshing={servicesRefreshing}
          onRefresh={() => fetchServices(true)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionShell: {flex: 1},
  subTabToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 6,
    gap: 8,
  },
  subTabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subTabBtnActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary + '40',
  },
  subTabBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  subTabBtnTextActive: {
    color: Colors.primary,
  },
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
  familyHeader: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  familyHeaderTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
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
