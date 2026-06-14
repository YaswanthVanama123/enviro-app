import React, {useState} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors, FontSize, Spacing} from '../../../theme';
import {useAuth} from '../../admin/context/AdminAuthContext';
import {UserRole} from '../../../services/storage/storage.service';
import {useTranslation} from '../../../i18n';
import {LanguageSwitcher} from '../../../shared/components/ui/LanguageSwitcher';

type TabType = 'employee' | 'admin';

export function LoginScreen() {
  const {login, loading} = useAuth();
  const {t} = useTranslation();

  const [activeTab, setActiveTab] = useState<TabType>('employee');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    if (!username.trim() || !password) {
      setError(t('login.enterCredentials'));
      return;
    }

    setError(null);
    const result = await login(username, password, activeTab as UserRole);
    if (result) {
      setError(result);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setUsername('');
    setPassword('');
    setError(null);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          {}
          <View style={styles.logoContainer}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoText}>EM</Text>
            </View>
          </View>

          <Text style={styles.title}>EnviroMaster</Text>
          <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
          <View style={styles.regionPill}>
            <Ionicons name="location-outline" size={13} color={Colors.primary} />
            <Text style={styles.regionText}>{t('landing.region')}</Text>
          </View>

          {}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'employee' && styles.tabActive,
              ]}
              onPress={() => handleTabChange('employee')}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'employee' && styles.tabTextActive,
                ]}>
                {t('common.employee')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'admin' && styles.tabActive,
              ]}
              onPress={() => handleTabChange('admin')}>
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'admin' && styles.tabTextActive,
                ]}>
                {t('common.admin')}
              </Text>
            </TouchableOpacity>
          </View>

          {}
          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('login.username')}</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder={t('login.usernamePlaceholder')}
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('login.password')}</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('login.passwordPlaceholder')}
                  placeholderTextColor={Colors.textMuted}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!loading}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons
                    name={showPassword ? 'eye' : 'eye-off'}
                    size={20}
                    color={Colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleLogin}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color={Colors.textWhite} size="small" />
              ) : (
                <Text style={styles.buttonText}>
                  {t('login.signInAs', {
                    role:
                      activeTab === 'admin'
                        ? t('common.admin')
                        : t('common.employee'),
                  })}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          {}
          <Text style={styles.infoText}>
            {activeTab === 'admin'
              ? t('login.infoAdmin')
              : t('login.infoEmployee')}
          </Text>

          <View style={styles.langRow}>
            <LanguageSwitcher variant="dark" />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  card: {
    
    backgroundColor: 'transparent',
    padding: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.textWhite,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  subtitle: {
    fontSize: FontSize.md,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  regionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'center',
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: Spacing.xl,
  },
  regionText: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  langRow: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 4,
    marginBottom: Spacing.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: Colors.primary,





  },
  tabText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  tabTextActive: {
    color: Colors.textWhite,
  },
  form: {
    gap: Spacing.md,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  eyeButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  eyeIcon: {
    fontSize: 20,
  },
  errorContainer: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 10,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    minHeight: 48,
  },
  buttonDisabled: {
    backgroundColor: '#e57373',
  },
  buttonText: {
    color: Colors.textWhite,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  infoText: {
    marginTop: Spacing.xl,
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
