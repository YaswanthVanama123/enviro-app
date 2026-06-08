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
import {useNavigation, useRoute, type RouteProp} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';
import type {RootStackParamList} from '../../../app/navigation/types';
import {
  adminApi,
  type PayrollTotals,
  type EmployeePayroll,
} from '../../../services/api/endpoints/admin.api';
import {PayrollEmployeeList} from '../components/payroll/PayrollEmployeeList';
import {formatDate} from '../components/payroll/payrollFormat';

type DetailRoute = RouteProp<RootStackParamList, 'PayrollPeriodDetail'>;

export function PayrollPeriodDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<DetailRoute>();
  const {period, isCurrent} = route.params;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeePayroll[]>([]);
  const [totals, setTotals] = useState<PayrollTotals | null>(null);
  const [finalized, setFinalized] = useState(false);

  const loadData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const res = await adminApi.getPayrollEmployees(period.start, period.end);
        if (res) {
          setEmployees(res.employees);
          setTotals(res.totals);
          setFinalized(!!res.finalized);
        } else {
          setEmployees([]);
          setTotals(null);
          setError('Failed to load payroll for this period');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load payroll for this period');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [period.start, period.end],
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Period Payroll</Text>
        <View style={styles.headerRight} />
      </View>

      {error && (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={20} color="#dc2626" />
          <Text style={styles.errorBannerText}>{error}</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            tintColor={Colors.primary}
          />
        }>
        <View style={styles.periodCard}>
          <View style={styles.periodTitleRow}>
            <Text style={styles.periodTitle}>Payroll Period</Text>
            {isCurrent && (
              <View style={styles.currentBadge}>
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            )}
            {finalized && (
              <View style={styles.finalizedBadge}>
                <Ionicons name="lock-closed" size={10} color="#15803d" />
                <Text style={styles.finalizedBadgeText}>Finalized</Text>
              </View>
            )}
          </View>
          <Text style={styles.periodLabel}>{period.label}</Text>
          <Text style={styles.periodDates}>
            {formatDate(period.start)} - {formatDate(period.end)}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading payroll…</Text>
          </View>
        ) : (
          <PayrollEmployeeList
            employees={employees}
            totals={totals}
            period={period}
            showSummary
          />
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
  periodTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  periodTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
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
  periodLabel: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#6366f1',
  },
  periodDates: {
    fontSize: FontSize.sm,
    color: '#64748b',
    marginTop: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl * 2,
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: FontSize.md,
    color: '#64748b',
  },
});

export default PayrollPeriodDetailScreen;
