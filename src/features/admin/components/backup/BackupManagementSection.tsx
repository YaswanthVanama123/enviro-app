import React, {useState} from 'react';
import {View, Text, TouchableOpacity} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {BackupSubTab} from '../../utils/pricing.utils';
import {BackupListTab} from './BackupListTab';
import {BackupStatsTab} from './BackupStatsTab';
import {BackupHealthTab} from './BackupHealthTab';
import {CreateBackupModal} from './CreateBackupModal';
import {bStyles} from './backup.styles';
import {Colors} from '../../../../theme/colors';

const SUB_TABS: {key: BackupSubTab; label: string; icon: string}[] = [
  {key: 'list',   label: 'Backup List',   icon: 'list-outline'},
  {key: 'stats',  label: 'Statistics',    icon: 'bar-chart-outline'},
  {key: 'health', label: 'System Health', icon: 'heart-outline'},
];

export function BackupManagementSection() {
  const [subTab, setSubTab] = useState<BackupSubTab>('list');
  const [showCreate, setShowCreate] = useState(false);
  const [listKey, setListKey] = useState(0);

  return (
    <View style={{flex: 1}}>
      <View style={bStyles.subTabBar}>
        {SUB_TABS.map(t => (
          <TouchableOpacity
            key={t.key}
            style={[bStyles.subTab, subTab === t.key && bStyles.subTabActive]}
            onPress={() => setSubTab(t.key)}>
            <Ionicons name={t.icon} size={14} color={subTab === t.key ? '#2563eb' : Colors.textMuted} />
            <Text style={[bStyles.subTabText, subTab === t.key && bStyles.subTabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {subTab === 'list'   && <BackupListTab key={listKey} onCreateBackup={() => setShowCreate(true)} />}
      {subTab === 'stats'  && <BackupStatsTab />}
      {subTab === 'health' && <BackupHealthTab />}

      {showCreate && (
        <CreateBackupModal
          onClose={() => setShowCreate(false)}
          onDone={() => {setShowCreate(false); setListKey(k => k + 1);}}
        />
      )}
    </View>
  );
}
