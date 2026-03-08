import React from 'react';
import {View, StyleSheet} from 'react-native';
import {SKELETON_BG} from '../../utils/pricing.utils';

interface SkeletonRowProps {
  lines?: number;
}

export function SkeletonRow({lines = 2}: SkeletonRowProps) {
  return (
    <View style={styles.skeletonRow}>
      <View style={styles.skeletonIcon} />
      <View style={{flex: 1, gap: 6}}>
        {Array.from({length: lines}).map((_, i) => (
          <View
            key={i}
            style={[styles.skeletonLine, {width: i === 0 ? '65%' : '40%'}]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 12,
  },
  skeletonIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: SKELETON_BG,
    flexShrink: 0,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: SKELETON_BG,
    borderRadius: 4,
  },
});
