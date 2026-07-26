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
import {
  companyMappingApi,
  ConnectedCompany,
  FarBreakdownRow,
} from '../../../../services/api/endpoints/companyMapping.api';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

const money = (n: number): string =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);

export function LocationFarSection() {
  const [companies, setCompanies] = useState<ConnectedCompany[]>([]);
  const [loadingCompanies, setLoadingCompanies] = useState(true);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ConnectedCompany | null>(null);
  const [prior, setPrior] = useState<{redline: number; greenline: number} | null>(null);
  const [breakdown, setBreakdown] = useState<FarBreakdownRow[]>([]);
  const [loadingPrior, setLoadingPrior] = useState(false);
  const [recalculating, setRecalculating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    companyMappingApi
      .getConnectedCompanies()
      .then(rows => {
        if (!cancelled) {setCompanies(rows || []);}
      })
      .finally(() => {
        if (!cancelled) {setLoadingCompanies(false);}
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadFar = useCallback(async (biginId: string) => {
    setLoadingPrior(true);
    const [p, b] = await Promise.all([
      companyMappingApi.getPriorFarByBigin(biginId),
      companyMappingApi.getFarBreakdown(biginId),
    ]);
    setPrior(p);
    setBreakdown(b || []);
    setLoadingPrior(false);
  }, []);

  const selectCompany = useCallback(
    (c: ConnectedCompany) => {
      setSelected(c);
      setQuery('');
      setPickerOpen(false);
      setPrior(null);
      setBreakdown([]);
      loadFar(c.biginId);
    },
    [loadFar],
  );

  const handleRecalc = useCallback(async () => {
    if (!selected) {return;}
    setRecalculating(true);
    const p = await companyMappingApi.recalcCompanyFar(selected.biginId);
    if (p) {setPrior(p);}
    const b = await companyMappingApi.getFarBreakdown(selected.biginId);
    setBreakdown(b || []);
    setRecalculating(false);
  }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {return companies;}
    return companies.filter(c => c.companyName.toLowerCase().includes(q));
  }, [companies, query]);

  const hasNoPrior = (prior?.redline || 0) === 0 && (prior?.greenline || 0) === 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Location Pit Far Prior Totals</Text>
        <Text style={styles.subtitle}>
          Accumulated Pit (&gt;15 min) far revenue per location, split by pricing line. This is the
          prior total the next agreement at the company continues from.
        </Text>

        <Text style={styles.fieldLabel}>Bigin-connected company</Text>
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
          <Text
            style={[styles.selectText, !selected && styles.selectPlaceholder]}
            numberOfLines={1}>
            {loadingCompanies
              ? 'Loading companies…'
              : selected?.companyName ?? `Search ${companies.length} companies…`}
          </Text>
          <Ionicons name="chevron-down" size={16} color={Colors.textMuted} />
        </TouchableOpacity>

        {selected && (
          <View style={styles.resultBlock}>
            <View style={styles.resultHeader}>
              <Text style={styles.resultHeaderText} numberOfLines={2}>
                {selected.companyName} — prior summed Pit far revenue
              </Text>
              <TouchableOpacity
                style={[styles.recalcBtn, (recalculating || loadingPrior) && styles.btnDisabled]}
                onPress={handleRecalc}
                disabled={recalculating || loadingPrior}
                activeOpacity={0.8}>
                {recalculating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Ionicons name="refresh" size={13} color="#fff" />
                )}
                <Text style={styles.recalcBtnText}>
                  {recalculating ? 'Recalculating…' : 'Recalculate'}
                </Text>
              </TouchableOpacity>
            </View>

            {loadingPrior ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.loadingText}>Loading prior totals…</Text>
              </View>
            ) : (
              <>
                <View style={styles.cardRedline}>
                  <Text style={styles.cardLabelRed}>REDLINE PRIOR</Text>
                  <Text style={styles.cardValueRed}>{money(prior?.redline || 0)}</Text>
                  <Text style={styles.cardHint}>
                    First $100/visit = $0, $100–$200 normal, above $200 = 150%
                  </Text>
                </View>
                <View style={styles.cardGreenline}>
                  <Text style={styles.cardLabelGreen}>GREENLINE PRIOR</Text>
                  <Text style={styles.cardValueGreen}>{money(prior?.greenline || 0)}</Text>
                  <Text style={styles.cardHint}>First $100/visit = $0, above $100 = 150%</Text>
                </View>

                {hasNoPrior && (
                  <Text style={styles.emptyNote}>
                    No prior Pit far revenue recorded yet. If this company has agreements with Pit
                    (&gt;15 min) services, tap Recalculate to recompute them with the current engine.
                  </Text>
                )}

                {breakdown.length > 0 && (
                  <View style={styles.breakdownBlock}>
                    <Text style={styles.breakdownTitle}>
                      Agreements at this company ({breakdown.length})
                    </Text>
                    <View style={styles.breakdownTable}>
                      <View style={styles.breakdownHeadRow}>
                        <Text style={[styles.breakdownHeadCell, styles.colAgreement]}>AGREEMENT</Text>
                        <Text style={[styles.breakdownHeadCell, styles.colMoney]}>REDLINE</Text>
                        <Text style={[styles.breakdownHeadCell, styles.colMoney]}>GREENLINE</Text>
                      </View>
                      {breakdown.map(a => (
                        <View key={a.agreementId} style={styles.breakdownRow}>
                          <View style={styles.colAgreement}>
                            <Text style={styles.breakdownName} numberOfLines={2}>{a.title}</Text>
                            {(!a.hasCommission || a.status === 'draft') && (
                              <Text style={styles.breakdownMeta}>
                                {!a.hasCommission ? 'no commission' : ''}
                                {!a.hasCommission && a.status === 'draft' ? ' · ' : ''}
                                {a.status === 'draft' ? 'draft' : ''}
                              </Text>
                            )}
                          </View>
                          <Text
                            style={[
                              styles.breakdownValue,
                              styles.colMoney,
                              a.redline > 0 ? styles.redText : styles.mutedText,
                            ]}>
                            {money(a.redline)}
                          </Text>
                          <Text
                            style={[
                              styles.breakdownValue,
                              styles.colMoney,
                              a.greenline > 0 ? styles.greenText : styles.mutedText,
                            ]}>
                            {money(a.greenline)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        )}
      </ScrollView>

      <Modal
        visible={pickerOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPickerOpen(false)}>
        <View style={styles.pickerScreen}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Company</Text>
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
              value={query}
              onChangeText={setQuery}
              placeholder="Search companies…"
              placeholderTextColor={Colors.textMuted}
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')}>
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
                onPress={() => selectCompany(item)}
                activeOpacity={0.7}>
                <Text style={styles.pickerRowName} numberOfLines={1}>{item.companyName}</Text>
                <Text style={styles.pickerRowCount}>
                  {item.agreementCount} agreement{item.agreementCount !== 1 ? 's' : ''}
                </Text>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <View style={styles.pickerEmpty}>
                <Text style={styles.pickerEmptyText}>No companies match.</Text>
              </View>
            }
            keyboardShouldPersistTaps="handled"
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: Colors.background},
  scrollContent: {padding: Spacing.lg, paddingBottom: 48},
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
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
  resultBlock: {marginTop: Spacing.xl},
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  resultHeaderText: {flex: 1, fontSize: FontSize.xs, color: Colors.textMuted, lineHeight: 17},
  recalcBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.md,
    flexShrink: 0,
  },
  btnDisabled: {opacity: 0.6},
  recalcBtnText: {fontSize: 12, fontWeight: '700', color: '#fff'},
  loadingBox: {flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg},
  loadingText: {fontSize: FontSize.sm, color: Colors.textMuted},
  cardRedline: {
    borderWidth: 1,
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cardGreenline: {
    borderWidth: 1,
    borderColor: '#bbf7d0',
    backgroundColor: '#f0fdf4',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  cardLabelRed: {fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: '#b91c1c'},
  cardLabelGreen: {fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: '#15803d'},
  cardValueRed: {fontSize: 24, fontWeight: '700', color: '#991b1b', marginTop: 6},
  cardValueGreen: {fontSize: 24, fontWeight: '700', color: '#166534', marginTop: 6},
  cardHint: {fontSize: 11, color: Colors.textMuted, marginTop: 4, lineHeight: 15},
  emptyNote: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.md,
    lineHeight: 18,
  },
  breakdownBlock: {marginTop: Spacing.xl},
  breakdownTitle: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  breakdownTable: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    overflow: 'hidden',
  },
  breakdownHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  breakdownHeadCell: {fontSize: 10, fontWeight: '700', letterSpacing: 0.4, color: Colors.textMuted},
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    backgroundColor: Colors.surface,
  },
  colAgreement: {flex: 2, paddingRight: Spacing.sm},
  colMoney: {flex: 1, textAlign: 'right'},
  breakdownName: {fontSize: FontSize.xs, color: Colors.textPrimary, fontWeight: '600'},
  breakdownMeta: {fontSize: 10, color: Colors.textMuted, marginTop: 2},
  breakdownValue: {fontSize: FontSize.xs, fontWeight: '600'},
  redText: {color: '#991b1b'},
  greenText: {color: '#166534'},
  mutedText: {color: Colors.textMuted},
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
  pickerRow: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
  },
  pickerRowActive: {backgroundColor: '#fef2f2'},
  pickerRowName: {fontSize: FontSize.sm, color: Colors.textPrimary, fontWeight: '600'},
  pickerRowCount: {fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2},
  separator: {height: 1, backgroundColor: Colors.borderLight},
  pickerEmpty: {alignItems: 'center', paddingVertical: 48},
  pickerEmptyText: {fontSize: FontSize.sm, color: Colors.textMuted},
});

export default LocationFarSection;
