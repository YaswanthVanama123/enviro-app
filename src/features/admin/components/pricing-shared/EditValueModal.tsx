import React from 'react';
import {
  View, Text, Modal, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

interface EditValueModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  fieldLabel: string;
  prefix?: string;
  value: string;
  onChangeValue: (v: string) => void;
  saving: boolean;
  error?: string;
  success: boolean;
  successText?: string;
  onCancel: () => void;
  onSave: () => void;
}

export function EditValueModal({
  visible,
  title,
  subtitle,
  fieldLabel,
  prefix = '$',
  value,
  onChangeValue,
  saving,
  error,
  success,
  successText = 'Price updated!',
  onCancel,
  onSave,
}: EditValueModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => !saving && onCancel()}>
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={() => !saving && onCancel()}>
        <TouchableOpacity activeOpacity={1} style={styles.card} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.headerIconBox}>
              <Ionicons name="pencil" size={16} color="#1d4ed8" />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? (
                <Text style={styles.sub} numberOfLines={1}>{subtitle}</Text>
              ) : null}
            </View>
            {!saving && (
              <TouchableOpacity onPress={onCancel} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Ionicons name="close" size={20} color="#9ca3af" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.body}>
            {success ? (
              <View style={styles.successBox}>
                <Ionicons name="checkmark-circle" size={36} color="#16a34a" />
                <Text style={styles.successText}>{successText}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.label}>{fieldLabel}</Text>
                <View style={styles.inputRow}>
                  {prefix ? <Text style={styles.currencySign}>{prefix}</Text> : null}
                  <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeValue}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor="#9ca3af"
                    autoFocus
                    selectTextOnFocus
                  />
                </View>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={onCancel}
                    disabled={saving}>
                    <Text style={styles.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.saveBtn, saving && {opacity: 0.6}]}
                    onPress={onSave}
                    disabled={saving}>
                    {saving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.saveBtnText}>Save</Text>}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
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
