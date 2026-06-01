

import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors, Spacing, Radius, FontSize} from '../../../theme';
import {biginAuditApi} from '../../../services/api/endpoints/biginAudit.api';
import {useAdminAuth} from '../../admin/context/AdminAuthContext';

interface InsideSalesResult {
  salespersonName: string;
  isInsideSales: boolean;
  matchCount: number;
  totalAgreementsByUser?: number;
  agreementCount?: number;
  biginIdCount?: number;
  allBiginIds?: string[];
  agreementDetails?: Array<{
    agreementId?: string;
    biginId: string | null;
    title: string;
    createdAt: string;
    createdBy?: string;
    dealName?: string;
  }>;
  matchedBiginIds?: string[];
  message?: string;
  matchDetails: Array<{
    recordId?: string;
    recordName: string;
    action: string;
    timestamp: string;
    module: string;
  }>;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function MyInsideSalesScreen() {
  const {adminUser} = useAdminAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InsideSalesResult | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkEligibility = useCallback(async (isRefresh = false) => {
    const salespersonName = adminUser?.fullName || adminUser?.username;

    if (!salespersonName) {
      setError('User not logged in');
      setLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      console.log('Checking inside sales for:', salespersonName);
      const response = await biginAuditApi.checkInsideSalesEligibility(salespersonName);

      if (response?.success && response.data) {
        setResult(response.data);
        setLastChecked(new Date());
      } else {
        setError('Failed to check inside sales status');
      }
    } catch (err: any) {
      console.error('Error checking inside sales:', err);
      setError(err.message || 'Error checking inside sales status');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [adminUser?.fullName, adminUser?.username]);

  useEffect(() => {
    checkEligibility();
  }, [checkEligibility]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Checking your Inside Sales status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.error}>
          <Ionicons name="alert-circle-outline" size={48} color="#dc2626" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => checkEligibility()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  
  
  const statusColor = result?.isInsideSales ? '#d97706' : '#059669';
  const statusBgColor = result?.isInsideSales ? '#fef3c7' : '#dcfce7';
  const statusBorderColor = result?.isInsideSales ? '#fcd34d' : '#86efac';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => checkEligibility(true)}
            colors={[Colors.primary]}
          />
        }>
        {}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <View style={styles.iconBox}>
              <Ionicons name="analytics" size={24} color={Colors.primary} />
            </View>
            <View style={styles.titleContent}>
              <Text style={styles.title}>Inside Sales Status</Text>
              <Text style={styles.subtitle}>
                Based on Lisa Rothwell's audit history
              </Text>
            </View>
          </View>
        </View>

        {result && (
          <>
            {/* Status Card */}
            <View style={[styles.statusCard, {borderColor: statusBorderColor, backgroundColor: statusBgColor}]}>
              <View style={styles.statusHeader}>
                <View style={styles.statusIconContainer}>
                  <Ionicons
                    name={result.isInsideSales ? 'alert-circle' : 'checkmark-circle'}
                    size={48}
                    color={statusColor}
                  />
                </View>
                <View style={styles.statusContent}>
                  <Text style={[styles.statusTitle, {color: statusColor}]}>
                    {result.isInsideSales ? 'Inside Sales (3% Deduction)' : 'No Inside Sales Deduction'}
                  </Text>
                  <Text style={styles.statusDetails}>
                    {result.totalAgreementsByUser || 0} total agreement{(result.totalAgreementsByUser || 0) !== 1 ? 's' : ''} | {' '}
                    {result.agreementCount || 0} uploaded to Bigin | {' '}
                    {result.matchCount} found in audit
                  </Text>
                  {result.message && (
                    <Text style={styles.statusMessage}>{result.message}</Text>
                  )}
                  {lastChecked && (
                    <Text style={styles.lastChecked}>
                      Last checked: {formatDate(lastChecked.toISOString())}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Stats Cards */}
            <View style={styles.statsRow}>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{result.totalAgreementsByUser || 0}</Text>
                <Text style={styles.statLabel}>Total Agreements</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{result.agreementCount || 0}</Text>
                <Text style={styles.statLabel}>Uploaded to Bigin</Text>
              </View>
              <View style={styles.statCard}>
                <Text style={styles.statValue}>{result.matchCount}</Text>
                <Text style={styles.statLabel}>Found in Audit</Text>
              </View>
            </View>

            {/* Matching Audit Records */}
            {result.matchCount > 0 && result.matchDetails.length > 0 && (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>Matching Audit Records</Text>
                <Text style={styles.sectionSubtitle}>
                  Found in Lisa Rothwell's audit history (last 1 year)
                </Text>
                {result.matchDetails.map((match, idx) => (
                  <View key={idx} style={styles.matchRow}>
                    <View style={styles.matchInfo}>
                      <Text style={styles.matchBiginId}>{match.recordId || '-'}</Text>
                      <Text style={styles.matchName}>{match.recordName || '-'}</Text>
                    </View>
                    <View style={styles.matchMeta}>
                      <View style={styles.actionBadge}>
                        <Text style={styles.actionBadgeText}>{match.action}</Text>
                      </View>
                      <Text style={styles.matchDate}>{formatDate(match.timestamp)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>
                Your Agreements ({result.totalAgreementsByUser || 0} total, {result.agreementCount || 0} uploaded)
              </Text>
              <Text style={styles.sectionSubtitle}>
                List of your agreements and their Bigin upload status
              </Text>
              {result.agreementDetails && result.agreementDetails.length > 0 ? (
                result.agreementDetails.map((agreement, idx) => {
                  const hasBiginId = agreement.biginId && agreement.biginId.trim() !== '';
                  const isMatched = hasBiginId && result.matchedBiginIds?.includes(agreement.biginId!);
                  return (
                    <View
                      key={idx}
                      style={[
                        styles.agreementRow,
                        isMatched && styles.agreementRowMatched,
                        !hasBiginId && styles.agreementRowNotUploaded,
                      ]}>
                      <View style={styles.agreementInfo}>
                        <Text style={styles.agreementTitle}>{agreement.title}</Text>
                        <Text style={styles.agreementBiginId}>
                          {hasBiginId ? agreement.biginId : 'Not uploaded to Bigin'}
                        </Text>
                        {agreement.dealName && (
                          <Text style={styles.agreementDealName}>{agreement.dealName}</Text>
                        )}
                      </View>
                      <View style={styles.agreementMeta}>
                        <View style={[
                          styles.statusBadge,
                          !hasBiginId && styles.statusBadgePending,
                          isMatched && styles.statusBadgeSuccess,
                          hasBiginId && !isMatched && styles.statusBadgeNeutral,
                        ]}>
                          <Text style={[
                            styles.statusBadgeText,
                            !hasBiginId && styles.statusBadgeTextPending,
                            isMatched && styles.statusBadgeTextSuccess,
                            hasBiginId && !isMatched && styles.statusBadgeTextNeutral,
                          ]}>
                            {!hasBiginId ? 'Not Uploaded' : isMatched ? 'In Audit' : 'Not in Audit'}
                          </Text>
                        </View>
                        <Text style={styles.agreementDate}>{formatDate(agreement.createdAt)}</Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <Text style={styles.emptyText}>
                  No agreements found. Create agreements and upload them to Bigin.
                </Text>
              )}
            </View>

            {}
            <View style={styles.infoCard}>
              <Text style={styles.infoTitle}>How Inside Sales Works</Text>
              <View style={styles.infoItem}>
                <Ionicons name="document-text-outline" size={16} color="#1e40af" />
                <Text style={styles.infoText}>
                  When you create and upload agreements to Bigin, they get a Bigin Deal ID
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="person-outline" size={16} color="#1e40af" />
                <Text style={styles.infoText}>
                  Lisa Rothwell processes these deals, creating audit records
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="search-outline" size={16} color="#1e40af" />
                <Text style={styles.infoText}>
                  If your Bigin IDs appear in Lisa's audit history (last 1 year), you are Inside Sales
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="warning-outline" size={16} color="#d97706" />
                <Text style={styles.infoText}>
                  Inside Sales = 3% deduction from commission
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons name="checkmark-circle-outline" size={16} color="#059669" />
                <Text style={styles.infoText}>
                  No matches = No deduction - you keep full commission
                </Text>
              </View>
            </View>
          </>
        )}

        <View style={{height: 100}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scroll: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
  error: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  errorTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#dc2626',
    marginTop: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  retryBtn: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  retryBtnText: {
    color: '#fff',
    fontWeight: '600',
  },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContent: {
    flex: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statusCard: {
    marginHorizontal: Spacing.lg,
    marginTop: -Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  statusIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusContent: {
    flex: 1,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusDetails: {
    fontSize: FontSize.sm,
    color: '#475569',
    marginBottom: 4,
  },
  statusMessage: {
    fontSize: FontSize.sm,
    color: '#64748b',
    fontStyle: 'italic',
    marginBottom: 4,
  },
  lastChecked: {
    fontSize: FontSize.xs,
    color: '#94a3b8',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#fff',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    marginBottom: Spacing.md,
  },
  matchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  matchInfo: {
    flex: 1,
  },
  matchBiginId: {
    fontSize: FontSize.sm,
    fontFamily: 'monospace',
    color: Colors.textPrimary,
  },
  matchName: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },
  matchMeta: {
    alignItems: 'flex-end',
  },
  actionBadge: {
    backgroundColor: '#dbeafe',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  actionBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: '#1d4ed8',
    textTransform: 'capitalize',
  },
  matchDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  agreementRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  agreementRowMatched: {
    backgroundColor: '#f0fdf4',
  },
  agreementRowNotUploaded: {
    backgroundColor: '#fffbeb',
  },
  agreementInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  agreementTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  agreementBiginId: {
    fontSize: FontSize.xs,
    fontFamily: 'monospace',
    color: Colors.textMuted,
    marginTop: 2,
  },
  agreementDealName: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  agreementMeta: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
    backgroundColor: '#f1f5f9',
  },
  statusBadgePending: {
    backgroundColor: '#fef3c7',
  },
  statusBadgeSuccess: {
    backgroundColor: '#dcfce7',
  },
  statusBadgeNeutral: {
    backgroundColor: '#f1f5f9',
  },
  statusBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: '#64748b',
  },
  statusBadgeTextPending: {
    color: '#d97706',
  },
  statusBadgeTextSuccess: {
    color: '#059669',
  },
  statusBadgeTextNeutral: {
    color: '#64748b',
  },
  agreementDate: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 4,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoTitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#1e40af',
    marginBottom: Spacing.md,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: FontSize.sm,
    color: '#1e40af',
    lineHeight: 20,
  },
});

export default MyInsideSalesScreen;
