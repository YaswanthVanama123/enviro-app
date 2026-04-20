import React from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors, Spacing, Radius, FontSize, Shadow} from '../../../theme';

interface ActionCardProps {
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  iconName: string;
  btnLabel: string;
  btnColor: string;
  onPress: () => void;
  fullWidth?: boolean;
  cardWidth?: number;
}

export function ActionCard({
  title,
  description,
  iconBg,
  iconColor,
  iconName,
  btnLabel,
  btnColor,
  onPress,
  fullWidth = false,
  cardWidth,
}: ActionCardProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[
        styles.actionCard,
        fullWidth ? styles.actionCardFull : cardWidth ? {width: cardWidth} : undefined,
      ]}>
      <View style={[styles.actionIcon, {backgroundColor: iconBg}]}>
        <Ionicons name={iconName} size={22} color={iconColor} />
      </View>
      <View style={fullWidth ? styles.actionTextFull : styles.actionTextBlock}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc} numberOfLines={fullWidth ? 1 : 3}>
          {description}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[
          styles.actionBtn,
          {backgroundColor: btnColor},
          fullWidth && styles.actionBtnFull,
        ]}>
        <Text style={styles.actionBtnText}>{btnLabel}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  actionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadow.medium,
  },
  actionCardFull: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  actionTextBlock: {flex: 1, marginBottom: Spacing.md},
  actionTextFull: {flex: 1},
  actionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  actionDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  actionBtn: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  actionBtnFull: {alignSelf: 'center', paddingHorizontal: Spacing.lg},
  actionBtnText: {
    color: Colors.textWhite,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
