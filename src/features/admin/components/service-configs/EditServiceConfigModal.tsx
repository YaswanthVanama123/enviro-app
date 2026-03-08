import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  Switch,
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

interface EditServiceConfigModalProps {
  visible: boolean;
  config: ServiceConfig | null;
  onClose: () => void;
  onSaved: (updated: ServiceConfig) => void;
}

export function EditServiceConfigModal({
  visible,
  config,
  onClose,
  onSaved,
}: EditServiceConfigModalProps) {
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
