import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {pricingApi, ServiceConfig} from '../../../../services/api/endpoints/pricing.api';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

interface Props {
  visible: boolean;
  config: ServiceConfig | null;
  onClose: () => void;
  onSaved: (updated: ServiceConfig) => void;
}

const SUPPLY_ITEMS = [
  {key: 'vacuums',          label: 'Vacuums',           defaultAmount: 100},
  {key: 'mops',             label: 'Mops',              defaultAmount: 500},
  {key: 'mopBuckets',       label: 'Mop Buckets',       defaultAmount: 200},
  {key: 'dustMops',         label: 'Dust Mops',         defaultAmount: 300},
  {key: 'microfiber',       label: 'Microfiber',        defaultAmount: 0},
  {key: 'cleaningProducts', label: 'Cleaning Products', defaultAmount: 0},
  {key: 'consumables',      label: 'Consumables',       defaultAmount: 0},
  {key: 'miscellaneous',    label: 'Miscellaneous',     defaultAmount: 0},
];

function placeTypeLabel(key: string): string {
  return key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
}

type TabKey = 'production' | 'labor' | 'supplies';

export function EditJanitorialConfigModal({visible, config, onClose, onSaved}: Props) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabKey>('production');
  const [saving, setSaving] = useState(false);

  // Production rates — loaded from backend only
  const [productionRates, setProductionRates] = useState<Record<string, string>>({});

  // Labor defaults
  const [costPerHour, setCostPerHour] = useState('20');
  const [laborTaxPct, setLaborTaxPct] = useState('15');
  const [grossProfitPct, setGrossProfitPct] = useState('33');

  // Default supply amounts
  const [supplies, setSupplies] = useState<Record<string, string>>(() =>
    Object.fromEntries(SUPPLY_ITEMS.map(s => [s.key, String(s.defaultAmount)])),
  );

  useEffect(() => {
    if (!config || !visible) {return;}
    const cfg = config.config ?? {};

    // Production rates — from backend only
    const pr = cfg.productionRates ?? {};
    setProductionRates(
      Object.fromEntries(Object.entries(pr).map(([k, v]) => [k, String(v)])),
    );

    // Labor
    setCostPerHour(String(cfg.costPerHour    ?? 20));
    setLaborTaxPct(String(cfg.laborTaxPct    ?? 15));
    setGrossProfitPct(String(cfg.grossProfitPct ?? 33));

    // Supplies
    const adminSupplies = cfg.defaultSupplies ?? {};
    setSupplies(
      Object.fromEntries(
        SUPPLY_ITEMS.map(s => [s.key, String(adminSupplies[s.key] ?? s.defaultAmount)]),
      ),
    );
  }, [config, visible]);

  const buildPricingConfig = useCallback(() => {
    const existingCfg = config?.config ?? {};
    return {
      ...existingCfg,
      productionRates: Object.fromEntries(
        Object.entries(productionRates).map(([k, v]) => [k, parseFloat(v) || 0]),
      ),
      costPerHour:    parseFloat(costPerHour)    || 20,
      laborTaxPct:    parseFloat(laborTaxPct)    || 15,
      grossProfitPct: parseFloat(grossProfitPct) || 33,
      defaultSupplies: Object.fromEntries(
        SUPPLY_ITEMS.map(s => [s.key, parseFloat(supplies[s.key]) || 0]),
      ),
    };
  }, [config, productionRates, costPerHour, laborTaxPct, grossProfitPct, supplies]);

  const handleSave = useCallback(async () => {
    if (!config) {return;}
    setSaving(true);
    const pricingConfig = buildPricingConfig();
    const result = await pricingApi.updateServiceConfigPricing(config._id, pricingConfig);
    setSaving(false);
    if (result.ok) {
      onSaved({...config, config: pricingConfig});
      onClose();
    } else {
      Alert.alert('Save Failed', result.error ?? 'Unknown error. Please try again.');
    }
  }, [config, buildPricingConfig, onSaved, onClose]);

  if (!config) {return null;}

  const tabs: {key: TabKey; label: string; icon: string}[] = [
    {key: 'production', label: 'Production Rates', icon: 'speedometer-outline'},
    {key: 'labor',      label: 'Labor Defaults',   icon: 'cash-outline'},
    {key: 'supplies',   label: 'Supply Defaults',  icon: 'cart-outline'},
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={[styles.screen, {paddingTop: insets.top}]}>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="briefcase-outline" size={20} color="#059669" />
              <View>
                <Text style={styles.headerTitle}>Janitorial Pricing Config</Text>
                <Text style={styles.headerSub} numberOfLines={1}>{config.label}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Tab bar */}
          <View style={styles.tabBar}>
            {tabs.map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}>
                <Ionicons
                  name={tab.icon}
                  size={14}
                  color={activeTab === tab.key ? Colors.primary : Colors.textMuted}
                />
                <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={[styles.scrollContent, {paddingBottom: insets.bottom + 100}]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>

            {/* Production Rates Tab */}
            {activeTab === 'production' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionTitle}>Production Rates</Text>
                <Text style={styles.sectionHint}>
                  How many square feet one worker cleans per hour.{'\n'}
                  Hours Per Visit = Square Feet ÷ Production Rate
                </Text>
                {Object.keys(productionRates).map(key => (
                  <View key={key} style={styles.fieldGroup}>
                    <View style={styles.fieldLabelRow}>
                      <Text style={styles.fieldLabel}>{placeTypeLabel(key)}</Text>
                    </View>
                    <View style={styles.inputRow}>
                      <TextInput
                        style={styles.input}
                        value={productionRates[key]}
                        onChangeText={v => setProductionRates(prev => ({...prev, [key]: v}))}
                        keyboardType="numeric"
                        returnKeyType="done"
                        placeholderTextColor={Colors.textMuted}
                      />
                      <Text style={styles.inputSuffix}>sq ft/hr</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Labor Defaults Tab */}
            {activeTab === 'labor' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionTitle}>Labor Defaults</Text>
                <Text style={styles.sectionHint}>
                  Admin-configured baseline values. Salespeople can override per quote.
                </Text>

                <View style={styles.fieldGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldLabel}>Cost Per Labor Hour</Text>
                    <Text style={styles.fieldHint}>Default: $20/hr</Text>
                  </View>
                  <View style={styles.inputRow}>
                    <Text style={styles.inputPrefix}>$</Text>
                    <TextInput
                      style={styles.input}
                      value={costPerHour}
                      onChangeText={setCostPerHour}
                      keyboardType="numeric"
                      returnKeyType="done"
                      placeholder="20"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <Text style={styles.inputSuffix}>/hr</Text>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldLabel}>Labor Tax %</Text>
                    <Text style={styles.fieldHint}>Default: 15%</Text>
                  </View>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={laborTaxPct}
                      onChangeText={setLaborTaxPct}
                      keyboardType="numeric"
                      returnKeyType="done"
                      placeholder="15"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <Text style={styles.inputSuffix}>%</Text>
                  </View>
                </View>

                <View style={styles.fieldGroup}>
                  <View style={styles.fieldLabelRow}>
                    <Text style={styles.fieldLabel}>Gross Profit %</Text>
                    <Text style={styles.fieldHint}>Default: 33%</Text>
                  </View>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.input}
                      value={grossProfitPct}
                      onChangeText={setGrossProfitPct}
                      keyboardType="numeric"
                      returnKeyType="done"
                      placeholder="33"
                      placeholderTextColor={Colors.textMuted}
                    />
                    <Text style={styles.inputSuffix}>%</Text>
                  </View>
                  <Text style={styles.calcNote}>
                    Contract Value = Total Cost ÷ (1 − Gross Profit%)
                  </Text>
                </View>
              </View>
            )}

            {/* Supplies Tab */}
            {activeTab === 'supplies' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionTitle}>Default Supply Line Items</Text>
                <Text style={styles.sectionHint}>
                  Annual supply costs pre-filled when creating a new quote.{'\n'}
                  Salespeople can edit them per quote.
                </Text>
                {SUPPLY_ITEMS.map(item => (
                  <View key={item.key} style={styles.supplyRow}>
                    <View style={styles.supplyNameCol}>
                      <Text style={styles.supplyName}>{item.label}</Text>
                      <Text style={styles.fieldHint}>Default: ${item.defaultAmount}/yr</Text>
                    </View>
                    <View style={styles.supplyInputRow}>
                      <Text style={styles.inputPrefix}>$</Text>
                      <TextInput
                        style={[styles.input, styles.supplyInput]}
                        value={supplies[item.key]}
                        onChangeText={v => setSupplies(prev => ({...prev, [item.key]: v}))}
                        keyboardType="numeric"
                        returnKeyType="done"
                        placeholder="0"
                        placeholderTextColor={Colors.textMuted}
                      />
                      <Text style={styles.inputSuffix}>/yr</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, {paddingBottom: Math.max(insets.bottom, Spacing.lg)}]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={saving}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, saving && {opacity: 0.6}]}
              onPress={handleSave}
              disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="checkmark" size={16} color="#fff" />}
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Pricing'}</Text>
            </TouchableOpacity>
          </View>

        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerLeft: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1, minWidth: 0},
  headerTitle: {fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary},
  headerSub: {fontSize: FontSize.xs, color: Colors.textMuted},
  closeBtn: {padding: 6, borderRadius: Radius.md, backgroundColor: '#f1f5f9'},
  tabBar: {
    flexDirection: 'row', backgroundColor: Colors.surface,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 4, paddingVertical: 11, borderBottomWidth: 2, borderBottomColor: 'transparent',
  },
  tabActive: {borderBottomColor: Colors.primary},
  tabText: {fontSize: 11, fontWeight: '600', color: Colors.textMuted},
  tabTextActive: {color: Colors.primary},
  scroll: {flex: 1},
  scrollContent: {paddingHorizontal: Spacing.lg, paddingTop: Spacing.lg, gap: Spacing.md},
  tabContent: {gap: Spacing.md},
  sectionTitle: {fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary},
  sectionHint: {fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 18, marginTop: -4},
  fieldGroup: {gap: 6},
  fieldLabelRow: {flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  fieldLabel: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary},
  fieldHint: {fontSize: FontSize.xs, color: Colors.textMuted},
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.xs,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 11,
  },
  inputPrefix: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary},
  inputSuffix: {fontSize: FontSize.sm, color: Colors.textMuted, flexShrink: 0},
  input: {flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, padding: 0},
  calcNote: {
    fontSize: FontSize.xs, color: '#2563eb', fontStyle: 'italic',
    paddingHorizontal: 2,
  },
  supplyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    gap: Spacing.md, paddingVertical: Spacing.xs,
    borderBottomWidth: 1, borderBottomColor: Colors.borderLight,
  },
  supplyNameCol: {flex: 1, gap: 2},
  supplyName: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary},
  supplyInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: 8,
    minWidth: 110,
  },
  supplyInput: {width: 60, flexShrink: 1},
  footer: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md,
    backgroundColor: Colors.surface, borderTopWidth: 1, borderTopColor: Colors.border,
  },
  cancelBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 13, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface,
  },
  cancelBtnText: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary},
  saveBtn: {
    flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: Radius.lg, backgroundColor: '#059669',
  },
  saveBtnText: {fontSize: FontSize.sm, fontWeight: '700', color: '#fff'},
});
