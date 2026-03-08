import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {Colors, FontSize, Spacing} from '../../../theme';

export function CreateAgreementScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>✏️</Text>
      <Text style={styles.title}>Create Agreement</Text>
      <Text style={styles.sub}>Coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    paddingHorizontal: Spacing.xl,
  },
  icon: {fontSize: 48, marginBottom: Spacing.md},
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  sub: {
    fontSize: FontSize.md,
    color: Colors.textMuted,
  },
});
