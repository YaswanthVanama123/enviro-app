import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useTranslation, SUPPORTED_LANGUAGES} from '../../../i18n';
import {Colors, FontSize, Radius, Spacing} from '../../../theme';

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark';
}

export function LanguageSwitcher({variant = 'dark'}: LanguageSwitcherProps) {
  const {language, setLanguage} = useTranslation();
  const isLight = variant === 'light';

  return (
    <View
      style={[
        styles.container,
        isLight ? styles.containerLight : styles.containerDark,
      ]}>
      <Ionicons
        name="globe-outline"
        size={15}
        color={isLight ? Colors.textWhiteMuted : Colors.textSecondary}
        style={styles.icon}
      />
      {SUPPORTED_LANGUAGES.map(lang => {
        const active = language === lang.code;
        return (
          <TouchableOpacity
            key={lang.code}
            onPress={() => setLanguage(lang.code)}
            style={[
              styles.chip,
              active && (isLight ? styles.chipActiveLight : styles.chipActiveDark),
            ]}>
            <Text
              style={[
                styles.chipText,
                isLight ? styles.chipTextLight : styles.chipTextDark,
                active &&
                  (isLight ? styles.chipTextActiveLight : styles.chipTextActiveDark),
              ]}>
              {lang.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    alignSelf: 'center',
  },
  containerDark: {
    backgroundColor: Colors.gray100,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  containerLight: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
  },
  icon: {
    marginRight: 4,
  },
  chip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  chipActiveDark: {
    backgroundColor: Colors.primary,
  },
  chipActiveLight: {
    backgroundColor: Colors.surface,
  },
  chipText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
  },
  chipTextDark: {
    color: Colors.textSecondary,
  },
  chipTextLight: {
    color: Colors.textWhite,
  },
  chipTextActiveDark: {
    color: Colors.textWhite,
  },
  chipTextActiveLight: {
    color: Colors.primary,
  },
});
