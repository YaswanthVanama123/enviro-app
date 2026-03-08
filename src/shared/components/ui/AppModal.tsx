/**
 * AppModal — reusable modal components matching the webapp dialog style.
 *
 * Usage:
 *   <ConfirmModal
 *     visible={showDelete}
 *     icon="trash-outline"
 *     iconColor="#ef4444"
 *     iconBg="#fef2f2"
 *     title="Move to Trash"
 *     subtitle='Move "Agreement name" to trash?'
 *     confirmLabel="Move to Trash"
 *     confirmColor="#ef4444"
 *     onConfirm={handleDelete}
 *     onCancel={() => setShowDelete(false)}
 *   />
 *
 *   <InfoModal
 *     visible={showInfo}
 *     icon="checkmark-circle"
 *     iconColor="#16a34a"
 *     iconBg="#f0fdf4"
 *     title="Success"
 *     subtitle="Status updated successfully."
 *     onClose={() => setShowInfo(false)}
 *   />
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors, Spacing, Radius, FontSize} from '../../../theme';

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

export interface ConfirmModalProps {
  visible: boolean;
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  confirmLabel?: string;
  confirmColor?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

export function ConfirmModal({
  visible,
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  confirmLabel = 'Confirm',
  confirmColor = Colors.primary,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  loading,
}: ConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Icon */}
          <View style={[styles.iconCircle, {backgroundColor: iconBg}]}>
            <Ionicons name={icon} size={28} color={iconColor} />
          </View>

          {/* Text */}
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.cancelBtn]}
              onPress={onCancel}
              disabled={loading}>
              <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.confirmBtn, {backgroundColor: confirmColor}, loading && {opacity: 0.6}]}
              onPress={onConfirm}
              disabled={loading}>
              <Text style={styles.confirmBtnText}>{loading ? '...' : confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── InfoModal ────────────────────────────────────────────────────────────────

export interface InfoModalProps {
  visible: boolean;
  icon: string;
  iconColor: string;
  iconBg: string;
  title: string;
  subtitle?: string;
  closeLabel?: string;
  onClose: () => void;
  action?: {label: string; onPress: () => void; color?: string};
}

export function InfoModal({
  visible,
  icon,
  iconColor,
  iconBg,
  title,
  subtitle,
  closeLabel = 'OK',
  onClose,
  action,
}: InfoModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, {backgroundColor: iconBg}]}>
            <Ionicons name={icon} size={28} color={iconColor} />
          </View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          <View style={styles.btnRow}>
            {action && (
              <TouchableOpacity
                style={[styles.btn, styles.confirmBtn, {backgroundColor: action.color ?? Colors.primary}]}
                onPress={() => {action.onPress(); onClose();}}>
                <Text style={styles.confirmBtnText}>{action.label}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.btn, action ? styles.cancelBtn : styles.confirmBtn, !action && {backgroundColor: Colors.primary}]}
              onPress={onClose}>
              <Text style={action ? styles.cancelBtnText : styles.confirmBtnText}>{closeLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── OptionsModal ─────────────────────────────────────────────────────────────

export interface ModalOption {
  label: string;
  icon?: string;
  iconColor?: string;
  color?: string;
  onPress: () => void;
  destructive?: boolean;
}

export interface OptionsModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  options: ModalOption[];
  onCancel: () => void;
}

export function OptionsModal({
  visible,
  title,
  subtitle,
  options,
  onCancel,
}: OptionsModalProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.sheetOverlay}>
        <TouchableOpacity style={styles.sheetBg} activeOpacity={1} onPress={onCancel} />
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.sheetHandle} />

          {/* Header */}
          <Text style={styles.sheetTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sheetSubtitle}>{subtitle}</Text> : null}

          {/* Options */}
          <ScrollView style={styles.sheetOptions} showsVerticalScrollIndicator={false}>
            {options.map((opt, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.sheetOption,
                  idx < options.length - 1 && styles.sheetOptionBorder,
                ]}
                onPress={() => {opt.onPress(); onCancel();}}>
                {opt.icon && (
                  <View style={[
                    styles.sheetOptionIcon,
                    {backgroundColor: opt.destructive ? '#fef2f2' : '#f8fafc'},
                  ]}>
                    <Ionicons
                      name={opt.icon}
                      size={18}
                      color={opt.destructive ? '#ef4444' : (opt.iconColor ?? Colors.textSecondary)}
                    />
                  </View>
                )}
                <Text style={[
                  styles.sheetOptionText,
                  {color: opt.destructive ? '#ef4444' : (opt.color ?? Colors.textPrimary)},
                ]}>
                  {opt.label}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Cancel */}
          <TouchableOpacity style={styles.sheetCancel} onPress={onCancel}>
            <Text style={styles.sheetCancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ConfirmModal / InfoModal
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.sm,
  },
  btnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    width: '100%',
    marginTop: Spacing.md,
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cancelBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  confirmBtn: {
    backgroundColor: Colors.primary,
  },
  confirmBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },

  // OptionsModal (bottom sheet)
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: Spacing.md,
  },
  sheetTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    paddingHorizontal: Spacing.xl,
  },
  sheetSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.xl,
  },
  sheetOptions: {
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 16,
    gap: Spacing.md,
  },
  sheetOptionBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  sheetOptionIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetOptionText: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '500',
  },
  sheetCancel: {
    marginHorizontal: Spacing.xl,
    marginTop: Spacing.md,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  sheetCancelText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
});
