import React from 'react';
import {View, Text} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {bStyles} from './backup.styles';

interface HealthCardProps {
  icon: string;
  title: string;
  status: 'ok' | 'warning' | 'error';
  message?: string;
  progress?: number;
  progressLabel?: string;
}

export function HealthCard({
  icon,
  title,
  status,
  message,
  progress,
  progressLabel,
}: HealthCardProps) {
  const statusColor = status === 'ok' ? '#16a34a' : status === 'warning' ? '#d97706' : '#dc2626';
  const statusIcon = status === 'ok' ? 'checkmark-circle' : status === 'warning' ? 'warning' : 'close-circle';

  return (
    <View style={bStyles.healthCard}>
      <View style={bStyles.healthCardHeader}>
        <View style={bStyles.healthCardIconBox}>
          <Ionicons name={icon} size={18} color="#6b7280" />
        </View>
        <Text style={bStyles.healthCardTitle}>{title}</Text>
        <Ionicons name={statusIcon} size={18} color={statusColor} />
      </View>
      {message ? <Text style={bStyles.healthCardMsg}>{message}</Text> : null}
      {progress !== undefined && (
        <View style={bStyles.progressWrap}>
          <View style={bStyles.progressTrack}>
            <View style={[bStyles.progressFill, {
              width: `${Math.min(progress * 100, 100)}%` as any,
              backgroundColor: progress > 0.85 ? '#dc2626' : progress > 0.65 ? '#d97706' : '#16a34a',
            }]} />
          </View>
          {progressLabel ? <Text style={bStyles.progressLabel}>{progressLabel}</Text> : null}
        </View>
      )}
    </View>
  );
}
