import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Radius, FontSize, Spacing} from '../../../theme';

interface StatChipProps {
  count: number;
  label: string;
  color: string;
  bg: string;
}

export function StatChip({count, label, color, bg}: StatChipProps) {
  return (
    <View style={[styles.statChip, {backgroundColor: bg}]}>
      <Text style={[styles.statCount, {color}]}>{count}</Text>
      <Text style={[styles.statLabel, {color}]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statChip: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
  },
  statCount: {fontSize: FontSize.lg, fontWeight: '800', lineHeight: 22},
  statLabel: {fontSize: FontSize.xs, fontWeight: '600', marginTop: 1},
});
