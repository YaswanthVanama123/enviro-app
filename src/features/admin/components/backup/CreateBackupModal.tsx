import React, {useState} from 'react';
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
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {pricingApi} from '../../../../services/api/endpoints/pricing.api';
import {bStyles} from './backup.styles';
import {Colors} from '../../../../theme/colors';

interface CreateBackupModalProps {
  onClose: () => void;
  onDone: () => void;
}

export function CreateBackupModal({onClose, onDone}: CreateBackupModalProps) {
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    setSaving(true);
    const ok = await pricingApi.createBackup(description.trim() || undefined);
    setSaving(false);
    if (ok) {
      onDone();
    } else {
      Alert.alert('Error', 'Failed to create backup. Please try again.');
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={bStyles.sheet}>
          <View style={bStyles.sheetHeader}>
            <Text style={bStyles.sheetTitle}>Create Backup</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={bStyles.sheetContent} showsVerticalScrollIndicator={false}>
            <View style={bStyles.infoBox}>
              <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
              <Text style={bStyles.infoBoxText}>
                Creates a snapshot of all current pricing data including service configs, product catalog, and pricing tables.
              </Text>
            </View>

            <View style={bStyles.field}>
              <Text style={bStyles.fieldLabel}>
                Description <Text style={bStyles.fieldOptional}>(optional)</Text>
              </Text>
              <TextInput
                style={[bStyles.input, bStyles.inputMulti]}
                value={description}
                onChangeText={setDescription}
                placeholder="e.g. Before Q2 pricing update"
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>

          <View style={bStyles.sheetFooter}>
            <TouchableOpacity style={bStyles.sheetCancelBtn} onPress={onClose}>
              <Text style={bStyles.sheetCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[bStyles.sheetSaveBtn, saving && {opacity: 0.6}]}
              onPress={handleCreate}
              disabled={saving}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="cloud-upload-outline" size={16} color="#fff" />}
              <Text style={bStyles.sheetSaveBtnText}>{saving ? 'Creating…' : 'Create Backup'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
