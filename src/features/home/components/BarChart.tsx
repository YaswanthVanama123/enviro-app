import React from 'react';
import {View, Text, StyleSheet, ScrollView} from 'react-native';
import {Colors, Spacing, Radius} from '../../../theme';

const CHART_HEIGHT = 160;
const BAR_WIDTH = 26;

export interface ChartBar {
  label: string;
  done: number;
  pending: number;
  saved: number;
  drafts: number;
}

interface BarChartProps {
  data: ChartBar[];
}

export function BarChart({data}: BarChartProps) {
  const allTotals = data.map(d => d.done + d.pending + d.saved + d.drafts);
  const maxTotal = Math.max(...allTotals, 1);

  // Use a sensible scale — if max is tiny, don't stretch a single bar to full height
  const effectiveMax = Math.max(maxTotal, 5);
  const scale = CHART_HEIGHT / effectiveMax;

  // Minimum visible height for any non-zero segment
  const MIN_SEG = 4;
  const segHeight = (val: number) =>
    val > 0 ? Math.max(val * scale, MIN_SEG) : 0;

  // Grid line values (25%, 50%, 75%, 100% of effectiveMax)
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
            style={[styles.gridLine, {bottom: val * scale}]}>
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

const styles = StyleSheet.create({
  chartArea: {
    height: CHART_HEIGHT + 20,
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
  },
  barSeg: {width: BAR_WIDTH},
  barSegTop: {borderTopLeftRadius: Radius.xs, borderTopRightRadius: Radius.xs},
  barTotal: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 3,
    fontWeight: '600',
  },
  barLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
    fontWeight: '500',
  },
});
