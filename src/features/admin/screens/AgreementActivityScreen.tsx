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
import {
  agreementActivityApi,
  type ActivityRange,
  type ActivityAgreement,
  type AgreementActivityResponse,
} from '../../../services/api/endpoints/agreementActivity.api';
import {adminApi, type PayrollPeriod} from '../../../services/api/endpoints/admin.api';

type UIRange = ActivityRange | 'thisPayroll' | 'previousPayroll';
type FilterMode = 'created' | 'payroll';

interface PayrollPeriods {
  current?: PayrollPeriod;
  previous?: PayrollPeriod;
}

const RANGES: {key: UIRange; label: string}[] = [
  {key: 'today', label: 'Today'},
  {key: 'week', label: 'This Week'},
  {key: 'month', label: 'This Month'},
  {key: 'thisPayroll', label: 'This Payroll'},
  {key: 'previousPayroll', label: 'Previous Payroll'},
  {key: 'date', label: 'Specific Date'},
];

const CREATED_KEYS: UIRange[] = ['today', 'week', 'month', 'date'];
const PAYROLL_KEYS: UIRange[] = ['thisPayroll', 'previousPayroll'];

const STATUS_COLORS: Record<string, {bg: string; text: string}> = {
  draft: {bg: '#f3f4f6', text: '#6b7280'},
  saved: {bg: '#dbeafe', text: '#1d4ed8'},
  pending_approval: {bg: '#fef3c7', text: '#92400e'},
  approved_salesman: {bg: '#d1fae5', text: '#065f46'},
  approved_admin: {bg: '#064e3b', text: '#ffffff'},
  active: {bg: '#dcfce7', text: '#16a34a'},
};

const STATUS_LABELS: Record<string, string> = {
  draft: 'Draft',
  saved: 'Saved',
  pending_approval: 'Pending',
  approved_salesman: 'Approved',
  approved_admin: 'Admin Approved',
  active: 'Active',
  finalized: 'Active',
};

function toYmd(date: Date): string {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${day}`;
}

function localDateStr(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return toYmd(d);
}

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

export function AgreementActivityScreen() {
  const navigation = useNavigation();
  const [range, setRange] = useState<UIRange>('today');
  const [filterMode, setFilterMode] = useState<FilterMode>('created');
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [payrollPeriods, setPayrollPeriods] = useState<PayrollPeriods>({});
  const [data, setData] = useState<AgreementActivityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [agreementsByUser, setAgreementsByUser] = useState<Record<string, ActivityAgreement[]>>({});
  const [loadingByUser, setLoadingByUser] = useState<Record<string, boolean>>({});

  useEffect(() => {
    adminApi
      .getPayrollPeriods()
      .then(res => {
        if (res?.periods) setPayrollPeriods(res.periods);
      })
      .catch(() => {});
  }, []);

  const resolveApiArgs = useCallback((): {
    apiRange: ActivityRange;
    dates: {from?: string; to?: string};
  } => {
    if (range === 'thisPayroll' || range === 'previousPayroll') {
      const p = range === 'thisPayroll' ? payrollPeriods.current : payrollPeriods.previous;
      if (p) return {apiRange: 'date', dates: {from: localDateStr(p.start), to: localDateStr(p.end)}};
      return {apiRange: 'date', dates: {}};
    }
    if (range === 'date') return {apiRange: 'date', dates: {from: toYmd(fromDate), to: toYmd(toDate)}};
    return {apiRange: range as ActivityRange, dates: {}};
  }, [range, fromDate, toDate, payrollPeriods]);

  const load = useCallback(async () => {
    setLoading(true);
    setExpanded({});
    setAgreementsByUser({});
    setLoadingByUser({});
    const {apiRange, dates} = resolveApiArgs();
    const res = await agreementActivityApi.getActivity(apiRange, dates);
    setData(res);
    setLoading(false);
  }, [resolveApiArgs]);

  useEffect(() => {
    load();
  }, [load]);

  const loadEmployee = useCallback(
    async (username: string) => {
      setLoadingByUser(prev => ({...prev, [username]: true}));
      const {apiRange, dates} = resolveApiArgs();
      const rows = await agreementActivityApi.getEmployeeAgreements(username, apiRange, dates);
      setAgreementsByUser(prev => ({...prev, [username]: rows || []}));
      setLoadingByUser(prev => ({...prev, [username]: false}));
    },
    [resolveApiArgs],
  );

  const toggle = (username: string) => {
    setExpanded(prev => {
      const open = !prev[username];
      if (open && agreementsByUser[username] === undefined && !loadingByUser[username]) {
        loadEmployee(username);
      }
      return {...prev, [username]: open};
    });
  };

  const visibleRanges = RANGES.filter(r =>
    (filterMode === 'created' ? CREATED_KEYS : PAYROLL_KEYS).includes(r.key),
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Agreement Activity</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={load} disabled={loading}>
          <Ionicons name="sync" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Mode toggle */}
        <View style={styles.modeToggle}>
          {(['created', 'payroll'] as FilterMode[]).map(mode => (
            <TouchableOpacity
              key={mode}
              style={[styles.modeBtn, filterMode === mode && styles.modeBtnActive]}
              onPress={() => {
                setFilterMode(mode);
                setRange(mode === 'created' ? 'today' : 'thisPayroll');
              }}>
              <Text style={[styles.modeBtnText, filterMode === mode && styles.modeBtnTextActive]}>
                {mode === 'created' ? 'Created' : 'Payroll'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Range tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.rangeTabs}>
            {visibleRanges.map(r => (
              <TouchableOpacity
                key={r.key}
                style={[styles.rangeTab, range === r.key && styles.rangeTabActive]}
                onPress={() => setRange(r.key)}>
                <Text style={[styles.rangeTabText, range === r.key && styles.rangeTabTextActive]}>
                  {r.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Date range */}
        {range === 'date' && (
          <View style={styles.dateRangeRow}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFromPicker(true)}>
              <Text style={styles.dateBtnLabel}>From</Text>
              <Text style={styles.dateBtnValue}>{toYmd(fromDate)}</Text>
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
            </TouchableOpacity>
            <Text style={styles.dateSep}>to</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
              <Text style={styles.dateBtnLabel}>To</Text>
              <Text style={styles.dateBtnValue}>{toYmd(toDate)}</Text>
              <Ionicons name="calendar-outline" size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {showFromPicker && (
          <DateTimePicker
            value={fromDate}
            mode="date"
            maximumDate={toDate}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => {
              setShowFromPicker(Platform.OS === 'ios');
              if (d) setFromDate(d);
            }}
          />
        )}
        {showToPicker && (
          <DateTimePicker
            value={toDate}
            mode="date"
            minimumDate={fromDate}
            maximumDate={new Date()}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(e, d) => {
              setShowToPicker(Platform.OS === 'ios');
              if (d) setToDate(d);
            }}
          />
        )}

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{data?.totalAgreements ?? 0}</Text>
            <Text style={styles.summaryLabel}>Agreements</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryNum}>{data?.totalEmployees ?? 0}</Text>
            <Text style={styles.summaryLabel}>Employees</Text>
          </View>
        </View>

        {/* List */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : !data || data.employees.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="document-outline" size={40} color="#9ca3af" />
            <Text style={styles.emptyText}>No agreements for this range.</Text>
          </View>
        ) : (
          data.employees.map(emp => {
            const open = !!expanded[emp.username];
            const rows = agreementsByUser[emp.username];
            const empLoading = !!loadingByUser[emp.username];
            return (
              <View key={emp.username} style={styles.empCard}>
                <TouchableOpacity style={styles.empHead} onPress={() => toggle(emp.username)} activeOpacity={0.7}>
                  <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={18} color="#6b7280" />
                  <Ionicons name="person-circle-outline" size={22} color={Colors.primary} />
                  <Text style={styles.empName}>{emp.name}</Text>
                  <View style={styles.empCount}>
                    <Text style={styles.empCountText}>{emp.count}</Text>
                  </View>
                </TouchableOpacity>

                {open && (
                  <View style={styles.empBody}>
                    {empLoading ? (
                      <View style={styles.rowMsg}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                        <Text style={styles.rowMsgText}>Loading…</Text>
                      </View>
                    ) : rows && rows.length > 0 ? (
                      rows.map(a => {
                        const sc = STATUS_COLORS[a.status] || STATUS_COLORS.draft;
                        return (
                          <View key={a.id} style={styles.row}>
                            <Ionicons name="document-text-outline" size={16} color="#9ca3af" />
                            <View style={{flex: 1}}>
                              <Text style={styles.rowTitle} numberOfLines={1}>{a.title}</Text>
                              <Text style={styles.rowTimeNote}>{fmtTime(a.createdAt)}</Text>
                            </View>
                            <View style={[styles.statusBadge, {backgroundColor: sc.bg}]}>
                              <Text style={[styles.statusText, {color: sc.text}]}>
                                {STATUS_LABELS[a.status] || a.status}
                              </Text>
                            </View>
                          </View>
                        );
                      })
                    ) : (
                      <View style={styles.rowMsg}>
                        <Text style={styles.rowMsgText}>No agreements.</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
          })
        )}

        <View style={{height: 40}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f9fafb'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  backBtn: {padding: Spacing.xs},
  headerTitle: {flex: 1, color: '#fff', fontSize: FontSize.lg, fontWeight: '700'},
  refreshBtn: {padding: Spacing.xs},
  scroll: {flex: 1},
  scrollContent: {padding: Spacing.lg},
  modeToggle: {flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm},
  modeBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  modeBtnActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  modeBtnText: {fontSize: FontSize.sm, fontWeight: '600', color: '#475569'},
  modeBtnTextActive: {color: '#fff'},
  rangeTabs: {flexDirection: 'row', gap: Spacing.xs, paddingVertical: Spacing.xs},
  rangeTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  rangeTabActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  rangeTabText: {fontSize: FontSize.xs, fontWeight: '500', color: '#475569'},
  rangeTabTextActive: {color: '#fff'},
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  dateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  dateBtnLabel: {fontSize: 10, fontWeight: '600', color: '#6b7280', textTransform: 'uppercase'},
  dateBtnValue: {flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary},
  dateSep: {fontSize: FontSize.sm, color: '#6b7280'},
  summaryRow: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md, marginBottom: Spacing.md},
  summaryCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  summaryNum: {fontSize: 24, fontWeight: '700', color: Colors.primary},
  summaryLabel: {fontSize: FontSize.xs, color: '#6b7280', marginTop: 2},
  centered: {paddingVertical: 48, alignItems: 'center'},
  empty: {paddingVertical: 48, alignItems: 'center', gap: Spacing.sm},
  emptyText: {color: '#9ca3af', fontSize: FontSize.sm},
  empCard: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  empHead: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md},
  empName: {flex: 1, fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary},
  empCount: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: 9999,
  },
  empCountText: {fontSize: FontSize.sm, fontWeight: '700', color: Colors.primary},
  empBody: {borderTopWidth: 1, borderTopColor: '#f0f0f0', padding: Spacing.sm, backgroundColor: '#fafafa'},
  row: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm},
  rowTitle: {flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary},
  rowMsg: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm},
  rowMsgText: {fontSize: FontSize.sm, color: '#9ca3af'},
  rowTimeNote: {fontSize: FontSize.xs, color: '#9ca3af'},
  statusBadge: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10},
  statusText: {fontSize: 10, fontWeight: '600'},
});

export default AgreementActivityScreen;
