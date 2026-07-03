import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';
import {emailApi, type EmailDocumentType} from '../../../services/api/endpoints/email.api';
import {emailTemplateApi} from '../../../services/api/endpoints/emailTemplate.api';

interface Props {
  visible: boolean;
  documentId: string;
  documentType?: EmailDocumentType;
  fileName?: string;
  defaultTo?: string;
  onClose: () => void;
  onSent?: () => void;
}

export function EmailComposerModal({
  visible,
  documentId,
  documentType = 'auto-detect',
  fileName,
  defaultTo = '',
  onClose,
  onSent,
}: Props) {
  const [to, setTo] = useState(defaultTo);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [templateLoaded, setTemplateLoaded] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setError(null);
    setSuccess(false);
    setTo(defaultTo);
    if (templateLoaded) return;
    emailTemplateApi
      .getActiveTemplate()
      .then(t => {
        if (t) {
          setSubject(prev => prev || t.subject);
          setBody(prev => prev || t.body);
        }
        setTemplateLoaded(true);
      })
      .catch(() => setTemplateLoaded(true));
  }, [visible, defaultTo, templateLoaded]);

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());

  const handleSend = async () => {
    setError(null);
    if (!isValidEmail(to)) {
      setError('Enter a valid recipient email address');
      return;
    }
    if (!subject.trim()) {
      setError('Subject cannot be empty');
      return;
    }
    setSending(true);
    try {
      const res = await emailApi.sendWithPdf({
        to: to.trim(),
        subject,
        body,
        documentId,
        documentType,
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onSent?.();
          onClose();
        }, 1200);
      } else {
        setError(res.message || 'Failed to send email');
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.center}>
          <View style={styles.modal}>
            <View style={styles.header}>
              <Ionicons name="mail-outline" size={18} color={Colors.primary} />
              <Text style={styles.title}>Send Email</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.bodyContent} keyboardShouldPersistTaps="handled">
              {fileName ? (
                <View style={styles.attachRow}>
                  <Ionicons name="document-attach-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.attachText} numberOfLines={1}>{fileName} (PDF attached automatically)</Text>
                </View>
              ) : null}

              <Text style={styles.label}>To *</Text>
              <TextInput
                style={styles.input}
                value={to}
                onChangeText={setTo}
                placeholder="recipient@example.com"
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Subject *</Text>
              <TextInput
                style={styles.input}
                value={subject}
                onChangeText={setSubject}
                placeholder="Email subject"
                placeholderTextColor="#9ca3af"
              />

              <Text style={styles.label}>Message</Text>
              <TextInput
                style={[styles.input, styles.bodyInput]}
                value={body}
                onChangeText={setBody}
                placeholder="Email body"
                placeholderTextColor="#9ca3af"
                multiline
                textAlignVertical="top"
              />

              {error && <Text style={styles.error}>{error}</Text>}
              {success && (
                <View style={styles.successRow}>
                  <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                  <Text style={styles.successText}>Email sent</Text>
                </View>
              )}
            </ScrollView>

            <View style={styles.actions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={sending}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sendBtn} onPress={handleSend} disabled={sending}>
                {sending ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="send" size={15} color="#fff" />
                    <Text style={styles.sendBtnText}>Send</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)'},
  center: {flex: 1, justifyContent: 'center', padding: Spacing.lg},
  modal: {backgroundColor: '#fff', borderRadius: Radius.xl, overflow: 'hidden', maxHeight: '88%'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {flex: 1, fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary},
  bodyContent: {padding: Spacing.lg},
  attachRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  attachText: {flex: 1, fontSize: FontSize.xs, color: Colors.textSecondary},
  label: {fontSize: FontSize.sm, fontWeight: '600', color: '#374151', marginTop: Spacing.sm, marginBottom: 4},
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  bodyInput: {minHeight: 140},
  error: {marginTop: Spacing.md, color: '#dc2626', fontSize: FontSize.sm},
  successRow: {flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.md},
  successText: {color: '#16a34a', fontSize: FontSize.sm, fontWeight: '600'},
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cancelBtn: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: '#f1f5f9'},
  cancelBtnText: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary},
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    minWidth: 96,
    justifyContent: 'center',
  },
  sendBtnText: {fontSize: FontSize.sm, fontWeight: '700', color: '#fff'},
});

export default EmailComposerModal;
