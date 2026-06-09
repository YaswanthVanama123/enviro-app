import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {salesPersonApi} from '../../../../services/api/endpoints/quota.api';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';
import type {SalesPerson, SalesRole} from '../../types/quota.types';
import {formatCurrency, getSalesRoleLabel} from '../../types/quota.types';

const ROLE_OPTIONS: {value: SalesRole; label: string}[] = [
  {value: 'field_sales', label: 'Field Sales'},
  {value: 'inside_sales', label: 'Inside Sales'},
  {value: 'account_manager', label: 'Account Manager'},
  {value: 'sales_manager', label: 'Sales Manager'},
];

const PERIOD_OPTIONS: {value: 'monthly' | 'quarterly' | 'annual'; label: string}[] = [
  {value: 'monthly', label: 'Monthly'},
  {value: 'quarterly', label: 'Quarterly'},
  {value: 'annual', label: 'Annual'},
];

type ActiveFilter = 'all' | 'active' | 'inactive';

export function SalesPersonManager() {
  const [salesPersons, setSalesPersons] = useState<SalesPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('active');

  const [editing, setEditing] = useState<SalesPerson | null>(null);
  const [salesRole, setSalesRole] = useState<SalesRole>('field_sales');
  const [territory, setTerritory] = useState('');
  const [phone, setPhone] = useState('');
  const [monthlyTarget, setMonthlyTarget] = useState('50000');
  const [periodType, setPeriodType] = useState<'monthly' | 'quarterly' | 'annual'>('monthly');
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadSalesPersons = useCallback(async () => {
    setLoading(true);
    const active = activeFilter === 'all' ? undefined : activeFilter === 'active';
    const result = await salesPersonApi.getAll({
      active,
      search: searchTerm || undefined,
    });
    if (result) {
      setSalesPersons(result.data);
    }
    setLoading(false);
  }, [activeFilter, searchTerm]);

  useEffect(() => {
    const t = setTimeout(loadSalesPersons, 300);
    return () => clearTimeout(t);
  }, [loadSalesPersons]);

  const openEdit = (person: SalesPerson) => {
    setEditing(person);
    setSalesRole(person.role || 'field_sales');
    setTerritory(person.territory || '');
    setPhone(person.phone || '');
    setMonthlyTarget(String(person.quota?.monthlyTarget ?? 50000));
    setPeriodType(person.quota?.periodType || 'monthly');
    setFormError(null);
  };

  const handleSave = async () => {
    if (!editing) return;
    setSaving(true);
    setFormError(null);
    try {
      const updated = await salesPersonApi.update(editing.employeeId, {
        salesRole,
        territory,
        phone,
      });
      if (!updated) {
        setFormError('Failed to update sales person');
        setSaving(false);
        return;
      }

      const target = parseFloat(monthlyTarget) || 0;
      if (
        target !== editing.quota?.monthlyTarget ||
        periodType !== editing.quota?.periodType
      ) {
        const quotaResult = await salesPersonApi.updateQuota(editing.employeeId, {
          monthlyTarget: target,
          periodType,
        });
        if (!quotaResult) {
          setFormError('Failed to update quota');
          setSaving(false);
          return;
        }
      }

      setEditing(null);
      loadSalesPersons();
    } catch (err) {
      setFormError('An error occurred while saving');
    }
    setSaving(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={18} color="#94a3b8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by name, email, or username..."
            placeholderTextColor="#94a3b8"
            value={searchTerm}
            onChangeText={setSearchTerm}
          />
        </View>
      </View>

      <View style={styles.filterRow}>
        {(['all', 'active', 'inactive'] as ActiveFilter[]).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, activeFilter === f && styles.filterChipActive]}
            onPress={() => setActiveFilter(f)}>
            <Text
              style={[
                styles.filterChipText,
                activeFilter === f && styles.filterChipTextActive,
              ]}>
              {f === 'all' ? 'All' : f === 'active' ? 'Active' : 'Inactive'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={16} color="#2563eb" />
        <Text style={styles.infoBannerText}>
          Employees are managed in User Management. Edit quota targets here.
        </Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : salesPersons.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="people-outline" size={48} color="#94a3b8" />
          <Text style={styles.emptyText}>No employees found.</Text>
        </View>
      ) : (
        salesPersons.map(person => (
          <View
            key={person.employeeId}
            style={[styles.card, !person.isActive && styles.cardInactive]}>
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{person.name}</Text>
                <Text style={styles.cardMeta}>
                  {person.employeeId}
                  {person.email ? ` · ${person.email}` : ''}
                </Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  person.isActive ? styles.statusActive : styles.statusInactive,
                ]}>
                <Text
                  style={[
                    styles.statusText,
                    person.isActive ? styles.statusTextActive : styles.statusTextInactive,
                  ]}>
                  {person.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>

            <View style={styles.cardRow}>
              <Text style={styles.cardRowLabel}>Sales Role</Text>
              <Text style={styles.cardRowValue}>{getSalesRoleLabel(person.role)}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardRowLabel}>Territory</Text>
              <Text style={styles.cardRowValue}>{person.territory || '-'}</Text>
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardRowLabel}>Quota Target</Text>
              <Text style={styles.cardRowValue}>
                {formatCurrency(person.quota?.monthlyTarget || 50000)}/mo
              </Text>
            </View>

            <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(person)}>
              <Ionicons name="create-outline" size={16} color="#fff" />
              <Text style={styles.editBtnText}>Edit Quota</Text>
            </TouchableOpacity>
          </View>
        ))
      )}

      <Modal
        visible={editing !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditing(null)}>
        {editing && (
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Quota Settings</Text>
              <TouchableOpacity onPress={() => setEditing(null)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                {editing.name} · {editing.employeeId}
              </Text>

              <Text style={styles.fieldLabel}>Sales Role</Text>
              <View style={styles.optionGroup}>
                {ROLE_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.option, salesRole === opt.value && styles.optionActive]}
                    onPress={() => setSalesRole(opt.value)}>
                    <Text
                      style={[
                        styles.optionText,
                        salesRole === opt.value && styles.optionTextActive,
                      ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Territory</Text>
              <TextInput
                style={styles.textField}
                value={territory}
                onChangeText={setTerritory}
                placeholder="e.g., Houston Metro"
                placeholderTextColor="#94a3b8"
              />

              <Text style={styles.fieldLabel}>Phone</Text>
              <TextInput
                style={styles.textField}
                value={phone}
                onChangeText={setPhone}
                placeholder="(555) 123-4567"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
              />

              <Text style={styles.fieldLabel}>Monthly Quota Target ($)</Text>
              <TextInput
                style={styles.textField}
                value={monthlyTarget}
                onChangeText={setMonthlyTarget}
                placeholder="50000"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Quota Period</Text>
              <View style={styles.optionGroup}>
                {PERIOD_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.option, periodType === opt.value && styles.optionActive]}
                    onPress={() => setPeriodType(opt.value)}>
                    <Text
                      style={[
                        styles.optionText,
                        periodType === opt.value && styles.optionTextActive,
                      ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {formError && <Text style={styles.formError}>{formError}</Text>}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setEditing(null)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={saving}>
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </SafeAreaView>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {gap: Spacing.md},
  searchRow: {flexDirection: 'row'},
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
  },
  searchInput: {flex: 1, fontSize: FontSize.md, color: Colors.textPrimary},
  filterRow: {flexDirection: 'row', gap: Spacing.sm},
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterChipActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  filterChipText: {fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '600'},
  filterChipTextActive: {color: '#fff'},
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: '#eff6ff',
    borderRadius: Radius.md,
    padding: Spacing.sm,
  },
  infoBannerText: {flex: 1, fontSize: FontSize.xs, color: '#1e40af'},
  center: {padding: 40, alignItems: 'center', gap: Spacing.sm},
  emptyText: {fontSize: FontSize.sm, color: Colors.textMuted},
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  cardInactive: {opacity: 0.6},
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  cardInfo: {flex: 1},
  cardName: {fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary},
  cardMeta: {fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2},
  statusBadge: {paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.sm},
  statusActive: {backgroundColor: '#dcfce7'},
  statusInactive: {backgroundColor: '#f3f4f6'},
  statusText: {fontSize: FontSize.xs, fontWeight: '600'},
  statusTextActive: {color: '#16a34a'},
  statusTextInactive: {color: '#6b7280'},
  cardRow: {flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2},
  cardRowLabel: {fontSize: FontSize.sm, color: Colors.textMuted},
  cardRowValue: {fontSize: FontSize.sm, fontWeight: '500', color: Colors.textPrimary},
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  editBtnText: {color: '#fff', fontSize: FontSize.sm, fontWeight: '600'},
  modalContainer: {flex: 1, backgroundColor: Colors.background},
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary},
  modalContent: {padding: Spacing.lg, gap: Spacing.sm},
  modalSubtitle: {fontSize: FontSize.sm, color: Colors.textMuted, marginBottom: Spacing.sm},
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: Spacing.sm,
  },
  optionGroup: {flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm},
  option: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  optionActive: {backgroundColor: Colors.primary, borderColor: Colors.primary},
  optionText: {fontSize: FontSize.sm, color: Colors.textMuted, fontWeight: '500'},
  optionTextActive: {color: '#fff', fontWeight: '600'},
  textField: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 44,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  formError: {fontSize: FontSize.sm, color: '#dc2626', marginTop: Spacing.sm},
  modalActions: {flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg},
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {fontSize: FontSize.md, fontWeight: '600', color: Colors.textMuted},
  saveBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveBtnDisabled: {opacity: 0.6},
  saveBtnText: {fontSize: FontSize.md, fontWeight: '700', color: '#fff'},
});

export default SalesPersonManager;
