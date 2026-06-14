import React from 'react';
import {View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Platform} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import type {NativeStackNavigationProp} from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useAuth} from '../../features/admin/context/AdminAuthContext';
import {Colors, FontSize, Spacing} from '../../theme';
import {useTranslation} from '../../i18n';
import {LanguageSwitcher} from '../../shared/components/ui/LanguageSwitcher';
import type {RootStackParamList} from './types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

interface QuickAction {
  labelKey: string;
  descKey: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  route: keyof RootStackParamList;
}

const EMPLOYEE_ACTIONS: QuickAction[] = [
  {labelKey: 'more.actions.myQuota', descKey: 'more.actions.myQuotaDesc', icon: 'trending-up', iconColor: '#2563eb', iconBg: '#dbeafe', route: 'MyQuota'},
  {labelKey: 'more.actions.myCommissions', descKey: 'more.actions.myCommissionsDesc', icon: 'calculator', iconColor: '#16a34a', iconBg: '#dcfce7', route: 'MyCommissions'},
  {labelKey: 'more.actions.insideSales', descKey: 'more.actions.insideSalesDesc', icon: 'analytics', iconColor: '#d97706', iconBg: '#fef3c7', route: 'MyInsideSales'},
];

const ADMIN_ACTIONS: QuickAction[] = [
  {labelKey: 'more.actions.insideSales', descKey: 'more.actions.insideSalesDescAdmin', icon: 'analytics', iconColor: '#d97706', iconBg: '#fef3c7', route: 'MyInsideSales'},
  {labelKey: 'more.actions.employeeCommissions', descKey: 'more.actions.employeeCommissionsDesc', icon: 'cash-outline', iconColor: '#16a34a', iconBg: '#dcfce7', route: 'AdminCommissions'},
  {labelKey: 'more.actions.adminPanel', descKey: 'more.actions.adminPanelDesc', icon: 'shield-checkmark', iconColor: Colors.primary, iconBg: Colors.primaryLight, route: 'AdminPanel'},
];

export function MoreScreen() {
  const {user, isAdmin, logout} = useAuth();
  const {t} = useTranslation();
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const actions = isAdmin ? ADMIN_ACTIONS : EMPLOYEE_ACTIONS;

  const handleLogout = () => {
    Alert.alert(t('more.logoutConfirmTitle'), t('more.logoutConfirmMessage'), [
      {text: t('common.cancel'), style: 'cancel'},
      {text: t('common.logout'), style: 'destructive', onPress: () => logout()},
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, {paddingTop: insets.top + Spacing.lg}]}
      showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(user?.fullName || user?.username || 'U')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{user?.fullName || user?.username}</Text>
        <View style={[styles.roleBadge, isAdmin ? styles.adminBadge : styles.employeeBadge]}>
          <Text style={styles.roleText}>{isAdmin ? t('common.administrator') : t('common.employee')}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('more.quickActions')}</Text>
        {actions.map(action => (
          <TouchableOpacity
            key={action.route}
            style={styles.actionRow}
            onPress={() => navigation.navigate(action.route as any)}>
            <View style={[styles.actionIcon, {backgroundColor: action.iconBg}]}>
              <Ionicons name={action.icon} size={20} color={action.iconColor} />
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionLabel}>{t(action.labelKey)}</Text>
              <Text style={styles.actionDesc}>{t(action.descKey)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('language.label')}</Text>
        <View style={styles.langRow}>
          <LanguageSwitcher variant="dark" />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('more.accountInfo')}</Text>
        <View style={styles.infoRow}>
          <Ionicons name="person-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.infoLabel}>{t('more.username')}</Text>
          <Text style={styles.infoValue}>{user?.username}</Text>
        </View>
        {user?.email ? (
          <View style={styles.infoRow}>
            <Ionicons name="mail-outline" size={20} color={Colors.textSecondary} />
            <Text style={styles.infoLabel}>{t('more.email')}</Text>
            <Text style={styles.infoValue}>{user.email}</Text>
          </View>
        ) : null}
        <View style={styles.infoRow}>
          <Ionicons name="shield-outline" size={20} color={Colors.textSecondary} />
          <Text style={styles.infoLabel}>{t('more.role')}</Text>
          <Text style={styles.infoValue}>{isAdmin ? t('common.administrator') : t('common.employee')}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={Colors.primary} />
        <Text style={styles.logoutText}>{t('common.logout')}</Text>
      </TouchableOpacity>

      <View style={{height: Platform.OS === 'ios' ? 100 : 80}} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  content: {paddingHorizontal: Spacing.lg},
  header: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginBottom: Spacing.lg,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {fontSize: 32, fontWeight: '700', color: Colors.primary},
  name: {fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm},
  roleBadge: {paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: 12},
  adminBadge: {backgroundColor: Colors.primary},
  employeeBadge: {backgroundColor: Colors.blue},
  roleText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textWhite,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  section: {backgroundColor: Colors.surface, borderRadius: 16, padding: Spacing.md, marginBottom: Spacing.lg},
  langRow: {alignItems: 'flex-start'},
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.md,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  actionIcon: {width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center'},
  actionContent: {flex: 1, marginLeft: Spacing.md},
  actionLabel: {fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary},
  actionDesc: {fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2},
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  infoLabel: {flex: 1, marginLeft: Spacing.sm, fontSize: FontSize.md, color: Colors.textSecondary},
  infoValue: {fontSize: FontSize.md, fontWeight: '500', color: Colors.textPrimary},
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primaryLight,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    gap: Spacing.sm,
  },
  logoutText: {fontSize: FontSize.md, fontWeight: '600', color: Colors.primary},
});
