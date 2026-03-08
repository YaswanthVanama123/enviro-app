import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors} from '../../../theme/colors';
import {Spacing} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';

export function PricingDetailsScreen() {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Pricing Details</Text>
      </View>
      <View style={styles.center}>
        <Ionicons name="pricetag-outline" size={52} color={Colors.textMuted} />
        <Text style={styles.title}>Pricing Tables</Text>
        <Text style={styles.sub}>Coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {flex: 1, backgroundColor: Colors.background},
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 3,
    borderBottomColor: Colors.primary,
  },
  headerTitle: {fontSize: FontSize.lg, fontWeight: '700', color: Colors.primary},
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  sub: {fontSize: FontSize.md, color: Colors.textMuted},
});
