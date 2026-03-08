import React from 'react';
import {ScrollView, TouchableOpacity, Text, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {MainTab, MAIN_TABS} from '../../utils/pricing.utils';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

interface PricingTabBarProps {
  active: MainTab;
  onSelect: (t: MainTab) => void;
}

export function PricingTabBar({active, onSelect}: PricingTabBarProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.mainTabBar}
      contentContainerStyle={styles.mainTabBarContent}>
      {MAIN_TABS.map(tab => {
        const isActive = tab.key === active;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.mainTab, isActive && styles.mainTabActive]}
            onPress={() => onSelect(tab.key)}
            activeOpacity={0.7}>
            <Ionicons
              name={tab.icon}
              size={15}
              color={isActive ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.mainTabText, isActive && styles.mainTabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  mainTabBar: {
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    maxHeight: 46,
  },
  mainTabBarContent: {
    paddingHorizontal: Spacing.md,
    gap: 4,
    alignItems: 'center',
    paddingVertical: 6,
  },
  mainTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
  },
  mainTabActive: {
    backgroundColor: Colors.primaryLight,
  },
  mainTabText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  mainTabTextActive: {
    color: Colors.primary,
  },
});
