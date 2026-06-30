import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';
import {adminApi, type PayrollSettings, type ApprovalCutoff} from '../../../services/api/endpoints/admin.api';

const CYCLE_TYPES = [
  {key: 'weekly', label: 'Weekly'},
  {key: 'biweekly', label: 'Bi-Weekly'},
  {key: 'monthly', label: 'Monthly'},
] as const;

const DAYS_OF_WEEK = [
  {value: 0, label: 'Sunday'},
  {value: 1, label: 'Monday'},
  {value: 2, label: 'Tuesday'},
  {value: 3, label: 'Wednesday'},
  {value: 4, label: 'Thursday'},
  {value: 5, label: 'Friday'},
  {value: 6, label: 'Saturday'},
];

export function PayrollSettingsScreen() {
  const navigation = useNavigation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [cycleType, setCycleType] = useState<'weekly' | 'biweekly' | 'monthly'>('biweekly');
  const [cycleDayOfWeek, setCycleDayOfWeek] = useState<number>(1);

  const [cutoffEnabled, setCutoffEnabled] = useState<boolean>(true);
  const [cutoffDayOfWeek, setCutoffDayOfWeek] = useState<number>(0);
  const [cutoffHour, setCutoffHour] = useState<number>(0);
  const [cutoffMinute, setCutoffMinute] = useState<number>(0);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const [originalSettings, setOriginalSettings] = useState<PayrollSettings | null>(null);
  const [originalCutoff, setOriginalCutoff] = useState<ApprovalCutoff | null>(null);

  const [showDatePicker, setShowDatePicker] = useState(false);

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const settings = await adminApi.getSettings();
      if (settings?.payrollSettings) {
        const ps = settings.payrollSettings;
        setStartDate(ps.startDate ? new Date(ps.startDate) : null);
        setCycleType(ps.cycleType || 'biweekly');
        setCycleDayOfWeek(ps.cycleDayOfWeek ?? 1);
        setOriginalSettings(ps);
      }
      const ac = settings?.approvalCutoff || {enabled: true, dayOfWeek: 0, hour: 0, minute: 0};
      setCutoffEnabled(ac.enabled !== false);
      setCutoffDayOfWeek(ac.dayOfWeek ?? 0);
      setCutoffHour(ac.hour ?? 0);
      setCutoffMinute(ac.minute ?? 0);
      setOriginalCutoff(ac);
    } catch (err: any) {
      setError(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  useEffect(() => {
    if (!originalSettings) {
      setHasChanges(false);
      return;
    }

    const originalStartDate = originalSettings.startDate
      ? new Date(originalSettings.startDate).toISOString().split('T')[0]
      : '';
    const currentStartDate = startDate ? startDate.toISOString().split('T')[0] : '';

    const startDateChanged = currentStartDate !== originalStartDate;
    const cycleTypeChanged = cycleType !== (originalSettings.cycleType || 'biweekly');
    const cycleDayChanged = cycleDayOfWeek !== (originalSettings.cycleDayOfWeek ?? 1);

    const cutoffChanged =
      !originalCutoff ||
      cutoffEnabled !== (originalCutoff.enabled !== false) ||
      cutoffDayOfWeek !== (originalCutoff.dayOfWeek ?? 0) ||
      cutoffHour !== (originalCutoff.hour ?? 0) ||
      cutoffMinute !== (originalCutoff.minute ?? 0);

    setHasChanges(startDateChanged || cycleTypeChanged || cycleDayChanged || cutoffChanged);
  }, [startDate, cycleType, cycleDayOfWeek, originalSettings, cutoffEnabled, cutoffDayOfWeek, cutoffHour, cutoffMinute, originalCutoff]);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setShowSuccess(false);

      const updated = await adminApi.updateSettings({
        payrollSettings: {
          startDate: startDate ? startDate.toISOString() : null,
          cycleType,
          cycleDayOfWeek,
        },
        approvalCutoff: {
          enabled: cutoffEnabled,
          dayOfWeek: cutoffDayOfWeek,
          hour: cutoffHour,
          minute: cutoffMinute,
        },
      });

      if (updated?.payrollSettings) {
        setOriginalSettings(updated.payrollSettings);
      }
      if (updated?.approvalCutoff) {
        setOriginalCutoff(updated.approvalCutoff);
      }
      setHasChanges(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const clearDate = () => {
    setStartDate(null);
  };

  const formatDate = (date: Date | null): string => {
    if (!date) return 'Not set';
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (h: number, m: number): string => {
    const d = new Date();
    d.setHours(h, m, 0, 0);
    return d.toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
  };

  const handleTimeChange = (event: any, selected?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selected) {
      setCutoffHour(selected.getHours());
      setCutoffMinute(selected.getMinutes());
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payroll Settings</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading settings...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payroll Settings</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        {}
        <View style={styles.infoBanner}>
          <Ionicons name="information-circle-outline" size={20} color="#0369a1" />
          <Text style={styles.infoBannerText}>
            Configure the payroll cycle and start date for commission calculations.
            Commissions will be tracked from the start date you set.
          </Text>
        </View>

        {}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle-outline" size={20} color="#dc2626" />
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        )}

        {}
        {showSuccess && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#16a34a" />
            <Text style={styles.successBannerText}>Settings saved successfully!</Text>
          </View>
        )}

        {}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, {backgroundColor: '#fef3c7'}]}>
              <Ionicons name="calendar-outline" size={20} color="#f59e0b" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Payroll Start Date</Text>
              <Text style={styles.sectionSubtitle}>
                The date from which payroll calculations begin
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.datePickerBtn}
            onPress={() => setShowDatePicker(true)}>
            <View style={styles.datePickerContent}>
              <Ionicons
                name="calendar"
                size={20}
                color={startDate ? Colors.primary : '#9ca3af'}
              />
              <Text
                style={[
                  styles.datePickerText,
                  !startDate && styles.datePickerPlaceholder,
                ]}>
                {formatDate(startDate)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          {startDate && (
            <TouchableOpacity style={styles.clearBtn} onPress={clearDate}>
              <Ionicons name="close-circle-outline" size={18} color="#9ca3af" />
              <Text style={styles.clearBtnText}>Clear date</Text>
            </TouchableOpacity>
          )}
        </View>

        {}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, {backgroundColor: '#dbeafe'}]}>
              <Ionicons name="repeat-outline" size={20} color="#2563eb" />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Payroll Cycle Type</Text>
              <Text style={styles.sectionSubtitle}>
                How often payroll is calculated
              </Text>
            </View>
          </View>

          <View style={styles.optionsRow}>
            {CYCLE_TYPES.map(type => (
              <TouchableOpacity
                key={type.key}
                style={[
                  styles.optionBtn,
                  cycleType === type.key && styles.optionBtnActive,
                ]}
                onPress={() => setCycleType(type.key)}>
                <Text
                  style={[
                    styles.optionBtnText,
                    cycleType === type.key && styles.optionBtnTextActive,
                  ]}>
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {}
        {(cycleType === 'weekly' || cycleType === 'biweekly') && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={[styles.sectionIcon, {backgroundColor: '#dcfce7'}]}>
                <Ionicons name="today-outline" size={20} color="#16a34a" />
              </View>
              <View>
                <Text style={styles.sectionTitle}>Cycle Day of Week</Text>
                <Text style={styles.sectionSubtitle}>
                  The day when the payroll cycle starts/ends
                </Text>
              </View>
            </View>

            <View style={styles.dayOptions}>
              {DAYS_OF_WEEK.map(day => (
                <TouchableOpacity
                  key={day.value}
                  style={[
                    styles.dayOption,
                    cycleDayOfWeek === day.value && styles.dayOptionActive,
                  ]}
                  onPress={() => setCycleDayOfWeek(day.value)}>
                  <Text
                    style={[
                      styles.dayOptionText,
                      cycleDayOfWeek === day.value && styles.dayOptionTextActive,
                    ]}>
                    {day.label.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.selectedDayText}>
              Selected: {DAYS_OF_WEEK.find(d => d.value === cycleDayOfWeek)?.label}
            </Text>
          </View>
        )}

        {}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, {backgroundColor: '#ede9fe'}]}>
              <Ionicons name="time-outline" size={20} color="#7c3aed" />
            </View>
            <View style={{flex: 1}}>
              <Text style={styles.sectionTitle}>Weekly Approval Cutoff</Text>
              <Text style={styles.sectionSubtitle}>
                After this weekly cutoff, completing an agreement counts toward the next payroll period. Default is midnight Sunday.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setCutoffEnabled(!cutoffEnabled)}>
            <Text style={styles.toggleLabel}>
              Roll completions to the next period after the cutoff
            </Text>
            <View style={[styles.toggle, cutoffEnabled && styles.toggleOn]}>
              <View style={[styles.toggleKnob, cutoffEnabled && styles.toggleKnobOn]} />
            </View>
          </TouchableOpacity>

          {cutoffEnabled && (
            <>
              <Text style={[styles.sectionSubtitle, {marginTop: Spacing.md, marginBottom: Spacing.xs}]}>
                Cutoff day
              </Text>
              <View style={styles.dayOptions}>
                {DAYS_OF_WEEK.map(day => (
                  <TouchableOpacity
                    key={day.value}
                    style={[
                      styles.dayOption,
                      cutoffDayOfWeek === day.value && styles.dayOptionActive,
                    ]}
                    onPress={() => setCutoffDayOfWeek(day.value)}>
                    <Text
                      style={[
                        styles.dayOptionText,
                        cutoffDayOfWeek === day.value && styles.dayOptionTextActive,
                      ]}>
                      {day.label.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.sectionSubtitle, {marginTop: Spacing.md, marginBottom: Spacing.xs}]}>
                Cutoff time
              </Text>
              <TouchableOpacity
                style={styles.datePickerBtn}
                onPress={() => setShowTimePicker(true)}>
                <View style={styles.datePickerContent}>
                  <Ionicons name="time" size={20} color={Colors.primary} />
                  <Text style={styles.datePickerText}>
                    {formatTime(cutoffHour, cutoffMinute)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </>
          )}
        </View>

        {}
        <TouchableOpacity
          style={[
            styles.saveBtn,
            (!hasChanges || saving) && styles.saveBtnDisabled,
          ]}
          onPress={handleSave}
          disabled={!hasChanges || saving}>
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color="#fff" />
              <Text style={styles.saveBtnText}>Save Settings</Text>
            </>
          )}
        </TouchableOpacity>

        {!hasChanges && !saving && (
          <Text style={styles.noChangesText}>No unsaved changes</Text>
        )}

        <View style={{height: 40}} />
      </ScrollView>

      {}
      {showDatePicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={(() => { const d = new Date(); d.setHours(cutoffHour, cutoffMinute, 0, 0); return d; })()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
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
  infoBannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: '#0369a1',
    lineHeight: 20,
  },
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
  errorBannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: '#dc2626',
  },
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
  successBannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: '#16a34a',
    fontWeight: '600',
  },
  section: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  sectionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  sectionSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  datePickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  datePickerText: {
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  datePickerPlaceholder: {
    color: '#9ca3af',
    fontWeight: '400',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.sm,
    alignSelf: 'flex-start',
  },
  clearBtnText: {
    fontSize: FontSize.sm,
    color: '#9ca3af',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  optionBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  optionBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  optionBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  optionBtnTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  dayOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  dayOption: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
  },
  dayOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayOptionText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  dayOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  selectedDayText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    fontStyle: 'italic',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  toggleLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  toggle: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#d1d5db',
    padding: 3,
    justifyContent: 'center',
  },
  toggleOn: {
    backgroundColor: Colors.primary,
  },
  toggleKnob: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignSelf: 'flex-start',
  },
  toggleKnobOn: {
    alignSelf: 'flex-end',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  saveBtnDisabled: {
    opacity: 0.5,
  },
  saveBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  noChangesText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

export default PayrollSettingsScreen;
