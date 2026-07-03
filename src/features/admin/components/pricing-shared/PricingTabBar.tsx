import React from 'react';
import {ScrollView, TouchableOpacity, Text, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {MainTab, MAIN_TABS} from '../../utils/pricing.utils';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';

interface PricingTabBarProps {
  active: MainTab;
  onSelect: (t: MainTab) => void;
}

export function PricingTabBar({active, onSelect}: PricingTabBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.bar}
      contentContainerStyle={styles.barContent}>
      {MAIN_TABS.map(tab => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.8}>
            <Ionicons
              name={tab.icon}
              size={15}
              color={isActive ? '#fff' : Colors.textMuted}
            />
            <Text
              style={[styles.tabText, isActive && styles.tabTextActive]}
              allowFontScaling={false}
              numberOfLines={1}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 56,
    flexGrow: 0,
    flexShrink: 0,
    backgroundColor: Colors.surface,
  },
  barContent: {
    paddingHorizontal: Spacing.md,
    gap: 8,
    alignItems: 'center',
    paddingVertical: 10,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    paddingHorizontal: 14,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
  },
  tabActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    includeFontPadding: false,
  },
  tabTextActive: {
    color: '#fff',
  },
});
