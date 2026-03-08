import React, {useState, useCallback, useEffect} from 'react';
import {View, Text, FlatList, RefreshControl, TouchableOpacity, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {pricingApi, PricingBackup} from '../../../../services/api/endpoints/pricing.api';
import {BackupCard} from './BackupCard';
import {RestoreBackupModal} from './RestoreBackupModal';
import {BackupDetailsModal} from './BackupDetailsModal';
import {SkeletonRow} from '../pricing-shared/SkeletonRow';
import {bStyles} from './backup.styles';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

interface BackupListTabProps {
  onCreateBackup: () => void;
}

export function BackupListTab({onCreateBackup}: BackupListTabProps) {
  const [backups, setBackups] = useState<PricingBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<PricingBackup | null>(null);
  const [detailTarget, setDetailTarget] = useState<PricingBackup | null>(null);
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {setRefreshing(true);} else {setLoading(true);}
    const data = await pricingApi.getBackupList();
    setBackups(data);
    if (isRefresh) {setRefreshing(false);} else {setLoading(false);}
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <View style={styles.sectionShell}>
        <View style={styles.createBackupBtnSkeleton} />
        {[1, 2, 3].map(i => <SkeletonRow key={i} lines={3} />)}
      </View>
    );
  }

  return (
    <View style={{flex: 1}}>
      <View style={bStyles.listHeader}>
        <Text style={bStyles.listHeaderTitle}>
          {backups.length} backup{backups.length !== 1 ? 's' : ''}
        </Text>
        <TouchableOpacity style={bStyles.createBtn} onPress={onCreateBackup}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={bStyles.createBtnText}>Create Backup</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={backups}
        keyExtractor={b => b.changeDayId}
        renderItem={({item}) => (
          <BackupCard
            backup={item}
            onRestore={setRestoreTarget}
            onViewDetails={setDetailTarget}
          />
        )}
        ItemSeparatorComponent={() => <View style={{height: Spacing.sm}} />}
        contentContainerStyle={{padding: Spacing.md, paddingBottom: 40}}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cloud-outline" size={44} color={Colors.textMuted} />
            <Text style={styles.emptyTitle}>No backups yet</Text>
            <Text style={styles.emptySub}>Create a backup to save current pricing data.</Text>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      />

      {restoreTarget && (
        <RestoreBackupModal
          backup={restoreTarget}
          onClose={() => setRestoreTarget(null)}
          onDone={() => {setRestoreTarget(null); fetchData(true);}}
        />
      )}

      {detailTarget && (
        <BackupDetailsModal
          backup={detailTarget}
          onClose={() => setDetailTarget(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionShell: {flex: 1},
  createBackupBtnSkeleton: {
    height: 46,
    margin: Spacing.lg,
    backgroundColor: '#e5e7eb',
    borderRadius: Radius.lg,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 56,
    paddingHorizontal: 32,
    gap: Spacing.sm,
  },
  emptyTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  emptySub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
