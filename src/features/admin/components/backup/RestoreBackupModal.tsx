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
import {pricingApi, PricingBackup} from '../../../../services/api/endpoints/pricing.api';
import {getTriggerLabel, getTriggerColor, formatDate} from '../../utils/pricing.utils';
import {bStyles} from './backup.styles';
import {Colors} from '../../../../theme/colors';

interface RestoreBackupModalProps {
  backup: PricingBackup;
  onClose: () => void;
  onDone: () => void;
}

export function RestoreBackupModal({backup, onClose, onDone}: RestoreBackupModalProps) {
  const [confirmText, setConfirmText] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const canRestore = confirmText.trim().toUpperCase() === 'RESTORE';
  const counts = backup.snapshotMetadata?.documentCounts;

  const handleRestore = async () => {
    if (!canRestore) {return;}
    setSaving(true);
    const ok = await pricingApi.restoreBackup(backup.changeDayId, notes.trim() || undefined);
    setSaving(false);
    if (ok) {
      Alert.alert('Restored', `Pricing data restored to ${backup.changeDay || backup.changeDayId}.`);
      onDone();
    } else {
      Alert.alert('Error', 'Failed to restore backup. Please try again.');
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{flex: 1}} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={bStyles.sheet}>
          <View style={bStyles.sheetHeader}>
            <Text style={bStyles.sheetTitle}>Restore Backup</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={bStyles.sheetContent} showsVerticalScrollIndicator={false}>
            <View style={bStyles.warningBox}>
              <Ionicons name="warning" size={18} color="#d97706" />
              <Text style={bStyles.warningBoxText}>
                This will overwrite ALL current pricing data. This action cannot be undone.
              </Text>
            </View>

            <View style={bStyles.sectionBox}>
              <Text style={bStyles.boxTitle}>Backup to Restore</Text>
              <View style={bStyles.infoRow}>
                <Text style={bStyles.infoRowLabel}>Change Day</Text>
                <Text style={bStyles.infoRowValue}>{backup.changeDay || backup.changeDayId}</Text>
              </View>
              <View style={bStyles.infoRow}>
                <Text style={bStyles.infoRowLabel}>Created</Text>
                <Text style={bStyles.infoRowValue}>{formatDate(backup.createdAt)}</Text>
              </View>
              {backup.backupTrigger && (
                <View style={bStyles.infoRow}>
                  <Text style={bStyles.infoRowLabel}>Trigger</Text>
                  <Text style={[bStyles.infoRowValue, {color: getTriggerColor(backup.backupTrigger)}]}>
                    {getTriggerLabel(backup.backupTrigger)}
                  </Text>
                </View>
              )}
              {counts && (
                <View style={bStyles.infoRow}>
                  <Text style={bStyles.infoRowLabel}>Contents</Text>
                  <Text style={bStyles.infoRowValue}>
                    {[
                      counts.priceFixCount ? `${counts.priceFixCount} PriceFix` : null,
                      counts.productCatalogCount ? `${counts.productCatalogCount} Products` : null,
                      counts.serviceConfigCount ? `${counts.serviceConfigCount} Services` : null,
                    ].filter(Boolean).join(', ') || '—'}
                  </Text>
                </View>
              )}
            </View>

            <View style={bStyles.field}>
              <Text style={bStyles.fieldLabel}>Type RESTORE to confirm</Text>
              <TextInput
                style={[bStyles.input, canRestore && {borderColor: '#16a34a'}]}
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder="RESTORE"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="characters"
              />
            </View>

            <View style={bStyles.field}>
              <Text style={bStyles.fieldLabel}>
                Notes <Text style={bStyles.fieldOptional}>(optional)</Text>
              </Text>
              <TextInput
                style={[bStyles.input, bStyles.inputMulti]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Reason for restoring..."
                placeholderTextColor={Colors.textMuted}
                multiline
                numberOfLines={2}
              />
            </View>
          </ScrollView>

          <View style={bStyles.sheetFooter}>
            <TouchableOpacity style={bStyles.sheetCancelBtn} onPress={onClose}>
              <Text style={bStyles.sheetCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[bStyles.sheetSaveBtn, {backgroundColor: canRestore ? '#7c3aed' : '#d1d5db'}, saving && {opacity: 0.6}]}
              onPress={handleRestore}
              disabled={!canRestore || saving}>
              {saving
                ? <ActivityIndicator size="small" color="#fff" />
                : <Ionicons name="refresh-outline" size={16} color="#fff" />}
              <Text style={bStyles.sheetSaveBtnText}>{saving ? 'Restoring…' : 'Restore'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
