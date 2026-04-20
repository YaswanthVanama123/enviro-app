import React from 'react';
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
import {Colors, Spacing, Radius, FontSize, Shadow} from '../../../theme';
import {StatChip} from '../components/StatChip';
import {ActionCard} from '../components/ActionCard';
import {BarChart} from '../components/BarChart';
import {useHomeData, type TimeFilter} from '../hooks/useHomeData';

const {width: SCREEN_WIDTH} = Dimensions.get('window');
const CARD_GAP = Spacing.lg;
const ACTION_CARD_WIDTH = (SCREEN_WIDTH - Spacing.xl * 2 - CARD_GAP) / 2;

export default function HomeScreen({navigation}: {navigation?: any}) {
  const insets = useSafeAreaInsets();
  const {
    counts,
    chartData,
    loading,
    refreshing,
    apiError,
    timeFilter,
    setTimeFilter,
    fetchData,
  } = useHomeData();

  const go = (route: string) => navigation?.navigate(route);

  return (
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

        <View style={[styles.hero, {paddingTop: insets.top + Spacing.lg}]}>
          <View style={styles.heroRow}>
            <View style={styles.heroLogo}>
              <Text style={styles.heroLogoText}>EM</Text>
            </View>
            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>Enviro-Master</Text>
              <Text style={styles.heroSub}>Professional Agreement Management</Text>
            </View>
            <View style={styles.heroBadge}>
              <Text style={styles.heroBadgeNum}>{counts.total}</Text>
              <Text style={styles.heroBadgeLbl}>Total</Text>
            </View>
          </View>

          <Text style={styles.heroTagline}>
            Create, manage and maintain customer service agreements with ease
          </Text>

          <View style={styles.statsRow}>
            <StatChip count={counts.done} label="Done" color={Colors.statusDone} bg="rgba(34,197,94,0.2)" />
            <StatChip count={counts.pending} label="Pending" color={Colors.statusPending} bg="rgba(245,158,11,0.2)" />
            <StatChip count={counts.saved} label="Saved" color={Colors.statusSaved} bg="rgba(14,165,233,0.2)" />
            <StatChip count={counts.drafts} label="Drafts" color="rgba(255,255,255,0.85)" bg="rgba(255,255,255,0.15)" />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Agreement Management</Text>
          <View style={styles.actionRow}>
            <ActionCard
              title="Create Agreement"
              description="Create a new customer agreement with comprehensive service details"
              iconBg={Colors.greenLight}
              iconColor={Colors.green}
              iconName="add-circle-outline"
              btnLabel="Get Started →"
              btnColor={Colors.green}
              onPress={() => go('New')}
              cardWidth={ACTION_CARD_WIDTH}
            />
            <ActionCard
              title="Extend Agreement"
              description="Extend an existing agreement with new terms and updated packages"
              iconBg={Colors.orangeLight}
              iconColor={Colors.orange}
              iconName="git-branch-outline"
              btnLabel="Click to extend"
              btnColor={Colors.green}
              onPress={() => go('New')}
              cardWidth={ACTION_CARD_WIDTH}
            />
          </View>
          <ActionCard
            title="Edit Agreement"
            description="Modify existing agreement details, update services, or adjust product configurations"
            iconBg={Colors.blueLight}
            iconColor={Colors.blue}
            iconName="create-outline"
            btnLabel="Get Started →"
            btnColor={Colors.blue}
            onPress={() => go('Saved')}
            fullWidth
          />
        </View>

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
                  <Text style={[styles.pillTxt, timeFilter === f && styles.pillTxtActive]}>
                    {f === 'week' ? 'This Week' : f === 'month' ? 'This Month' : 'This Year'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.chartCard}>
            {loading ? (
              <View style={styles.chartLoading}>
                <ActivityIndicator color={Colors.primary} size="small" />
                <Text style={styles.chartLoadingTxt}>Loading chart data...</Text>
              </View>
            ) : apiError ? (
              <View style={styles.chartLoading}>
                <Text style={styles.errorTxt}>{apiError}</Text>
                <TouchableOpacity onPress={() => fetchData(timeFilter)} style={styles.retryBtn}>
                  <Text style={styles.retryTxt}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <BarChart data={chartData} />
            )}

            <View style={styles.legend}>
              {[
                {label: 'Pending', color: Colors.statusPending},
                {label: 'Saved',   color: Colors.statusSaved},
                {label: 'Drafts',  color: Colors.statusDrafts},
              ].map(item => (
                <View key={item.label} style={styles.legendItem}>
                  <View style={[styles.legendDot, {backgroundColor: item.color}]} />
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

const styles = StyleSheet.create({
  safe: {flex: 1, backgroundColor: Colors.background},
  scroll: {flex: 1, backgroundColor: Colors.background},
  scrollContent: {paddingBottom: Spacing.xl},

  hero: {
    backgroundColor: Colors.heroGradientStart,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  heroRow: {flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md, gap: Spacing.md},
  heroLogo: {
    width: 46, height: 46, borderRadius: Radius.xl,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroLogoText: {color: Colors.textWhite, fontSize: FontSize.md, fontWeight: '800', letterSpacing: 1.5},
  heroText: {flex: 1},
  heroTitle: {color: Colors.textWhite, fontSize: FontSize.xl, fontWeight: '700', letterSpacing: 0.2},
  heroSub: {color: Colors.textWhiteMuted, fontSize: FontSize.xs, marginTop: 2},
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    alignItems: 'center', minWidth: 52,
  },
  heroBadgeNum: {color: Colors.textWhite, fontSize: FontSize.xxl, fontWeight: '800', lineHeight: 28},
  heroBadgeLbl: {color: Colors.textWhiteMuted, fontSize: FontSize.xs},
  heroTagline: {color: Colors.textWhiteMuted, fontSize: FontSize.sm, lineHeight: 20, marginBottom: Spacing.xl},
  statsRow: {flexDirection: 'row', gap: Spacing.sm},

  section: {paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl},
  sectionTitle: {fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary},
  actionRow: {flexDirection: 'row', gap: CARD_GAP, marginTop: Spacing.lg, marginBottom: CARD_GAP},

  analyticsHead: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: Spacing.lg,
  },
  pills: {
    flexDirection: 'row', backgroundColor: Colors.border,
    borderRadius: Radius.full, padding: 3, gap: 2,
  },
  pill: {paddingHorizontal: Spacing.sm, paddingVertical: 5, borderRadius: Radius.full},
  pillActive: {backgroundColor: Colors.surface, ...Shadow.small},
  pillTxt: {fontSize: 11, fontWeight: '600', color: Colors.textSecondary},
  pillTxtActive: {color: Colors.textPrimary},

  chartCard: {backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.medium},
  chartLoading: {height: 160, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm},
  chartLoadingTxt: {color: Colors.textMuted, fontSize: FontSize.sm},
  errorTxt: {color: Colors.primary, fontSize: FontSize.sm, textAlign: 'center'},
  retryBtn: {
    marginTop: Spacing.sm, paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radius.md,
  },
  retryTxt: {color: Colors.textWhite, fontSize: FontSize.sm, fontWeight: '700'},

  legend: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center',
    gap: Spacing.md, marginTop: Spacing.lg, paddingTop: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.borderLight,
  },
  legendItem: {flexDirection: 'row', alignItems: 'center', gap: Spacing.xs},
  legendDot: {width: 8, height: 8, borderRadius: 4},
  legendTxt: {fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '500'},
});
