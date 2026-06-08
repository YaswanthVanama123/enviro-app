import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Share,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';
import type {RootStackParamList} from '../../../app/navigation/types';
import {
  adminApi,
  type PayrollPeriod,
  type PayrollTotals,
  type EmployeePayroll,
  type PayrollHistoryItem,
  type PayrollSettings,
} from '../../../services/api/endpoints/admin.api';
import {PayrollEmployeeList} from '../components/payroll/PayrollEmployeeList';
import {formatMoney, formatDate, formatLongDate} from '../components/payroll/payrollFormat';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

type SubTab = 'overview' | 'settings' | 'history';

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

export function PayrollScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('overview');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [settings, setSettings] = useState<PayrollSettings>({
    startDate: null,
    cycleType: 'biweekly',
    cycleDayOfWeek: 1,
  });
  const [originalSettings, setOriginalSettings] = useState<PayrollSettings | null>(null);

  const [currentPeriod, setCurrentPeriod] = useState<PayrollPeriod | null>(null);
  const [previousPeriod, setPreviousPeriod] = useState<PayrollPeriod | null>(null);

  const [employees, setEmployees] = useState<EmployeePayroll[]>([]);
  const [totals, setTotals] = useState<PayrollTotals | null>(null);

  const [history, setHistory] = useState<PayrollHistoryItem[]>([]);

  const loadPayrollData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const [periodsRes, employeesRes] = await Promise.all([
        adminApi.getPayrollPeriods(),
        adminApi.getPayrollEmployees(),
      ]);

      if (periodsRes) {
        setSettings(periodsRes.settings);
        setOriginalSettings(periodsRes.settings);
        setCurrentPeriod(periodsRes.periods.current);
        setPreviousPeriod(periodsRes.periods.previous);
      }

      if (employeesRes) {
        setEmployees(employeesRes.employees);
        setTotals(employeesRes.totals);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load payroll data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    try {
      const res = await adminApi.getPayrollHistory(12);
      if (res) {
        setHistory(res.history);
      }
    } catch (err) {
      console.error('Failed to load payroll history:', err);
    }
  }, []);

  useEffect(() => {
    loadPayrollData();
  }, [loadPayrollData]);

  useEffect(() => {
    if (activeSubTab === 'history') {
      loadHistory();
    }
  }, [activeSubTab, loadHistory]);

  const hasChanges = originalSettings
    ? settings.startDate !== originalSettings.startDate ||
      settings.cycleType !== originalSettings.cycleType ||
      settings.cycleDayOfWeek !== originalSettings.cycleDayOfWeek
    : false;

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const updated = await adminApi.updateSettings({
        payrollSettings: settings,
      });

      if (updated) {
        setOriginalSettings(settings);
        setSuccessMessage('Payroll settings saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        loadPayrollData();
      } else {
        setError('Failed to save settings');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleSharePayroll = async () => {
    if (!employees.length || !currentPeriod) return;

    let content = `Payroll Report: ${currentPeriod.label}\n`;
    content += `Period: ${formatDate(currentPeriod.start)} - ${formatDate(currentPeriod.end)}\n\n`;

    if (totals) {
      content += `Summary:\n`;
      content += `- Total Commission: ${formatMoney(totals.totalAnnualCommission)}\n`;
      content += `- Salespeople: ${totals.totalEmployees}\n`;
      content += `- Agreements: ${totals.totalAgreements}\n`;
      content += `- Total Revenue: ${formatMoney(totals.totalMonthlyRevenue)}\n\n`;
    }

    content += `Employee Breakdown:\n`;
    employees.forEach(emp => {
      content += `\n${emp.username}:\n`;
      content += `  - Agreements: ${emp.totalAgreements}\n`;
      content += `  - Revenue: ${formatMoney(emp.totalMonthlyRevenue)}/mo\n`;
      content += `  - Commission: ${formatMoney(emp.totalAnnualCommission)}\n`;
    });

    try {
      await Share.share({
        message: content,
        title: `Payroll Report - ${currentPeriod.label}`,
      });
    } catch (err) {
      console.error('Share failed:', err);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payroll Management</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading payroll data...</Text>
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
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payroll Management</Text>
        <View style={styles.headerRight} />
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="#dc2626" />
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Ionicons name="close" size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
      )}

      {successMessage && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
          <Text style={styles.successBannerText}>{successMessage}</Text>
        </View>
      )}

      <View style={styles.subTabBar}>
        <TouchableOpacity
          style={[styles.subTabBtn, activeSubTab === 'overview' && styles.subTabBtnActive]}
          onPress={() => setActiveSubTab('overview')}>
          <Ionicons
            name="people-outline"
            size={18}
            color={activeSubTab === 'overview' ? '#fff' : '#64748b'}
          />
          <Text style={[styles.subTabText, activeSubTab === 'overview' && styles.subTabTextActive]}>
            Current Period
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTabBtn, activeSubTab === 'settings' && styles.subTabBtnActive]}
          onPress={() => setActiveSubTab('settings')}>
          <Ionicons
            name="settings-outline"
            size={18}
            color={activeSubTab === 'settings' ? '#fff' : '#64748b'}
          />
          <Text style={[styles.subTabText, activeSubTab === 'settings' && styles.subTabTextActive]}>
            Settings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.subTabBtn, activeSubTab === 'history' && styles.subTabBtnActive]}
          onPress={() => setActiveSubTab('history')}>
          <Ionicons
            name="time-outline"
            size={18}
            color={activeSubTab === 'history' ? '#fff' : '#64748b'}
          />
          <Text style={[styles.subTabText, activeSubTab === 'history' && styles.subTabTextActive]}>
            History
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadPayrollData(true)}
            tintColor={Colors.primary}
          />
        }>
        {activeSubTab === 'overview' && (
          <View>
            <View style={styles.periodCard}>
              <View style={styles.periodHeader}>
                <Text style={styles.periodTitle}>Current Payroll Period</Text>
                <View style={styles.periodActions}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => loadPayrollData(true)}>
                    <Ionicons name="refresh" size={16} color="#6366f1" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={handleSharePayroll}
                    disabled={!employees.length}>
                    <Ionicons name="share-outline" size={16} color="#6366f1" />
                  </TouchableOpacity>
                </View>
              </View>
              {currentPeriod && (
                <View style={styles.periodInfo}>
                  <Text style={styles.periodLabel}>{currentPeriod.label}</Text>
                  <Text style={styles.periodDates}>
                    {formatDate(currentPeriod.start)} - {formatDate(currentPeriod.end)}
                  </Text>
                </View>
              )}
            </View>

            {currentPeriod && (
              <PayrollEmployeeList
                employees={employees}
                totals={totals}
                period={currentPeriod}
                showSummary
              />
            )}
          </View>
        )}

        {activeSubTab === 'settings' && (
          <View>
            <View style={styles.settingsSection}>
              <View style={styles.settingsSectionHeader}>
                <View style={[styles.settingsSectionIcon, {backgroundColor: '#fef3c7'}]}>
                  <Ionicons name="calendar-outline" size={20} color="#f59e0b" />
                </View>
                <View>
                  <Text style={styles.settingsSectionTitle}>Payroll Start Date</Text>
                  <Text style={styles.settingsSectionSubtitle}>
                    The date from which payroll calculations begin
                  </Text>
                </View>
              </View>
              <View style={styles.settingsValue}>
                <Text style={styles.settingsValueText}>
                  {settings.startDate ? formatLongDate(settings.startDate) : 'Not set'}
                </Text>
              </View>
            </View>

            <View style={styles.settingsSection}>
              <View style={styles.settingsSectionHeader}>
                <View style={[styles.settingsSectionIcon, {backgroundColor: '#dbeafe'}]}>
                  <Ionicons name="repeat-outline" size={20} color="#2563eb" />
                </View>
                <View>
                  <Text style={styles.settingsSectionTitle}>Payroll Cycle Type</Text>
                  <Text style={styles.settingsSectionSubtitle}>
                    How often payroll is calculated
                  </Text>
                </View>
              </View>
              <View style={styles.cycleTypeOptions}>
                {CYCLE_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.key}
                    style={[
                      styles.cycleTypeBtn,
                      settings.cycleType === type.key && styles.cycleTypeBtnActive,
                    ]}
                    onPress={() => setSettings({...settings, cycleType: type.key})}>
                    <Text
                      style={[
                        styles.cycleTypeBtnText,
                        settings.cycleType === type.key && styles.cycleTypeBtnTextActive,
                      ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {(settings.cycleType === 'weekly' || settings.cycleType === 'biweekly') && (
              <View style={styles.settingsSection}>
                <View style={styles.settingsSectionHeader}>
                  <View style={[styles.settingsSectionIcon, {backgroundColor: '#dcfce7'}]}>
                    <Ionicons name="today-outline" size={20} color="#16a34a" />
                  </View>
                  <View>
                    <Text style={styles.settingsSectionTitle}>Cycle Day of Week</Text>
                    <Text style={styles.settingsSectionSubtitle}>
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
                        settings.cycleDayOfWeek === day.value && styles.dayOptionActive,
                      ]}
                      onPress={() => setSettings({...settings, cycleDayOfWeek: day.value})}>
                      <Text
                        style={[
                          styles.dayOptionText,
                          settings.cycleDayOfWeek === day.value && styles.dayOptionTextActive,
                        ]}>
                        {day.label.slice(0, 3)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.saveSettingsBtn,
                (!hasChanges || saving) && styles.saveSettingsBtnDisabled,
              ]}
              onPress={handleSaveSettings}
              disabled={!hasChanges || saving}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="save-outline" size={20} color="#fff" />
                  <Text style={styles.saveSettingsBtnText}>Save Settings</Text>
                </>
              )}
            </TouchableOpacity>

            {!hasChanges && !saving && (
              <Text style={styles.noChangesText}>No unsaved changes</Text>
            )}
          </View>
        )}

        {activeSubTab === 'history' && (
          <View>
            <Text style={styles.sectionTitle}>Payroll History</Text>
            <Text style={styles.historySubtitle}>
              Tap a period to view each salesperson's payroll
            </Text>

            {history.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyText}>No payroll history available.</Text>
              </View>
            ) : (
              history.map((item, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.7}
                  onPress={() =>
                    navigation.navigate('PayrollPeriodDetail', {
                      period: item.period,
                      isCurrent: idx === 0,
                    })
                  }
                  style={[styles.historyCard, idx === 0 && styles.historyCardCurrent]}>
                  <View style={styles.historyPeriod}>
                    <Text style={styles.historyLabel}>{item.period.label}</Text>
                    {idx === 0 && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                    )}
                    {item.finalized && (
                      <View style={styles.finalizedBadge}>
                        <Ionicons name="lock-closed" size={9} color="#15803d" />
                        <Text style={styles.finalizedBadgeText}>Finalized</Text>
                      </View>
                    )}
                    <View style={{flex: 1}} />
                    <Ionicons name="chevron-forward" size={18} color="#94a3b8" />
                  </View>
                  <View style={styles.historyStats}>
                    <View style={styles.historyStat}>
                      <Text style={styles.historyStatValue}>{item.employeeCount}</Text>
                      <Text style={styles.historyStatLabel}>Salespeople</Text>
                    </View>
                    <View style={styles.historyStat}>
                      <Text style={styles.historyStatValue}>{item.totalAgreements}</Text>
                      <Text style={styles.historyStatLabel}>Agreements</Text>
                    </View>
                    <View style={styles.historyStat}>
                      <Text style={styles.historyStatValue}>
                        {formatMoney(item.totalRevenue)}
                      </Text>
                      <Text style={styles.historyStatLabel}>Revenue</Text>
                    </View>
                    <View style={[styles.historyStat, styles.historyStatHighlight]}>
                      <Text style={[styles.historyStatValue, styles.historyStatValueHighlight]}>
                        {formatMoney(item.totalCommission)}
                      </Text>
                      <Text style={styles.historyStatLabel}>Commission</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backBtn: {
    padding: Spacing.xs,
  },
  headerTitle: {
    flex: 1,
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginLeft: Spacing.sm,
  },
  headerRight: {
    width: 32,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: '#64748b',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#fef2f2',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
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
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  successBannerText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: '#16a34a',
    fontWeight: '600',
  },
  subTabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  subTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: '#f1f5f9',
  },
  subTabBtnActive: {
    backgroundColor: Colors.primary,
  },
  subTabText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: '#64748b',
  },
  subTabTextActive: {
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  periodCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  periodTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#1e293b',
  },
  periodActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  periodInfo: {
    gap: 4,
  },
  periodLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#6366f1',
  },
  periodDates: {
    fontSize: FontSize.sm,
    color: '#64748b',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: Spacing.md,
  },
  emptyState: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: '#64748b',
    textAlign: 'center',
  },
  settingsSection: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  settingsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  settingsSectionIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsSectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#1e293b',
  },
  settingsSectionSubtitle: {
    fontSize: FontSize.xs,
    color: '#64748b',
    marginTop: 2,
  },
  settingsValue: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: Radius.md,
    padding: Spacing.md,
  },
  settingsValueText: {
    fontSize: FontSize.md,
    color: '#1e293b',
    fontWeight: '500',
  },
  cycleTypeOptions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  cycleTypeBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  cycleTypeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  cycleTypeBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: '#64748b',
  },
  cycleTypeBtnTextActive: {
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
    borderColor: '#e2e8f0',
    borderRadius: Radius.md,
  },
  dayOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  dayOptionText: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: '#64748b',
  },
  dayOptionTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  saveSettingsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  saveSettingsBtnDisabled: {
    opacity: 0.5,
  },
  saveSettingsBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  noChangesText: {
    fontSize: FontSize.sm,
    color: '#64748b',
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  historySubtitle: {
    fontSize: FontSize.sm,
    color: '#64748b',
    marginBottom: Spacing.md,
    marginTop: -Spacing.sm,
  },
  historyCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  historyCardCurrent: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  historyPeriod: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  historyLabel: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#1e293b',
  },
  currentBadge: {
    backgroundColor: '#6366f1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  currentBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  finalizedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  finalizedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#15803d',
  },
  historyStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  historyStat: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.md * 2 - Spacing.sm * 3) / 4,
    alignItems: 'center',
  },
  historyStatHighlight: {
    backgroundColor: '#f0fdf4',
    borderRadius: Radius.sm,
    padding: Spacing.xs,
  },
  historyStatValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#1e293b',
  },
  historyStatValueHighlight: {
    color: '#16a34a',
  },
  historyStatLabel: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
  },
});

export default PayrollScreen;
