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
import {
  diagnosticsApi,
  ConnectionCheck,
  ConnectionDiagnostics,
} from '../../../services/api/endpoints/diagnostics.api';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';

const STATUS_LABEL: Record<string, string> = {
  ok: 'All connections healthy',
  degraded: 'Optional connection unavailable',
  error: 'A required connection is down',
};

const TONE = {
  ok: {color: '#16a34a', bg: '#f0fdf4', icon: 'checkmark-circle-outline'},
  warn: {color: '#d97706', bg: '#fffbeb', icon: 'alert-circle-outline'},
  error: {color: '#ef4444', bg: '#fef2f2', icon: 'close-circle-outline'},
  idle: {color: Colors.textMuted, bg: '#f3f4f6', icon: 'remove-circle-outline'},
};

function toneFor(check: ConnectionCheck): keyof typeof TONE {
  if (check.ok) {
    return check.configured ? 'ok' : 'idle';
  }
  return check.required ? 'error' : 'warn';
}

export function SystemConnectionsScreen() {
  const [data, setData] = useState<ConnectionDiagnostics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await diagnosticsApi.getConnections();
      if (result) {
        setData(result);
      } else {
        setError('Could not reach the server to run connection checks.');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Connection check failed');
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const summaryTone: keyof typeof TONE =
    data?.status === 'ok' ? 'ok' : data?.status === 'degraded' ? 'warn' : 'error';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.headerIcon}>
            <Ionicons name="git-network-outline" size={24} color={Colors.primary} />
          </View>
          <View style={{flex: 1}}>
            <Text style={styles.headerTitle}>Database Connections</Text>
            <Text style={styles.headerSubtitle}>
              {data
                ? `${data.environment} · checked ${new Date(data.checkedAt).toLocaleTimeString()}`
                : 'Checking every configured connection…'}
            </Text>
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Running connection checks…</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }>
          {data && (
            <View
              style={[
                styles.summary,
                {backgroundColor: TONE[summaryTone].bg, borderColor: TONE[summaryTone].color},
              ]}>
              <Ionicons
                name={TONE[summaryTone].icon}
                size={18}
                color={TONE[summaryTone].color}
              />
              <Text style={[styles.summaryText, {color: TONE[summaryTone].color}]}>
                {STATUS_LABEL[data.status]} — {data.summary.healthy}/{data.summary.total} healthy
              </Text>
            </View>
          )}

          {error && (
            <View style={[styles.summary, {backgroundColor: TONE.error.bg, borderColor: TONE.error.color}]}>
              <Ionicons name={TONE.error.icon} size={18} color={TONE.error.color} />
              <Text style={[styles.summaryText, {color: TONE.error.color}]}>{error}</Text>
            </View>
          )}

          {(data?.checks ?? []).map(check => {
            const tone = TONE[toneFor(check)];
            return (
              <View key={check.key} style={[styles.card, {borderLeftColor: tone.color}]}>
                <View style={styles.cardHead}>
                  <Ionicons name={tone.icon} size={18} color={tone.color} />
                  <Text style={styles.cardLabel}>{check.label}</Text>
                  <Text style={styles.cardState}>{check.state.replace(/_/g, ' ')}</Text>
                </View>

                {check.database ? (
                  <Row label="Database" value={check.database} />
                ) : null}
                {check.target ? <Row label="Target" value={check.target} mono /> : null}
                {check.latencyMs !== undefined ? (
                  <Row label="Latency" value={`${check.latencyMs} ms`} />
                ) : null}
                {check.collections
                  ? Object.entries(check.collections).map(([name, count]) => (
                      <Row key={name} label={name} value={`${count.toLocaleString()} docs`} mono />
                    ))
                  : null}
                {!check.required ? <Row label="Required" value="Optional" /> : null}

                {check.note ? <Text style={styles.note}>{check.note}</Text> : null}
                {check.error ? <Text style={styles.error}>{check.error}</Text> : null}
              </View>
            );
          })}

          <TouchableOpacity style={styles.recheckBtn} onPress={onRefresh} disabled={refreshing}>
            <Ionicons name="refresh-outline" size={16} color="#fff" />
            <Text style={styles.recheckText}>{refreshing ? 'Checking…' : 'Re-check'}</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function Row({label, value, mono}: {label: string; value: string; mono?: boolean}) {
  return (
    <View style={styles.row}>
      <Text style={[styles.rowLabel, mono && styles.mono]} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.rowValue, mono && styles.mono]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  header: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {flexDirection: 'row', alignItems: 'center', gap: Spacing.md},
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary},
  headerSubtitle: {fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2},
  loadingBox: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md},
  loadingText: {fontSize: FontSize.sm, color: Colors.textSecondary},
  scroll: {padding: Spacing.md, paddingBottom: Spacing.xl},
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  summaryText: {flex: 1, fontSize: FontSize.sm, fontWeight: '600'},
  card: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderLeftWidth: 4,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  cardHead: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm},
  cardLabel: {flex: 1, fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary},
  cardState: {fontSize: 10, textTransform: 'uppercase', color: Colors.textMuted, letterSpacing: 0.4},
  row: {flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md, paddingVertical: 3},
  rowLabel: {fontSize: FontSize.sm, color: Colors.textSecondary, flexShrink: 1},
  rowValue: {fontSize: FontSize.sm, color: Colors.textPrimary, textAlign: 'right', flex: 1},
  mono: {fontSize: 11},
  note: {fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: Spacing.sm},
  error: {fontSize: FontSize.sm, color: '#ef4444', marginTop: Spacing.sm},
  recheckBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  recheckText: {color: '#fff', fontSize: FontSize.md, fontWeight: '700'},
});

export default SystemConnectionsScreen;
