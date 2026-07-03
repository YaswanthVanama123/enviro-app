import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import {useNavigation} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {Colors} from '../../../theme/colors';
import {Spacing, Radius} from '../../../theme/spacing';
import {FontSize} from '../../../theme/typography';
import {
  adminApi,
  type UserListItem,
  type CreateAdminPayload,
  type CreateEmployeePayload,
} from '../../../services/api/endpoints/admin.api';
import {useAuth} from '../context/AdminAuthContext';

type RoleFilter = 'all' | 'admin' | 'employee';
type UserRole = 'admin' | 'employee';

const SUPER_ADMIN = 'envimaster';

const emptyForm = {
  username: '',
  password: '',
  confirmPassword: '',
  fullName: '',
  email: '',
  role: 'employee' as UserRole,
  isActive: true,
  backupManagement: false,
  priceChanges: false,
};

function formatDate(iso?: string): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
}

export function UserManagementScreen() {
  const navigation = useNavigation();
  const {user} = useAuth();

  const [users, setUsers] = useState<UserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<RoleFilter>('all');
  const [search, setSearch] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<UserListItem | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [resetTarget, setResetTarget] = useState<UserListItem | null>(null);
  const [newPassword, setNewPassword] = useState('');

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await adminApi.listUsers({limit: 200});
      setUsers(res?.users ?? []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter(u => {
    if (filterRole !== 'all' && u.role !== filterRole) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        u.username.toLowerCase().includes(q) ||
        (u.fullName || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowForm(true);
  };

  const openEdit = (u: UserListItem) => {
    setEditing(u);
    setForm({
      username: u.username,
      password: '',
      confirmPassword: '',
      fullName: u.fullName || '',
      email: u.email || '',
      role: u.role,
      isActive: u.isActive,
      backupManagement: u.permissions?.backupManagement ?? false,
      priceChanges: u.permissions?.priceChanges ?? false,
    });
    setFormError(null);
    setShowForm(true);
  };

  const submitForm = async () => {
    setFormError(null);
    if (!form.username.trim()) {
      setFormError('Username is required');
      return;
    }
    if (!editing) {
      if (!form.password || form.password.length < 6) {
        setFormError('Password must be at least 6 characters');
        return;
      }
      if (form.password !== form.confirmPassword) {
        setFormError('Passwords do not match');
        return;
      }
      if (form.role === 'employee' && !form.fullName.trim()) {
        setFormError('Full name is required for employees');
        return;
      }
    }
    setSubmitting(true);
    try {
      let result: {ok: boolean; message?: string};
      if (editing) {
        result = await adminApi.updateUser(editing.role, editing.id, {
          username: form.username,
          email: form.email || undefined,
          isActive: form.isActive,
          ...(editing.role === 'employee' ? {fullName: form.fullName} : {}),
          ...(editing.role === 'admin'
            ? {permissions: {backupManagement: form.backupManagement, priceChanges: form.priceChanges}}
            : {}),
        });
      } else if (form.role === 'admin') {
        const payload: CreateAdminPayload = {
          username: form.username,
          password: form.password,
          email: form.email || undefined,
          permissions: {backupManagement: form.backupManagement, priceChanges: form.priceChanges},
          isActive: form.isActive,
        };
        result = await adminApi.createAdmin(payload);
      } else {
        const payload: CreateEmployeePayload = {
          username: form.username,
          password: form.password,
          fullName: form.fullName,
          email: form.email || undefined,
          isActive: form.isActive,
        };
        result = await adminApi.createEmployee(payload);
      }
      if (!result.ok) {
        setFormError(result.message || 'Failed to save user');
        return;
      }
      setShowForm(false);
      fetchUsers();
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (u: UserListItem) => {
    await adminApi.toggleUserStatus(u.role, u.id, !u.isActive);
    fetchUsers();
  };

  const submitReset = async () => {
    if (!resetTarget) return;
    if (!newPassword || newPassword.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      const res = await adminApi.resetUserPassword(resetTarget.role, resetTarget.id, newPassword);
      if (res.ok) {
        setResetTarget(null);
        setNewPassword('');
      } else {
        setFormError(res.message || 'Failed to reset password');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isSuper = (u: UserListItem) => u.username === SUPER_ADMIN;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>User Management</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filters}>
        <View style={styles.roleTabs}>
          {(['all', 'admin', 'employee'] as RoleFilter[]).map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.roleTab, filterRole === r && styles.roleTabActive]}
              onPress={() => setFilterRole(r)}>
              <Text style={[styles.roleTabText, filterRole === r && styles.roleTabTextActive]}>
                {r === 'all' ? 'All' : r === 'admin' ? 'Admins' : 'Employees'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.searchBox}>
          <Ionicons name="search" size={16} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by username or name…"
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color="#9ca3af" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => fetchUsers()}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchUsers(true)} tintColor={Colors.primary} />}>
          <Text style={styles.count}>{filtered.length} user{filtered.length === 1 ? '' : 's'}</Text>
          {filtered.map(u => (
            <View key={`${u.role}-${u.id}`} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{(u.fullName || u.username)[0]?.toUpperCase()}</Text>
                </View>
                <View style={{flex: 1}}>
                  <Text style={styles.userName}>{u.fullName || u.username}</Text>
                  <Text style={styles.userSub}>@{u.username}{u.email ? ` · ${u.email}` : ''}</Text>
                </View>
                <View style={styles.badges}>
                  <View style={[styles.roleBadge, u.role === 'admin' ? styles.adminBadge : styles.empBadge]}>
                    <Text style={[styles.roleBadgeText, {color: u.role === 'admin' ? '#1d4ed8' : Colors.primary}]}>
                      {u.role}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, u.isActive ? styles.activeBadge : styles.inactiveBadge]}>
                    <Text style={[styles.statusBadgeText, {color: u.isActive ? '#15803d' : '#b91c1c'}]}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </Text>
                  </View>
                </View>
              </View>
              <Text style={styles.lastLogin}>Last login: {formatDate(u.lastLoginAt)}</Text>
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(u)}>
                  <Ionicons name="create-outline" size={14} color="#2563eb" />
                  <Text style={[styles.actionText, {color: '#2563eb'}]}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => {
                    setResetTarget(u);
                    setNewPassword('');
                    setFormError(null);
                  }}>
                  <Ionicons name="key-outline" size={14} color="#7c3aed" />
                  <Text style={[styles.actionText, {color: '#7c3aed'}]}>Reset</Text>
                </TouchableOpacity>
                {!isSuper(u) && (
                  <TouchableOpacity
                    style={[styles.actionBtn, u.isActive ? styles.deactivateBtn : styles.activateBtn]}
                    onPress={() => toggleStatus(u)}>
                    <Text style={[styles.actionText, {color: u.isActive ? '#dc2626' : '#15803d'}]}>
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          ))}
          <View style={{height: 40}} />
        </ScrollView>
      )}

      {/* Create / Edit modal */}
      <Modal visible={showForm} transparent animationType="fade" onRequestClose={() => setShowForm(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <ScrollView>
              <Text style={styles.modalTitle}>{editing ? 'Edit User' : 'Create New User'}</Text>

              {!editing && (
                <>
                  <Text style={styles.label}>Role</Text>
                  <View style={styles.segment}>
                    {(['employee', 'admin'] as UserRole[]).map(r => (
                      <TouchableOpacity
                        key={r}
                        style={[styles.segBtn, form.role === r && styles.segBtnActive]}
                        onPress={() => setForm({...form, role: r})}>
                        <Text style={[styles.segText, form.role === r && styles.segTextActive]}>
                          {r === 'admin' ? 'Admin' : 'Employee'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              <Text style={styles.label}>Username *</Text>
              <TextInput
                style={styles.input}
                value={form.username}
                onChangeText={v => setForm({...form, username: v})}
                autoCapitalize="none"
              />

              {!editing && (
                <>
                  <Text style={styles.label}>Password *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.password}
                    onChangeText={v => setForm({...form, password: v})}
                    secureTextEntry
                    placeholder="Minimum 6 characters"
                    placeholderTextColor="#9ca3af"
                  />
                  <Text style={styles.label}>Confirm Password *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.confirmPassword}
                    onChangeText={v => setForm({...form, confirmPassword: v})}
                    secureTextEntry
                  />
                </>
              )}

              {(editing ? editing.role === 'employee' : form.role === 'employee') && (
                <>
                  <Text style={styles.label}>Full Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={form.fullName}
                    onChangeText={v => setForm({...form, fullName: v})}
                  />
                </>
              )}

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={form.email}
                onChangeText={v => setForm({...form, email: v})}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              {(editing ? editing.role === 'admin' : form.role === 'admin') && (
                <>
                  <Text style={styles.permHeader}>Permissions</Text>
                  {editing && isSuper(editing) && (
                    <Text style={styles.superNote}>Super admin — all permissions always granted.</Text>
                  )}
                  <TouchableOpacity
                    style={styles.checkRow}
                    disabled={!!(editing && isSuper(editing))}
                    onPress={() => setForm({...form, backupManagement: !form.backupManagement})}>
                    <Ionicons
                      name={(editing && isSuper(editing)) || form.backupManagement ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={Colors.primary}
                    />
                    <Text style={styles.checkLabel}>Backup management (create & restore)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.checkRow}
                    disabled={!!(editing && isSuper(editing))}
                    onPress={() => setForm({...form, priceChanges: !form.priceChanges})}>
                    <Ionicons
                      name={(editing && isSuper(editing)) || form.priceChanges ? 'checkbox' : 'square-outline'}
                      size={20}
                      color={Colors.primary}
                    />
                    <Text style={styles.checkLabel}>Price changes (edit pricing)</Text>
                  </TouchableOpacity>
                </>
              )}

              {editing && (
                <TouchableOpacity
                  style={styles.checkRow}
                  onPress={() => setForm({...form, isActive: !form.isActive})}>
                  <Ionicons name={form.isActive ? 'checkbox' : 'square-outline'} size={20} color={Colors.primary} />
                  <Text style={styles.checkLabel}>Active</Text>
                </TouchableOpacity>
              )}

              {formError && <Text style={styles.formError}>{formError}</Text>}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowForm(false)} disabled={submitting}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={submitForm} disabled={submitting}>
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>{editing ? 'Save Changes' : 'Create User'}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Reset password modal */}
      <Modal visible={resetTarget !== null} transparent animationType="fade" onRequestClose={() => setResetTarget(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSub}>For {resetTarget?.username}</Text>
            <Text style={styles.label}>New Password *</Text>
            <TextInput
              style={styles.input}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholder="Minimum 6 characters"
              placeholderTextColor="#9ca3af"
            />
            {formError && <Text style={styles.formError}>{formError}</Text>}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setResetTarget(null)} disabled={submitting}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={submitReset} disabled={submitting}>
                {submitting ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.saveBtnText}>Reset</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#f9fafb'},
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: Spacing.sm,
  },
  backBtn: {padding: Spacing.xs},
  headerTitle: {flex: 1, fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary},
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.full,
  },
  addBtnText: {color: '#fff', fontWeight: '700', fontSize: FontSize.sm},
  filters: {paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, gap: Spacing.sm},
  roleTabs: {flexDirection: 'row', gap: Spacing.sm},
  roleTab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  roleTabActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  roleTabText: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary},
  roleTabTextActive: {color: '#fff'},
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
  },
  searchInput: {flex: 1, paddingVertical: Spacing.sm, fontSize: FontSize.sm, color: Colors.textPrimary},
  centered: {flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.md, padding: Spacing.xl},
  errorText: {color: '#dc2626', fontSize: FontSize.md, textAlign: 'center'},
  retryBtn: {backgroundColor: Colors.primary, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md},
  retryBtnText: {color: '#fff', fontWeight: '600'},
  list: {padding: Spacing.lg},
  count: {fontSize: FontSize.xs, color: Colors.textMuted, marginBottom: Spacing.sm},
  card: {
    backgroundColor: '#fff',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  cardTop: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm},
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {color: '#fff', fontWeight: '800', fontSize: FontSize.md},
  userName: {fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary},
  userSub: {fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 1},
  badges: {alignItems: 'flex-end', gap: 4},
  roleBadge: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4},
  adminBadge: {backgroundColor: '#dbeafe'},
  empBadge: {backgroundColor: '#fdeaea'},
  roleBadgeText: {fontSize: 10, fontWeight: '700', textTransform: 'capitalize'},
  statusBadge: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4},
  activeBadge: {backgroundColor: '#dcfce7'},
  inactiveBadge: {backgroundColor: '#fee2e2'},
  statusBadgeText: {fontSize: 10, fontWeight: '700'},
  lastLogin: {fontSize: FontSize.xs, color: Colors.textMuted, marginTop: Spacing.sm},
  cardActions: {flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm},
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.md,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  deactivateBtn: {backgroundColor: '#fef2f2', borderColor: '#fecaca', marginLeft: 'auto'},
  activateBtn: {backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', marginLeft: 'auto'},
  actionText: {fontSize: FontSize.xs, fontWeight: '700'},
  modalOverlay: {flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: Spacing.lg},
  modal: {backgroundColor: '#fff', borderRadius: Radius.xl, padding: Spacing.lg, maxHeight: '88%'},
  modalTitle: {fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: Spacing.sm},
  modalSub: {fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.sm},
  label: {fontSize: FontSize.sm, fontWeight: '600', color: '#374151', marginTop: Spacing.sm, marginBottom: 4},
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  segment: {flexDirection: 'row', backgroundColor: '#f1f5f9', borderRadius: Radius.md, padding: 3, gap: 3},
  segBtn: {flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: Radius.sm},
  segBtnActive: {backgroundColor: Colors.primary},
  segText: {fontSize: FontSize.sm, fontWeight: '700', color: Colors.textSecondary},
  segTextActive: {color: '#fff'},
  permHeader: {fontSize: FontSize.sm, fontWeight: '700', color: '#374151', marginTop: Spacing.md},
  superNote: {fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2},
  checkRow: {flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.sm},
  checkLabel: {fontSize: FontSize.sm, color: Colors.textPrimary, flex: 1},
  formError: {
    marginTop: Spacing.md,
    padding: Spacing.sm,
    backgroundColor: '#fef2f2',
    color: '#dc2626',
    borderRadius: Radius.sm,
    fontSize: FontSize.sm,
  },
  modalActions: {flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.lg},
  cancelBtn: {paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md, backgroundColor: '#f1f5f9'},
  cancelBtnText: {fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary},
  saveBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    minWidth: 110,
    alignItems: 'center',
  },
  saveBtnText: {fontSize: FontSize.sm, fontWeight: '700', color: '#fff'},
});

export default UserManagementScreen;
