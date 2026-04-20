import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {pricingApi, BackupSystemHealth} from '../../../../services/api/endpoints/pricing.api';
import {timeAgo} from '../../utils/pricing.utils';
import {HealthCard} from './HealthCard';
import {SkeletonRow} from '../pricing-shared/SkeletonRow';
import {bStyles} from './backup.styles';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

export function BackupHealthTab() {
  const [health, setHealth] = useState<BackupSystemHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [enforcing, setEnforcing] = useState(false);
  useEffect(() => {
    setLoading(true);
    pricingApi.getBackupHealth().then(h => {
      setHealth(h);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.sectionShell}>
        {[1, 2, 3].map(i => <SkeletonRow key={i} lines={2} />)}
      </View>
    );
  }

  if (!health) {
    return (
      <View style={styles.emptyState}>
        <Ionicons name="heart-outline" size={44} color={Colors.textMuted} />
        <Text style={styles.emptyTitle}>Health data unavailable</Text>
        <Text style={styles.emptySub}>Could not retrieve system health info.</Text>
      </View>
    );
  }

  const overallColor = health.status === 'healthy' ? '#16a34a' : health.status === 'warning' ? '#d97706' : '#dc2626';
  const overallBg = health.status === 'healthy' ? '#dcfce7' : health.status === 'warning' ? '#fef3c7' : '#fee2e2';
  const overallIcon = health.status === 'healthy' ? 'checkmark-circle' : health.status === 'warning' ? 'warning' : 'alert-circle';

  return (
    <ScrollView contentContainerStyle={{padding: Spacing.md, paddingBottom: 40}} showsVerticalScrollIndicator={false}>
      <View style={[bStyles.healthBanner, {backgroundColor: overallBg, borderColor: overallColor + '40'}]}>
        <Ionicons name={overallIcon} size={28} color={overallColor} />
        <View style={{flex: 1}}>
          <Text style={[bStyles.healthBannerTitle, {color: overallColor, textTransform: 'capitalize'}]}>
            System {health.status}
          </Text>
          <Text style={bStyles.healthBannerSub}>{health.checks?.totalBackups ?? 0} backups tracked</Text>
        </View>
      </View>

      {health.checks && (
        <>
          <HealthCard
            icon="server-outline"
            title="Database Connectivity"
            status={health.checks.backupModelAccessible ? 'ok' : 'error'}
            message={health.checks.backupModelAccessible ? 'Connected' : 'Connection failed'}
          />

          <HealthCard
            icon="archive-outline"
            title="Retention Policy"
            status={health.checks.retentionPolicyCompliant ? 'ok' : 'warning'}
            message={`${health.checks.totalBackups} backups stored`}
          />

          <HealthCard
            icon="time-outline"
            title="Backup Activity"
            status={health.checks.hasBackupToday ? 'ok' : 'warning'}
            message={
              health.checks.mostRecentBackup
                ? `Last backup ${timeAgo(health.checks.mostRecentBackup.createdAt)}`
                : 'No recent backups'
            }
          />
        </>
      )}

      {health.warnings && health.warnings.length > 0 && (
        <View style={bStyles.sectionBox}>
          <Text style={bStyles.boxTitle}>System Warnings</Text>
          {health.warnings.map((w, i) => (
            <View key={i} style={bStyles.warningRow}>
              <Ionicons name="warning-outline" size={14} color="#d97706" />
              <Text style={bStyles.warningText}>{w}</Text>
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={[bStyles.enforceBtn, enforcing && {opacity: 0.6}]}
        disabled={enforcing}
        onPress={() => {
          Alert.alert(
            'Enforce Retention Policy',
            'This will delete backups that exceed the retention limit. Continue?',
            [
              {text: 'Cancel', style: 'cancel'},
              {
                text: 'Enforce',
                style: 'destructive',
                onPress: async () => {
                  setEnforcing(true);
                  const ok = await pricingApi.enforceRetentionPolicy();
                  setEnforcing(false);
                  if (ok) {
                    Alert.alert('Done', 'Retention policy enforced successfully.');
                  } else {
                    Alert.alert('Error', 'Failed to enforce retention policy.');
                  }
                },
              },
            ],
          );
        }}>
        {enforcing
          ? <ActivityIndicator size="small" color="#dc2626" />
          : <Ionicons name="trash-outline" size={15} color="#dc2626" />}
        <Text style={bStyles.enforceBtnText}>{enforcing ? 'Enforcing…' : 'Enforce Retention Policy'}</Text>
      </TouchableOpacity>
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
