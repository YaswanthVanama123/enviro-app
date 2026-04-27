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
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  zohoApi,
  ZohoCompany,
  ZohoUser,
} from '../../../services/api/endpoints/agreements.api';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';

interface BiginTaskModalProps {
  visible: boolean;
  agreementId: string;
  agreementTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = 'loading' | 'select-company' | 'form' | 'submitting' | 'success' | 'error';

export function BiginTaskModal({
  visible,
  agreementId,
  agreementTitle,
  onClose,
  onSuccess,
}: BiginTaskModalProps) {
  const [step, setStep] = useState<Step>('loading');
  const [linkedCompany, setLinkedCompany] = useState<{id: string; name: string} | null>(null);
  const [linkedDeal, setLinkedDeal] = useState<{id: string; name: string} | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<ZohoCompany | null>(null);

  // Users
  const [users, setUsers] = useState<ZohoUser[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<ZohoUser | null>(null);
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerDropOpen, setOwnerDropOpen] = useState(false);

  // Companies
  const [companies, setCompanies] = useState<ZohoCompany[]>([]);
  const [companySearch, setCompanySearch] = useState('');
  const [loadingCompanies, setLoadingCompanies] = useState(false);

  // Task fields
  const [taskName, setTaskName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');
  const [highPriority, setHighPriority] = useState(false);
  const [markCompleted, setMarkCompleted] = useState(false);
  const [reminder, setReminder] = useState(false);
  const [reminderWhen, setReminderWhen] = useState('On due date');
  const [reminderTime, setReminderTime] = useState('08:00');
  const [repeat, setRepeat] = useState(false);
  const [repeatFrequency, setRepeatFrequency] = useState('Every Day');
  const [repeatUntil, setRepeatUntil] = useState('');

  // Inline dropdowns
  const [reminderWhenOpen, setReminderWhenOpen] = useState(false);
  const [repeatFreqOpen, setRepeatFreqOpen] = useState(false);

  const [errorMsg, setErrorMsg] = useState('');

  // Reset & load on open
  useEffect(() => {
    if (!visible) {return;}
    setStep('loading');
    setLinkedCompany(null);
    setLinkedDeal(null);
    setSelectedCompany(null);
    setSelectedOwner(null);
    setOwnerSearch('');
    setOwnerDropOpen(false);
    setTaskName('');
    setDueDate('');
    setDescription('');
    setHighPriority(false);
    setMarkCompleted(false);
    setReminder(false);
    setReminderWhen('On due date');
    setReminderTime('08:00');
    setRepeat(false);
    setRepeatFrequency('Every Day');
    setRepeatUntil('');
    setReminderWhenOpen(false);
    setRepeatFreqOpen(false);
    setErrorMsg('');
    setCompanies([]);
    setCompanySearch('');

    Promise.allSettled([
      zohoApi.getStatus(agreementId),
      zohoApi.getUsers(),
    ]).then(([statusRes, usersRes]) => {
      if (usersRes.status === 'fulfilled') {
        setUsers(usersRes.value);
      }
      if (statusRes.status === 'fulfilled' && statusRes.value) {
        const s = statusRes.value;
        if (s.mapping?.companyId && s.mapping?.companyName) {
          setLinkedCompany({id: s.mapping.companyId, name: s.mapping.companyName});
          if (s.mapping.dealId && s.mapping.dealName) {
            setLinkedDeal({id: s.mapping.dealId, name: s.mapping.dealName});
          }
          setStep('form');
          return;
        }
      }
      setStep('select-company');
    });
  }, [visible, agreementId]);

  // Load companies for selector
  useEffect(() => {
    if (step !== 'select-company') {return;}
    setLoadingCompanies(true);
    const timer = setTimeout(() => {
      zohoApi.getCompanies(companySearch || undefined).then(list => {
        setCompanies(list);
        setLoadingCompanies(false);
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [companySearch, step]);

  const handleSelectCompany = useCallback((company: ZohoCompany) => {
    setSelectedCompany(company);
    setStep('form');
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!taskName.trim()) {
      setErrorMsg('Task Name is required.');
      return;
    }
    const company = linkedCompany ?? (selectedCompany ? {id: selectedCompany.id, name: selectedCompany.name} : null);
    if (!company) {
      setErrorMsg('Please select a company.');
      return;
    }

    // Validations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (dueDate) {
      const due = new Date(dueDate);
      if (isNaN(due.getTime())) {
        setErrorMsg('Invalid due date format. Use YYYY-MM-DD.');
        return;
      }
      if (due < today) {
        setErrorMsg('Due Date cannot be in the past.');
        return;
      }
    }
    if (repeat && repeatUntil) {
      const until = new Date(repeatUntil);
      const due = dueDate ? new Date(dueDate) : today;
      if (until <= due) {
        setErrorMsg("'Until' date must be greater than the Due Date.");
        return;
      }
    }
    if (reminder && dueDate) {
      const base = new Date(dueDate);
      if (reminderWhen === 'A day before due date') {base.setDate(base.getDate() - 1);}
      else if (reminderWhen === '2 days before due date') {base.setDate(base.getDate() - 2);}
      const [hh, mm] = reminderTime.split(':').map(Number);
      base.setHours(hh || 0, mm || 0, 0, 0);
      if (base <= new Date()) {
        setErrorMsg('The reminder date and time must be in the future.');
        return;
      }
    }

    setErrorMsg('');
    setStep('submitting');

    try {
      const payload = {
        subject: taskName.trim(),
        dueDate: dueDate || undefined,
        priority: (highPriority ? 'High' : 'Medium') as 'High' | 'Medium',
        status: (markCompleted ? 'Completed' : 'Not Started') as 'Completed' | 'Not Started',
        description: description.trim() || undefined,
        ownerId: selectedOwner?.id || undefined,
        reminder: reminder || undefined,
        reminderWhen: reminder ? reminderWhen : undefined,
        reminderTime: reminder ? reminderTime : undefined,
        repeat: repeat || undefined,
        repeatFrequency: repeat ? repeatFrequency : undefined,
        repeatUntil: repeat && repeatUntil ? repeatUntil : undefined,
      };

      const result = linkedCompany
        ? await zohoApi.createTask(agreementId, payload)
        : await zohoApi.createTaskForCompany(company.id, {
            ...payload,
            companyName: company.name,
            agreementId,
          });

      if (result.success) {
        setStep('success');
        onSuccess();
      } else {
        setErrorMsg(result.error ?? 'Task creation failed.');
        setStep('form');
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Task creation failed.');
      setStep('form');
    }
  }, [taskName, dueDate, description, highPriority, markCompleted, selectedOwner,
      reminder, reminderWhen, reminderTime, repeat, repeatFrequency, repeatUntil,
      linkedCompany, selectedCompany, agreementId, onSuccess]);

  const effectiveCompany = linkedCompany ?? (selectedCompany ? {id: selectedCompany.id, name: selectedCompany.name} : null);
  const relatedToName = linkedDeal ? linkedDeal.name : (effectiveCompany?.name ?? '');
  const filteredUsers = users.filter(u =>
    !ownerSearch || u.name.toLowerCase().includes(ownerSearch.toLowerCase()),
  );
  const initials = (name: string) =>
    name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase();

  const renderContent = () => {
    if (step === 'loading' || step === 'submitting') {
      return (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#16a34a" />
          <Text style={styles.loadingText}>
            {step === 'loading' ? 'Checking Bigin link…' : 'Creating task in Bigin…'}
          </Text>
        </View>
      );
    }

    if (step === 'success') {
      return (
        <View style={styles.centerBox}>
          <Ionicons name="checkmark-circle" size={52} color="#16a34a" />
          <Text style={styles.doneTitle}>Task Created!</Text>
          <Text style={styles.doneSub}>
            Added to {linkedDeal ? `pipeline "${linkedDeal.name}"` : (effectiveCompany?.name ?? 'the company')} in Bigin.
          </Text>
          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
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
          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={styles.doneBtnText}>Close</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (step === 'select-company') {
      return (
        <View style={styles.formBody}>
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
          <View style={styles.listBox}>
            {companies.length === 0 && !loadingCompanies ? (
              <Text style={styles.emptyText}>No companies found</Text>
            ) : (
              <FlatList
                data={companies}
                keyExtractor={item => item.id}
                scrollEnabled
                nestedScrollEnabled
                style={{maxHeight: 300}}
                renderItem={({item}) => (
                  <TouchableOpacity
                    style={styles.listItem}
                    onPress={() => handleSelectCompany(item)}
                    activeOpacity={0.7}>
                    <Ionicons name="business-outline" size={14} color={Colors.textMuted} />
                    <Text style={styles.listItemText} numberOfLines={1}>{item.name}</Text>
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      );
    }

    // form
    return (
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        style={{maxHeight: 520}}>
        <View style={styles.formBody}>

          {/* Section header + Owner */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionHeaderText}>Task Information</Text>
            <TouchableOpacity
              style={styles.ownerBtn}
              onPress={() => {setOwnerDropOpen(v => !v); setReminderWhenOpen(false); setRepeatFreqOpen(false);}}
              activeOpacity={0.8}>
              <View style={styles.ownerAvatar}>
                {selectedOwner
                  ? <Text style={styles.ownerAvatarText}>{initials(selectedOwner.name)}</Text>
                  : <Ionicons name="person-outline" size={12} color="#fff" />}
              </View>
              <Text style={styles.ownerBtnText} numberOfLines={1}>
                {selectedOwner ? selectedOwner.name : 'Owner'}
              </Text>
              <Ionicons name="chevron-down" size={11} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Owner dropdown */}
          {ownerDropOpen && (
            <View style={styles.dropdownBox}>
              <View style={styles.searchRow}>
                <Ionicons name="search-outline" size={13} color={Colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search…"
                  placeholderTextColor={Colors.textMuted}
                  value={ownerSearch}
                  onChangeText={setOwnerSearch}
                  autoCorrect={false}
                />
              </View>
              {filteredUsers.length === 0 ? (
                <Text style={styles.emptyText}>No users found</Text>
              ) : (
                <FlatList
                  data={filteredUsers}
                  keyExtractor={u => u.id}
                  scrollEnabled
                  nestedScrollEnabled
                  style={{maxHeight: 180}}
                  renderItem={({item}) => (
                    <TouchableOpacity
                      style={styles.listItem}
                      onPress={() => {setSelectedOwner(item); setOwnerDropOpen(false); setOwnerSearch('');}}
                      activeOpacity={0.7}>
                      <View style={styles.ownerAvatar}>
                        <Text style={[styles.ownerAvatarText, {fontSize: 9}]}>{initials(item.name)}</Text>
                      </View>
                      <View style={{flex: 1}}>
                        <Text style={styles.listItemText} numberOfLines={1}>{item.name}</Text>
                        <Text style={styles.ownerEmail} numberOfLines={1}>{item.email}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          )}

          {/* Task Name */}
          <Text style={styles.fieldLabel}>
            Task Name <Text style={{color: '#ef4444'}}>*</Text>
          </Text>
          <TextInput
            style={styles.textInput}
            placeholder="Enter task name…"
            placeholderTextColor={Colors.textMuted}
            value={taskName}
            onChangeText={setTaskName}
            autoCapitalize="sentences"
          />

          {/* Due Date */}
          <Text style={[styles.fieldLabel, {marginTop: Spacing.sm}]}>Due Date</Text>
          <TextInput
            style={styles.textInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={Colors.textMuted}
            value={dueDate}
            onChangeText={setDueDate}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
          />

          {/* Repeat */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setRepeat(v => !v)}
            activeOpacity={0.7}>
            <View style={[styles.checkbox, repeat && styles.checkboxChecked]}>
              {repeat && <Ionicons name="checkmark" size={11} color="#fff" />}
            </View>
            <Text style={styles.checkLabel}>Repeat</Text>
          </TouchableOpacity>
          {repeat && (
            <View style={styles.subFields}>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => {setRepeatFreqOpen(v => !v); setReminderWhenOpen(false);}}
                activeOpacity={0.8}>
                <Text style={styles.pickerBtnText}>{repeatFrequency}</Text>
                <Ionicons name="chevron-down" size={13} color={Colors.textMuted} />
              </TouchableOpacity>
              {repeatFreqOpen && (
                <View style={styles.inlineDropdown}>
                  {['Every Day', 'Every Week', 'Every Month', 'Every Year'].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.inlineDropdownItem, repeatFrequency === opt && styles.inlineDropdownItemSelected]}
                      onPress={() => {setRepeatFrequency(opt); setRepeatFreqOpen(false);}}>
                      <Text style={[styles.inlineDropdownText, repeatFrequency === opt && styles.inlineDropdownTextSelected]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.subRow}>
                <Text style={styles.subLabel}>Until</Text>
                <TextInput
                  style={[styles.textInput, {flex: 1, marginLeft: Spacing.sm}]}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textMuted}
                  value={repeatUntil}
                  onChangeText={setRepeatUntil}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              </View>
              {repeatUntil && dueDate && new Date(repeatUntil) <= new Date(dueDate) && (
                <Text style={styles.inlineError}>'Until' must be after the Due Date.</Text>
              )}
            </View>
          )}

          {/* Reminder */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setReminder(v => !v)}
            activeOpacity={0.7}>
            <View style={[styles.checkbox, reminder && styles.checkboxChecked]}>
              {reminder && <Ionicons name="checkmark" size={11} color="#fff" />}
            </View>
            <Text style={styles.checkLabel}>Reminder</Text>
          </TouchableOpacity>
          {reminder && (
            <View style={styles.subFields}>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => {setReminderWhenOpen(v => !v); setRepeatFreqOpen(false);}}
                activeOpacity={0.8}>
                <Text style={styles.pickerBtnText}>{reminderWhen}</Text>
                <Ionicons name="chevron-down" size={13} color={Colors.textMuted} />
              </TouchableOpacity>
              {reminderWhenOpen && (
                <View style={styles.inlineDropdown}>
                  {['On due date', 'A day before due date', '2 days before due date'].map(opt => (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.inlineDropdownItem, reminderWhen === opt && styles.inlineDropdownItemSelected]}
                      onPress={() => {setReminderWhen(opt); setReminderWhenOpen(false);}}>
                      <Text style={[styles.inlineDropdownText, reminderWhen === opt && styles.inlineDropdownTextSelected]}>
                        {opt}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <View style={styles.subRow}>
                <Text style={styles.subLabel}>Time</Text>
                <TextInput
                  style={[styles.textInput, {flex: 1, marginLeft: Spacing.sm}]}
                  placeholder="HH:MM"
                  placeholderTextColor={Colors.textMuted}
                  value={reminderTime}
                  onChangeText={setReminderTime}
                  keyboardType="numbers-and-punctuation"
                  maxLength={5}
                />
              </View>
            </View>
          )}

          {/* Related To */}
          <Text style={[styles.fieldLabel, {marginTop: Spacing.sm}]}>Related To</Text>
          <View style={styles.relatedToBox}>
            <Ionicons name="business-outline" size={14} color={Colors.textMuted} />
            <View style={{flex: 1}}>
              {linkedDeal && linkedCompany && (
                <Text style={styles.relatedToSub} numberOfLines={1}>{linkedCompany.name}</Text>
              )}
              <Text style={styles.relatedToMain} numberOfLines={1}>{relatedToName}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={[styles.fieldLabel, {marginTop: Spacing.sm}]}>Description</Text>
          <TextInput
            style={[styles.textInput, styles.textInputMulti]}
            placeholder="A few words about this task…"
            placeholderTextColor={Colors.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          {/* High Priority */}
          <TouchableOpacity style={styles.checkRow} onPress={() => setHighPriority(v => !v)} activeOpacity={0.7}>
            <View style={[styles.checkbox, highPriority && styles.checkboxChecked]}>
              {highPriority && <Ionicons name="checkmark" size={11} color="#fff" />}
            </View>
            <Text style={styles.checkLabel}>Mark as High Priority</Text>
          </TouchableOpacity>

          {/* Mark Completed */}
          <TouchableOpacity style={styles.checkRow} onPress={() => setMarkCompleted(v => !v)} activeOpacity={0.7}>
            <View style={[styles.checkbox, markCompleted && styles.checkboxChecked]}>
              {markCompleted && <Ionicons name="checkmark" size={11} color="#fff" />}
            </View>
            <Text style={styles.checkLabel}>Mark as completed</Text>
          </TouchableOpacity>

          {errorMsg ? (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle-outline" size={14} color="#b91c1c" />
              <Text style={styles.errorBannerText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Footer */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSubmit} activeOpacity={0.8}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
          </View>

        </View>
      </ScrollView>
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
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={step === 'loading' || step === 'submitting' ? undefined : onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderLeft}>
              <View style={styles.taskIcon}>
                <Ionicons name="checkbox-outline" size={16} color="#fff" />
              </View>
              <View>
                <Text style={styles.sheetTitle}>Create Task</Text>
                <Text style={styles.sheetSub} numberOfLines={1}>{agreementTitle}</Text>
              </View>
            </View>
            {step !== 'loading' && step !== 'submitting' && (
              <TouchableOpacity onPress={onClose} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          {renderContent()}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {flex: 1, justifyContent: 'flex-end'},
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
  taskIcon: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  sheetTitle: {fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary},
  sheetSub: {fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1, maxWidth: 220},

  centerBox: {
    alignItems: 'center',
    padding: Spacing.xxxl,
    gap: Spacing.md,
  },
  loadingText: {fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm},
  doneTitle: {fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary},
  doneSub: {fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center'},
  doneBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xxl,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: '#16a34a',
  },
  doneBtnText: {fontSize: FontSize.md, fontWeight: '700', color: '#fff'},
  errorTitle: {fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginTop: Spacing.xs},
  errorSub: {fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center'},

  formBody: {padding: Spacing.lg, gap: Spacing.sm},
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
  textInputMulti: {minHeight: 72, paddingTop: 10, textAlignVertical: 'top'},

  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  sectionHeaderText: {fontSize: FontSize.sm, fontWeight: '700', color: Colors.textPrimary},

  ownerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f3f4f6',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  ownerAvatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#16a34a',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  ownerAvatarText: {fontSize: 11, fontWeight: '700', color: '#fff'},
  ownerBtnText: {fontSize: FontSize.xs, fontWeight: '600', color: Colors.textPrimary, maxWidth: 100},
  ownerEmail: {fontSize: 10, color: Colors.textMuted},

  dropdownBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    marginBottom: Spacing.sm,
  },

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
  searchInput: {flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, padding: 0},

  listBox: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    marginTop: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  listItemText: {flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary},
  emptyText: {textAlign: 'center', fontSize: FontSize.sm, color: Colors.textMuted, paddingVertical: Spacing.lg},

  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
    marginTop: Spacing.xs,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  checkboxChecked: {backgroundColor: '#16a34a', borderColor: '#16a34a'},
  checkLabel: {fontSize: FontSize.sm, color: Colors.textPrimary},

  subFields: {
    marginLeft: 26,
    marginBottom: Spacing.xs,
    gap: Spacing.xs,
  },
  subRow: {flexDirection: 'row', alignItems: 'center', marginTop: Spacing.xs},
  subLabel: {fontSize: FontSize.xs, fontWeight: '600', color: Colors.textMuted, textTransform: 'uppercase'},

  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    backgroundColor: Colors.background,
  },
  pickerBtnText: {fontSize: FontSize.sm, color: Colors.textPrimary},
  inlineDropdown: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Colors.surface,
    marginTop: 4,
    marginBottom: 4,
  },
  inlineDropdownItem: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  inlineDropdownItemSelected: {backgroundColor: '#f0fdf4'},
  inlineDropdownText: {fontSize: FontSize.sm, color: Colors.textPrimary},
  inlineDropdownTextSelected: {color: '#16a34a', fontWeight: '700'},
  inlineError: {fontSize: 11, color: '#ef4444', marginTop: 2},

  relatedToBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: '#f9fafb',
  },
  relatedToSub: {fontSize: 10, color: Colors.textMuted, marginBottom: 1},
  relatedToMain: {fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '500'},

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: Spacing.sm,
    backgroundColor: '#fef2f2',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: '#fecaca',
    marginTop: Spacing.xs,
  },
  errorBannerText: {flex: 1, fontSize: FontSize.xs, color: '#b91c1c'},

  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  cancelBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    backgroundColor: '#fff',
  },
  cancelBtnText: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary},
  saveBtn: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: '#16a34a',
  },
  saveBtnText: {fontSize: FontSize.sm, fontWeight: '700', color: '#fff'},
});
