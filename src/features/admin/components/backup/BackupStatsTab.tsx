import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {pricingApi, BackupStatistics} from '../../../../services/api/endpoints/pricing.api';
import {getTriggerLabel, getTriggerColor, timeAgo, formatFileSize} from '../../utils/pricing.utils';
import {SkeletonRow} from '../pricing-shared/SkeletonRow';
import {bStyles} from './backup.styles';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

export function BackupStatsTab() {
  const [stats, setStats] = useState<BackupStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    pricingApi.getBackupStatistics().then(s => {
      setStats(s);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.sectionShell}>
        {[1, 2, 3, 4].map(i => <SkeletonRow key={i} lines={2} />)}
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="bar-chart-outline" size={44} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Statistics unavailable</Text>
        <Text style={styles.emptySub}>Could not load backup statistics.</Text>
      </View>
    );
  }

  const healthColor = stats.systemHealth === 'healthy' ? '#16a34a' : stats.systemHealth === 'warning' ? '#d97706' : '#dc2626';

  return (
    <ScrollView contentContainerStyle={{padding: Spacing.md, paddingBottom: 40}} showsVerticalScrollIndicator={false}>
      {/* 4 stat cards */}
      <View style={bStyles.statsGrid}>
        <View style={bStyles.statCard}>
          <Ionicons name="cloud-outline" size={22} color="#3b82f6" />
          <Text style={bStyles.statValue}>{stats.totalBackups}</Text>
          <Text style={bStyles.statLabel}>Total Backups</Text>
        </View>
        <View style={bStyles.statCard}>
          <Ionicons name="trending-up-outline" size={22} color="#16a34a" />
          <Text style={bStyles.statValue}>{Math.round(stats.storageEfficiency ?? 0)}%</Text>
          <Text style={bStyles.statLabel}>Storage Efficiency</Text>
        </View>
        <View style={bStyles.statCard}>
          <Ionicons name="server-outline" size={22} color="#7c3aed" />
          <Text style={bStyles.statValue}>{formatFileSize(stats.totalCompressedSize)}</Text>
          <Text style={bStyles.statLabel}>Storage Used</Text>
        </View>
        <View style={bStyles.statCard}>
          <Ionicons name="heart-outline" size={22} color={healthColor} />
          <Text style={[bStyles.statValue, {color: healthColor, textTransform: 'capitalize'}]}>{stats.systemHealth}</Text>
          <Text style={bStyles.statLabel}>System Health</Text>
        </View>
      </View>

      {/* Trigger breakdown */}
      {stats.triggerBreakdown && stats.triggerBreakdown.length > 0 && (
        <View style={bStyles.sectionBox}>
          <Text style={bStyles.boxTitle}>Backup Triggers</Text>
          {stats.triggerBreakdown.map(t => (
            <View key={t.trigger} style={bStyles.triggerRow}>
              <View style={[bStyles.triggerDot, {backgroundColor: getTriggerColor(t.trigger)}]} />
              <Text style={bStyles.triggerRowLabel}>{getTriggerLabel(t.trigger)}</Text>
              <View style={bStyles.triggerBarWrap}>
                <View style={[bStyles.triggerBar, {
                  width: `${Math.min(t.percentage, 100)}%` as any,
                  backgroundColor: getTriggerColor(t.trigger) + '80',
                }]} />
              </View>
              <Text style={bStyles.triggerCount}>{t.count}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Compression analysis */}
      {stats.compressionAnalysis && (
        <View style={bStyles.sectionBox}>
          <Text style={bStyles.boxTitle}>Compression Analysis</Text>
          <View style={bStyles.compressionRow}>
            <View style={bStyles.compressionStat}>
              <Text style={[bStyles.compressionValue, {color: '#16a34a'}]}>
                {Math.round((stats.compressionAnalysis.best ?? 0) * 100)}%
              </Text>
              <Text style={bStyles.compressionLabel}>Best</Text>
            </View>
            <View style={bStyles.compressionDivider} />
            <View style={bStyles.compressionStat}>
              <Text style={[bStyles.compressionValue, {color: '#3b82f6'}]}>
                {Math.round((stats.compressionAnalysis.average ?? 0) * 100)}%
              </Text>
              <Text style={bStyles.compressionLabel}>Average</Text>
            </View>
            <View style={bStyles.compressionDivider} />
            <View style={bStyles.compressionStat}>
              <Text style={[bStyles.compressionValue, {color: '#f59e0b'}]}>
                {Math.round((stats.compressionAnalysis.worst ?? 0) * 100)}%
              </Text>
              <Text style={bStyles.compressionLabel}>Worst</Text>
            </View>
          </View>
        </View>
      )}

      {/* Recent backups */}
      {stats.recentBackups && stats.recentBackups.length > 0 && (
        <View style={bStyles.sectionBox}>
          <Text style={bStyles.boxTitle}>Recent Backups</Text>
          {stats.recentBackups.slice(0, 5).map(b => (
            <View key={b.changeDayId} style={bStyles.recentRow}>
              <View style={[bStyles.recentDot, {backgroundColor: getTriggerColor(b.backupTrigger)}]} />
              <Text style={bStyles.recentId}>{b.changeDay || b.changeDayId}</Text>
              <Text style={bStyles.recentAge}>{timeAgo(b.firstChangeTimestamp || b.createdAt)}</Text>
              <Text style={[bStyles.recentTrigger, {color: getTriggerColor(b.backupTrigger)}]}>
                {getTriggerLabel(b.backupTrigger)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionShell: {flex: 1},
  emptyState: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  emptySub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
