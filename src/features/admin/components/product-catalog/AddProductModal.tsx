import React, {useState, useCallback, useEffect} from 'react';
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
import {pricingApi} from '../../../../services/api/endpoints/pricing.api';
import {PickerField} from './PickerField';
import {KIND_OPTIONS, UOM_OPTIONS, BILLING_OPTIONS} from '../../utils/pricing.utils';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

interface AddProductModalProps {
  visible: boolean;
  familyKey: string;
  familyLabel: string;
  onClose: () => void;
  onAdded: () => void;
}

export function AddProductModal({
  visible,
  familyKey,
  familyLabel,
  onClose,
  onAdded,
}: AddProductModalProps) {
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

            <View style={addStyles.fieldGroup}>
              <Text style={addStyles.label}>Kind</Text>
              <PickerField
                placeholder="Select kind…"
                value={kind}
                options={KIND_OPTIONS}
                onSelect={setKind}
              />
            </View>

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
