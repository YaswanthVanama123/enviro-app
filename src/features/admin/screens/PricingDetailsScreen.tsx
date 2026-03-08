import React, {useState, useEffect, useCallback, useRef} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  Switch,
  KeyboardAvoidingView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  pricingApi,
  Product,
  ProductFamily,
  ProductCatalog,
  ServiceConfig,
  PricingBackup,
} from '../../../services/api/endpoints/pricing.api';
import {ConfirmModal} from '../../../shared/components/ui/AppModal';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(amount: number | undefined): string {
  if (!amount || amount === 0) {return '—';}
  return `$${amount}`;
}

function timeAgo(iso: string | undefined): string {
  if (!iso) {return '—';}
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) {return 'today';}
  if (days === 1) {return '1 day ago';}
  if (days < 30) {return `${days} days ago`;}
  const m = Math.floor(days / 30);
  if (m < 12) {return `${m}mo ago`;}
  return `${Math.floor(m / 12)}y ago`;}

function formatDate(iso: string | undefined): string {
  if (!iso) {return '—';}
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {return iso;}
}

// ─── Tab definitions ──────────────────────────────────────────────────────────

type MainTab = 'pricing' | 'services' | 'catalog' | 'backup';

const MAIN_TABS: {key: MainTab; label: string; icon: string}[] = [
  {key: 'pricing',  label: 'Pricing Tables',  icon: 'pricetag-outline'},
  {key: 'services', label: 'Service Configs',  icon: 'settings-outline'},
  {key: 'catalog',  label: 'Product Catalog',  icon: 'cube-outline'},
  {key: 'backup',   label: 'Backup',           icon: 'cloud-upload-outline'},
];

// ─── Shared Tab Bar ───────────────────────────────────────────────────────────

function MainTabBar({active, onSelect}: {active: MainTab; onSelect: (t: MainTab) => void}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.mainTabBar}
      contentContainerStyle={styles.mainTabBarContent}>
      {MAIN_TABS.map(tab => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.mainTab, isActive && styles.mainTabActive]}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.7}>
            <Ionicons
              name={tab.icon}
              size={15}
              color={isActive ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.mainTabText, isActive && styles.mainTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

// ─── Skeleton rows ────────────────────────────────────────────────────────────

function SkeletonRow({lines = 2}: {lines?: number}) {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonIcon} />
      <View style={{flex: 1, gap: 6}}>
        {Array.from({length: lines}).map((_, i) => (
          <View
            key={i}
            style={[styles.skeletonLine, {width: i === 0 ? '65%' : '40%'}]}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Product row ──────────────────────────────────────────────────────────────

function ProductRow({product}: {product: Product}) {
  const [expanded, setExpanded] = useState(false);
  const hasWarranty = (product.warrantyPricePerUnit?.amount ?? 0) > 0;
  const hasDesc = !!product.description;

  return (
    <TouchableOpacity
      activeOpacity={hasDesc ? 0.7 : 1}
      onPress={() => hasDesc && setExpanded(e => !e)}
      style={styles.productRow}>
      <View style={styles.productRowTop}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <View style={styles.productKeyBadge}>
            <Text style={styles.productKeyText}>{product.key}</Text>
          </View>
        </View>
        <View style={styles.productPrices}>
          <View style={styles.priceChip}>
            <Text style={styles.priceChipLabel}>Base</Text>
            <Text style={styles.priceChipValue}>
              {fmt(product.basePrice?.amount)}
              {product.basePrice?.uom ? (
                <Text style={styles.priceUom}> /{product.basePrice.uom}</Text>
              ) : null}
            </Text>
          </View>
          {hasWarranty && (
            <View style={styles.priceChip}>
              <Text style={styles.priceChipLabel}>Warranty</Text>
              <Text style={[styles.priceChipValue, {color: '#7c3aed'}]}>
                {fmt(product.warrantyPricePerUnit?.amount)}
                {product.warrantyPricePerUnit?.billingPeriod ? (
                  <Text style={styles.priceUom}> /{product.warrantyPricePerUnit.billingPeriod}</Text>
                ) : null}
              </Text>
            </View>
          )}
          {hasDesc && (
            <Ionicons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={14}
              color={Colors.textMuted}
              style={{marginTop: 2}}
            />
          )}
        </View>
      </View>
      {expanded && hasDesc && (
        <Text style={styles.productDesc}>{product.description}</Text>
      )}
    </TouchableOpacity>
  );
}

// ─── Helpers for service config display ───────────────────────────────────────

function camelToLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

function formatConfigValue(key: string, val: any): string {
  if (val === null || val === undefined) {return '—';}
  if (typeof val === 'boolean') {return val ? 'Yes' : 'No';}
  if (typeof val === 'number') {
    const lk = key.toLowerCase();
    if (lk.includes('price') || lk.includes('charge') || lk.includes('cost') ||
        lk.includes('fee') || lk.includes('minimum') || lk.includes('rate') ||
        lk.includes('base') || lk.includes('additional') || lk.includes('amount')) {
      return `$${val % 1 === 0 ? val.toFixed(2) : val}`;
    }
    if (lk.includes('sqft') || lk.includes('sq_ft') || lk.includes('unit') && lk.includes('sq')) {
      return `${val.toFixed ? val.toFixed(2) : val} sq ft`;
    }
    if (lk.includes('multiplier') || lk.includes('factor')) {
      return `${val.toFixed ? val.toFixed(2) : val} ×`;
    }
    return String(val);
  }
  if (typeof val === 'string') {return val || '—';}
  return JSON.stringify(val);
}

function flattenConfig(obj: any): Array<{label: string; value: string}> {
  if (!obj || typeof obj !== 'object') {return [];}
  const rows: Array<{label: string; value: string}> = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_') || typeof v === 'function') {continue;}
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      for (const [k2, v2] of Object.entries(v as object)) {
        if (typeof v2 !== 'object' && typeof v2 !== 'function') {
          rows.push({label: camelToLabel(k2), value: formatConfigValue(k2, v2)});
        }
      }
    } else if (!Array.isArray(v)) {
      rows.push({label: camelToLabel(k), value: formatConfigValue(k, v)});
    }
  }
  return rows;
}

// ─── Service Details Modal (View All Fields) ──────────────────────────────────

type ServiceSubTab = 'unit' | 'minimums' | 'multipliers' | 'frequencies';

const SERVICE_SUBTABS: {key: ServiceSubTab; label: string; icon: string}[] = [
  {key: 'unit',        label: 'Unit Pricing',        icon: 'pricetag-outline'},
  {key: 'minimums',    label: 'Minimums',             icon: 'cash-outline'},
  {key: 'multipliers', label: 'Install Multipliers',  icon: 'flash-outline'},
  {key: 'frequencies', label: 'Service Frequencies',  icon: 'calendar-outline'},
];

// Map known nested config keys to sub-tab categories
const NESTED_CATEGORY: Record<string, ServiceSubTab> = {
  unitPricing:        'unit',
  unit:               'unit',
  minimums:           'minimums',
  minimum:            'minimums',
  installMultipliers: 'multipliers',
  multipliers:        'multipliers',
  serviceFrequencies: 'frequencies',
  frequencies:        'frequencies',
  frequency:          'frequencies',
};

function categorizeField(key: string): ServiceSubTab {
  const lk = key.toLowerCase();
  if (lk.includes('frequency') || lk.includes('freq') || lk.includes('schedule') || lk.includes('interval') || lk.includes('visit')) {
    return 'frequencies';
  }
  if (lk.includes('multiplier') || lk.includes('install') || lk.includes('factor') || lk.includes('dirty') || lk.includes('clean')) {
    return 'multipliers';
  }
  if (lk.includes('minimum') || lk.startsWith('min')) {
    return 'minimums';
  }
  return 'unit';
}

function getFieldDescription(key: string): string {
  const lk = key.toLowerCase();
  if (lk.includes('basesqft') || lk === 'basesqftunit') {return 'Base square footage unit for pricing (typically 500 sq ft)';}
  if (lk === 'baseprice') {return 'Price charged for the base square footage unit';}
  if (lk.includes('additionalsqft')) {return 'Additional square footage unit beyond the base';}
  if (lk.includes('additionalunit') && lk.includes('price')) {return 'Price for each additional unit beyond the base';}
  if (lk.includes('minimumcharge')) {return 'Minimum charge per service visit';}
  if (lk.includes('minimumsq')) {return 'Minimum square footage required for service';}
  if (lk.includes('dirty') && lk.includes('install')) {return 'Multiplier applied for dirty install conditions';}
  if (lk.includes('clean') && lk.includes('install')) {return 'Multiplier applied for clean install conditions';}
  if (lk.includes('multiplier')) {return 'Pricing multiplier applied to base rate';}
  if (lk.includes('frequency') || lk.includes('freq')) {return 'Service visit frequency option';}
  return '';
}

interface ConfigField {
  key: string;
  label: string;
  description: string;
  value: string;
  category: ServiceSubTab;
}

function extractConfigFields(config: any): ConfigField[] {
  if (!config || typeof config !== 'object') {return [];}
  const result: ConfigField[] = [];

  // Check if config has known nested category keys
  const hasNested = Object.keys(config).some(k => k in NESTED_CATEGORY && typeof config[k] === 'object' && config[k] !== null);

  if (hasNested) {
    for (const [catKey, catVal] of Object.entries(config)) {
      const category = NESTED_CATEGORY[catKey];
      if (!category || typeof catVal !== 'object' || catVal === null) {continue;}
      for (const [fk, fv] of Object.entries(catVal as object)) {
        if (fk.startsWith('_') || typeof fv === 'function' || typeof fv === 'object') {continue;}
        result.push({key: fk, label: camelToLabel(fk), description: getFieldDescription(fk), value: formatConfigValue(fk, fv), category});
      }
    }
  } else {
    // Flat structure
    for (const [k, v] of Object.entries(config)) {
      if (k.startsWith('_') || typeof v === 'function') {continue;}
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        // One level of nesting with unknown key — flatten into 'unit' by default
        for (const [k2, v2] of Object.entries(v as object)) {
          if (typeof v2 !== 'object' && typeof v2 !== 'function') {
            result.push({key: k2, label: camelToLabel(k2), description: getFieldDescription(k2), value: formatConfigValue(k2, v2), category: categorizeField(k2)});
          }
        }
      } else if (!Array.isArray(v)) {
        result.push({key: k, label: camelToLabel(k), description: getFieldDescription(k), value: formatConfigValue(k, v), category: categorizeField(k)});
      }
    }
  }
  return result;
}

function ServiceDetailsModal({
  visible,
  serviceConfig,
  onClose,
}: {
  visible: boolean;
  serviceConfig: ServiceConfig | null;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [activeSubTab, setActiveSubTab] = useState<ServiceSubTab>('unit');

  useEffect(() => {
    if (visible) {setActiveSubTab('unit');}
  }, [visible, serviceConfig]);

  if (!serviceConfig) {return null;}

  const allFields = extractConfigFields(serviceConfig.config);
  const visibleFields = allFields.filter(f => f.category === activeSubTab);

  // Count per sub-tab
  const counts = SERVICE_SUBTABS.reduce<Record<string, number>>((acc, t) => {
    acc[t.key] = allFields.filter(f => f.category === t.key).length;
    return acc;
  }, {});

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[detailStyles.screen, {paddingTop: insets.top}]}>

        {/* Purple header */}
        <View style={detailStyles.header}>
          <View style={detailStyles.headerContent}>
            <View style={detailStyles.headerIcon}>
              <Ionicons name="settings-outline" size={22} color="#fff" />
            </View>
            <View style={detailStyles.headerText}>
              <Text style={detailStyles.headerTitle} numberOfLines={1}>
                {serviceConfig.label || serviceConfig.serviceId}
              </Text>
              <Text style={detailStyles.headerSub}>Pricing Details</Text>
            </View>
          </View>
          <TouchableOpacity style={detailStyles.closeBtn} onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.9)" />
            <Text style={detailStyles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>

        {/* Sub-tab bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={detailStyles.subTabBar}
          contentContainerStyle={detailStyles.subTabBarContent}>
          {SERVICE_SUBTABS.map(tab => {
            const isActive = tab.key === activeSubTab;
            const count = counts[tab.key] ?? 0;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[detailStyles.subTab, isActive && detailStyles.subTabActive]}
                onPress={() => setActiveSubTab(tab.key)}
                activeOpacity={0.7}>
                <Ionicons name={tab.icon} size={14} color={isActive ? Colors.primary : Colors.textMuted} />
                <Text style={[detailStyles.subTabText, isActive && detailStyles.subTabTextActive]}>
                  {tab.label}
                </Text>
                {count > 0 && (
                  <View style={[detailStyles.subTabBadge, isActive && detailStyles.subTabBadgeActive]}>
                    <Text style={[detailStyles.subTabBadgeText, isActive && detailStyles.subTabBadgeTextActive]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Field cards */}
        <FlatList
          key={activeSubTab}
          data={visibleFields}
          keyExtractor={f => f.key}
          renderItem={({item}) => (
            <View style={detailStyles.fieldCard}>
              <View style={detailStyles.fieldCardLeft}>
                <Text style={detailStyles.fieldCardLabel}>{item.label}</Text>
                {item.description ? (
                  <Text style={detailStyles.fieldCardDesc}>{item.description}</Text>
                ) : null}
              </View>
              <View style={detailStyles.fieldCardRight}>
                <Text style={detailStyles.fieldCardValue}>{item.value}</Text>
              </View>
            </View>
          )}
          ItemSeparatorComponent={() => <View style={detailStyles.separator} />}
          ListEmptyComponent={
            <View style={detailStyles.emptyFields}>
              <Ionicons name="document-outline" size={36} color={Colors.textMuted} />
              <Text style={detailStyles.emptyFieldsText}>No fields in this category</Text>
            </View>
          }
          contentContainerStyle={{paddingBottom: insets.bottom + 24}}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </Modal>
  );
}

// ─── Services Pricing sub-view ────────────────────────────────────────────────

function ServicesPricingSubView({
  configs,
  loading,
  onRefresh,
  refreshing,
}: {
  configs: ServiceConfig[];
  loading: boolean;
  onRefresh: () => void;
  refreshing: boolean;
}) {
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
      {/* Service sub-tabs */}
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
        serviceConfig={current}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — PRICING TABLES (Products + Services toggle)
// ═══════════════════════════════════════════════════════════════════════════════

type PricingSubTab = 'products' | 'services';

function PricingTablesSection() {
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
      if (!activeFamily && data.families?.length) {
        setActiveFamily(data.families[0].key);
      }
    }
    if (isRefresh) {setCatalogRefreshing(false);} else {setCatalogLoading(false);}
  }, [activeFamily]);

  const catalogLoaded = useRef(false);
  useEffect(() => {
    if (!catalogLoaded.current) {
      catalogLoaded.current = true;
      fetchCatalog();
    }
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

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — SERVICE CONFIGS
// ═══════════════════════════════════════════════════════════════════════════════

const SERVICE_COLORS: Record<string, string> = {
  saniclean:          '#ef4444',
  saniscrub:          '#f97316',
  sanipod:            '#eab308',
  foaming_drain:      '#22c55e',
  grease_trap:        '#14b8a6',
  microfiber_mopping: '#3b82f6',
  rpm_windows:        '#6366f1',
  carpet_cleaning:    '#8b5cf6',
  janitorial:         '#ec4899',
  strip_wax:          '#f59e0b',
  electrostatic:      '#10b981',
  refresh_power:      '#0ea5e9',
};

function serviceColor(serviceId: string): string {
  return SERVICE_COLORS[serviceId.toLowerCase()] ?? Colors.primary;
}

// ─── Edit Service Config Modal ────────────────────────────────────────────────

function EditServiceConfigModal({
  visible,
  config,
  onClose,
  onSaved,
}: {
  visible: boolean;
  config: ServiceConfig | null;
  onClose: () => void;
  onSaved: (updated: ServiceConfig) => void;
}) {
  const insets = useSafeAreaInsets();
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [version, setVersion] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [tagsInput, setTagsInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Populate form when config changes
  useEffect(() => {
    if (config && visible) {
      setLabel(config.label ?? '');
      setDescription(config.description ?? '');
      setVersion(config.version ?? '');
      setIsActive(config.isActive ?? true);
      setTagsInput(config.tags?.join(', ') ?? '');
    }
  }, [config, visible]);

  const handleSave = useCallback(async () => {
    if (!config) {return;}
    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      Alert.alert('Validation', 'Label is required.');
      return;
    }
    setSaving(true);
    const parsedTags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    const result = await pricingApi.updateServiceConfig(config._id, {
      label: trimmedLabel,
      description: description.trim() || undefined,
      version: version.trim() || undefined,
      isActive,
      tags: parsedTags,
    });
    setSaving(false);
    if (result.ok) {
      onSaved({
        ...config,
        label: trimmedLabel,
        description: description.trim() || undefined,
        version: version.trim() || undefined,
        isActive,
        tags: parsedTags,
      });
      onClose();
    } else {
      Alert.alert('Save Failed', result.error ?? 'Unknown error. Please try again.');
    }
  }, [config, label, description, version, isActive, tagsInput, onSaved, onClose]);

  if (!config) {return null;}

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[editStyles.screen, {paddingTop: insets.top}]}>

          {/* Header */}
          <View style={editStyles.header}>
            <View style={editStyles.headerLeft}>
              <Ionicons name="settings-outline" size={20} color={Colors.textPrimary} />
              <View>
                <Text style={editStyles.headerTitle}>Edit Service Config</Text>
                <Text style={editStyles.headerSub} numberOfLines={1}>
                  {config.serviceId}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={editStyles.closeBtn}
              onPress={onClose}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <ScrollView
            style={editStyles.formScroll}
            contentContainerStyle={[editStyles.formContent, {paddingBottom: insets.bottom + 100}]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Label */}
            <View style={editStyles.fieldGroup}>
              <Text style={editStyles.fieldLabel}>Label <Text style={editStyles.required}>*</Text></Text>
              <TextInput
                style={editStyles.input}
                value={label}
                onChangeText={setLabel}
                placeholder="Service display name"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="next"
              />
            </View>

            {/* Description */}
            <View style={editStyles.fieldGroup}>
              <Text style={editStyles.fieldLabel}>Description</Text>
              <TextInput
                style={[editStyles.input, editStyles.inputMultiline]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional description"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Version */}
            <View style={editStyles.fieldGroup}>
              <Text style={editStyles.fieldLabel}>Version</Text>
              <TextInput
                style={editStyles.input}
                value={version}
                onChangeText={setVersion}
                placeholder="e.g. 1.0"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="next"
              />
            </View>

            {/* Tags */}
            <View style={editStyles.fieldGroup}>
              <Text style={editStyles.fieldLabel}>Tags</Text>
              <Text style={editStyles.fieldHint}>Comma-separated list of tags</Text>
              <TextInput
                style={editStyles.input}
                value={tagsInput}
                onChangeText={setTagsInput}
                placeholder="e.g. cleaning, residential"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="done"
              />
            </View>

            {/* Active toggle */}
            <View style={editStyles.toggleRow}>
              <View style={editStyles.toggleInfo}>
                <Text style={editStyles.fieldLabel}>Active</Text>
                <Text style={editStyles.fieldHint}>
                  {isActive ? 'This config is currently active' : 'This config is currently inactive'}
                </Text>
              </View>
              <Switch
                value={isActive}
                onValueChange={setIsActive}
                trackColor={{false: '#e5e7eb', true: Colors.primary + '60'}}
                thumbColor={isActive ? Colors.primary : '#9ca3af'}
              />
            </View>

          </ScrollView>

          {/* Action buttons */}
          <View style={[editStyles.footer, {paddingBottom: Math.max(insets.bottom, Spacing.lg)}]}>
            <TouchableOpacity style={editStyles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={editStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[editStyles.saveBtn, saving && {opacity: 0.6}]}
              onPress={handleSave}
              disabled={saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
              <Text style={editStyles.saveBtnText}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Service Config Card ──────────────────────────────────────────────────────

function ServiceConfigCard({config, onEdit}: {config: ServiceConfig; onEdit: (c: ServiceConfig) => void}) {
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

function ServiceConfigsSection() {
  const [configs, setConfigs] = useState<ServiceConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editTarget, setEditTarget] = useState<ServiceConfig | null>(null);
  const loaded = useRef(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {setRefreshing(true);} else {setLoading(true);}
    const data = await pricingApi.getAllServiceConfigs();
    setConfigs(data ?? []);
    if (isRefresh) {setRefreshing(false);} else {setLoading(false);}
  }, []);

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      fetchData();
    }
  }, [fetchData]);

  const handleSaved = useCallback((updated: ServiceConfig) => {
    setConfigs(prev => prev.map(c => c._id === updated._id ? updated : c));
  }, []);

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      fetchData();
    }
  }, [fetchData]);

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

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — PRODUCT CATALOG (family overview)
// ═══════════════════════════════════════════════════════════════════════════════

const FAMILY_ICONS: Record<string, string> = {
  floorProducts:      'water-outline',
  saniProducts:       'shield-checkmark-outline',
  dispensers:         'server-outline',
  threeSinkComponents:'layers-outline',
  otherChemicals:     'flask-outline',
  soapProducts:       'sparkles-outline',
  paper:              'document-outline',
  extrasFacilities:   'grid-outline',
};
const FAMILY_COLORS: Record<string, string> = {
  floorProducts:      '#3b82f6',
  saniProducts:       '#10b981',
  dispensers:         '#8b5cf6',
  threeSinkComponents:'#f59e0b',
  otherChemicals:     '#ef4444',
  soapProducts:       '#ec4899',
  paper:              '#6366f1',
  extrasFacilities:   '#14b8a6',
};

// ─── Inline Picker ────────────────────────────────────────────────────────────

function PickerField({
  placeholder,
  value,
  options,
  onSelect,
}: {
  placeholder: string;
  value: string;
  options: {label: string; value: string}[];
  onSelect: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);
  return (
    <View>
      <TouchableOpacity
        style={addStyles.pickerField}
        onPress={() => setOpen(o => !o)}
        activeOpacity={0.7}>
        <Text style={[addStyles.pickerText, !selected && addStyles.pickerPlaceholder]}>
          {selected ? selected.label : placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
      </TouchableOpacity>
      {open && (
        <View style={addStyles.pickerDropdown}>
          {options.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={addStyles.pickerOption}
              onPress={() => {onSelect(opt.value); setOpen(false);}}>
              <Text style={[addStyles.pickerOptionText, opt.value === value && addStyles.pickerOptionActive]}>
                {opt.label}
              </Text>
              {opt.value === value && (
                <Ionicons name="checkmark" size={14} color={Colors.primary} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const KIND_OPTIONS = [
  {label: 'Degreaser',     value: 'degreaser'},
  {label: 'Disinfectant',  value: 'disinfectant'},
  {label: 'Floor Cleaner', value: 'floorCleaner'},
  {label: 'Soap',          value: 'soap'},
  {label: 'Dispenser',     value: 'dispenser'},
  {label: 'Paper',         value: 'paper'},
  {label: 'Chemical',      value: 'chemical'},
  {label: 'Other',         value: 'other'},
];

const UOM_OPTIONS = [
  {label: 'Gallon',  value: 'gallon'},
  {label: 'Case',    value: 'case'},
  {label: 'Each',    value: 'each'},
  {label: 'Oz',      value: 'oz'},
  {label: 'Lb',      value: 'lb'},
  {label: 'Bottle',  value: 'bottle'},
  {label: 'Pack',    value: 'pack'},
  {label: 'Sq Ft',   value: 'sqft'},
];

const BILLING_OPTIONS = [
  {label: 'Monthly',  value: 'monthly'},
  {label: 'Annual',   value: 'annual'},
  {label: 'One-time', value: 'one_time'},
];

// ─── Add Product Modal ────────────────────────────────────────────────────────

function AddProductModal({
  visible,
  familyKey,
  familyLabel,
  onClose,
  onAdded,
}: {
  visible: boolean;
  familyKey: string;
  familyLabel: string;
  onClose: () => void;
  onAdded: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyEdited, setKeyEdited] = useState(false);
  const [kind, setKind] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [uom, setUom] = useState('');
  const [warrantyPrice, setWarrantyPrice] = useState('');
  const [billingPeriod, setBillingPeriod] = useState('monthly');
  const [displayByAdmin, setDisplayByAdmin] = useState(true);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(''); setKey(''); setKeyEdited(false);
      setKind(''); setBasePrice(''); setUom('');
      setWarrantyPrice(''); setBillingPeriod('monthly');
      setDisplayByAdmin(true); setDescription('');
    }
  }, [visible]);

  const handleNameChange = useCallback((val: string) => {
    setName(val);
    if (!keyEdited) {
      const auto = val.toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_-]/g, '')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '');
      setKey(auto);
    }
  }, [keyEdited]);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {Alert.alert('Validation', 'Product name is required.'); return;}
    if (!key.trim())  {Alert.alert('Validation', 'Product key is required.'); return;}
    if (!uom)         {Alert.alert('Validation', 'Unit of measure is required.'); return;}
    setSaving(true);
    const result = await pricingApi.addProduct(familyKey, {
      key: key.trim(),
      name: name.trim(),
      kind: kind || undefined,
      basePrice: {amount: parseFloat(basePrice) || 0, currency: 'USD', uom},
      warrantyPricePerUnit:
        parseFloat(warrantyPrice) > 0
          ? {amount: parseFloat(warrantyPrice), currency: 'USD', billingPeriod}
          : undefined,
      displayByAdmin,
      description: description.trim() || undefined,
    });
    setSaving(false);
    if (result.ok) {
      onAdded();
      onClose();
    } else {
      Alert.alert('Add Failed', result.error ?? 'Failed to add product. Please try again.');
    }
  }, [familyKey, name, key, kind, basePrice, uom, warrantyPrice, billingPeriod, displayByAdmin, description, onAdded, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[addStyles.screen, {paddingTop: insets.top}]}>

          {/* Header */}
          <View style={addStyles.header}>
            <View style={addStyles.headerLeft}>
              <Ionicons name="cube-outline" size={20} color={Colors.textPrimary} />
              <View>
                <Text style={addStyles.headerTitle}>Add New Product</Text>
                <Text style={addStyles.headerSub}>{familyLabel}</Text>
              </View>
            </View>
            <TouchableOpacity style={addStyles.closeBtn} onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={addStyles.scroll}
            contentContainerStyle={[addStyles.content, {paddingBottom: insets.bottom + 100}]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Product Name */}
            <View style={addStyles.fieldGroup}>
              <Text style={addStyles.label}>Product Name <Text style={addStyles.required}>*</Text></Text>
              <TextInput
                style={addStyles.input}
                value={name}
                onChangeText={handleNameChange}
                placeholder="e.g. Heavy Duty Degreaser"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="next"
              />
            </View>

            {/* Product Key */}
            <View style={addStyles.fieldGroup}>
              <Text style={addStyles.label}>Product Key <Text style={addStyles.required}>*</Text></Text>
              <Text style={addStyles.hint}>Auto-generated · only letters, numbers, hyphens, underscores</Text>
              <TextInput
                style={addStyles.input}
                value={key}
                onChangeText={v => {setKey(v); setKeyEdited(true);}}
                placeholder="e.g. heavy_duty_degreaser"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                returnKeyType="next"
              />
            </View>

            {/* Kind */}
            <View style={addStyles.fieldGroup}>
              <Text style={addStyles.label}>Kind</Text>
              <PickerField
                placeholder="Select kind…"
                value={kind}
                options={KIND_OPTIONS}
                onSelect={setKind}
              />
            </View>

            {/* Base Price + UOM */}
            <View style={addStyles.row}>
              <View style={[addStyles.fieldGroup, {flex: 1}]}>
                <Text style={addStyles.label}>Base Price ($)</Text>
                <TextInput
                  style={addStyles.input}
                  value={basePrice}
                  onChangeText={setBasePrice}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>
              <View style={[addStyles.fieldGroup, {flex: 1}]}>
                <Text style={addStyles.label}>UOM <Text style={addStyles.required}>*</Text></Text>
                <PickerField
                  placeholder="Select…"
                  value={uom}
                  options={UOM_OPTIONS}
                  onSelect={setUom}
                />
              </View>
            </View>

            {/* Warranty Price + Billing Period */}
            <View style={addStyles.row}>
              <View style={[addStyles.fieldGroup, {flex: 1}]}>
                <Text style={addStyles.label}>Warranty Price ($)</Text>
                <TextInput
                  style={addStyles.input}
                  value={warrantyPrice}
                  onChangeText={setWarrantyPrice}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                />
              </View>
              <View style={[addStyles.fieldGroup, {flex: 1}]}>
                <Text style={addStyles.label}>Billing Period</Text>
                <PickerField
                  placeholder="Select…"
                  value={billingPeriod}
                  options={BILLING_OPTIONS}
                  onSelect={setBillingPeriod}
                />
              </View>
            </View>

            {/* Display in Admin Panel */}
            <View style={addStyles.toggleRow}>
              <View style={{flex: 1, gap: 3}}>
                <Text style={addStyles.label}>Display in Admin Panel</Text>
                <Text style={addStyles.hint}>Show this product in the admin pricing view</Text>
              </View>
              <Switch
                value={displayByAdmin}
                onValueChange={setDisplayByAdmin}
                trackColor={{false: '#e5e7eb', true: Colors.primary + '60'}}
                thumbColor={displayByAdmin ? Colors.primary : '#9ca3af'}
              />
            </View>

            {/* Description */}
            <View style={addStyles.fieldGroup}>
              <Text style={addStyles.label}>Description</Text>
              <TextInput
                style={[addStyles.input, addStyles.inputMultiline]}
                value={description}
                onChangeText={setDescription}
                placeholder="Optional product description"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

          </ScrollView>

          {/* Footer */}
          <View style={[addStyles.footer, {paddingBottom: Math.max(insets.bottom, Spacing.lg)}]}>
            <TouchableOpacity style={addStyles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={addStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[addStyles.saveBtn, saving && {opacity: 0.6}]}
              onPress={handleSave}
              disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="add-circle-outline" size={16} color="#fff" />}
              <Text style={addStyles.saveBtnText}>{saving ? 'Adding…' : 'Add Product'}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Product Details Modal ────────────────────────────────────────────────────

function ProductDetailsModal({
  visible,
  product,
  familyLabel,
  familyColor,
  onClose,
}: {
  visible: boolean;
  product: Product | null;
  familyLabel: string;
  familyColor: string;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  if (!product) {return null;}

  const hasWarranty = (product.warrantyPricePerUnit?.amount ?? 0) > 0;

  const rows: {label: string; value: React.ReactNode}[] = [
    {
      label: 'Product Key',
      value: (
        <Text style={pdStyles.monoValue}>{product.key}</Text>
      ),
    },
    {
      label: 'Family',
      value: <Text style={pdStyles.value}>{familyLabel}</Text>,
    },
    {
      label: 'Base Price',
      value: (
        <Text style={[pdStyles.value, {color: '#16a34a', fontWeight: '700'}]}>
          {fmt(product.basePrice?.amount)}{product.basePrice?.uom ? ` / ${product.basePrice.uom}` : ''}
        </Text>
      ),
    },
    {
      label: 'Unit of Measure',
      value: <Text style={pdStyles.value}>{product.basePrice?.uom || '—'}</Text>,
    },
    {
      label: 'Warranty Price',
      value: (
        <Text style={[pdStyles.value, hasWarranty && {color: '#7c3aed', fontWeight: '700'}]}>
          {hasWarranty
            ? `${fmt(product.warrantyPricePerUnit?.amount)}${product.warrantyPricePerUnit?.billingPeriod ? ` / ${product.warrantyPricePerUnit.billingPeriod}` : ''}`
            : '—'}
        </Text>
      ),
    },
    {
      label: 'Display in Admin',
      value: (
        <View style={[pdStyles.displayBadge, product.displayByAdmin ? pdStyles.displayYes : pdStyles.displayNo]}>
          <Text style={[pdStyles.displayBadgeText, product.displayByAdmin ? pdStyles.displayYesText : pdStyles.displayNoText]}>
            {product.displayByAdmin ? 'Yes' : 'No'}
          </Text>
        </View>
      ),
    },
    ...(product.quantityPerCase
      ? [{
          label: 'Qty per Case',
          value: <Text style={pdStyles.value}>{product.quantityPerCase}{product.quantityPerCaseLabel ? ` ${product.quantityPerCaseLabel}` : ''}</Text>,
        }]
      : []),
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <View style={[pdStyles.screen, {paddingTop: insets.top}]}>

        {/* Header */}
        <View style={[pdStyles.header, {borderLeftColor: familyColor}]}>
          <View style={pdStyles.headerLeft}>
            <View style={[pdStyles.headerIcon, {backgroundColor: familyColor + '18'}]}>
              <Ionicons name="cube-outline" size={22} color={familyColor} />
            </View>
            <View style={{flex: 1, minWidth: 0}}>
              <Text style={pdStyles.headerTitle} numberOfLines={2}>{product.name}</Text>
              <Text style={pdStyles.headerSub}>{familyLabel}</Text>
            </View>
          </View>
          <TouchableOpacity style={pdStyles.closeBtn} onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Ionicons name="close" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={[pdStyles.content, {paddingBottom: insets.bottom + 32}]}
          showsVerticalScrollIndicator={false}>

          {/* Detail rows */}
          <View style={pdStyles.section}>
            {rows.map((row, idx) => (
              <View key={row.label}>
                <View style={pdStyles.row}>
                  <Text style={pdStyles.rowLabel}>{row.label}</Text>
                  <View style={pdStyles.rowValue}>{row.value}</View>
                </View>
                {idx < rows.length - 1 && <View style={pdStyles.divider} />}
              </View>
            ))}
          </View>

          {/* Description */}
          {product.description ? (
            <View style={pdStyles.section}>
              <Text style={pdStyles.descLabel}>Description</Text>
              <Text style={pdStyles.descText}>{product.description}</Text>
            </View>
          ) : null}

        </ScrollView>

        {/* Close footer */}
        <View style={[pdStyles.footer, {paddingBottom: Math.max(insets.bottom, Spacing.lg)}]}>
          <TouchableOpacity style={pdStyles.closeFooterBtn} onPress={onClose}>
            <Text style={pdStyles.closeFooterBtnText}>Close</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

// ─── Family Card ──────────────────────────────────────────────────────────────

function FamilyCard({family, onAddProduct}: {family: ProductFamily; onAddProduct: (key: string) => void}) {
  const [expanded, setExpanded] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const color = FAMILY_COLORS[family.key] ?? Colors.primary;
  const icon = FAMILY_ICONS[family.key] ?? 'cube-outline';
  const preview = family.products.slice(0, 3);

  return (
    <TouchableOpacity
      style={styles.familyCard}
      activeOpacity={0.8}
      onPress={() => setExpanded(e => !e)}>
      {/* Card header */}
      <View style={styles.familyCardHeader}>
        <View style={[styles.familyCardIcon, {backgroundColor: color + '18'}]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.familyCardMeta}>
          <Text style={styles.familyCardTitle}>{family.label}</Text>
          <Text style={styles.familyCardCount}>
            {family.products.length} product{family.products.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={Colors.textMuted}
        />
      </View>

      {/* Preview chips (collapsed) */}
      {!expanded && (
        <View style={styles.familyCardChips}>
          {preview.map(p => (
            <View key={p.key} style={[styles.previewChip, {borderColor: color + '40', backgroundColor: color + '0d'}]}>
              <Text style={[styles.previewChipText, {color}]} numberOfLines={1}>
                {p.name}
              </Text>
            </View>
          ))}
          {family.products.length > 3 && (
            <View style={[styles.previewChip, {borderColor: Colors.border, backgroundColor: '#f1f5f9'}]}>
              <Text style={[styles.previewChipText, {color: Colors.textMuted}]}>
                +{family.products.length - 3} more
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Expanded product list */}
      {expanded && (
        <View style={styles.familyCardExpanded}>
          {family.products.map((p, idx) => (
            <View key={p.key}>
              <View style={styles.catalogProductRow}>
                <View style={[styles.catalogProductDot, {backgroundColor: color}]} />
                <View style={styles.catalogProductInfo}>
                  <Text style={styles.catalogProductName}>{p.name}</Text>
                  <Text style={styles.catalogProductKey}>{p.key}</Text>
                </View>
                <View style={styles.catalogProductRight}>
                  <Text style={styles.catalogProductPrice}>
                    {fmt(p.basePrice?.amount)}
                    {p.basePrice?.uom ? (
                      <Text style={styles.priceUom}> /{p.basePrice.uom}</Text>
                    ) : null}
                  </Text>
                  <TouchableOpacity
                    style={styles.viewDetailsBtn}
                    onPress={() => setDetailProduct(p)}
                    activeOpacity={0.7}>
                    <Text style={styles.viewDetailsBtnText}>View Details</Text>
                  </TouchableOpacity>
                </View>
              </View>
              {idx < family.products.length - 1 && (
                <View style={[styles.separator, {marginLeft: 28}]} />
              )}
            </View>
          ))}
          {/* Add Product button */}
          <TouchableOpacity
            style={[styles.addProductBtn, {borderColor: color + '60', backgroundColor: color + '0d'}]}
            activeOpacity={0.7}
            onPress={() => onAddProduct(family.key)}>
            <Ionicons name="add-circle-outline" size={15} color={color} />
            <Text style={[styles.addProductBtnText, {color}]}>Add Product</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Product button when collapsed too */}
      {!expanded && (
        <TouchableOpacity
          style={[styles.addProductBtn, {borderColor: color + '60', backgroundColor: color + '0d'}]}
          activeOpacity={0.7}
          onPress={() => onAddProduct(family.key)}>
          <Ionicons name="add-circle-outline" size={15} color={color} />
          <Text style={[styles.addProductBtnText, {color}]}>Add Product</Text>
        </TouchableOpacity>
      )}
      <ProductDetailsModal
        visible={detailProduct !== null}
        product={detailProduct}
        familyLabel={family.label}
        familyColor={color}
        onClose={() => setDetailProduct(null)}
      />
    </TouchableOpacity>
  );
}

function ProductCatalogSection() {
  const [catalog, setCatalog] = useState<ProductCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loaded = useRef(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {setRefreshing(true);} else {setLoading(true);}
    const data = await pricingApi.getProductCatalog();
    setCatalog(data);
    if (isRefresh) {setRefreshing(false);} else {setLoading(false);}
  }, []);

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      fetchData();
    }
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

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 4 — BACKUP MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

function BackupRow({
  backup,
  onRestore,
}: {
  backup: PricingBackup;
  onRestore: (b: PricingBackup) => void;
}) {
  return (
    <View style={styles.backupRow}>
      <View style={styles.backupIconBox}>
        <Ionicons name="save-outline" size={20} color="#3b82f6" />
      </View>
      <View style={styles.backupInfo}>
        <Text style={styles.backupId}>{backup.changeDayId}</Text>
        <Text style={styles.backupDate}>{formatDate(backup.createdAt)}</Text>
        <View style={styles.backupStats}>
          {backup.serviceConfigsCount !== undefined && (
            <Text style={styles.backupStat}>{backup.serviceConfigsCount} services</Text>
          )}
          {backup.productFamiliesCount !== undefined && (
            <Text style={styles.backupStat}>· {backup.productFamiliesCount} families</Text>
          )}
          {backup.totalProducts !== undefined && (
            <Text style={styles.backupStat}>· {backup.totalProducts} products</Text>
          )}
        </View>
        {backup.note ? (
          <Text style={styles.backupNote} numberOfLines={1}>{backup.note}</Text>
        ) : null}
      </View>
      <TouchableOpacity
        style={styles.restoreBtn}
        onPress={() => onRestore(backup)}
        hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
        <Ionicons name="refresh-outline" size={14} color="#7c3aed" />
        <Text style={styles.restoreBtnText}>Restore</Text>
      </TouchableOpacity>
    </View>
  );
}

function BackupManagementSection() {
  const [backups, setBackups] = useState<PricingBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<PricingBackup | null>(null);
  const [confirmCreate, setConfirmCreate] = useState(false);
  const loaded = useRef(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {setRefreshing(true);} else {setLoading(true);}
    const data = await pricingApi.getBackupList();
    setBackups(data);
    if (isRefresh) {setRefreshing(false);} else {setLoading(false);}
  }, []);

  useEffect(() => {
    if (!loaded.current) {
      loaded.current = true;
      fetchData();
    }
  }, [fetchData]);

  const doCreate = useCallback(async () => {
    setCreating(true);
    const ok = await pricingApi.createBackup();
    setCreating(false);
    if (ok) {
      fetchData(true);
    } else {
      Alert.alert('Error', 'Failed to create backup. Please try again.');
    }
  }, [fetchData]);

  const doRestore = useCallback(async (backup: PricingBackup) => {
    const ok = await pricingApi.restoreBackup(backup.changeDayId);
    if (ok) {
      Alert.alert('Restored', `Pricing restored to ${backup.changeDayId} successfully.`);
    } else {
      Alert.alert('Error', 'Failed to restore backup. Please try again.');
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.sectionShell}>
        <View style={styles.createBackupBtnSkeleton} />
        {[1,2,3].map(i => <SkeletonRow key={i} lines={3} />)}
      </View>
    );
  }

  return (
    <View style={styles.sectionShell}>
      {/* Create backup button */}
      <TouchableOpacity
        style={[styles.createBackupBtn, creating && {opacity: 0.6}]}
        onPress={() => setConfirmCreate(true)}
        disabled={creating}>
        {creating ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
        )}
        <Text style={styles.createBackupBtnText}>
          {creating ? 'Creating…' : 'Create Backup'}
        </Text>
      </TouchableOpacity>

      {/* Backup list */}
      <FlatList
        data={backups}
        keyExtractor={b => b.changeDayId}
        renderItem={({item}) => (
          <BackupRow backup={item} onRestore={b => setConfirmRestore(b)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListHeaderComponent={
          backups.length > 0 ? (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>
                {backups.length} backup{backups.length !== 1 ? 's' : ''} available
              </Text>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cloud-outline" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No backups yet</Text>
            <Text style={styles.emptySub}>Create a backup to save current pricing.</Text>
          </View>
        }
        contentContainerStyle={{paddingBottom: 40}}
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

      {/* Confirm create */}
      <ConfirmModal
        visible={confirmCreate}
        icon="cloud-upload-outline"
        iconColor="#3b82f6"
        iconBg="#eff6ff"
        title="Create Backup?"
        subtitle="This will save a snapshot of all current pricing data (services + product catalog)."
        confirmLabel="Create Backup"
        confirmColor="#3b82f6"
        onConfirm={() => {setConfirmCreate(false); doCreate();}}
        onCancel={() => setConfirmCreate(false)}
      />

      {/* Confirm restore */}
      <ConfirmModal
        visible={confirmRestore !== null}
        icon="refresh-outline"
        iconColor="#7c3aed"
        iconBg="#f5f3ff"
        title="Restore Backup?"
        subtitle={
          confirmRestore
            ? `Restore pricing to the snapshot from ${confirmRestore.changeDayId}? This will overwrite current pricing data.`
            : ''
        }
        confirmLabel="Restore"
        confirmColor="#7c3aed"
        onConfirm={() => {
          const b = confirmRestore;
          setConfirmRestore(null);
          if (b) {doRestore(b);}
        }}
        onCancel={() => setConfirmRestore(null)}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

export function PricingDetailsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<MainTab>('pricing');

  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      {/* Main tab bar */}
      <MainTabBar active={activeTab} onSelect={setActiveTab} />

      {/* Tab content */}
      <View style={styles.tabContent}>
        {activeTab === 'pricing'  && <PricingTablesSection />}
        {activeTab === 'services' && <ServiceConfigsSection />}
        {activeTab === 'catalog'  && <ProductCatalogSection />}
        {activeTab === 'backup'   && <BackupManagementSection />}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const SKELETON_BG = '#e5e7eb';

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},

  // ── Main tab bar ─────────────────────────────────────────────────────────
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

  // ── Service pricing field rows ────────────────────────────────────────────
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

  // ── Main tab bar ─────────────────────────────────────────────────────────
  mainTabBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    maxHeight: 46,
  },
  mainTabBarContent: {
    paddingHorizontal: Spacing.md,
    gap: 4,
    alignItems: 'center',
    paddingVertical: 6,
  },
  mainTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  mainTabActive: {
    backgroundColor: Colors.primaryLight,
  },
  mainTabText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  mainTabTextActive: {
    color: Colors.primary,
  },

  // ── Tab content shell ─────────────────────────────────────────────────────
  tabContent: {
    flex: 1,
  },
  sectionShell: {
    flex: 1,
  },

  // ── Family sub-tabs (Pricing Tables) ──────────────────────────────────────
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
  familyTabBarSkeleton: {
    height: 42,
    backgroundColor: SKELETON_BG,
  },

  // ── Family header ─────────────────────────────────────────────────────────
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

  // ── Product row (Pricing Tables) ─────────────────────────────────────────
  productRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  productRowTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
  },
  productInfo: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  productName: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  productKeyBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  productKeyText: {
    fontSize: 10,
    color: Colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  productPrices: {
    alignItems: 'flex-end',
    gap: 4,
  },
  priceChip: {
    alignItems: 'flex-end',
  },
  priceChipWarranty: {},
  priceChipLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  priceChipValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#16a34a',
  },
  priceUom: {
    fontSize: 10,
    fontWeight: '400',
    color: Colors.textMuted,
  },
  productDesc: {
    marginTop: 8,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 18,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: 6,
  },

  // ── Service configs (card layout) ────────────────────────────────────────
  serviceCardsList: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: 40,
    gap: Spacing.sm,
  },
  serviceCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: 6,
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
  serviceUpdated: {
    fontSize: 10,
    color: Colors.textMuted,
  },

  // ── Product Catalog section ───────────────────────────────────────────────
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

  familyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
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
  familyCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  familyCardIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  familyCardMeta: {
    flex: 1,
    minWidth: 0,
  },
  familyCardTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  familyCardCount: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  familyCardChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
    gap: 6,
  },
  previewChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    maxWidth: 120,
  },
  previewChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  familyCardExpanded: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    marginTop: Spacing.sm,
    paddingVertical: 8,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  addProductBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  catalogProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  catalogProductRight: {
    alignItems: 'flex-end',
    gap: 5,
    flexShrink: 0,
  },
  viewDetailsBtn: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: Radius.md,
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  viewDetailsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2563eb',
  },
  catalogProductDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  catalogProductInfo: {
    flex: 1,
    minWidth: 0,
  },
  catalogProductName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  catalogProductKey: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 1,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  catalogProductPrice: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#16a34a',
    flexShrink: 0,
  },

  // ── Backup section ────────────────────────────────────────────────────────
  createBackupBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: Spacing.lg,
    paddingVertical: 13,
    borderRadius: Radius.lg,
    backgroundColor: '#3b82f6',
  },
  createBackupBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
  createBackupBtnSkeleton: {
    height: 46,
    margin: Spacing.lg,
    backgroundColor: SKELETON_BG,
    borderRadius: Radius.lg,
  },
  backupRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    gap: Spacing.md,
  },
  backupIconBox: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  backupInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  backupId: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  backupDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  backupStats: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 2,
  },
  backupStat: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  backupNote: {
    fontSize: 11,
    color: Colors.textMuted,
    fontStyle: 'italic',
    marginTop: 2,
  },
  restoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e9d5ff',
    backgroundColor: '#faf5ff',
    flexShrink: 0,
    marginTop: 2,
  },
  restoreBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7c3aed',
  },

  // ── Shared ────────────────────────────────────────────────────────────────
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
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
    paddingHorizontal: Spacing.xxxl,
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

  // Skeleton
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    gap: Spacing.md,
  },
  skeletonIcon: {
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    backgroundColor: SKELETON_BG,
    flexShrink: 0,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: SKELETON_BG,
    borderRadius: Radius.xs,
  },
});

// ─── Detail Modal Styles ──────────────────────────────────────────────────────

const detailStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: '#5b21b6',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 1,
  },
  closeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginLeft: Spacing.sm,
    flexShrink: 0,
  },
  closeBtnText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  subTabBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    maxHeight: 46,
  },
  subTabBarContent: {
    paddingHorizontal: Spacing.md,
    gap: 4,
    alignItems: 'center',
    paddingVertical: 6,
  },
  subTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  subTabActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary + '40',
  },
  subTabText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  subTabTextActive: {
    color: Colors.primary,
  },
  subTabBadge: {
    backgroundColor: '#e5e7eb',
    borderRadius: Radius.full,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
  },
  subTabBadgeActive: {
    backgroundColor: Colors.primary + '20',
  },
  subTabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
  },
  subTabBadgeTextActive: {
    color: Colors.primary,
  },
  fieldCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: 14,
    backgroundColor: Colors.surface,
    gap: Spacing.md,
  },
  fieldCardLeft: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  fieldCardRight: {
    flexShrink: 0,
    alignItems: 'flex-end',
  },
  fieldCardLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  fieldCardDesc: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 16,
  },
  fieldCardValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#16a34a',
    textAlign: 'right',
    maxWidth: 130,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  emptyFields: {
    alignItems: 'center',
    paddingVertical: 56,
    gap: Spacing.sm,
  },
  emptyFieldsText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: 4,
  },
});

// ─── Edit Modal Styles ────────────────────────────────────────────────────────

const editStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  closeBtn: {
    padding: 6,
    borderRadius: Radius.md,
    backgroundColor: '#f1f5f9',
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  required: {
    color: '#ef4444',
  },
  fieldHint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: -2,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  inputMultiline: {
    height: 80,
    paddingTop: 11,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  toggleInfo: {
    flex: 1,
    gap: 3,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cancelBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: Radius.lg,
    backgroundColor: '#2563eb',
  },
  saveBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
});

// ─── Add Product Modal Styles ─────────────────────────────────────────────────

const addStyles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
    borderRadius: Radius.md,
    backgroundColor: '#f1f5f9',
  },
  scroll: {flex: 1},
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  fieldGroup: {gap: 5},
  label: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  required: {color: '#ef4444'},
  hint: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  inputMultiline: {
    height: 80,
    paddingTop: 11,
  },
  pickerField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 11,
  },
  pickerText: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    flex: 1,
  },
  pickerPlaceholder: {
    color: Colors.textMuted,
  },
  pickerDropdown: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    marginTop: 4,
    overflow: 'hidden',
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  pickerOptionText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  pickerOptionActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: Radius.lg,
    backgroundColor: '#2563eb',
  },
  saveBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
});

// ─── Product Details Modal Styles ─────────────────────────────────────────────

const pdStyles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderLeftWidth: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
    minWidth: 0,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    padding: 6,
    borderRadius: Radius.md,
    backgroundColor: '#f1f5f9',
    marginLeft: Spacing.sm,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    gap: Spacing.md,
  },
  rowLabel: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    flex: 1,
  },
  rowValue: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: '55%',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.md,
  },
  value: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    textAlign: 'right',
  },
  monoValue: {
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'right',
  },
  displayBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  displayYes: {backgroundColor: '#d1fae5'},
  displayNo:  {backgroundColor: '#fee2e2'},
  displayBadgeText: {fontSize: 12, fontWeight: '700'},
  displayYesText: {color: '#065f46'},
  displayNoText:  {color: '#991b1b'},
  descLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 6,
  },
  descText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 22,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  closeFooterBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeFooterBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
