import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  zohoApi,
  ZohoUploadStatus,
  ZohoCompany,
} from '../../../services/api/endpoints/agreements.api';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';

// ─── Props ────────────────────────────────────────────────────────────────────

interface BiginUploadModalProps {
  visible: boolean;
  agreementId: string;
  agreementTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── BiginUploadModal ─────────────────────────────────────────────────────────

export function BiginUploadModal({
  visible,
  agreementId,
  agreementTitle,
  onClose,
  onSuccess,
}: BiginUploadModalProps) {
  type Step = 'loading' | 'first-time' | 'update' | 'submitting' | 'done' | 'error';

  const [step, setStep] = useState<Step>('loading');
  const [status, setStatus] = useState<ZohoUploadStatus | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // First-time fields
  const [companies, setCompanies] = useState<ZohoCompany[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<ZohoCompany | null>(null);
  const [dealName, setDealName] = useState('');

  // Shared field
  const [noteText, setNoteText] = useState('');

  // Reset when opened
  useEffect(() => {
    if (!visible) {return;}
    setStep('loading');
    setStatus(null);
    setErrorMsg('');
    setSelectedCompany(null);
    setDealName('');
    setNoteText('');
    setCompanySearch('');
    setCompanies([]);

    zohoApi.getStatus(agreementId).then(s => {
      if (!s) {
        setErrorMsg('Could not check Bigin status. Please try again.');
        setStep('error');
        return;
      }
      setStatus(s);
      setStep(s.isFirstTime ? 'first-time' : 'update');
    });
  }, [visible, agreementId]);

  // Load companies when search changes (first-time flow)
  useEffect(() => {
    if (step !== 'first-time') {return;}
    setLoadingCompanies(true);
    const timer = setTimeout(() => {
      zohoApi.getCompanies(companySearch || undefined).then(list => {
        setCompanies(list);
        setLoadingCompanies(false);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [companySearch, step]);

  const handleSubmit = useCallback(async () => {
    if (step === 'first-time') {
      if (!selectedCompany) {
        setErrorMsg('Please select a company.');
        return;
      }
      if (!dealName.trim()) {
        setErrorMsg('Please enter a deal name.');
        return;
      }
    }
    setErrorMsg('');
    setStep('submitting');

    let result;
    if (status?.isFirstTime) {
      result = await zohoApi.firstTimeUpload(agreementId, {
        companyId: selectedCompany!.id,
        companyName: selectedCompany!.name,
        dealName: dealName.trim(),
        noteText: noteText.trim(),
      });
    } else {
      result = await zohoApi.updateUpload(agreementId, {
        noteText: noteText.trim(),
        dealId: status?.mapping?.dealId,
      });
    }

    if (result.success) {
      setStep('done');
      onSuccess();
    } else {
      setErrorMsg(result.message || result.error || 'Upload failed.');
      setStep(status?.isFirstTime ? 'first-time' : 'update');
    }
  }, [step, status, selectedCompany, dealName, noteText, agreementId, onSuccess]);

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderCompanyItem = ({item}: {item: ZohoCompany}) => {
    const selected = selectedCompany?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.companyItem, selected && styles.companyItemSelected]}
        onPress={() => setSelectedCompany(item)}
        activeOpacity={0.7}>
        <View style={[styles.companyCheck, selected && styles.companyCheckSelected]}>
          {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
        </View>
        <Text style={[styles.companyName, selected && styles.companyNameSelected]} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (step === 'loading') {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Checking Bigin status…</Text>
        </View>
      );
    }

    if (step === 'submitting') {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {status?.isFirstTime ? 'Creating deal in Bigin…' : 'Updating Bigin deal…'}
          </Text>
        </View>
      );
    }

    if (step === 'done') {
      return (
        <View style={styles.centerBox}>
          <View style={styles.doneIcon}>
            <Ionicons name="checkmark-circle" size={52} color="#16a34a" />
          </View>
          <Text style={styles.doneTitle}>
            {status?.isFirstTime ? 'Deal Created!' : 'Deal Updated!'}
          </Text>
          <Text style={styles.doneSub}>
            {status?.isFirstTime
              ? 'Agreement uploaded to Bigin successfully.'
              : 'Bigin deal has been updated successfully.'}
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 'error') {
      return (
        <View style={styles.centerBox}>
          <Ionicons name="alert-circle-outline" size={44} color="#ef4444" />
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSub}>{errorMsg}</Text>
          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // first-time or update
    return (
      <View style={styles.formBody}>
        {/* Update — show existing mapping */}
        {step === 'update' && status?.mapping && (
          <View style={styles.mappingCard}>
            <Ionicons name="link-outline" size={15} color={Colors.primary} />
            <View style={{flex: 1}}>
              <Text style={styles.mappingLabel}>Linked Deal</Text>
              <Text style={styles.mappingValue} numberOfLines={1}>
                {status.mapping.dealName}
              </Text>
              <Text style={styles.mappingCompany} numberOfLines={1}>
                {status.mapping.companyName}
              </Text>
            </View>
          </View>
        )}

        {/* First-time — company picker */}
        {step === 'first-time' && (
          <>
            <Text style={styles.fieldLabel}>Select Company</Text>
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={15} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search companies…"
                placeholderTextColor={Colors.textMuted}
                value={companySearch}
                onChangeText={setCompanySearch}
                autoCorrect={false}
                autoCapitalize="none"
              />
              {loadingCompanies && <ActivityIndicator size="small" color={Colors.textMuted} />}
            </View>
            <View style={styles.companyList}>
              {companies.length === 0 && !loadingCompanies ? (
                <Text style={styles.emptyCompanies}>No companies found</Text>
              ) : (
                <FlatList
                  data={companies}
                  keyExtractor={item => item.id}
                  renderItem={renderCompanyItem}
                  scrollEnabled={true}
                  nestedScrollEnabled={true}
                  style={{maxHeight: 160}}
                />
              )}
            </View>

            <Text style={[styles.fieldLabel, {marginTop: Spacing.md}]}>Deal Name</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Enter deal name…"
              placeholderTextColor={Colors.textMuted}
              value={dealName}
              onChangeText={setDealName}
              autoCapitalize="words"
            />
          </>
        )}

        {/* Note text (shared) */}
        <Text style={[styles.fieldLabel, {marginTop: step === 'first-time' ? Spacing.md : 0}]}>
          Note / Description
        </Text>
        <TextInput
          style={[styles.textInput, styles.textInputMulti]}
          placeholder="Enter note or description…"
          placeholderTextColor={Colors.textMuted}
          value={noteText}
          onChangeText={setNoteText}
          multiline
          textAlignVertical="top"
        />

        {/* Error */}
        {errorMsg ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={14} color="#b91c1c" />
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* Submit */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} activeOpacity={0.8}>
          <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
          <Text style={styles.submitBtnText}>
            {status?.isFirstTime ? 'Upload to Bigin' : 'Update Bigin Deal'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={step === 'loading' || step === 'submitting' ? undefined : onClose} />
        <View style={styles.sheet}>
          {/* Handle */}
          <View style={styles.handle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderLeft}>
              <View style={styles.biginIcon}>
                <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
              </View>
              <View>
                <Text style={styles.sheetTitle}>
                  {step === 'update' ? 'Update Bigin Deal' : 'Upload to Bigin'}
                </Text>
                <Text style={styles.sheetSub} numberOfLines={1}>{agreementTitle}</Text>
              </View>
            </View>
            {step !== 'loading' && step !== 'submitting' && (
              <TouchableOpacity onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Content */}
          {renderContent()}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingBottom: Spacing.xxxl,
    overflow: 'hidden',
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#d1d5db',
    alignSelf: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  biginIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: '#ea580c',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sheetTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sheetSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
    maxWidth: 220,
  },

  // Center box (loading / done / error)
  centerBox: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  doneIcon: {marginBottom: Spacing.xs},
  doneTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  doneSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },
  doneBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
  },
  doneBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  errorTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.xs,
  },
  errorSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Form body
  formBody: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  textInputMulti: {
    minHeight: 80,
    paddingTop: 10,
    textAlignVertical: 'top',
  },

  // Company picker
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    backgroundColor: Colors.background,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
    padding: 0,
  },
  companyList: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    marginTop: 4,
  },
  companyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  companyItemSelected: {
    backgroundColor: Colors.primaryLight,
  },
  companyCheck: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  companyCheckSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  companyName: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  companyNameSelected: {
    fontWeight: '600',
    color: Colors.primaryDark,
  },
  emptyCompanies: {
    textAlign: 'center',
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    paddingVertical: Spacing.lg,
  },

  // Mapping card (update flow)
  mappingCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: Spacing.sm,
  },
  mappingLabel: {
    fontSize: FontSize.xs,
    color: Colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  mappingValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  mappingCompany: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },

  // Error banner
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: Spacing.sm,
    backgroundColor: '#fef2f2',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorBannerText: {
    flex: 1,
    fontSize: FontSize.xs,
    color: '#b91c1c',
  },

  // Submit button
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 13,
    borderRadius: Radius.lg,
    backgroundColor: '#ea580c',
    marginTop: Spacing.xs,
  },
  submitBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
});
