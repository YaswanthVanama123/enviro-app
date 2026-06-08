import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  Share,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';
import type {
  EmployeePayroll,
  PayrollPeriod,
  PayrollTotals,
} from '../../../../services/api/endpoints/admin.api';
import {formatMoney, formatDate} from './payrollFormat';

const {width: SCREEN_WIDTH} = Dimensions.get('window');

interface Props {
  employees: EmployeePayroll[];
  totals: PayrollTotals | null;
  period: PayrollPeriod;
  showSummary?: boolean;
}

export function PayrollEmployeeList({
  employees,
  totals,
  period,
  showSummary = true,
}: Props) {
  const [expandedEmployee, setExpandedEmployee] = useState<string | null>(null);
  const [slipEmployee, setSlipEmployee] = useState<EmployeePayroll | null>(null);

  const shareSlip = async (emp: EmployeePayroll) => {
    let content = `PAYROLL STATEMENT\n`;
    content += `================\n\n`;
    content += `Employee: ${emp.username}\n`;
    content += `Period: ${period.label}\n`;
    content += `${formatDate(period.start)} - ${formatDate(period.end)}\n\n`;
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
  };

  return (
    <View>
      {showSummary && totals && (
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
            <Text style={styles.summaryValue}>
              {formatMoney(totals.totalMonthlyRevenue)}
            </Text>
          </View>
        </View>
      )}

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
                    {emp.totalAgreements} agreements ·{' '}
                    {formatMoney(emp.totalMonthlyRevenue)}/mo
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
                  <TouchableOpacity
                    style={styles.viewPayrollBtn}
                    onPress={() => setSlipEmployee(emp)}>
                    <Ionicons name="document-text-outline" size={18} color="#fff" />
                    <Text style={styles.viewPayrollBtnText}>View Payroll Slip</Text>
                  </TouchableOpacity>

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

      <Modal
        visible={slipEmployee !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSlipEmployee(null)}>
        {slipEmployee && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payroll Statement</Text>
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalShareBtn}
                  onPress={() => shareSlip(slipEmployee)}>
                  <Ionicons name="share-outline" size={20} color="#6366f1" />
                  <Text style={styles.modalShareBtnText}>Share</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setSlipEmployee(null)}>
                  <Ionicons name="close" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.payslipHeader}>
                <Text style={styles.payslipCompanyName}>ENVIRO-MASTER</Text>
                <Text style={styles.payslipTagline}>Services International</Text>
              </View>

              <View style={styles.payslipInfoGrid}>
                <View style={styles.payslipInfoBox}>
                  <Text style={styles.payslipInfoBoxHeader}>Employee Information</Text>
                  <View style={styles.payslipInfoRow}>
                    <Text style={styles.payslipInfoLabel}>Employee Name</Text>
                    <Text style={styles.payslipInfoValue}>{slipEmployee.username}</Text>
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
                    <Text style={styles.payslipInfoValue}>{period.label}</Text>
                  </View>
                  <View style={styles.payslipInfoRow}>
                    <Text style={styles.payslipInfoLabel}>Dates</Text>
                    <Text style={styles.payslipInfoValue}>
                      {formatDate(period.start)} - {formatDate(period.end)}
                    </Text>
                  </View>
                </View>
              </View>

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
                {slipEmployee.agreements.map(agreement => (
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

              <View style={styles.payslipSummary}>
                <View style={styles.payslipSummaryRow}>
                  <Text style={styles.payslipSummaryLabel}>Total Agreements</Text>
                  <Text style={styles.payslipSummaryValue}>
                    {slipEmployee.totalAgreements}
                  </Text>
                </View>
                <View style={styles.payslipSummaryRow}>
                  <Text style={styles.payslipSummaryLabel}>Total Monthly Revenue</Text>
                  <Text style={styles.payslipSummaryValue}>
                    {formatMoney(slipEmployee.totalMonthlyRevenue)}
                  </Text>
                </View>
                <View style={[styles.payslipSummaryRow, styles.payslipSummaryRowTotal]}>
                  <Text style={styles.payslipSummaryLabelTotal}>NET PAY</Text>
                  <Text style={styles.payslipSummaryValueTotal}>
                    {formatMoney(slipEmployee.totalAnnualCommission)}
                  </Text>
                </View>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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

export default PayrollEmployeeList;
