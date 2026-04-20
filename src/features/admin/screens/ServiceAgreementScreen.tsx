import React, {useState, useEffect, useCallback} from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {pricingApi, ServiceAgreementTemplate} from '../../../services/api/endpoints/pricing.api';
import {timeAgo} from '../utils/pricing.utils';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';

type AgreementTab = 'terms' | 'labels';

const TERM_LABELS = [
  'Property Ownership',
  'Promise of Good Service',
  'Payment Terms',
  'Indemnification',
  'Expiration / Termination',
  'Install Warranty & Scope of Service',
  'Sale of Customer Business',
] as const;

type LabelGroup = {
  title: string;
  icon: string;
  fields: {key: keyof ServiceAgreementTemplate; label: string; multiline?: boolean}[];
};

const LABEL_GROUPS: LabelGroup[] = [
  {
    title: 'Agreement Header',
    icon: 'document-outline',
    fields: [
      {key: 'titleText',    label: 'Title'},
      {key: 'subtitleText', label: 'Subtitle'},
    ],
  },
  {
    title: 'Dispenser Options',
    icon: 'cube-outline',
    fields: [
      {key: 'retainDispensersLabel',  label: 'Retain Dispensers Label'},
      {key: 'disposeDispensersLabel', label: 'Dispose Dispensers Label'},
    ],
  },
  {
    title: 'Representative Labels',
    icon: 'person-outline',
    fields: [
      {key: 'emSalesRepLabel',     label: 'EM Sales Rep'},
      {key: 'insideSalesRepLabel', label: 'Inside Sales Rep'},
    ],
  },
  {
    title: 'Customer Section',
    icon: 'people-outline',
    fields: [
      {key: 'authorityText',          label: 'Authority Statement', multiline: true},
      {key: 'customerContactLabel',   label: 'Customer Contact Label'},
      {key: 'customerSignatureLabel', label: 'Customer Signature Label'},
      {key: 'customerDateLabel',      label: 'Customer Date Label'},
    ],
  },
  {
    title: 'EM Section',
    icon: 'business-outline',
    fields: [
      {key: 'emFranchiseeLabel', label: 'EM Franchisee Label'},
      {key: 'emSignatureLabel',  label: 'EM Signature Label'},
      {key: 'emDateLabel',       label: 'EM Date Label'},
    ],
  },
  {
    title: 'Page Settings',
    icon: 'book-outline',
    fields: [
      {key: 'pageNumberText', label: 'Page Number Text'},
    ],
  },
];

export function ServiceAgreementScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState<AgreementTab>('terms');
  const [template, setTemplate] = useState<ServiceAgreementTemplate | null>(null);
  const [draft, setDraft] = useState<ServiceAgreementTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    pricingApi.getServiceAgreementTemplate().then(t => {
      setTemplate(t);
      setDraft(t ? {...t} : null);
      setLoading(false);
    });
  }, []);

  const isDirty = !!(draft && template && JSON.stringify(draft) !== JSON.stringify(template));

  const handleField = useCallback((key: keyof ServiceAgreementTemplate, value: string) => {
    setDraft(prev => prev ? {...prev, [key]: value} : prev);
  }, []);

  const handleSave = async () => {
    if (!draft) {return;}
    setSaving(true);
    const ok = await pricingApi.updateServiceAgreementTemplate(draft);
    setSaving(false);
    if (ok) {
      setTemplate({...draft});
      Alert.alert('Saved', 'Service agreement template updated successfully.');
    } else {
      Alert.alert('Error', 'Failed to save template. Please try again.');
    }
  };

  const handleDiscard = () => {
    Alert.alert(
      'Discard Changes',
      'Are you sure you want to discard all unsaved changes?',
      [
        {text: 'Cancel', style: 'cancel'},
        {text: 'Discard', style: 'destructive', onPress: () => setDraft(template ? {...template} : null)},
      ],
    );
  };

  if (loading) {
    return (
      <View style={[styles.screen, {paddingTop: insets.top}]}>
        <View style={styles.screenHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Ionicons name="reader-outline" size={18} color={Colors.primary} />
          <Text style={styles.screenTitle}>Service Agreement Template</Text>
        </View>
        <View style={styles.loadingBox}>
          {[1, 2, 3, 4].map(i => (
            <View key={i} style={styles.skeletonCard}>
              <View style={[styles.skeletonLine, {width: '45%', height: 11}]} />
              <View style={styles.skeletonLine} />
              <View style={[styles.skeletonLine, {height: 64}]} />
            </View>
          ))}
        </View>
      </View>
    );
  }

  if (!draft) {
    return (
      <View style={[styles.screen, {paddingTop: insets.top}]}>
        <View style={styles.screenHeader}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
            <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Ionicons name="reader-outline" size={18} color={Colors.primary} />
          <Text style={styles.screenTitle}>Service Agreement Template</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={44} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>Template unavailable</Text>
          <Text style={styles.emptySub}>Could not load the service agreement template.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.screen, {paddingTop: insets.top}]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

      <View style={styles.screenHeader}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
          <Ionicons name="chevron-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.screenHeaderLeft}>
          <Ionicons name="reader-outline" size={18} color={Colors.primary} />
          <Text style={styles.screenTitle}>Service Agreement Template</Text>
        </View>
        {template?.updatedAt && (
          <Text style={styles.lastSaved}>Saved {timeAgo(template.updatedAt)}</Text>
        )}
      </View>

      <View style={styles.tabBar}>
        {(['terms', 'labels'] as AgreementTab[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.7}>
            <Ionicons
              name={tab === 'terms' ? 'document-text-outline' : 'text-outline'}
              size={14}
              color={activeTab === tab ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'terms' ? 'Terms & Conditions' : 'Labels & Text'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={15} color="#2563eb" />
        <Text style={styles.infoBannerText}>
          {activeTab === 'terms'
            ? 'These terms appear in all service agreement PDFs'
            : 'These labels are used throughout the service agreement PDF'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">

        {activeTab === 'terms' ? (
          <>
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="list-outline" size={14} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Agreement Terms</Text>
              </View>
              {TERM_LABELS.map((label, i) => {
                const key = `term${i + 1}` as keyof ServiceAgreementTemplate;
                return (
                  <View key={key} style={[styles.termBlock, i < TERM_LABELS.length - 1 && styles.termBlockBorder]}>
                    <View style={styles.termLabelRow}>
                      <View style={styles.termBadge}>
                        <Text style={styles.termBadgeText}>{i + 1}</Text>
                      </View>
                      <Text style={styles.termLabel}>{label}</Text>
                    </View>
                    <TextInput
                      style={styles.termInput}
                      value={String(draft[key] ?? '')}
                      onChangeText={v => handleField(key, v)}
                      multiline
                      textAlignVertical="top"
                      placeholder={`Enter ${label} terms…`}
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                );
              })}
            </View>

            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name="create-outline" size={14} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Agreement Note</Text>
              </View>
              <View style={styles.sectionBody}>
                <TextInput
                  style={styles.termInput}
                  value={draft.noteText ?? ''}
                  onChangeText={v => handleField('noteText', v)}
                  multiline
                  textAlignVertical="top"
                  placeholder="Enter agreement note…"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>
          </>
        ) : (
          LABEL_GROUPS.map(group => (
            <View key={group.title} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Ionicons name={group.icon} size={14} color={Colors.primary} />
                <Text style={styles.sectionTitle}>{group.title}</Text>
              </View>
              <View style={styles.sectionBody}>
                {group.fields.map((field, fi) => (
                  <View key={String(field.key)} style={[styles.labelField, fi > 0 && styles.labelFieldBorder]}>
                    <Text style={styles.labelFieldLabel}>{field.label}</Text>
                    <TextInput
                      style={[styles.labelInput, field.multiline && styles.labelInputMulti]}
                      value={String(draft[field.key] ?? '')}
                      onChangeText={v => handleField(field.key, v)}
                      multiline={field.multiline}
                      textAlignVertical={field.multiline ? 'top' : 'center'}
                      placeholder={`Enter ${field.label.toLowerCase()}…`}
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))
        )}

        <View style={{height: Spacing.xl}} />
      </ScrollView>

      <View style={[styles.saveFooter, {paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.md}]}>
        <TouchableOpacity
          style={[styles.discardBtn, !isDirty && {opacity: 0.4}]}
          onPress={handleDiscard}
          disabled={!isDirty}>
          <Text style={styles.discardBtnText}>Discard</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveBtn, (!isDirty || saving) && {opacity: 0.5}]}
          onPress={handleSave}
          disabled={!isDirty || saving}>
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Ionicons name="checkmark" size={16} color="#fff" />}
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save Changes'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  screenHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  screenTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  lastSaved: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.primary,
  },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 8,
    backgroundColor: '#eff6ff',
    borderBottomWidth: 1,
    borderBottomColor: '#bfdbfe',
  },
  infoBannerText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: '#1e40af',
  },

  scrollContent: {
    padding: Spacing.md,
  },

  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    marginBottom: Spacing.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#f8fafc',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  sectionTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  sectionBody: {
    padding: Spacing.md,
    gap: Spacing.md,
  },

  termBlock: {
    gap: Spacing.xs,
    padding: Spacing.md,
  },
  termBlockBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  termLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  termBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  termBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: '#fff',
  },
  termLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    flex: 1,
  },
  termInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    minHeight: 88,
    lineHeight: 20,
  },

  labelField: {
    gap: 5,
    paddingVertical: Spacing.sm,
  },
  labelFieldBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  labelFieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  labelInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  labelInputMulti: {
    minHeight: 70,
    textAlignVertical: 'top',
    paddingTop: 10,
  },

  saveFooter: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  discardBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  discardBtnText: {
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
    paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },

  loadingBox: {
    flex: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  skeletonCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  skeletonLine: {
    width: '100%',
    height: 13,
    backgroundColor: '#e5e7eb',
    borderRadius: 4,
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  emptySub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
