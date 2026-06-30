import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors, FontSize, TextSize, Radius, Spacing} from '../../../theme';
import {useTranslation} from '../../../i18n';
import {LanguageSwitcher} from '../../../shared/components/ui/LanguageSwitcher';
import type {RootStackParamList} from '../../../app/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FEATURES: {key: string; icon: string; tint: string; fg: string}[] = [
  {key: 'agreements', icon: 'document-text', tint: '#fee2e2', fg: '#c00000'},
  {key: 'commissions', icon: 'cash', tint: '#dcfce7', fg: '#16a34a'},
  {key: 'quota', icon: 'trending-up', tint: '#dbeafe', fg: '#2563eb'},
  {key: 'documents', icon: 'folder-open', tint: '#fef3c7', fg: '#d97706'},
];

export function LandingScreen() {
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();

  const goToLogin = () => navigation.navigate('Login');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        {/* ---------- Hero ---------- */}
        <View style={styles.hero}>
          {/* decorative depth */}
          <View style={styles.blobOne} pointerEvents="none" />
          <View style={styles.blobTwo} pointerEvents="none" />
          <View style={styles.blobThree} pointerEvents="none" />

          <SafeAreaView edges={['top']}>
            <View style={styles.heroTop}>
              <View style={styles.logoChip}>
                <Text style={styles.logoChipText}>EM</Text>
              </View>
              <LanguageSwitcher variant="light" />
            </View>

            <View style={styles.heroBody}>
              <View style={styles.badge}>
                <View style={styles.badgeDot} />
                <Text style={styles.badgeText}>{t('landing.badge')}</Text>
              </View>

              <Text style={styles.heroTitle}>{t('landing.heroTitle')}</Text>
              <Text style={styles.heroSubtitle}>{t('landing.heroSubtitle')}</Text>

              <View style={styles.regionPill}>
                <Ionicons name="location" size={13} color={Colors.textWhite} />
                <Text style={styles.regionText}>{t('landing.region')}</Text>
              </View>

              <Text style={styles.heroDesc}>{t('landing.heroDescription')}</Text>

              <TouchableOpacity
                style={styles.ctaPrimary}
                onPress={goToLogin}
                activeOpacity={0.9}>
                <Text style={styles.ctaPrimaryText}>{t('landing.getStarted')}</Text>
                <View style={styles.ctaArrow}>
                  <Ionicons name="arrow-forward" size={16} color={Colors.textWhite} />
                </View>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* ---------- Features ---------- */}
        <View style={styles.featuresSection}>
          <Text style={styles.sectionEyebrow}>{t('landing.featuresSubheading')}</Text>
          <Text style={styles.sectionHeading}>{t('landing.featuresHeading')}</Text>

          <View style={styles.grid}>
            {FEATURES.map(f => (
              <View key={f.key} style={styles.featureCard}>
                <View style={[styles.featureIcon, {backgroundColor: f.tint}]}>
                  <Ionicons name={f.icon} size={20} color={f.fg} />
                </View>
                <Text style={styles.featureTitle}>
                  {t(`landing.features.${f.key}.title`)}
                </Text>
                <Text style={styles.featureDesc}>
                  {t(`landing.features.${f.key}.description`)}
                </Text>
              </View>
            ))}
          </View>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={goToLogin}
            activeOpacity={0.7}>
            <Ionicons name="log-in-outline" size={18} color={Colors.primary} />
            <Text style={styles.loginLinkText}>{t('landing.login')}</Text>
          </TouchableOpacity>

          <Text style={styles.footer}>{t('landing.footer')}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const cardShadow = Platform.select({
  ios: {
    shadowColor: '#0f172a',
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  android: {elevation: 3},
});

const ctaShadow = Platform.select({
  ios: {
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.18,
    shadowRadius: 16,
  },
  android: {elevation: 6},
});

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.background},
  scroll: {flex: 1},
  content: {paddingBottom: Spacing.xxxl},

  hero: {
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl + Spacing.xl,
    overflow: 'hidden',
  },
  blobOne: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  blobTwo: {
    position: 'absolute',
    top: 40,
    left: -90,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  blobThree: {
    position: 'absolute',
    bottom: -40,
    right: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },

  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  logoChip: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {width: 0, height: 4},
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {elevation: 4},
    }) as object),
  },
  logoChipText: {fontSize: FontSize.xl, fontWeight: '800', color: Colors.primary, letterSpacing: -0.5},

  heroBody: {alignItems: 'flex-start'},
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    marginBottom: Spacing.lg,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textWhite,
  },
  badgeText: {
    color: Colors.textWhite,
    fontSize: FontSize.xxs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  heroTitle: {
    fontSize: FontSize.hero,
    lineHeight: 30,
    fontWeight: '800',
    color: Colors.textWhite,
    marginBottom: Spacing.sm,
    letterSpacing: -0.6,
  },
  heroSubtitle: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textWhite,
    opacity: 0.95,
    marginBottom: Spacing.md,
  },
  regionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.14)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.full,
    marginBottom: Spacing.lg,
  },
  regionText: {
    color: Colors.textWhite,
    fontSize: FontSize.xxs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroDesc: {
    fontSize: FontSize.sm,
    color: Colors.textWhite,
    opacity: 0.9,
    lineHeight: 19,
    marginBottom: Spacing.xl,
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md + 4,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
    ...(ctaShadow as object),
  },
  ctaPrimaryText: {
    fontSize: FontSize.md,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: -0.2,
  },
  ctaArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  featuresSection: {
    paddingHorizontal: Spacing.xl,
    marginTop: -Spacing.xl,
  },
  sectionEyebrow: {
    fontSize: FontSize.xxs,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  sectionHeading: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    letterSpacing: -0.4,
    marginBottom: Spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '48.5%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    ...(cardShadow as object),
  },
  featureIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  featureTitle: {
    fontSize: TextSize[14],
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 5,
    letterSpacing: -0.2,
  },
  featureDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.full,
    backgroundColor: Colors.primaryLight,
    borderWidth: 1,
    borderColor: '#fbd5d5',
  },
  loginLinkText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primary,
  },
  footer: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
    lineHeight: 16,
  },
});
