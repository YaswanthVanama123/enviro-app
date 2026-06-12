import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  useServiceCommission,
  ServiceCommissionResult,
} from '../../hooks/useServiceCommission';
import {AccountTypeCache} from '../../hooks/useAccountTypeDetection';
import {AccountType} from '../../../../services/api/endpoints/accountType.api';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

const ACCOUNT_TYPE_COLORS: Record<
  AccountType,
  {bg: string; text: string; border: string}
> = {
  Anchor: {bg: '#fef3c7', text: '#92400e', border: '#fbbf24'},
  Bread5: {bg: '#d1fae5', text: '#065f46', border: '#34d399'},
  Bread15: {bg: '#dbeafe', text: '#1e40af', border: '#60a5fa'},
  Pit: {bg: '#fee2e2', text: '#991b1b', border: '#f87171'},
};

interface ServiceCommissionBadgeProps {
  serviceData: any;
  accountTypeCache: AccountTypeCache;
  showDetails?: boolean;
  commissionRate?: number;
}

export function ServiceCommissionBadge({
  serviceData,
  accountTypeCache,
  showDetails = true,
  commissionRate = 6,
}: ServiceCommissionBadgeProps) {
  const [expanded, setExpanded] = useState(false);

  const commission = useServiceCommission({
    serviceData,
    accountTypeCache,
    commissionRate,
  });

  if (!serviceData?.isActive || commission.isOneTime) {
    return null;
  }

  if (!commission.accountType) {
    return (
      <View style={styles.pendingBadge}>
        <Ionicons name="hourglass-outline" size={14} color={Colors.gray500} />
        <Text style={styles.pendingText}>Detecting...</Text>
      </View>
    );
  }

  const colors = ACCOUNT_TYPE_COLORS[commission.accountType];

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.badge,
          {
            backgroundColor: colors.bg,
            borderColor: colors.border,
          },
        ]}
        onPress={() => showDetails && setExpanded(!expanded)}
        activeOpacity={showDetails ? 0.7 : 1}>
        <Text style={[styles.badgeType, {color: colors.text}]}>
          {commission.accountType}
        </Text>
        <Text style={[styles.badgeValue, {color: colors.text}]}>
          {commission.formatted.perVisitCommission}/visit
        </Text>
        {showDetails && (
          <Text style={styles.chevron}>{expanded ? '▲' : '▼'}</Text>
        )}
      </TouchableOpacity>

      {expanded && showDetails && (
        <View style={styles.details}>
          <View style={styles.row}>
            <Text style={styles.label}>Per-Visit Revenue:</Text>
            <Text style={styles.value}>
              {commission.formatted.perVisitRevenue}
            </Text>
          </View>

          {commission.revenueDeduction > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Account Type Deduction:</Text>
              <Text style={[styles.value, styles.negativeValue]}>
                -{commission.formatted.revenueDeduction}
              </Text>
            </View>
          )}

          {commission.anchorBonus > 0 && (
            <View style={styles.row}>
              <Text style={styles.label}>Anchor Bonus (150%):</Text>
              <Text style={[styles.value, styles.positiveValue]}>
                +${commission.anchorBonus.toFixed(2)}
              </Text>
            </View>
          )}

          <View style={styles.row}>
            <Text style={styles.label}>Commissionable Revenue:</Text>
            <Text style={styles.value}>
              {commission.formatted.commissionableRevenue}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Commission Rate:</Text>
            <Text style={styles.value}>{commission.commissionRate}%</Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Per-Visit Commission:</Text>
            <Text style={[styles.value, styles.positiveValue]}>
              {commission.formatted.perVisitCommission}
            </Text>
          </View>

          <View style={styles.row}>
            <Text style={styles.label}>Annual Commission:</Text>
            <Text style={[styles.value, styles.positiveValue, styles.highlight]}>
              {commission.formatted.annualCommission}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.row}>
            <Text style={styles.label}>Frequency:</Text>
            <Text style={styles.value}>
              {commission.frequencyLabel} ({commission.visitsPerYear}{' '}
              visits/year)
            </Text>
          </View>

          {commission.drivingTimeMinutes !== null && (
            <View style={styles.row}>
              <Text style={styles.label}>Driving Time:</Text>
              <Text style={styles.value}>
                {commission.drivingTimeMinutes.toFixed(1)} min
                {commission.nearestDestination &&
                  ` to ${commission.nearestDestination}`}
              </Text>
            </View>
          )}

          {commission.reason && (
            <Text style={styles.reason}>{commission.reason}</Text>
          )}

          {commission.usedFallback && (
            <View style={styles.warningRow}>
              <Ionicons name="warning" size={12} color="#f59e0b" />
              <Text style={styles.warning}>Using estimated driving time</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 6,
  },
  badgeType: {
    fontSize: FontSize.sm,
    fontWeight: '500',
  },
  badgeValue: {
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  chevron: {
    fontSize: 10,
    opacity: 0.7,
    color: Colors.gray500,
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: Colors.gray100,
    borderRadius: Radius.sm,
    alignSelf: 'flex-start',
  },
  pendingIcon: {
    fontSize: FontSize.sm,
  },
  pendingText: {
    fontSize: FontSize.sm,
    color: Colors.gray500,
  },
  details: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.gray50,
    borderRadius: Radius.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
  },
  value: {
    fontSize: FontSize.xs,
    fontWeight: '500',
    color: Colors.gray900,
  },
  negativeValue: {
    color: '#dc2626',
  },
  positiveValue: {
    color: '#059669',
  },
  highlight: {
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.gray200,
    marginVertical: Spacing.sm,
  },
  reason: {
    marginTop: Spacing.sm,
    fontSize: FontSize.xs - 1,
    color: Colors.gray500,
    fontStyle: 'italic',
  },
  warning: {
    marginTop: 4,
    fontSize: FontSize.xs - 1,
    color: '#f59e0b',
  },
  warningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default ServiceCommissionBadge;
