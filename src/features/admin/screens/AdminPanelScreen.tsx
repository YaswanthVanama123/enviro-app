import React, {useState, useEffect, useCallback} from 'react';
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
import {apiClient} from '../../../services/api/client';
import {storage} from '../../../services/storage/storage.service';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';
import {API_BASE_URL} from '../../../config';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminUser {
  id: string;
  username: string;
}

type ForgotStep = 'developer' | 'reset';

// ─── AdminPanelScreen ─────────────────────────────────────────────────────────

export function AdminPanelScreen() {
  const insets = useSafeAreaInsets();

  // Auth state
  const [user, setUser] = useState<AdminUser | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Login form
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Forgot password modal
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

  // ── Restore session on mount ─────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const token = await storage.getToken();
      const storedUser = await storage.getAdminUser();
      if (token && storedUser) {
        apiClient.setToken(token);
        setUser(storedUser);
      }
      setAuthReady(true);
    })();
  }, []);

  // ── Login ────────────────────────────────────────────────────────────────

  const handleLogin = useCallback(async () => {
    if (!username.trim() || !password) {
      setLoginError('Please enter username and password.');
      return;
    }
    setLoading(true);
    setLoginError(null);

    const res = await apiClient.post<{token: string; admin: AdminUser}>(
      '/api/admin/login',
      {username: username.trim(), password},
    );

    if (res.error || !res.data) {
      setLoginError(res.error ?? 'Login failed. Please try again.');
    } else {
      apiClient.setToken(res.data.token);
      await storage.setToken(res.data.token);
      await storage.setAdminUser(res.data.admin);
      setUser(res.data.admin);
    }
    setLoading(false);
  }, [username, password]);

  // ── Logout ───────────────────────────────────────────────────────────────

  const handleLogout = useCallback(async () => {
    apiClient.setToken(null);
    await storage.clearAuth();
    setUser(null);
    setUsername('');
    setPassword('');
    setLoginError(null);
  }, []);

  // ── Forgot password ──────────────────────────────────────────────────────

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

  // ── Render: loading splash ────────────────────────────────────────────────

  if (!authReady) {
    return (
      <View style={[styles.screen, {paddingTop: insets.top}, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // ── Render: logged-in ─────────────────────────────────────────────────────

  if (user) {
    return (
      <View style={[styles.screen, {paddingTop: insets.top}]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Admin Panel</Text>
          <Text style={styles.headerSub}>Logged in as {user.username}</Text>
        </View>

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {paddingBottom: insets.bottom + 24},
          ]}
          showsVerticalScrollIndicator={false}>

          {/* Profile card */}
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

          {/* Logout button */}
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={18} color="#ef4444" />
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Render: login form ────────────────────────────────────────────────────

  return (
    <View style={[styles.screen, {paddingTop: insets.top}]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Admin Login</Text>
        <Text style={styles.headerSub}>Restricted access</Text>
      </View>

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

          {/* Lock icon hero */}
          <View style={styles.heroRow}>
            <View style={styles.heroIcon}>
              <Ionicons name="lock-closed" size={36} color={Colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Admin Access</Text>
            <Text style={styles.heroSub}>Sign in with your admin credentials</Text>
          </View>

          {/* Login card */}
          <View style={styles.card}>

            {/* Username */}
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

            {/* Password */}
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

            {/* Error */}
            {loginError ? (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={14} color="#ef4444" />
                <Text style={styles.errorText}>{loginError}</Text>
              </View>
            ) : null}

            {/* Sign in button */}
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

            {/* Forgot password */}
            <TouchableOpacity style={styles.forgotBtn} onPress={openForgotModal}>
              <Text style={styles.forgotBtnText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Forgot Password Modal ── */}
      <Modal
        visible={showForgotModal}
        transparent
        animationType="fade"
        onRequestClose={closeForgotModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>

            {/* Header */}
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

            {/* ── Step 1: Developer name ── */}
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
              /* ── Step 2: Reset password ── */
              <View style={styles.modalBody}>
                <Text style={styles.modalDescription}>
                  Welcome, {developerName}! Set a new admin password:
                </Text>

                {/* New password */}
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

                {/* Confirm password */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  flex: {flex: 1},
  screen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Header (matches other screens)
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 3,
    borderBottomColor: Colors.primary,
  },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.primary,
  },
  headerSub: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 2,
  },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },

  // Hero section
  heroRow: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
    gap: Spacing.sm,
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
  heroTitle: {
    fontSize: FontSize.xl,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  heroSub: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // Login card
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },

  // Field
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.md : Spacing.sm,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    padding: 0,
  },

  // Error
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
  errorText: {
    fontSize: FontSize.xs,
    color: '#ef4444',
    flex: 1,
    lineHeight: 18,
  },

  // Sign in button
  signInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
  },
  signInBtnText: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: '#fff',
  },

  // Forgot password link
  forgotBtn: {
    marginTop: Spacing.md,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  forgotBtnText: {
    fontSize: FontSize.sm,
    color: Colors.primary,
    fontWeight: '500',
  },

  // Logged-in profile card
  profileCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
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
  profileName: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  profileRole: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
  },
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
  profileBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  profileBadgeText: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: '#065f46',
  },

  // Logout button
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: Spacing.lg,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
  },
  logoutBtnText: {
    fontSize: FontSize.md,
    fontWeight: '600',
    color: '#ef4444',
  },

  // Forgot password modal
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
  modalTitle: {
    flex: 1,
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  modalBody: {
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  modalDescription: {
    fontSize: FontSize.sm,
    color: Colors.textMuted,
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  modalPrimaryBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  modalPrimaryBtnText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: '#fff',
  },
});
