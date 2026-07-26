import React, {useState, useCallback, useEffect, useRef} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, FlatList,
  RefreshControl, StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  pricingApi,
  ProductCatalog,
  ServiceConfig,
  Product,
} from '../../../../services/api/endpoints/pricing.api';
import {ProductRow} from './ProductRow';
import {ServicesPricingSubView} from './ServicesPricingSubView';
import {EditValueModal} from '../pricing-shared/EditValueModal';
import {SkeletonRow} from '../pricing-shared/SkeletonRow';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

type PricingSubTab = 'products' | 'services';

export function PricingTablesSection() {
  const [subTab, setSubTab] = useState<PricingSubTab>('products');

  const [catalog, setCatalog] = useState<ProductCatalog | null>(null);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [catalogRefreshing, setCatalogRefreshing] = useState(false);
  const [activeFamily, setActiveFamily] = useState<string>('');

  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');
  const [editSuccess, setEditSuccess] = useState(false);

  const [serviceConfigs, setServiceConfigs] = useState<ServiceConfig[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesRefreshing, setServicesRefreshing] = useState(false);
  const servicesLoaded = useRef(false);

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

  const handleEditBase = useCallback((product: Product) => {
    setEditTarget(product);
    setEditPrice(String(product.basePrice?.amount ?? ''));
    setEditError('');
    setEditSuccess(false);
  }, []);

  const handleSaveBase = useCallback(async () => {
    if (!editTarget || !catalog?._id) {return;}
    const amount = parseFloat(editPrice);
    if (isNaN(amount) || amount < 0) {
      setEditError('Please enter a valid price.');
      return;
    }
    setEditError('');
    setEditSaving(true);

    const updatedFamilies = (catalog.families ?? []).map(family => ({
      ...family,
      products: family.products.map(p =>
        p.key === editTarget.key
          ? {...p, basePrice: {...p.basePrice, amount}}
          : p,
      ),
    }));

    const result = await pricingApi.updateProductCatalog(catalog._id!, {
      families: updatedFamilies,
      version: catalog.version,
    });

    setEditSaving(false);
    if (result.ok) {
      setEditSuccess(true);
      setCatalog(prev => prev ? {...prev, families: updatedFamilies} : prev);
      setTimeout(() => {
        setEditTarget(null);
        setEditSuccess(false);
      }, 1200);
    } else {
      setEditError(result.error ?? 'Failed to save. Please try again.');
    }
  }, [editTarget, editPrice, catalog]);

  const handleConfigUpdated = useCallback((updated: ServiceConfig) => {
    setServiceConfigs(prev =>
      prev.map(c => ((c._id ?? c.serviceId) === (updated._id ?? updated.serviceId) ? updated : c)),
    );
  }, []);

  const families = catalog?.families ?? [];
  const currentFamily = families.find(f => f.key === activeFamily);
  const products = currentFamily?.products ?? [];

  return (
    <View style={styles.sectionShell}>
      <View style={styles.subTabToggle}>
        <View style={styles.subTabTrack}>
          <TouchableOpacity
            style={[styles.subTabBtn, subTab === 'products' && styles.subTabBtnActive]}
            onPress={() => handleSubTab('products')}
            activeOpacity={0.8}>
            <Ionicons
              name="cube-outline"
              size={14}
              color={subTab === 'products' ? '#fff' : Colors.textMuted}
            />
            <Text
              style={[styles.subTabBtnText, subTab === 'products' && styles.subTabBtnTextActive]}
              allowFontScaling={false}
              numberOfLines={1}>
              Products
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.subTabBtn, subTab === 'services' && styles.subTabBtnActive]}
            onPress={() => handleSubTab('services')}
            activeOpacity={0.8}>
            <Ionicons
              name="settings-outline"
              size={14}
              color={subTab === 'services' ? '#fff' : Colors.textMuted}
            />
            <Text
              style={[styles.subTabBtnText, subTab === 'services' && styles.subTabBtnTextActive]}
              allowFontScaling={false}
              numberOfLines={1}>
              Services
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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
                    <Text
                      style={[styles.familyTabText, f.key === activeFamily && styles.familyTabTextActive]}
                      allowFontScaling={false}
                      numberOfLines={1}>
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <FlatList
                data={products}
                keyExtractor={p => p.key}
                renderItem={({item}) => <ProductRow product={item} onEditBase={handleEditBase} />}
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

      {subTab === 'services' && (
        <ServicesPricingSubView
          configs={serviceConfigs}
          loading={servicesLoading}
          refreshing={servicesRefreshing}
          onRefresh={() => fetchServices(true)}
          onConfigUpdated={handleConfigUpdated}
        />
      )}

      <EditValueModal
        visible={editTarget !== null}
        title="Edit Base Price"
        subtitle={editTarget?.name}
        fieldLabel={`Base Price${editTarget?.basePrice?.uom ? ` (per ${editTarget.basePrice.uom})` : ''}`}
        value={editPrice}
        onChangeValue={t => { setEditPrice(t); setEditError(''); }}
        saving={editSaving}
        error={editError}
        success={editSuccess}
        onCancel={() => setEditTarget(null)}
        onSave={handleSaveBase}
      />
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
    paddingVertical: 10,
  },
  subTabTrack: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: Radius.full,
    padding: 3,
    gap: 3,
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 34,
    borderRadius: Radius.full,
  },
  subTabBtnActive: {
    backgroundColor: Colors.primary,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: {width: 0, height: 1},
    elevation: 2,
  },
  subTabBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textMuted,
    includeFontPadding: false,
  },
  subTabBtnTextActive: {
    color: '#fff',
  },
  familyTabBarSkeleton: {
    height: 42,
    backgroundColor: '#e5e7eb',
  },
  familyTabBar: {
    height: 52,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  familyTabBarContent: {
    paddingHorizontal: Spacing.md,
    gap: 6,
    alignItems: 'center',
    paddingVertical: 8,
  },
  familyTab: {
    height: 34,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyTabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  familyTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
    includeFontPadding: false,
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
