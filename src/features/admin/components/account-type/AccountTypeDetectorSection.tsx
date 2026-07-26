import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {companyMappingApi} from '../../../../services/api/endpoints/companyMapping.api';
import {
  accountTypeApi,
  MapboxDetectionResult,
} from '../../../../services/api/endpoints/accountType.api';
import {
  getAccountTypeColor,
  getAccountTypeBgColor,
} from '../../types/accountType.types';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

const FREQUENCY_OPTIONS: {value: number | null; label: string}[] = [
  {value: null, label: 'All Frequencies'},
  {value: 1, label: 'Weekly'},
  {value: 2, label: 'Bi-Weekly'},
  {value: 3, label: 'Monthly'},
  {value: 14, label: 'Bi-Monthly'},
  {value: 4, label: 'Quarterly'},
  {value: 5, label: 'Bi-Annual'},
  {value: 6, label: 'Annual'},
  {value: 7, label: 'One Time'},
];

interface CompanyOption {
  biginId: string;
  biginCompanyName: string;
  routeStarCustomerName: string | null;
}

export function AccountTypeDetectorSection() {
  const [companies, setCompanies] = useState<CompanyOption[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [selected, setSelected] = useState<CompanyOption | null>(null);
  const [frequency, setFrequency] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [freqOpen, setFreqOpen] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [result, setResult] = useState<MapboxDetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    companyMappingApi
      .getAll({status: 'mapped', limit: 1000})
      .then(response => {
        if (cancelled) {return;}
        if (response?.data) {
          setCompanies(
            response.data.map(m => ({
              biginId: m.biginId,
              biginCompanyName: m.biginCompanyName,
              routeStarCustomerName: m.routeStarCustomerName,
            })),
          );
        }
      })
      .catch(() => {
        if (!cancelled) {setError('Failed to load companies');}
      })
      .finally(() => {
        if (!cancelled) {setLoadingCompanies(false);}
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) {return companies;}
    return companies.filter(
      c =>
        c.biginCompanyName.toLowerCase().includes(q) ||
        (c.routeStarCustomerName && c.routeStarCustomerName.toLowerCase().includes(q)),
    );
  }, [companies, searchTerm]);

  const handleDetect = useCallback(async () => {
    if (!selected) {
      setError('Please select a company');
      return;
    }
    setDetecting(true);
    setError(null);
    setResult(null);
    const detection = await accountTypeApi.detectWithMapbox(
      selected.biginId,
      frequency ?? undefined,
    );
    setResult(detection);
    if (!detection.success && detection.error) {
      setError(detection.error);
    }
    setDetecting(false);
  }, [selected, frequency]);

  const freqLabel =
    FREQUENCY_OPTIONS.find(o => o.value === frequency)?.label ?? 'All Frequencies';

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Account Type Detector</Text>
        <Text style={styles.subtitle}>
          Detect the account type for a Bigin-mapped company using live Mapbox driving times to the
          nearest RouteStar customers.
        </Text>

        <Text style={styles.fieldLabel}>Bigin Company</Text>
        <TouchableOpacity
          style={styles.selectBox}
          onPress={() => setPickerOpen(true)}
          disabled={loadingCompanies}
          activeOpacity={0.7}>
          {loadingCompanies ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name="business-outline" size={16} color={Colors.textMuted} />
          )}
          <Text style={[styles.selectText, !selected && styles.selectPlaceholder]} numberOfLines={1}>
            {loadingCompanies
              ? 'Loading companies…'
              : selected?.biginCompanyName ?? `Search ${companies.length} mapped companies…`}
          </Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
        </TouchableOpacity>
        {selected?.routeStarCustomerName ? (
          <Text style={styles.selectHint}>Mapped to {selected.routeStarCustomerName}</Text>
        ) : null}

        <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Frequency</Text>
        <TouchableOpacity
          style={styles.selectBox}
          onPress={() => setFreqOpen(true)}
          activeOpacity={0.7}>
          <Ionicons name="calendar-outline" size={16} color={Colors.textMuted} />
          <Text style={styles.selectText}>{freqLabel}</Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.detectBtn, (!selected || detecting) && styles.btnDisabled]}
          onPress={handleDetect}
          disabled={!selected || detecting}
          activeOpacity={0.8}>
          {detecting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="car-outline" size={16} color="#fff" />
          )}
          <Text style={styles.detectBtnText}>
            {detecting ? 'Detecting…' : 'Detect Account Type'}
          </Text>
        </TouchableOpacity>

        {error ? (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={15} color="#b91c1c" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {result?.success && (
          <View style={styles.resultBlock}>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Bigin Company</Text>
                <Text style={styles.infoValue}>{result.biginCompany || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Mapped To</Text>
                <Text style={styles.infoValue}>{result.routeStarCustomer || '—'}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{result.fromAddress || 'N/A'}</Text>
              </View>
            </View>

            <View
              style={[
                styles.badgeCard,
                {backgroundColor: getAccountTypeBgColor(result.accountType || 'Pit')},
              ]}>
              <Text style={styles.badgeCardLabel}>ACCOUNT TYPE</Text>
              <Text
                style={[
                  styles.badgeCardValue,
                  {color: getAccountTypeColor(result.accountType || 'Pit')},
                ]}>
                {result.accountType}
              </Text>
              {result.reason ? <Text style={styles.badgeCardReason}>{result.reason}</Text> : null}
            </View>

            {result.thresholds ? (
              <Text style={styles.thresholdText}>
                Thresholds — Bread 5: ≤{result.thresholds.bread5MaxMinutes} min · Bread 15: ≤
                {result.thresholds.bread15MaxMinutes} min
              </Text>
            ) : null}

            {result.destinations && result.destinations.length > 0 && (
              <View style={styles.destBlock}>
                <Text style={styles.destTitle}>Nearest Destinations</Text>
                <View style={styles.destTable}>
                  <View style={styles.destHeadRow}>
                    <Text style={[styles.destHeadCell, styles.colName]}>CUSTOMER</Text>
                    <Text style={[styles.destHeadCell, styles.colNum]}>STORED</Text>
                    <Text style={[styles.destHeadCell, styles.colNum]}>MAPBOX</Text>
                    <Text style={[styles.destHeadCell, styles.colNum]}>TIME</Text>
                  </View>
                  {result.destinations.map((dest, idx) => (
                    <View
                      key={`${dest.destination}-${idx}`}
                      style={[styles.destRow, idx === 0 && styles.destRowNearest]}>
                      <Text style={[styles.destName, styles.colName]} numberOfLines={2}>
                        {idx + 1}. {dest.destination}
                      </Text>
                      <Text style={[styles.destCell, styles.colNum]}>
                        {dest.storedDistanceMiles?.toFixed(1) ?? '-'} mi
                      </Text>
                      <Text style={[styles.destCell, styles.colNum]}>
                        {dest.mapboxDistanceMiles?.toFixed(1) ?? '-'} mi
                      </Text>
                      <Text style={[styles.destCell, styles.colNum]}>
                        {dest.drivingTimeMinutes != null
                          ? `${dest.drivingTimeMinutes.toFixed(1)} min`
                          : dest.error || '-'}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}

        {result && !result.success && !error ? (
          <View style={styles.noResultBox}>
            <Text style={styles.noResultText}>
              {result.error || 'Could not detect an account type for this company.'}
            </Text>
            {result.biginCompany ? (
              <Text style={styles.noResultMeta}>Company: {result.biginCompany}</Text>
            ) : null}
            {result.routeStarCustomer ? (
              <Text style={styles.noResultMeta}>Mapped to {result.routeStarCustomer}</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.pickerScreen}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Bigin Company</Text>
            <TouchableOpacity
              onPress={() => setPickerOpen(false)}
              hitSlop={{top: 8, bottom: 8, left: 8, right: 8}}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <View style={styles.pickerSearchRow}>
            <Ionicons name="search" size={16} color={Colors.textMuted} />
            <TextInput
              style={styles.pickerInput}
              value={searchTerm}
              onChangeText={setSearchTerm}
              placeholder="Search company or RouteStar customer…"
              placeholderTextColor={Colors.textMuted}
              autoCorrect={false}
            />
            {searchTerm.length > 0 && (
              <TouchableOpacity onPress={() => setSearchTerm('')}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <FlatList
            data={filtered}
            keyExtractor={c => c.biginId}
            renderItem={({item}) => (
              <TouchableOpacity
                style={[
                  styles.pickerRow,
                  selected?.biginId === item.biginId && styles.pickerRowActive,
                ]}
                onPress={() => {
                  setSelected(item);
                  setResult(null);
                  setError(null);
                  setPickerOpen(false);
                }}
                activeOpacity={0.7}>
                <Text style={styles.pickerRowName} numberOfLines={1}>
                  {item.biginCompanyName}
                </Text>
                {item.routeStarCustomerName ? (
                  <Text style={styles.pickerRowMeta} numberOfLines={1}>
                    {item.routeStarCustomerName}
                  </Text>
                ) : null}
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.pickerEmpty}>
                <Text style={styles.pickerEmptyText}>No mapped companies match.</Text>
              </View>
            }
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </Modal>

      <Modal
        visible={freqOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFreqOpen(false)}>
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setFreqOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.sheetCard} onPress={() => {}}>
            <Text style={styles.sheetTitle}>Frequency</Text>
            {FREQUENCY_OPTIONS.map(opt => (
              <TouchableOpacity
                key={String(opt.value)}
                style={styles.sheetRow}
                onPress={() => {
                  setFrequency(opt.value);
                  setFreqOpen(false);
                }}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.sheetRowText,
                    frequency === opt.value && styles.sheetRowTextActive,
                  ]}>
                  {opt.label}
                </Text>
                {frequency === opt.value && (
                  <Ionicons name="checkmark" size={16} color={Colors.primary} />
                )}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scrollContent: {padding: Spacing.lg, paddingBottom: 48},
  title: {fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary, marginBottom: 4},
  subtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    lineHeight: 18,
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: 6,
  },
  fieldLabelSpaced: {marginTop: Spacing.lg},
  selectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  selectText: {flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600'},
  selectPlaceholder: {color: Colors.textMuted, fontWeight: '400'},
  selectHint: {fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 5},
  detectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingVertical: 13,
    marginTop: Spacing.lg,
  },
  btnDisabled: {opacity: 0.5},
  detectBtnText: {fontSize: FontSize.sm, fontWeight: '700', color: '#fff'},
  errorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  errorText: {flex: 1, fontSize: FontSize.xs, color: '#b91c1c', lineHeight: 17},
  resultBlock: {marginTop: Spacing.xl},
  infoCard: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  infoRow: {gap: 2},
  infoLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: Colors.textMuted,
    textTransform: 'uppercase',
  },
  infoValue: {fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600'},
  badgeCard: {
    alignItems: 'center',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginTop: Spacing.md,
  },
  badgeCardLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: Colors.textSecondary,
  },
  badgeCardValue: {fontSize: 26, fontWeight: '700', marginTop: 4},
  badgeCardReason: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 17,
  },
  thresholdText: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  destBlock: {marginTop: Spacing.xl},
  destTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  destTable: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  destHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
  },
  destHeadCell: {fontSize: 9, fontWeight: '700', letterSpacing: 0.3, color: Colors.textMuted},
  destRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: Colors.surface,
  },
  destRowNearest: {backgroundColor: '#f0fdf4'},
  colName: {flex: 2.2, paddingRight: 4},
  colNum: {flex: 1, textAlign: 'right'},
  destName: {fontSize: 11, color: Colors.textPrimary, fontWeight: '600'},
  destCell: {fontSize: 11, color: Colors.textSecondary},
  noResultBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.lg,
    gap: 4,
  },
  noResultText: {fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 19},
  noResultMeta: {fontSize: FontSize.xs, color: Colors.textMuted},
  pickerScreen: {flex: 1, backgroundColor: Colors.background},
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerTitle: {fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary},
  pickerSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  pickerInput: {flex: 1, fontSize: FontSize.sm, color: Colors.textPrimary, paddingVertical: 6},
  pickerRow: {paddingHorizontal: Spacing.lg, paddingVertical: 12, backgroundColor: Colors.surface},
  pickerRowActive: {backgroundColor: '#fef2f2'},
  pickerRowName: {fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600'},
  pickerRowMeta: {fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2},
  separator: {height: 1, backgroundColor: Colors.borderLight},
  pickerEmpty: {alignItems: 'center', paddingVertical: 48},
  pickerEmptyText: {fontSize: FontSize.sm, color: Colors.textMuted},
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  sheetCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  sheetTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
  },
  sheetRowText: {fontSize: FontSize.sm, color: Colors.textSecondary},
  sheetRowTextActive: {color: Colors.primary, fontWeight: '700'},
});

export default AccountTypeDetectorSection;
