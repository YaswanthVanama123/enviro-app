import React, {useState, useCallback, useEffect, useRef} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, FlatList,
  RefreshControl, StyleSheet, Modal, TextInput, ActivityIndicator,
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

  const families = catalog?.families ?? [];
  const currentFamily = families.find(f => f.key === activeFamily);
  const products = currentFamily?.products ?? [];

  return (
    <View style={styles.sectionShell}>
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
        />
      )}

      <Modal
        visible={editTarget !== null}
        transparent
        animationType="fade"
        onRequestClose={() => !editSaving && setEditTarget(null)}>
        <TouchableOpacity
          style={modalStyles.overlay}
          activeOpacity={1}
          onPress={() => !editSaving && setEditTarget(null)}>
          <TouchableOpacity activeOpacity={1} style={modalStyles.card} onPress={() => {}}>
            <View style={modalStyles.header}>
              <View style={modalStyles.headerIconBox}>
                <Ionicons name="pencil" size={16} color="#1d4ed8" />
              </View>
              <View style={{flex: 1}}>
                <Text style={modalStyles.title}>Edit Base Price</Text>
                <Text style={modalStyles.sub} numberOfLines={1}>{editTarget?.name}</Text>
              </View>
              {!editSaving && (
                <TouchableOpacity onPress={() => setEditTarget(null)} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                  <Ionicons name="close" size={20} color="#9ca3af" />
                </TouchableOpacity>
              )}
            </View>

            <View style={modalStyles.body}>
              {editSuccess ? (
                <View style={modalStyles.successBox}>
                  <Ionicons name="checkmark-circle" size={36} color="#16a34a" />
                  <Text style={modalStyles.successText}>Price updated!</Text>
                </View>
              ) : (
                <>
                  <Text style={modalStyles.label}>
                    Base Price{editTarget?.basePrice?.uom ? ` (per ${editTarget.basePrice.uom})` : ''}
                  </Text>
                  <View style={modalStyles.inputRow}>
                    <Text style={modalStyles.currencySign}>$</Text>
                    <TextInput
                      style={modalStyles.input}
                      value={editPrice}
                      onChangeText={t => { setEditPrice(t); setEditError(''); }}
                      keyboardType="decimal-pad"
                      placeholder="0.00"
                      placeholderTextColor="#9ca3af"
                      autoFocus
                      selectTextOnFocus
                    />
                  </View>
                  {editError ? (
                    <Text style={modalStyles.errorText}>{editError}</Text>
                  ) : null}
                  <View style={modalStyles.actions}>
                    <TouchableOpacity
                      style={modalStyles.cancelBtn}
                      onPress={() => setEditTarget(null)}
                      disabled={editSaving}>
                      <Text style={modalStyles.cancelBtnText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[modalStyles.saveBtn, editSaving && {opacity: 0.6}]}
                      onPress={handleSaveBase}
                      disabled={editSaving}>
                      {editSaving
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={modalStyles.saveBtnText}>Save</Text>}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: '#dbeafe',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  body: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#3b82f6',
    borderRadius: Radius.lg,
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.md,
    overflow: 'hidden',
  },
  currencySign: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#16a34a',
    marginRight: 4,
  },
  input: {
    flex: 1,
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: '#16a34a',
    paddingVertical: Spacing.md,
    padding: 0,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: '#ef4444',
    marginTop: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#f8fafc',
  },
  cancelBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: '#1d4ed8',
  },
  saveBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  successText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#16a34a',
  },
});
