import React from 'react';
import {View, StyleSheet, ViewStyle} from 'react-native';
import {Colors, Radius, Shadow, Spacing} from '../../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
  padding?: number;
}

export function Card({children, style, padding = Spacing.lg}: CardProps) {
  return (
    <View style={[styles.card, {padding}, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    ...Shadow.medium,
  },
});
