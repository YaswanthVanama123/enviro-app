import React, {useState} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  useGlobalCommission,
  GlobalCommissionResult,
} from '../../hooks/useServiceCommission';
import {AccountTypeCache} from '../../hooks/useAccountTypeDetection';
import {useQuotaContext, QuotaLevel} from '../../context/QuotaContext';
import {AccountType} from '../../../../services/api/endpoints/accountType.api';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

const ACCOUNT_TYPE_COLORS: Record<AccountType, string> = {
  Anchor: '#fbbf24',
  Bread5: '#34d399',
  Bread15: '#60a5fa',
  Pit: '#f87171',
};

const QUOTA_LEVEL_CONFIG: Record<QuotaLevel, {label: string; color: string; bgColor: string}> = {
  below: {label: 'Below Quota', color: '#dc2626', bgColor: '#fee2e2'},
  above: {label: 'Above Quota', color: '#059669', bgColor: '#d1fae5'},
  double: {label: 'Double Quota', color: '#7c3aed', bgColor: '#ede9fe'},
};

interface GlobalCommissionSummaryProps {
  services: Record<string, any>;
  accountTypeCache: AccountTypeCache;
  contractMonths?: number;
  showDetectButton?: boolean;
  isDetecting?: boolean;
  isCompanyMapped?: boolean;
  error?: string | null;
  onDetect?: () => void;
}

export function GlobalCommissionSummary({
  services,
  accountTypeCache,
  contractMonths = 12,
  showDetectButton = true,
  isDetecting = false,
  isCompanyMapped = false,
  error = null,
  onDetect,
}: GlobalCommissionSummaryProps) {
  const [expanded, setExpanded] = useState(false);

  const {quotaLevel, baseCommissionRate, quotaLevelData, isLoading: quotaLoading} = useQuotaContext();
  const commissionRate = baseCommissionRate;
  const quotaConfig = QUOTA_LEVEL_CONFIG[quotaLevel];

  const global = useGlobalCommission({
    services,
    accountTypeCache,
    commissionRate,
    contractMonths,
    priorQuotaCredit: quotaLevelData?.actualSales || 0,
  });

  if (global.serviceCount === 0) {
    return null;
  }

  // Commission is only calculated / shown / saved when connected to Bigin.
  if (!isCompanyMapped) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text style={styles.icon}>💰</Text>
            <Text style={styles.title}>Commission Summary</Text>
          </View>
          {showDetectButton && onDetect && (
            <TouchableOpacity
              style={[styles.detectButton, isDetecting && styles.detectButtonDisabled]}
              onPress={onDetect}
              disabled={isDetecting}>
              {isDetecting ? (
                <>
                  <ActivityIndicator size="small" color="#fff" />
                  <Text style={styles.detectButtonText}>Connecting…</Text>
                </>
              ) : (
                <>
                  <Text style={styles.detectButtonIcon}>🔄</Text>
                  <Text style={styles.detectButtonText}>Connect</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>ℹ️ Please connect to Bigin to show the commission details.</Text>
        </View>
        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.icon}>💰</Text>
          <Text style={styles.title}>Commission Summary</Text>
          {}
          <View
            style={[
              styles.quotaBadge,
              {backgroundColor: quotaConfig.bgColor},
            ]}>
            <Text style={[styles.quotaBadgeText, {color: quotaConfig.color}]}>
              {quotaConfig.label} ({commissionRate}%)
            </Text>
          </View>
          {!global.hasDetectedServices && isCompanyMapped && (
            <Text style={styles.needsDetection}>(Detection needed)</Text>
          )}
        </View>

        {showDetectButton && isCompanyMapped && onDetect && (
          <TouchableOpacity
            style={[styles.detectButton, isDetecting && styles.detectButtonDisabled]}
            onPress={onDetect}
            disabled={isDetecting}>
            {isDetecting ? (
              <>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={styles.detectButtonText}>Detecting...</Text>
              </>
            ) : (
              <>
                <Text style={styles.detectButtonIcon}>🔄</Text>
                <Text style={styles.detectButtonText}>Detect</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>⚠️ {error}</Text>
        </View>
      )}

      {!isCompanyMapped && (
        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            ℹ️ Connect to Bigin to detect account types
          </Text>
        </View>
      )}

      <View style={styles.totalsRow}>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>PER VISIT</Text>
          <Text style={styles.totalValue}>
            {global.formatted.totalPerVisitCommission}
          </Text>
        </View>
        <View style={styles.totalItem}>
          <Text style={styles.totalLabel}>ANNUAL</Text>
          <Text style={styles.totalValue}>
            {global.formatted.totalAnnualCommission}
          </Text>
        </View>
      </View>

      {global.services.length > 0 && (
        <View style={styles.servicesSection}>
          <TouchableOpacity
            style={styles.expandHeader}
            onPress={() => setExpanded(!expanded)}>
            <Text style={styles.serviceCount}>
              {global.serviceCount} service{global.serviceCount !== 1 ? 's' : ''}{' '}
              included
            </Text>
            <Text style={styles.expandText}>
              {expanded ? '▲ Hide' : '▼ Show'}
            </Text>
          </TouchableOpacity>

          {expanded && (
            <View style={styles.servicesList}>
              {global.services.map((service, idx) => (
                <View key={idx} style={styles.serviceRow}>
                  <View style={styles.serviceNameRow}>
                    <View
                      style={[
                        styles.accountTypeDot,
                        {
                          backgroundColor: service.accountType
                            ? ACCOUNT_TYPE_COLORS[service.accountType]
                            : Colors.gray300,
                        },
                      ]}
                    />
                    <Text style={styles.serviceName}>
                      {service.serviceName
                        .replace(/([A-Z])/g, ' $1')
                        .trim()}
                    </Text>
                    {service.accountType && (
                      <Text style={styles.serviceType}>
                        ({service.accountType})
                      </Text>
                    )}
                  </View>
                  <View style={styles.serviceCommission}>
                    <Text style={styles.serviceCommissionValue}>
                      ${service.perVisitCommission.toFixed(2)}/visit
                    </Text>
                    <Text style={styles.serviceCommissionAnnual}>
                      (${service.annualCommission.toFixed(2)}/yr)
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <Text style={styles.rateNote}>
        Commission rate: {commissionRate}% ({quotaConfig.label})
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.gray200,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  icon: {
    fontSize: FontSize.md,
  },
  title: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.gray700,
  },
  needsDetection: {
    fontSize: FontSize.xs,
    color: '#f59e0b',
  },
  quotaBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
  },
  quotaBadgeText: {
    fontSize: FontSize.xs - 1,
    fontWeight: '600',
  },
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: '#3b82f6',
    borderRadius: Radius.sm,
  },
  detectButtonDisabled: {
    backgroundColor: Colors.gray400,
  },
  detectButtonIcon: {
    fontSize: FontSize.sm,
  },
  detectButtonText: {
    fontSize: FontSize.xs,
    color: '#ffffff',
    fontWeight: '500',
  },
  errorBox: {
    padding: Spacing.sm,
    backgroundColor: '#fee2e2',
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontSize: FontSize.xs,
    color: '#991b1b',
  },
  infoBox: {
    padding: Spacing.sm,
    backgroundColor: '#fef3c7',
    borderRadius: Radius.sm,
    marginBottom: Spacing.md,
  },
  infoText: {
    fontSize: FontSize.xs,
    color: '#92400e',
  },
  totalsRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  totalItem: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontSize: FontSize.xs - 1,
    color: Colors.gray500,
    letterSpacing: 0.5,
  },
  totalValue: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: '#059669',
  },
  servicesSection: {
    marginTop: Spacing.md,
  },
  expandHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  serviceCount: {
    fontSize: FontSize.xs,
    color: Colors.gray500,
  },
  expandText: {
    fontSize: FontSize.xs - 1,
    color: Colors.gray400,
  },
  servicesList: {
    marginTop: Spacing.sm,
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray100,
  },
  serviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    flex: 1,
  },
  accountTypeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  serviceName: {
    fontSize: FontSize.sm,
    color: Colors.gray700,
    textTransform: 'capitalize',
  },
  serviceType: {
    fontSize: FontSize.xs - 1,
    color: Colors.gray400,
  },
  serviceCommission: {
    alignItems: 'flex-end',
  },
  serviceCommissionValue: {
    fontSize: FontSize.sm,
    fontWeight: '500',
    color: '#059669',
  },
  serviceCommissionAnnual: {
    fontSize: FontSize.xs - 1,
    color: Colors.gray500,
  },
  rateNote: {
    marginTop: Spacing.md,
    fontSize: FontSize.xs - 1,
    color: Colors.gray400,
    textAlign: 'right',
  },
});

export default GlobalCommissionSummary;
