import React, {useState, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {SafeAreaView, useSafeAreaInsets} from 'react-native-safe-area-context';
import {Colors, Spacing, Radius, FontSize, Shadow} from '../theme';
import {
  pdfApi,
  getWeekRange,
  getMonthRange,
  getYearRange,
  type StatusCounts,
  type TimeSeriesPoint,
} from '../api/pdfApi';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_GAP = Spacing.lg;
const ACTION_CARD_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - CARD_GAP) / 2;
const CHART_HEIGHT = 160;
const BAR_WIDTH = 26;

// ─── Types ───────────────────────────────────────────────────────────────────

type TimeFilter = 'week' | 'month' | 'year';

interface ChartBar {
  label: string;
  done: number;
  pending: number;
  saved: number;
  drafts: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Maps raw timeSeries from the API to ChartBar[] — mirrors webapp getChartData() */
function buildChartData(
  filter: TimeFilter,
  timeSeries: TimeSeriesPoint[] | null | undefined,
  fallback: StatusCounts,
): ChartBar[] {
  const today = new Date();

  // ── Real time-series from backend ──────────────────────────────────────────
  if (timeSeries && timeSeries.length > 0) {
    if (filter === 'week') {
      const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      const startOfWeek = new Date(today);
      const dayOfWeek = today.getDay();
      const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      startOfWeek.setDate(today.getDate() - daysToMonday);

      const dataMap = new Map(timeSeries.map(item => [item.period, item]));

      return Array.from({length: 7}, (_, i) => {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        const d = dataMap.get(dateKey);
        return {
          label: dayNames[i],
          done: d?.done || 0,
          pending: d?.pending || 0,
          saved: d?.saved || 0,
          drafts: d?.drafts || 0,
        };
      });
    }

    if (filter === 'month') {
      return timeSeries.map((item, i) => ({
        label: `Week ${i + 1}`,
        done: item.done || 0,
        pending: item.pending || 0,
        saved: item.saved || 0,
        drafts: item.drafts || 0,
      }));
    }

    if (filter === 'year') {
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
      ];
      const currentYear = today.getFullYear();
      const dataMap = new Map<number, TimeSeriesPoint>();

      timeSeries.forEach(item => {
        const [yearStr, monthStr] = item.period.split('-');
        if (parseInt(yearStr, 10) === currentYear) {
          dataMap.set(parseInt(monthStr, 10) - 1, item);
        }
      });

      return Array.from({length: 12}, (_, month) => {
        const d = dataMap.get(month);
        return {
          label: monthNames[month],
          done: d?.done || 0,
          pending: d?.pending || 0,
          saved: d?.saved || 0,
          drafts: d?.drafts || 0,
        };
      });
    }
  }

  // ── Fallback: distribute totals across periods ──────────────────────────────
  if (filter === 'week') {
    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return dayNames.map((label, i) => ({
      label,
      done: Math.floor(fallback.done / 7) + (i === 0 ? fallback.done % 7 : 0),
      pending: Math.floor(fallback.pending / 7) + (i === 0 ? fallback.pending % 7 : 0),
      saved: Math.floor(fallback.saved / 7) + (i === 0 ? fallback.saved % 7 : 0),
      drafts: Math.floor(fallback.drafts / 7) + (i === 0 ? fallback.drafts % 7 : 0),
    }));
  }

  if (filter === 'month') {
    const currentWeek = Math.ceil(today.getDate() / 7);
    return Array.from({length: 4}, (_, i) => ({
      label: `Week ${i + 1}`,
      done: i + 1 === currentWeek ? fallback.done : 0,
      pending: i + 1 === currentWeek ? fallback.pending : 0,
      saved: i + 1 === currentWeek ? fallback.saved : 0,
      drafts: i + 1 === currentWeek ? fallback.drafts : 0,
    }));
  }

  // year fallback
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];
  const currentMonth = today.getMonth();
  return monthNames.map((label, i) => ({
    label,
    done: i === currentMonth ? fallback.done : 0,
    pending: i === currentMonth ? fallback.pending : 0,
    saved: i === currentMonth ? fallback.saved : 0,
    drafts: i === currentMonth ? fallback.drafts : 0,
  }));
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatChip({
  count,
  label,
  color,
  bg,
}: {count: number; label: string; color: string; bg: string}) {
  return (
    <View style={[styles.statChip, {backgroundColor: bg}]}>
      <Text style={[styles.statCount, {color}]}>{count}</Text>
      <Text style={[styles.statLabel, {color}]}>{label}</Text>
    </View>
  );
}

function ActionCard({
  title,
  description,
  iconBg,
  iconColor,
  iconChar,
  btnLabel,
  btnColor,
  onPress,
  fullWidth,
}: {
  title: string;
  description: string;
  iconBg: string;
  iconColor: string;
  iconChar: string;
  btnLabel: string;
  btnColor: string;
  onPress: () => void;
  fullWidth?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={onPress}
      style={[styles.actionCard, fullWidth && styles.actionCardFull]}>
      <View style={[styles.actionIcon, {backgroundColor: iconBg}]}>
        <Text style={[styles.actionIconChar, {color: iconColor}]}>
          {iconChar}
        </Text>
      </View>
      <View style={fullWidth ? styles.actionTextFull : styles.actionTextBlock}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionDesc} numberOfLines={fullWidth ? 1 : 3}>
          {description}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.8}
        style={[
          styles.actionBtn,
          {backgroundColor: btnColor},
          fullWidth && styles.actionBtnFull,
        ]}>
        <Text style={styles.actionBtnText}>{btnLabel}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

function BarChart({data}: {data: ChartBar[]}) {
  const allTotals = data.map(d => d.done + d.pending + d.saved + d.drafts);
  const maxTotal = Math.max(...allTotals, 1);

  // Use a sensible scale — if max is tiny, don't stretch a single bar to full height
  const effectiveMax = Math.max(maxTotal, 5);
  const scale = CHART_HEIGHT / effectiveMax;

  // Minimum visible height for any non-zero segment
  const MIN_SEG = 4;
  const segHeight = (val: number) =>
    val > 0 ? Math.max(val * scale, MIN_SEG) : 0;

  // Grid line values (0%, 25%, 50%, 75%, 100% of effectiveMax)
  const gridLines = [0.25, 0.5, 0.75, 1].map(pct =>
    Math.round(effectiveMax * pct),
  );

  return (
    <View>
      {/* Chart area with grid lines behind bars */}
      <View style={styles.chartArea}>
        {/* Horizontal grid lines */}
        {gridLines.map((val, i) => (
          <View
            key={i}
            style={[
              styles.gridLine,
              {bottom: val * scale},
            ]}>
            <Text style={styles.gridLabel}>{val}</Text>
          </View>
        ))}

        {/* Bars */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.chartInner,
            data.length <= 7 && styles.chartInnerSpread,
          ]}>
          {data.map((bar, idx) => {
            const total = bar.done + bar.pending + bar.saved + bar.drafts;
            const hasData = total > 0;

            return (
              <View key={idx} style={styles.barGroup}>
                {/* Bar stack — transparent track, only colored when data exists */}
                <View style={styles.barTrack}>
                  {hasData && (
                    <>
                      {bar.drafts > 0 && (
                        <View
                          style={[
                            styles.barSeg,
                            {
                              height: segHeight(bar.drafts),
                              backgroundColor: Colors.statusDrafts,
                            },
                          ]}
                        />
                      )}
                      {bar.saved > 0 && (
                        <View
                          style={[
                            styles.barSeg,
                            {
                              height: segHeight(bar.saved),
                              backgroundColor: Colors.statusSaved,
                            },
                          ]}
                        />
                      )}
                      {bar.pending > 0 && (
                        <View
                          style={[
                            styles.barSeg,
                            {
                              height: segHeight(bar.pending),
                              backgroundColor: Colors.statusPending,
                            },
                          ]}
                        />
                      )}
                      {bar.done > 0 && (
                        <View
                          style={[
                            styles.barSeg,
                            styles.barSegTop,
                            {
                              height: segHeight(bar.done),
                              backgroundColor: Colors.statusDone,
                            },
                          ]}
                        />
                      )}
                    </>
                  )}
                </View>
                {hasData && <Text style={styles.barTotal}>{total}</Text>}
                <Text style={styles.barLabel}>{bar.label}</Text>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Home Screen ─────────────────────────────────────────────────────────────

export default function HomeScreen({navigation}: {navigation?: any}) {
  const insets = useSafeAreaInsets();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [counts, setCounts] = useState<StatusCounts>({
    done: 0,
    pending: 0,
    saved: 0,
    drafts: 0,
    total: 0,
  });
  const [chartData, setChartData] = useState<ChartBar[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const fetchData = useCallback(
    async (filter: TimeFilter, isRefresh = false) => {
      isRefresh ? setRefreshing(true) : setLoading(true);
      setApiError(null);

      try {
        // Mirror webapp: calculate date range per filter
        let range: {startDate: string; endDate: string; groupBy: string};
        if (filter === 'week') {range = getWeekRange();}
        else if (filter === 'month') {range = getMonthRange();}
        else {range = getYearRange();}

        const result = await pdfApi.getDocumentStatusCounts(range);

        // Update totals — guard against unexpected response shapes
        const safeCounts: StatusCounts = {
          done: result?.counts?.done ?? 0,
          pending: result?.counts?.pending ?? 0,
          saved: result?.counts?.saved ?? 0,
          drafts: result?.counts?.drafts ?? 0,
          total: result?.counts?.total ??
            ((result?.counts?.done ?? 0) +
             (result?.counts?.pending ?? 0) +
             (result?.counts?.saved ?? 0) +
             (result?.counts?.drafts ?? 0)),
        };
        setCounts(safeCounts);

        // Build chart data (time-series preferred, totals as fallback)
        setChartData(
          buildChartData(filter, result?.timeSeries, safeCounts),
        );
      } catch (err: any) {
        setApiError(err?.message || 'Failed to load data');
        // Keep previous data visible on error
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchData(timeFilter);
  }, [timeFilter, fetchData]);

  const go = (route: string) => navigation?.navigate(route);

  return (
    // edges={[]} — no safe area edges here; hero manages top inset manually,
    // tab navigator handles bottom inset
    <SafeAreaView style={styles.safe} edges={[]}>
      <StatusBar backgroundColor={Colors.heroGradientStart} barStyle="light-content" />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(timeFilter, true)}
            tintColor={Colors.textWhite}
            colors={[Colors.primary]}
          />
        }>

        {/* ═══ HERO — paddingTop = safe area inset so content clears Dynamic Island ══ */}
        <View style={[styles.hero, {paddingTop: insets.top + Spacing.lg}]}>
          <View style={styles.heroRow}>
            <View style={styles.heroLogo}>
              <Text style={styles.heroLogoText}>EM</Text>
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Enviro-Master</Text>
              <Text style={styles.heroSub}>
                Professional Agreement Management
              </Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeNum}>{counts.total}</Text>
              <Text style={styles.heroBadgeLbl}>Total</Text>
            </View>
          </View>

          <Text style={styles.heroTagline}>
            Create, manage and maintain customer service agreements with ease
          </Text>

          {/* Stats — uses exact webapp status colors */}
          <View style={styles.statsRow}>
            <StatChip
              count={counts.done}
              label="Done"
              color={Colors.statusDone}
              bg="rgba(34,197,94,0.2)"
            />
            <StatChip
              count={counts.pending}
              label="Pending"
              color={Colors.statusPending}
              bg="rgba(245,158,11,0.2)"
            />
            <StatChip
              count={counts.saved}
              label="Saved"
              color={Colors.statusSaved}
              bg="rgba(14,165,233,0.2)"
            />
            <StatChip
              count={counts.drafts}
              label="Drafts"
              color="rgba(255,255,255,0.85)"
              bg="rgba(255,255,255,0.15)"
            />
          </View>
        </View>

        {/* ═══ QUICK ACTIONS ═══════════════════════════════════════════════ */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agreement Management</Text>

          <View style={styles.actionRow}>
            <ActionCard
              title="Create Agreement"
              description="Create a new customer agreement with comprehensive service details"
              iconBg={Colors.greenLight}
              iconColor={Colors.green}
              iconChar="✎"
              btnLabel="Get Started →"
              btnColor={Colors.green}
              onPress={() => go('New')}
            />
            <ActionCard
              title="Extend Agreement"
              description="Extend an existing agreement with new terms and updated packages"
              iconBg={Colors.orangeLight}
              iconColor={Colors.orange}
              iconChar="⊕"
              btnLabel="Click to extend"
              btnColor={Colors.green}
              onPress={() => go('New')}
            />
          </View>

          <ActionCard
            title="Edit Agreement"
            description="Modify existing agreement details, update services, or adjust product configurations"
            iconBg={Colors.blueLight}
            iconColor={Colors.blue}
            iconChar="✏"
            btnLabel="Get Started →"
            btnColor={Colors.blue}
            onPress={() => go('Saved')}
            fullWidth
          />
        </View>

        {/* ═══ ANALYTICS ═══════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <View style={styles.analyticsHead}>
            <Text style={styles.sectionTitle}>Analytics</Text>
            <View style={styles.pills}>
              {(['week', 'month', 'year'] as TimeFilter[]).map(f => (
                <TouchableOpacity
                  key={f}
                  activeOpacity={0.75}
                  onPress={() => setTimeFilter(f)}
                  style={[styles.pill, timeFilter === f && styles.pillActive]}>
                  <Text
                    style={[
                      styles.pillTxt,
                      timeFilter === f && styles.pillTxtActive,
                    ]}>
                    {f === 'week'
                      ? 'This Week'
                      : f === 'month'
                      ? 'This Month'
                      : 'This Year'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.chartCard}>
            {loading ? (
              <View style={styles.chartLoading}>
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text style={styles.chartLoadingTxt}>Loading chart data…</Text>
              </View>
            ) : apiError ? (
              <View style={styles.chartLoading}>
                <Text style={styles.errorTxt}>{apiError}</Text>
                <TouchableOpacity
                  onPress={() => fetchData(timeFilter)}
                  style={styles.retryBtn}>
                  <Text style={styles.retryTxt}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <BarChart data={chartData} />
            )}

            {/* Legend — mirrors webapp */}
            <View style={styles.legend}>
              {[
                {label: 'Pending', color: Colors.statusPending},
                {label: 'Saved',   color: Colors.statusSaved},
                {label: 'Drafts',  color: Colors.statusDrafts},
              ].map(item => (
                <View key={item.label} style={styles.legendItem}>
                  <View
                    style={[styles.legendDot, {backgroundColor: item.color}]}
                  />
                  <Text style={styles.legendTxt}>{item.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        <View style={{height: Spacing.xxxl}} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background, // white/gray — red only lives inside the hero View
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {paddingBottom: Spacing.xl},

  // Hero — paddingTop is set dynamically from useSafeAreaInsets
  hero: {
    backgroundColor: Colors.heroGradientStart,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  heroLogo: {
    width: 46,
    height: 46,
    borderRadius: Radius.xl,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLogoText: {
    color: Colors.textWhite,
    fontSize: FontSize.md,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  heroText: {flex: 1},
  heroTitle: {
    color: Colors.textWhite,
    fontSize: FontSize.xl,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  heroSub: {
    color: Colors.textWhiteMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    minWidth: 52,
  },
  heroBadgeNum: {
    color: Colors.textWhite,
    fontSize: FontSize.xxl,
    fontWeight: '800',
    lineHeight: 28,
  },
  heroBadgeLbl: {
    color: Colors.textWhiteMuted,
    fontSize: FontSize.xs,
  },
  heroTagline: {
    color: Colors.textWhiteMuted,
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.xl,
  },

  statsRow: {flexDirection: 'row', gap: Spacing.sm},
  statChip: {
    flex: 1,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
  },
  statCount: {fontSize: FontSize.lg, fontWeight: '800', lineHeight: 22},
  statLabel: {fontSize: FontSize.xs, fontWeight: '600', marginTop: 1},

  section: {paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl},
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // Action cards — bg #fff, radius 12px, shadow 0 2px 8px rgba(0,0,0,0.08)
  actionRow: {
    flexDirection: 'row',
    gap: CARD_GAP,
    marginTop: Spacing.lg,
    marginBottom: CARD_GAP,
  },
  actionCard: {
    width: ACTION_CARD_WIDTH,
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadow.medium,
  },
  actionCardFull: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  actionIconChar: {fontSize: 20, fontWeight: '600'},
  actionTextBlock: {flex: 1, marginBottom: Spacing.md},
  actionTextFull: {flex: 1},
  actionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  actionDesc: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  actionBtn: {
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  actionBtnFull: {alignSelf: 'center', paddingHorizontal: Spacing.lg},
  actionBtnText: {
    color: Colors.textWhite,
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Analytics
  analyticsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  pills: {
    flexDirection: 'row',
    backgroundColor: Colors.border,
    borderRadius: Radius.full,
    padding: 3,
    gap: 2,
  },
  pill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 5,
    borderRadius: Radius.full,
  },
  pillActive: {backgroundColor: Colors.surface, ...Shadow.small},
  pillTxt: {fontSize: 11, fontWeight: '600', color: Colors.textSecondary},
  pillTxtActive: {color: Colors.textPrimary},

  chartCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    ...Shadow.medium,
  },
  chartLoading: {
    height: CHART_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  chartLoadingTxt: {color: Colors.textMuted, fontSize: FontSize.sm},
  errorTxt: {color: Colors.primary, fontSize: FontSize.sm, textAlign: 'center'},
  retryBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  retryTxt: {color: Colors.textWhite, fontSize: FontSize.sm, fontWeight: '700'},

  // Bar chart
  chartArea: {
    height: CHART_HEIGHT + 20, // extra space for top grid label
    position: 'relative',
    marginBottom: Spacing.xs,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: Colors.borderLight,
  },
  gridLabel: {
    position: 'absolute',
    right: 0,
    top: -9,
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  chartInner: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    paddingBottom: 0,
  },
  chartInnerSpread: {flex: 1, justifyContent: 'space-around'},
  barGroup: {alignItems: 'center', marginHorizontal: 5},
  barTrack: {
    width: BAR_WIDTH,
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    borderRadius: Radius.xs,
    overflow: 'hidden',
    // No backgroundColor — empty bars are invisible, only colored segments show
  },
  barSeg: {width: BAR_WIDTH},
  barSegTop: {borderTopLeftRadius: Radius.xs, borderTopRightRadius: Radius.xs},
  barTotal: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: 3,
    fontWeight: '600',
  },
  barLabel: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },

  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.md,
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {width: 8, height: 8, borderRadius: 4},
  legendTxt: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
