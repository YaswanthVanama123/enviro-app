import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {
  payrollAgreementsApi,
  PayrollAgreement,
} from '../../../services/api/endpoints/payrollAgreements.api';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';
import {ConfirmModal, InfoModal} from '../../../shared/components/ui/AppModal';

const money = (n: number | null | undefined): string =>
  `$${(n ?? 0).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

export function PayrollAgreementsScreen() {
  const insets = useSafeAreaInsets();
  const [agreements, setAgreements] = useState<PayrollAgreement[]>([]);
  const [periodLabel, setPeriodLabel] = useState<string>('—');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [target, setTarget] = useState<PayrollAgreement | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [info, setInfo] = useState<{title: string; subtitle: string} | null>(null);

  const load = useCallback(async () => {
    const res = await payrollAgreementsApi.list();
    if (res) {
      setAgreements(res.agreements || []);
      setPeriodLabel(res.currentPeriod?.label || '—');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const confirmComplete = async () => {
    if (!target) return;
    setSubmitting(true);
    const res = await payrollAgreementsApi.complete(target.id);
    setSubmitting(false);
    const title = target.title;
    setTarget(null);
    if (res.error || !res.data?.success) {
      setInfo({title: 'Could not add', subtitle: res.error || 'Failed to add to payroll'});
    } else {
      setInfo({title: 'Added to payroll', subtitle: `"${title}" was locked into ${res.data.payrollLock?.periodLabel || periodLabel}.`});
      await load();
    }
  };

  const renderItem = ({item}: {item: PayrollAgreement}) => (
    <View style={[styles.card, item.addedToPayroll && styles.cardLocked]}>
      <View style={styles.cardTop}>
        <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
        {item.addedToPayroll ? (
          <View style={styles.badgeLocked}>
            <Ionicons name="lock-closed" size={11} color="#6d28d9" />
            <Text style={styles.badgeLockedText}>In payroll</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.meta}>{item.createdBy} · {item.status}</Text>
      <View style={styles.amountRow}>
        <View>
          <Text style={styles.amountLabel}>Weekly</Text>
          <Text style={styles.amountValue}>{money(item.weeklyCommission)}</Text>
        </View>
        <View>
          <Text style={styles.amountLabel}>Annual</Text>
          <Text style={styles.amountValue}>{money(item.annualCommission)}</Text>
        </View>
        <View>
          <Text style={styles.amountLabel}>Monthly</Text>
          <Text style={styles.amountValue}>{money(item.monthlyValue)}</Text>
        </View>
      </View>
      {item.addedToPayroll ? (
        <Text style={styles.lockedNote}>
          Locked {money(item.lockedAnnualCommission)} · {item.payrollPeriodLabel || ''}
        </Text>
      ) : (
        <TouchableOpacity style={styles.completeBtn} onPress={() => setTarget(item)}>
          <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
          <Text style={styles.completeBtnText}>Completed</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={[styles.container, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <Text style={styles.heading}>Payroll Agreements</Text>
        <View style={styles.periodPill}>
          <Ionicons name="calendar-outline" size={13} color={Colors.textMuted} />
          <Text style={styles.periodText}>{periodLabel}</Text>
        </View>
      </View>
      <Text style={styles.subtitle}>
        Agreements with commission calculated. Marking one Completed locks its commission into the
        current payroll period and it cannot change afterwards.
      </Text>

      {loading ? (
        <ActivityIndicator style={{marginTop: 32}} color={Colors.primary} />
      ) : (
        <FlatList
          data={agreements}
          keyExtractor={(a) => a.id}
          renderItem={renderItem}
          contentContainerStyle={{padding: Spacing.md, paddingBottom: insets.bottom + 24}}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
          }
          ListEmptyComponent={<Text style={styles.empty}>No agreements with commission found.</Text>}
        />
      )}

      <ConfirmModal
        visible={!!target}
        icon="cash-outline"
        iconColor="#6d28d9"
        iconBg="#ede9fe"
        title="Add to payroll?"
        subtitle={
          target
            ? `Add "${target.title}" to ${target.createdBy}'s payroll for ${periodLabel}. The commission ${money(target.annualCommission)} (annual) will be locked — later edits won't change it, and it can't be added again.`
            : ''
        }
        confirmLabel="Yes, add"
        confirmColor={Colors.primary}
        onConfirm={confirmComplete}
        onCancel={() => !submitting && setTarget(null)}
        loading={submitting}
      />

      <InfoModal
        visible={!!info}
        icon="information-circle-outline"
        iconColor={Colors.primary}
        iconBg={Colors.primaryLight}
        title={info?.title || ''}
        subtitle={info?.subtitle}
        onClose={() => setInfo(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: Spacing.md, paddingTop: Spacing.sm},
  heading: {fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary},
  periodPill: {flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border},
  periodText: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.textPrimary},
  subtitle: {fontSize: FontSize.sm, color: Colors.textMuted, paddingHorizontal: Spacing.md, marginTop: 4, marginBottom: 4},
  card: {backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, marginBottom: Spacing.sm, borderWidth: 1, borderColor: Colors.border},
  cardLocked: {backgroundColor: '#faf5ff', borderColor: '#e9d5ff'},
  cardTop: {flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'},
  title: {fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, flex: 1, marginRight: 8},
  badgeLocked: {flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ede9fe', borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 2},
  badgeLockedText: {fontSize: 11, fontWeight: '700', color: '#6d28d9'},
  meta: {fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2},
  amountRow: {flexDirection: 'row', gap: 24, marginTop: 10},
  amountLabel: {fontSize: 11, color: Colors.textMuted, textTransform: 'uppercase'},
  amountValue: {fontSize: FontSize.md, fontWeight: '700', color: '#16a34a'},
  completeBtn: {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 10, marginTop: 12},
  completeBtnText: {color: '#fff', fontWeight: '700', fontSize: FontSize.md},
  lockedNote: {marginTop: 10, fontSize: FontSize.sm, fontWeight: '600', color: '#6d28d9'},
  empty: {textAlign: 'center', color: Colors.textMuted, marginTop: 40},
});

export default PayrollAgreementsScreen;
