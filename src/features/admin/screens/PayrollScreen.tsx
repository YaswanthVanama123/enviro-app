import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Dimensions,
  Share,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';
import {
  adminApi,
  type PayrollPeriod,
  type PayrollTotals,
  type EmployeePayroll,
  type PayrollHistoryItem,
  type PayrollSettings,
} from '../../../services/api/endpoints/admin.api';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

type SubTab = 'overview' | 'settings' | 'history';

const STATUS_COLORS: Record<string, {bg: string; text: string}> = {
  draft: {bg: '#f3f4f6', text: '#6b7280'},
  saved: {bg: '#dbeafe', text: '#1d4ed8'},
  pending_approval: {bg: '#fef3c7', text: '#92400e'},
  approved: {bg: '#d1fae5', text: '#065f46'},
  active: {bg: '#dcfce7', text: '#16a34a'},
};

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

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatLongDate(dateStr: string): string {
  if (!dateStr) return 'Not set';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function PayrollScreen() {
  const navigation = useNavigation();
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
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);

  const [history, setHistory] = useState<PayrollHistoryItem[]>([]);

  const [viewingPayrollSlip, setViewingPayrollSlip] = useState<EmployeePayroll | null>(null);

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

      {}
      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="#dc2626" />
          <Text style={styles.errorBannerText}>{error}</Text>
          <TouchableOpacity onPress={() => setError(null)}>
            <Ionicons name="close" size={20} color="#dc2626" />
          </TouchableOpacity>
        </View>
      )}

      {}
      {successMessage && (
        <View style={styles.successBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#16a34a" />
          <Text style={styles.successBannerText}>{successMessage}</Text>
        </View>
      )}

      {}
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
        {}
        {activeSubTab === 'overview' && (
          <View>
            {}
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

            {}
            {totals && (
              <View style={styles.summaryGrid}>
                <View style={[styles.summaryCard, styles.summaryCardPrimary]}>
                  <View style={[styles.summaryIcon, styles.summaryIconPrimary]}>
                    <Ionicons name="cash-outline" size={24} color="#fff" />
                  </View>
                  <View style={styles.summaryContent}>
                    <Text style={[styles.summaryLabel, styles.summaryLabelPrimary]}>
                      Total Commission Payout
                    </Text>
                    <Text style={[styles.summaryValue, styles.summaryValuePrimary]}>
                      {formatMoney(totals.totalAnnualCommission)}
                    </Text>
                  </View>
                </View>

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Salespeople</Text>
                  <Text style={styles.summaryValue}>{totals.totalEmployees}</Text>
                </View>

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Agreements</Text>
                  <Text style={styles.summaryValue}>{totals.totalAgreements}</Text>
                </View>

                <View style={styles.summaryCard}>
                  <Text style={styles.summaryLabel}>Total Revenue</Text>
                  <Text style={styles.summaryValue}>{formatMoney(totals.totalMonthlyRevenue)}</Text>
                </View>
              </View>
            )}

            {}
            <View style={styles.employeesSection}>
              <Text style={styles.sectionTitle}>Salesperson Commissions</Text>

              {employees.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="document-text-outline" size={48} color="#94a3b8" />
                  <Text style={styles.emptyText}>No agreements found for this period.</Text>
                </View>
              ) : (
                employees.map(emp => (
                  <View
                    key={emp.username}
                    style={[
                      styles.employeeCard,
                      expandedEmployee === emp.username && styles.employeeCardExpanded,
                    ]}>
                    <TouchableOpacity
                      style={styles.employeeHeader}
                      onPress={() =>
                        setExpandedEmployee(
                          expandedEmployee === emp.username ? null : emp.username,
                        )
                      }
                      activeOpacity={0.7}>
                      <View style={styles.employeeAvatar}>
                        <Text style={styles.employeeAvatarText}>
                          {emp.username.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.employeeInfo}>
                        <Text style={styles.employeeName}>{emp.username}</Text>
                        <Text style={styles.employeeMeta}>
                          {emp.totalAgreements} agreements · {formatMoney(emp.totalMonthlyRevenue)}/mo
                        </Text>
                      </View>
                      <View style={styles.employeeCommission}>
                        <Text style={styles.commissionAmount}>
                          {formatMoney(emp.totalAnnualCommission)}
                        </Text>
                        <Text style={styles.commissionLabel}>Commission</Text>
                      </View>
                      <Ionicons
                        name={expandedEmployee === emp.username ? 'chevron-up' : 'chevron-down'}
                        size={20}
                        color="#94a3b8"
                      />
                    </TouchableOpacity>

                    {expandedEmployee === emp.username && (
                      <View style={styles.employeeDetails}>
                        {}
                        <TouchableOpacity
                          style={styles.viewPayrollBtn}
                          onPress={() => setViewingPayrollSlip(emp)}>
                          <Ionicons name="document-text-outline" size={18} color="#fff" />
                          <Text style={styles.viewPayrollBtnText}>View Payroll Slip</Text>
                        </TouchableOpacity>

                        {}
                        <View style={styles.statusBreakdown}>
                          <View style={[styles.statusChip, {backgroundColor: '#f3f4f6'}]}>
                            <Text style={[styles.statusChipText, {color: '#6b7280'}]}>
                              Draft: {emp.statusCounts.draft}
                            </Text>
                          </View>
                          <View style={[styles.statusChip, {backgroundColor: '#dbeafe'}]}>
                            <Text style={[styles.statusChipText, {color: '#1d4ed8'}]}>
                              Saved: {emp.statusCounts.saved}
                            </Text>
                          </View>
                          <View style={[styles.statusChip, {backgroundColor: '#fef3c7'}]}>
                            <Text style={[styles.statusChipText, {color: '#92400e'}]}>
                              Pending: {emp.statusCounts.pending_approval}
                            </Text>
                          </View>
                          <View style={[styles.statusChip, {backgroundColor: '#d1fae5'}]}>
                            <Text style={[styles.statusChipText, {color: '#065f46'}]}>
                              Approved: {emp.statusCounts.approved}
                            </Text>
                          </View>
                          <View style={[styles.statusChip, {backgroundColor: '#dcfce7'}]}>
                            <Text style={[styles.statusChipText, {color: '#16a34a'}]}>
                              Active: {emp.statusCounts.active}
                            </Text>
                          </View>
                        </View>

                        {}
                        <Text style={styles.agreementsTitle}>Agreements</Text>
                        {emp.agreements.map(agreement => (
                          <View key={agreement.id} style={styles.agreementItem}>
                            <View style={styles.agreementInfo}>
                              <Text style={styles.agreementTitle} numberOfLines={1}>
                                {agreement.title}
                              </Text>
                              <Text style={styles.agreementDate}>
                                {formatDate(agreement.createdAt)}
                              </Text>
                            </View>
                            <View style={styles.agreementValues}>
                              <Text style={styles.agreementRevenue}>
                                {formatMoney(agreement.monthlyValue)}/mo
                              </Text>
                              <Text style={styles.agreementCommission}>
                                {formatMoney(agreement.annualCommission)}
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {}
        {activeSubTab === 'settings' && (
          <View>
            {}
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

            {}
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

            {}
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

            {}
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

        {}
        {activeSubTab === 'history' && (
          <View>
            <Text style={styles.sectionTitle}>Payroll History</Text>
            <Text style={styles.historySubtitle}>Past payroll periods and their totals</Text>

            {history.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={48} color="#94a3b8" />
                <Text style={styles.emptyText}>No payroll history available.</Text>
              </View>
            ) : (
              history.map((period, idx) => (
                <View
                  key={idx}
                  style={[styles.historyCard, idx === 0 && styles.historyCardCurrent]}>
                  <View style={styles.historyPeriod}>
                    <Text style={styles.historyLabel}>{period.period.label}</Text>
                    {idx === 0 && (
                      <View style={styles.currentBadge}>
                        <Text style={styles.currentBadgeText}>Current</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.historyStats}>
                    <View style={styles.historyStat}>
                      <Text style={styles.historyStatValue}>{period.employeeCount}</Text>
                      <Text style={styles.historyStatLabel}>Salespeople</Text>
                    </View>
                    <View style={styles.historyStat}>
                      <Text style={styles.historyStatValue}>{period.totalAgreements}</Text>
                      <Text style={styles.historyStatLabel}>Agreements</Text>
                    </View>
                    <View style={styles.historyStat}>
                      <Text style={styles.historyStatValue}>
                        {formatMoney(period.totalRevenue)}
                      </Text>
                      <Text style={styles.historyStatLabel}>Revenue</Text>
                    </View>
                    <View style={[styles.historyStat, styles.historyStatHighlight]}>
                      <Text style={[styles.historyStatValue, styles.historyStatValueHighlight]}>
                        {formatMoney(period.totalCommission)}
                      </Text>
                      <Text style={styles.historyStatLabel}>Commission</Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        <View style={{height: 40}} />
      </ScrollView>

      {}
      <Modal
        visible={viewingPayrollSlip !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setViewingPayrollSlip(null)}>
        {viewingPayrollSlip && currentPeriod && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payroll Statement</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalShareBtn}
                  onPress={async () => {
                    const emp = viewingPayrollSlip;
                    let content = `PAYROLL STATEMENT\n`;
                    content += `================\n\n`;
                    content += `Employee: ${emp.username}\n`;
                    content += `Period: ${currentPeriod.label}\n`;
                    content += `${formatDate(currentPeriod.start)} - ${formatDate(currentPeriod.end)}\n\n`;
                    content += `COMMISSION EARNINGS\n`;
                    content += `-------------------\n`;
                    emp.agreements.forEach(a => {
                      content += `${a.title}\n`;
                      content += `  ${formatMoney(a.monthlyValue)}/mo → ${formatMoney(a.annualCommission)}\n`;
                    });
                    content += `\nTOTAL: ${formatMoney(emp.totalAnnualCommission)}\n`;

                    try {
                      await Share.share({message: content});
                    } catch (err) {
                      console.error('Share failed:', err);
                    }
                  }}>
                  <Ionicons name="share-outline" size={20} color="#6366f1" />
                  <Text style={styles.modalShareBtnText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setViewingPayrollSlip(null)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalContent}>
              {}
              <View style={styles.payslipHeader}>
                <Text style={styles.payslipCompanyName}>ENVIRO-MASTER</Text>
                <Text style={styles.payslipTagline}>Services International</Text>
              </View>

              {}
              <View style={styles.payslipInfoGrid}>
                <View style={styles.payslipInfoBox}>
                  <Text style={styles.payslipInfoBoxHeader}>Employee Information</Text>
                  <View style={styles.payslipInfoRow}>
                    <Text style={styles.payslipInfoLabel}>Employee Name</Text>
                    <Text style={styles.payslipInfoValue}>{viewingPayrollSlip.username}</Text>
                  </View>
                  <View style={styles.payslipInfoRow}>
                    <Text style={styles.payslipInfoLabel}>Department</Text>
                    <Text style={styles.payslipInfoValue}>Sales</Text>
                  </View>
                </View>

                <View style={styles.payslipInfoBox}>
                  <Text style={styles.payslipInfoBoxHeader}>Pay Period</Text>
                  <View style={styles.payslipInfoRow}>
                    <Text style={styles.payslipInfoLabel}>Period</Text>
                    <Text style={styles.payslipInfoValue}>{currentPeriod.label}</Text>
                  </View>
                  <View style={styles.payslipInfoRow}>
                    <Text style={styles.payslipInfoLabel}>Dates</Text>
                    <Text style={styles.payslipInfoValue}>
                      {formatDate(currentPeriod.start)} - {formatDate(currentPeriod.end)}
                    </Text>
                  </View>
                </View>
              </View>

              {}
              <View style={styles.payslipEarningsSection}>
                <Text style={styles.payslipSectionTitle}>Commission Earnings</Text>
                <View style={styles.payslipTableHeader}>
                  <Text style={[styles.payslipTableHeaderText, {flex: 2}]}>Description</Text>
                  <Text style={[styles.payslipTableHeaderText, {flex: 1, textAlign: 'right'}]}>
                    Value
                  </Text>
                  <Text style={[styles.payslipTableHeaderText, {flex: 1, textAlign: 'right'}]}>
                    Commission
                  </Text>
                </View>
                {viewingPayrollSlip.agreements.map(agreement => (
                  <View key={agreement.id} style={styles.payslipTableRow}>
                    <View style={{flex: 2}}>
                      <Text style={styles.payslipAgreementName} numberOfLines={1}>
                        {agreement.title}
                      </Text>
                      <Text style={styles.payslipAgreementDate}>
                        {formatDate(agreement.createdAt)}
                      </Text>
                    </View>
                    <Text style={[styles.payslipTableCell, {flex: 1, textAlign: 'right'}]}>
                      {formatMoney(agreement.monthlyValue)}/mo
                    </Text>
                    <Text
                      style={[
                        styles.payslipTableCell,
                        styles.payslipCommissionCell,
                        {flex: 1, textAlign: 'right'},
                      ]}>
                      {formatMoney(agreement.annualCommission)}
                    </Text>
                  </View>
                ))}
              </View>

              {}
              <View style={styles.payslipSummary}>
                <View style={styles.payslipSummaryRow}>
                  <Text style={styles.payslipSummaryLabel}>Total Agreements</Text>
                  <Text style={styles.payslipSummaryValue}>
                    {viewingPayrollSlip.totalAgreements}
                  </Text>
                </View>
                <View style={styles.payslipSummaryRow}>
                  <Text style={styles.payslipSummaryLabel}>Total Monthly Revenue</Text>
                  <Text style={styles.payslipSummaryValue}>
                    {formatMoney(viewingPayrollSlip.totalMonthlyRevenue)}
                  </Text>
                </View>
                <View style={[styles.payslipSummaryRow, styles.payslipSummaryRowTotal]}>
                  <Text style={styles.payslipSummaryLabelTotal}>NET PAY</Text>
                  <Text style={styles.payslipSummaryValueTotal}>
                    {formatMoney(viewingPayrollSlip.totalAnnualCommission)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
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
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - Spacing.lg * 2 - Spacing.sm) / 2 - 1,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryCardPrimary: {
    backgroundColor: '#6366f1',
    minWidth: SCREEN_WIDTH - Spacing.lg * 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  summaryIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryIconPrimary: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  summaryContent: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  summaryLabelPrimary: {
    color: 'rgba(255,255,255,0.8)',
  },
  summaryValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#1e293b',
    marginTop: 4,
  },
  summaryValuePrimary: {
    color: '#fff',
    fontSize: 24,
  },
  employeesSection: {
    marginBottom: Spacing.lg,
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
  employeeCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  employeeCardExpanded: {
    borderWidth: 1,
    borderColor: '#6366f1',
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  employeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6366f1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  employeeAvatarText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#1e293b',
  },
  employeeMeta: {
    fontSize: FontSize.xs,
    color: '#64748b',
    marginTop: 2,
  },
  employeeCommission: {
    alignItems: 'flex-end',
  },
  commissionAmount: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#7c3aed',
  },
  commissionLabel: {
    fontSize: 10,
    color: '#94a3b8',
  },
  employeeDetails: {
    backgroundColor: '#f8fafc',
    padding: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  viewPayrollBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#6366f1',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  viewPayrollBtnText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  statusBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: Spacing.md,
  },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  agreementsTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#475569',
    marginBottom: Spacing.sm,
  },
  agreementItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: 6,
  },
  agreementInfo: {
    flex: 1,
  },
  agreementTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#1e293b',
  },
  agreementDate: {
    fontSize: 11,
    color: '#94a3b8',
  },
  agreementValues: {
    alignItems: 'flex-end',
  },
  agreementRevenue: {
    fontSize: FontSize.xs,
    color: '#64748b',
  },
  agreementCommission: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#7c3aed',
  },
  
  settingsSection: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
  
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#1e293b',
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  modalShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#eef2ff',
    borderRadius: Radius.md,
  },
  modalShareBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#6366f1',
  },
  modalCloseBtn: {
    padding: Spacing.xs,
  },
  modalContent: {
    flex: 1,
    padding: Spacing.lg,
  },
  payslipHeader: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: '#6366f1',
  },
  payslipCompanyName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#6366f1',
  },
  payslipTagline: {
    fontSize: FontSize.sm,
    color: '#64748b',
    marginTop: 4,
  },
  payslipInfoGrid: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  payslipInfoBox: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  payslipInfoBoxHeader: {
    backgroundColor: '#6366f1',
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: '700',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  payslipInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  payslipInfoLabel: {
    fontSize: FontSize.sm,
    color: '#64748b',
  },
  payslipInfoValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#1e293b',
  },
  payslipEarningsSection: {
    marginBottom: Spacing.lg,
  },
  payslipSectionTitle: {
    backgroundColor: '#6366f1',
    color: '#fff',
    fontSize: FontSize.xs,
    fontWeight: '700',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopLeftRadius: Radius.md,
    borderTopRightRadius: Radius.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    overflow: 'hidden',
  },
  payslipTableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#e2e8f0',
  },
  payslipTableHeaderText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  payslipTableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderWidth: 1,
    borderTopWidth: 0,
    borderColor: '#e2e8f0',
  },
  payslipAgreementName: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#1e293b',
  },
  payslipAgreementDate: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  payslipTableCell: {
    fontSize: FontSize.sm,
    color: '#1e293b',
  },
  payslipCommissionCell: {
    fontWeight: '700',
    color: '#7c3aed',
  },
  payslipSummary: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: '#6366f1',
    overflow: 'hidden',
  },
  payslipSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  payslipSummaryLabel: {
    fontSize: FontSize.sm,
    color: '#64748b',
  },
  payslipSummaryValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: '#1e293b',
  },
  payslipSummaryRowTotal: {
    backgroundColor: '#6366f1',
    borderBottomWidth: 0,
    paddingVertical: Spacing.md,
  },
  payslipSummaryLabelTotal: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  payslipSummaryValueTotal: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
});

export default PayrollScreen;
