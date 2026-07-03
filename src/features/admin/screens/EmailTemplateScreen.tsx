import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';
import {emailTemplateApi, type EmailTemplate} from '../../../services/api/endpoints/emailTemplate.api';

const TIPS = [
  'Keep the message professional and concise',
  'Salesmen can customize this template before sending',
  'The PDF attachment will be added automatically',
  'Changes take effect immediately for all users',
];

export function EmailTemplateScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);

  const [original, setOriginal] = useState<EmailTemplate | null>(null);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const t = await emailTemplateApi.getActiveTemplate();
      if (t) {
        setOriginal(t);
        setSubject(t.subject);
        setBody(t.body);
      } else {
        setError('Failed to load email template');
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to load email template');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const hasChanges = !!original && (subject !== original.subject || body !== original.body);

  const handleDiscard = () => {
    if (original) {
      setSubject(original.subject);
      setBody(original.body);
    }
  };

  const handleSave = async () => {
    setError(null);
    if (!subject.trim()) {
      setError('Subject cannot be empty');
      return;
    }
    if (!body.trim()) {
      setError('Body cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const res = await emailTemplateApi.updateTemplate(subject, body);
      if (res.ok && res.template) {
        setOriginal(res.template);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 3000);
      } else {
        setError(res.message || 'Failed to save email template');
      }
    } finally {
      setSaving(false);
    }
  };

  const lastUpdated = original?.updatedAt
    ? new Date(original.updatedAt).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Email Template</Text>
        <View style={styles.headerRight} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading email template…</Text>
        </View>
      ) : (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.infoBanner}>
              <Ionicons name="information-circle-outline" size={18} color="#0369a1" />
              <Text style={styles.infoBannerText}>
                This template is used as the default for all email communications.
              </Text>
            </View>

            {error && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}
            {showSuccess && (
              <View style={styles.successBanner}>
                <Ionicons name="checkmark-circle-outline" size={18} color="#16a34a" />
                <Text style={styles.successBannerText}>Email template saved successfully!</Text>
              </View>
            )}

            <Text style={styles.label}>Email Subject</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="Enter email subject..."
              placeholderTextColor="#9ca3af"
            />
            <Text style={styles.hint}>This subject will be pre-filled when sending emails.</Text>

            <Text style={[styles.label, {marginTop: Spacing.lg}]}>Email Body</Text>
            <TextInput
              style={[styles.input, styles.bodyInput]}
              value={body}
              onChangeText={setBody}
              placeholder="Enter email body..."
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
            />
            <Text style={styles.hint}>
              This message will be pre-filled when sending emails. Salesmen can edit it before sending.
            </Text>

            <View style={styles.tipsBox}>
              <Text style={styles.tipsTitle}>Template Tips</Text>
              {TIPS.map((tip, i) => (
                <View key={i} style={styles.tipRow}>
                  <Text style={styles.tipDot}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </View>

            {lastUpdated && <Text style={styles.lastUpdated}>Last updated: {lastUpdated}</Text>}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.discardBtn, (!hasChanges || saving) && styles.btnDisabled]}
                onPress={handleDiscard}
                disabled={!hasChanges || saving}>
                <Ionicons name="arrow-undo-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.discardBtnText}>Discard</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, (!hasChanges || saving) && styles.btnDisabled]}
                onPress={handleSave}
                disabled={!hasChanges || saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="save-outline" size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Template</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {!hasChanges && !saving && <Text style={styles.noChanges}>No unsaved changes</Text>}
            <View style={{height: 40}} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f9fafb'},
  flex: {flex: 1},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {padding: Spacing.xs},
  headerTitle: {flex: 1, fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center'},
  headerRight: {width: 40},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md},
  loadingText: {fontSize: FontSize.md, color: Colors.textMuted},
  scroll: {flex: 1},
  scrollContent: {padding: Spacing.lg},
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  infoBannerText: {flex: 1, fontSize: FontSize.sm, color: '#0369a1', lineHeight: 20},
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  errorBannerText: {flex: 1, fontSize: FontSize.sm, color: '#dc2626'},
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  successBannerText: {flex: 1, fontSize: FontSize.sm, color: '#16a34a', fontWeight: '600'},
  label: {fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary, marginBottom: 6},
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  bodyInput: {minHeight: 200},
  hint: {fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 4},
  tipsBox: {
    marginTop: Spacing.lg,
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  tipsTitle: {fontSize: FontSize.sm, fontWeight: '700', color: '#92400e', marginBottom: Spacing.sm},
  tipRow: {flexDirection: 'row', gap: 6, marginBottom: 4},
  tipDot: {color: '#92400e', fontSize: FontSize.sm},
  tipText: {flex: 1, fontSize: FontSize.sm, color: '#92400e', lineHeight: 18},
  lastUpdated: {fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.lg, textAlign: 'center'},
  actions: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg},
  discardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  discardBtnText: {fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary},
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
  },
  saveBtnText: {fontSize: FontSize.sm, fontWeight: '700', color: '#fff'},
  btnDisabled: {opacity: 0.5},
  noChanges: {fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center', marginTop: Spacing.sm},
});

export default EmailTemplateScreen;
