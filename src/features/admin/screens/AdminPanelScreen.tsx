import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import {useAdminAuth} from '../context/AdminAuthContext';
import {API_BASE_URL} from '../../../config';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';

type ForgotStep = 'developer' | 'reset';

export function AdminPanelScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const {user, isAuthenticated, authReady, login, logout} = useAdminAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<ForgotStep>('developer');
  const [developerName, setDeveloperName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleLogin = useCallback(async () => {
    if (!username.trim() || !password) {
      setLoginError('Please enter username and password.');
      return;
    }
    setLoading(true);
    setLoginError(null);
    const error = await login(username, password);
    if (error) {setLoginError(error);}
    setLoading(false);
  }, [username, password, login]);

  const handleLogout = useCallback(async () => {
    await logout();
    setUsername('');
    setPassword('');
    setLoginError(null);
  }, [logout]);

  const openForgotModal = useCallback(() => {
    setShowForgotModal(true);
    setForgotStep('developer');
    setDeveloperName('');
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setResetSuccess(false);
  }, []);

  const closeForgotModal = useCallback(() => {
    setShowForgotModal(false);
    setForgotStep('developer');
    setDeveloperName('');
    setNewPassword('');
    setConfirmPassword('');
    setResetError('');
    setResetSuccess(false);
  }, []);

  const handleDeveloperSubmit = useCallback(() => {
    if (developerName.trim().toLowerCase() === 'hanitha') {
      setResetError('');
      setForgotStep('reset');
    } else {
      setResetError('Access denied. Only authorized developers can reset passwords.');
    }
  }, [developerName]);

  const handlePasswordReset = useCallback(async () => {
    setResetError('');
    if (newPassword.length < 6) {
      setResetError('Password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    setResetLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/reset-password`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({developerName: developerName.trim(), newPassword}),
      });
      const data = await res.json();
      if (res.ok) {
        setResetSuccess(true);
        setTimeout(() => closeForgotModal(), 2000);
      } else {
        setResetError(data.message ?? 'Failed to reset password.');
      }
    } catch {
      setResetError('Network error. Please try again.');
    } finally {
      setResetLoading(false);
    }
  }, [newPassword, confirmPassword, developerName, closeForgotModal]);

  if (!authReady) {
    return (
      <View style={[styles.screen, {paddingTop: insets.top}, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isAuthenticated && user) {
    return (
      <View style={[styles.screen, {paddingTop: insets.top}]}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {paddingBottom: insets.bottom + 24},
          ]}
          showsVerticalScrollIndicator={false}>

          <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              <Ionicons name="person" size={32} color={Colors.primary} />
            </View>
            <Text style={styles.profileName}>{user.username}</Text>
            <Text style={styles.profileRole}>Administrator</Text>
            <View style={styles.profileBadge}>
              <View style={styles.profileBadgeDot} />
              <Text style={styles.profileBadgeText}>Authenticated</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('Agreement')}>
            <View style={styles.menuRowLeft}>
              <View style={[styles.menuIconBox, {backgroundColor: '#eff6ff'}]}>
                <Ionicons name="reader-outline" size={18} color="#2563eb" />
              </View>
              <Text style={styles.menuRowText}>Service Agreement Template</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('Trash')}>
            <View style={styles.menuRowLeft}>
              <View style={[styles.menuIconBox, {backgroundColor: '#fef2f2'}]}>
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
              </View>
              <Text style={styles.menuRowText}>Trash</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color={Colors.primary} />
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {paddingBottom: insets.bottom + 24},
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>

          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="lock-closed" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Admin Access</Text>
            <Text style={styles.heroSub}>Sign in with your admin credentials</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Username</Text>
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={t => {setUsername(t); setLoginError(null);}}
                placeholder="Enter username"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <Text style={[styles.fieldLabel, {marginTop: Spacing.md}]}>Password</Text>
            <View style={styles.inputRow}>
              <Ionicons name="key-outline" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={t => {setPassword(t); setLoginError(null);}}
                placeholder="Enter password"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(p => !p)}
                hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>

            {loginError ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.signInBtn, loading && {opacity: 0.7}]}
              onPress={handleLogin}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="log-in-outline" size={18} color="#fff" />
                  <Text style={styles.signInBtnText}>Sign In</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.forgotBtn} onPress={openForgotModal}>
              <Text style={styles.forgotBtnText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={closeForgotModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconBox}>
                <Ionicons name="lock-closed-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.modalTitle}>
                {forgotStep === 'developer' ? 'Developer Verification' : 'Reset Password'}
              </Text>
              <TouchableOpacity onPress={closeForgotModal} hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                <Ionicons name="close" size={22} color={Colors.textMuted} />
              </TouchableOpacity>
            </View>

            {forgotStep === 'developer' ? (
              <View style={styles.modalBody}>
                <Text style={styles.modalDescription}>
                  Enter the developer name to proceed with password reset:
                </Text>
                <Text style={styles.fieldLabel}>Developer Name</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="person-outline" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={developerName}
                    onChangeText={t => {setDeveloperName(t); setResetError('');}}
                    placeholder="Enter developer name"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleDeveloperSubmit}
                    autoFocus
                  />
                </View>
                {resetError ? (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
                    <Text style={styles.errorText}>{resetError}</Text>
                  </View>
                ) : null}
                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancelBtn} onPress={closeForgotModal}>
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.modalPrimaryBtn} onPress={handleDeveloperSubmit}>
                    <Text style={styles.modalPrimaryBtnText}>Continue</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.modalBody}>
                <Text style={styles.modalDescription}>
                  Welcome, {developerName}! Set a new admin password:
                </Text>

                <Text style={styles.fieldLabel}>New Password</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="key-outline" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={t => {setNewPassword(t); setResetError('');}}
                    placeholder="Enter new password"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showNewPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    autoFocus
                  />
                  <TouchableOpacity
                    onPress={() => setShowNewPassword(p => !p)}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <Ionicons
                      name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                <Text style={[styles.fieldLabel, {marginTop: Spacing.md}]}>Confirm Password</Text>
                <View style={styles.inputRow}>
                  <Ionicons name="key-outline" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={t => {setConfirmPassword(t); setResetError('');}}
                    placeholder="Confirm new password"
                    placeholderTextColor={Colors.textMuted}
                    secureTextEntry={!showConfirmPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handlePasswordReset}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(p => !p)}
                    hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
                    <Ionicons
                      name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                      size={18}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>

                {resetError ? (
                  <View style={styles.errorRow}>
                    <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
                    <Text style={styles.errorText}>{resetError}</Text>
                  </View>
                ) : null}
                {resetSuccess ? (
                  <View style={[styles.errorRow, {backgroundColor: '#f0fdf4', borderColor: '#bbf7d0'}]}>
                    <Ionicons name="checkmark-circle-outline" size={14} color="#16a34a" />
                    <Text style={[styles.errorText, {color: '#16a34a'}]}>Password reset successfully!</Text>
                  </View>
                ) : null}

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, resetLoading && {opacity: 0.6}]}
                    onPress={closeForgotModal}
                    disabled={resetLoading}>
                    <Text style={styles.modalCancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalPrimaryBtn, resetLoading && {opacity: 0.6}]}
                    onPress={handlePasswordReset}
                    disabled={resetLoading}>
                    {resetLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Text style={styles.modalPrimaryBtnText}>Reset Password</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {flex: 1},
  screen: {flex: 1, backgroundColor: '#f9fafb'},
  center: {alignItems: 'center', justifyContent: 'center'},

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
    alignItems: 'center',
  },

  heroRow: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
    width: '100%',
    maxWidth: 520,
  },
  heroIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  heroTitle: {fontSize: FontSize.xl, fontWeight: '700', color: Colors.textPrimary},
  heroSub: {fontSize: FontSize.sm, color: Colors.textMuted, textAlign: 'center'},

  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 520,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  fieldLabel: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary, marginBottom: Spacing.xs},
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    gap: Spacing.sm,
  },
  input: {flex: 1, fontSize: FontSize.md, color: Colors.textPrimary, padding: 0},

  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  errorText: {fontSize: FontSize.xs, color: '#ef4444', flex: 1, lineHeight: 18},

  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.lg,
    paddingVertical: 16,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
  },
  signInBtnText: {fontSize: FontSize.md, fontWeight: '700', color: '#fff'},

  forgotBtn: {marginTop: Spacing.md, alignItems: 'center', paddingVertical: Spacing.sm},
  forgotBtnText: {fontSize: FontSize.sm, color: Colors.primary, fontWeight: '600'},

  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
    width: '100%',
    maxWidth: 520,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  profileName: {fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary},
  profileRole: {fontSize: FontSize.sm, color: Colors.textMuted},
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#d1fae5',
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginTop: Spacing.xs,
  },
  profileBadgeDot: {width: 7, height: 7, borderRadius: 4, backgroundColor: '#10b981'},
  profileBadgeText: {fontSize: FontSize.xs, fontWeight: '600', color: '#065f46'},

  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
    width: '100%',
    maxWidth: 520,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  menuIconBox: {
    width: 34,
    height: 34,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuRowText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
  },

  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
    width: '100%',
    maxWidth: 520,
  },
  logoutBtnText: {fontSize: FontSize.md, fontWeight: '600', color: Colors.primary},

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalIconBox: {
    width: 32,
    height: 32,
    borderRadius: Radius.md,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {flex: 1, fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary},
  modalBody: {padding: Spacing.lg, gap: Spacing.sm},
  modalDescription: {fontSize: FontSize.sm, color: Colors.textMuted, lineHeight: 20, marginBottom: Spacing.xs},
  modalActions: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md},
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelBtnText: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary},
  modalPrimaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {fontSize: FontSize.sm, fontWeight: '700', color: '#fff'},
});
