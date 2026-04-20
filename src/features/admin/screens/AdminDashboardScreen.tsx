import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useAdminAuth} from '../context/AdminAuthContext';
import {adminApi, AdminDashboardData} from '../../../services/api/endpoints/admin.api';
import {agreementsApi, SavedFileGroup} from '../../../services/api/endpoints/agreements.api';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';

function timeAgo(iso: string): string {
  if (!iso) {return '—';}
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) {return 'today';}
  if (days === 1) {return '1 day ago';}
  if (days < 30) {return `${days} days ago`;}
  const m = Math.floor(days / 30);
  if (m === 1) {return '1 month ago';}
  if (m < 12) {return `${m} months ago`;}
  return `${Math.floor(m / 12)}y ago`;
}

function StatCard({
  icon,
  iconBg,
  iconColor,
  value,
  label,
}: {
  icon: string;
  iconBg: string;
  iconColor: string;
  value: number;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconBox, {backgroundColor: iconBg}]}>
        <Ionicons name={icon} size={24} color={iconColor} />
      </View>
      <Text style={styles.statValue}>{value}+</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatusRow({
  color,
  label,
  count,
}: {
  color: string;
  label: string;
  count: number;
}) {
  return (
    <View style={styles.statusRow}>
      <View style={[styles.statusDot, {backgroundColor: color}]} />
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusCount}>{count}</Text>
    </View>
  );
}

function RecentRow({agreement}: {agreement: SavedFileGroup}) {
  return (
    <View style={styles.recentRow}>
      <View style={styles.recentFolderBox}>
        <Ionicons name="folder" size={16} color="#f59e0b" />
      </View>
      <View style={styles.recentMeta}>
        <Text style={styles.recentTitle} numberOfLines={1}>
          {agreement.agreementTitle}
        </Text>
        <Text style={styles.recentSub}>
          {agreement.fileCount} {agreement.fileCount === 1 ? 'file' : 'files'} · {timeAgo(agreement.latestUpdate)}
        </Text>
      </View>
      <View style={[styles.statusPill, {backgroundColor: getStatusBg(agreement.agreementStatus)}]}>
        <Text style={[styles.statusPillText, {color: getStatusColor(agreement.agreementStatus)}]}>
          {formatStatus(agreement.agreementStatus)}
        </Text>
      </View>
    </View>
  );
}

function formatStatus(s: string): string {
  if (!s) {return 'Draft';}
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getStatusBg(s: string): string {
  const map: Record<string, string> = {
    saved: '#e0f2fe',
    draft: '#f9fafb',
    pending_approval: '#fef3c7',
    approved_salesman: '#d1fae5',
    approved_admin: '#064e3b',
    finalized: Colors.primaryLight,
    active: '#d1fae5',
  };
  return map[s] ?? '#f3f4f6';
}

function getStatusColor(s: string): string {
  const map: Record<string, string> = {
    saved: '#075985',
    draft: '#374151',
    pending_approval: '#92400e',
    approved_salesman: '#065f46',
    approved_admin: '#ffffff',
    finalized: Colors.primaryDark,
    active: '#065f46',
  };
  return map[s] ?? '#374151';
}

function SkeletonBlock({width, height}: {width: number | string; height: number}) {
  return (
    <View
      style={[
        styles.skeleton,
        {width: width as any, height},
      ]}
    />
  );
}

export function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const {user: _user} = useAdminAuth();

  const [dashData, setDashData] = useState<AdminDashboardData | null>(null);
  const [recent, setRecent] = useState<SavedFileGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = useCallback(async (isRefresh = false) => {
    if (isRefresh) {setRefreshing(true);}
    else {setLoading(true);}

    const [dash, grouped] = await Promise.all([
      adminApi.getDashboard(),
      agreementsApi.getGrouped({
        page: 1,
        limit: 10,
        isDeleted: false,
        includeLogs: true,
        includeDrafts: true,
      }),
    ]);

    setDashData(dash);
    setRecent(grouped?.groups ?? []);

    if (isRefresh) {setRefreshing(false);}
    else {setLoading(false);}
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const stats = dashData?.stats;
  const statusCounts = dashData?.documentStatus;

  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      {refreshing && (
        <View style={styles.refreshIndicator}>
          <ActivityIndicator size="small" color={Colors.primary} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {paddingBottom: insets.bottom + 24},
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchAll(true)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }>

        {loading ? (
          <View style={styles.statsRow}>
            {[1, 2, 3].map(i => (
              <View key={i} style={[styles.statCard, {alignItems: 'center', gap: 8}]}>
                <SkeletonBlock width={44} height={44} />
                <SkeletonBlock width="60%" height={20} />
                <SkeletonBlock width="80%" height={12} />
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.statsRow}>
            <StatCard
              icon="cloud-upload-outline"
              iconBg="#dbeafe"
              iconColor="#2563eb"
              value={stats?.manualUploads ?? 0}
              label="Manual Uploads"
            />
            <StatCard
              icon="document-text-outline"
              iconBg="#dcfce7"
              iconColor="#16a34a"
              value={stats?.savedDocuments ?? 0}
              label="Saved Documents"
            />
            <StatCard
              icon="briefcase-outline"
              iconBg="#f3e8ff"
              iconColor="#7c3aed"
              value={stats?.totalDocuments ?? 0}
              label="Total Documents"
            />
          </View>
        )}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Document Status</Text>
          {loading ? (
            <View style={{gap: 8}}>
              {[1, 2, 3, 4].map(i => (
                <SkeletonBlock key={i} width="100%" height={16} />
              ))}
            </View>
          ) : (
            <>
              <StatusRow color="#10b981" label="Done" count={statusCounts?.done ?? 0} />
              <View style={styles.statusDivider} />
              <StatusRow color="#f59e0b" label="Pending" count={statusCounts?.pending ?? 0} />
              <View style={styles.statusDivider} />
              <StatusRow color="#3b82f6" label="Saved" count={statusCounts?.saved ?? 0} />
              <View style={styles.statusDivider} />
              <StatusRow color="#9ca3af" label="Drafts" count={statusCounts?.drafts ?? 0} />
            </>
          )}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Recent Documents</Text>
          {loading ? (
            <View style={{gap: 12}}>
              {[1, 2, 3, 4].map(i => (
                <View key={i} style={[styles.recentRow, {gap: 8}]}>
                  <SkeletonBlock width={28} height={28} />
                  <View style={{flex: 1, gap: 4}}>
                    <SkeletonBlock width="65%" height={12} />
                    <SkeletonBlock width="40%" height={10} />
                  </View>
                  <SkeletonBlock width={55} height={20} />
                </View>
              ))}
            </View>
          ) : recent.length === 0 ? (
            <Text style={styles.emptyText}>No recent documents</Text>
          ) : (
            recent.map((ag, idx) => (
              <View key={ag.id}>
                <RecentRow agreement={ag} />
                {idx < recent.length - 1 && (
                  <View style={styles.recentDivider} />
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  refreshIndicator: {
    position: 'absolute',
    top: 8,
    right: Spacing.lg,
    zIndex: 10,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.md,
  },

  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    alignItems: 'flex-start',
    gap: 4,
    shadowOpacity: 0,
    elevation: 0,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    lineHeight: 28,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
    lineHeight: 14,
  },

  sectionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.lg,
    gap: Spacing.sm,
    shadowOpacity: 0,
    elevation: 0,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },

  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusLabel: {
    flex: 1,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  statusCount: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.xl,
  },

  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  recentFolderBox: {
    width: 28,
    height: 28,
    borderRadius: Radius.sm,
    backgroundColor: '#fff7ed',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  recentMeta: {
    flex: 1,
    minWidth: 0,
  },
  recentTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  recentSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 1,
  },
  statusPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: Radius.full,
    flexShrink: 0,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  recentDivider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginVertical: Spacing.sm,
  },
  emptyText: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    paddingVertical: Spacing.lg,
  },

  skeleton: {
    backgroundColor: '#e5e7eb',
    borderRadius: Radius.xs,
  },
});
