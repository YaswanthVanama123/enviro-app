import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors, FontSize, Radius, Spacing} from '../../../theme';
import {useTranslation} from '../../../i18n';
import {LanguageSwitcher} from '../../../shared/components/ui/LanguageSwitcher';
import type {RootStackParamList} from '../../../app/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const FEATURES: {key: string; icon: string}[] = [
  {key: 'agreements', icon: 'document-text-outline'},
  {key: 'commissions', icon: 'cash-outline'},
  {key: 'quota', icon: 'trending-up-outline'},
  {key: 'documents', icon: 'folder-open-outline'},
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
        <SafeAreaView edges={['top']} style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={styles.logoChip}>
              <Text style={styles.logoChipText}>EM</Text>
            </View>
            <LanguageSwitcher variant="light" />
          </View>

          <View style={styles.heroBody}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t('landing.badge')}</Text>
            </View>
            <Text style={styles.heroTitle}>{t('landing.heroTitle')}</Text>
            <Text style={styles.heroSubtitle}>{t('landing.heroSubtitle')}</Text>
            <View style={styles.regionPill}>
              <Ionicons name="location-outline" size={14} color={Colors.textWhite} />
              <Text style={styles.regionText}>{t('landing.region')}</Text>
            </View>
            <Text style={styles.heroDesc}>{t('landing.heroDescription')}</Text>

            <TouchableOpacity style={styles.ctaPrimary} onPress={goToLogin} activeOpacity={0.85}>
              <Text style={styles.ctaPrimaryText}>{t('landing.getStarted')}</Text>
              <Ionicons name="arrow-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        <View style={styles.features}>
          {FEATURES.map(f => (
            <View key={f.key} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name={f.icon} size={22} color={Colors.primary} />
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

        <TouchableOpacity style={styles.loginLink} onPress={goToLogin} activeOpacity={0.7}>
          <Ionicons name="log-in-outline" size={18} color={Colors.primary} />
          <Text style={styles.loginLinkText}>{t('landing.login')}</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>{t('landing.footer')}</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: Colors.background},
  scroll: {flex: 1},
  content: {paddingBottom: Spacing.xxxl},
  hero: {
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    marginBottom: Spacing.xxl,
  },
  logoChip: {
    width: 48,
    height: 48,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoChipText: {fontSize: 20, fontWeight: '800', color: Colors.primary},
  heroBody: {alignItems: 'flex-start'},
  badge: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginBottom: Spacing.lg,
  },
  badgeText: {
    color: Colors.textWhite,
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: FontSize.xxxl,
    fontWeight: '800',
    color: Colors.textWhite,
    marginBottom: Spacing.sm,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: FontSize.lg,
    fontWeight: '600',
    color: Colors.textWhite,
    opacity: 0.95,
    marginBottom: Spacing.md,
  },
  regionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    marginBottom: Spacing.lg,
  },
  regionText: {
    color: Colors.textWhite,
    fontSize: FontSize.xs,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  heroDesc: {
    fontSize: FontSize.md,
    color: Colors.textWhite,
    opacity: 0.92,
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  ctaPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    alignSelf: 'stretch',
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.md + 2,
    borderRadius: Radius.xl,
  },
  ctaPrimaryText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.primary,
  },
  features: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    gap: Spacing.md,
  },
  featureCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  featureTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  featureDesc: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  loginLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    marginHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    backgroundColor: Colors.primaryLight,
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
    paddingHorizontal: Spacing.xl,
  },
});
