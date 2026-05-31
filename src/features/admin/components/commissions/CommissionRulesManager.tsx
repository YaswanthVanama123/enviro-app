/**
 * CommissionRulesManager (mobile)
 *
 * Mirrors enviromaster/src/components/admin/commissions/CommissionRulesManager.tsx.
 * Lets an admin edit commission rules — including the V2 spec-faithful fields
 * (per-visit penalties, Anchor / Pit thresholds, pricing tiers, frequency
 * visits-per-year, quota tier cutoffs) — and persists via the existing
 * commissionApi.updateRules PUT.
 */

import React, {useEffect, useState} from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {commissionApi} from '../../../../services/api/endpoints/commission.api';
import type {CommissionRules} from '../../types/commission.types';
import {
  ACCOUNT_TYPE_REVENUE_RULES,
  FREQUENCY_VISITS_PER_YEAR,
  DEFAULT_QUOTA_TIER_CUTOFFS,
  PIT_PER_VISIT_THRESHOLD,
  ANCHOR_PER_VISIT_THRESHOLD,
  ANCHOR_BONUS_MULTIPLIER,
} from '../../types/commission.types';
import {Colors} from '../../../../theme/colors';
import {Spacing, Radius} from '../../../../theme/spacing';
import {FontSize} from '../../../../theme/typography';

type PerVisitKey = 'Bread5' | 'Bread15' | 'Pit';
type FreqKey = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'one-time';
type CutoffKey = 'aboveQuota' | 'doubleQuota';
type TierField = 'minRatio' | 'maxRatio' | 'quotaMultiplier' | 'label' | 'requiresApproval';

const DEFAULT_PRICING_TIERS = [
  {minRatio: 0,    maxRatio: 0.99, quotaMultiplier: 0.5,  label: 'Below Redline',     requiresApproval: true},
  {minRatio: 1.0,  maxRatio: 1.09, quotaMultiplier: 1.0,  label: 'Redline',            requiresApproval: false},
  {minRatio: 1.1,  maxRatio: 1.19, quotaMultiplier: 1.25, label: '110% Premium',       requiresApproval: false},
  {minRatio: 1.2,  maxRatio: 1.29, quotaMultiplier: 1.5,  label: '120% Premium',       requiresApproval: false},
  {minRatio: 1.3,  maxRatio: Infinity, quotaMultiplier: 2.0, label: 'Greenline (130%+)', requiresApproval: false},
];

// Hydrate any V2 fields missing on the DB document with bundled defaults so
// legacy CommissionRules documents render with editable values. The admin's
// first Save will persist the hydrated values to MongoDB.
function hydrateV2Fields(rules: CommissionRules): CommissionRules {
  return {
    ...rules,
    pricingTiers:
      rules.pricingTiers && rules.pricingTiers.length > 0
        ? rules.pricingTiers
        : DEFAULT_PRICING_TIERS.map(t => ({...t})),
    perVisitPenalties: rules.perVisitPenalties ?? {
      Bread5: ACCOUNT_TYPE_REVENUE_RULES.Bread5.revenueDeduction,
      Bread15: ACCOUNT_TYPE_REVENUE_RULES.Bread15.revenueDeduction,
      Pit: ACCOUNT_TYPE_REVENUE_RULES.Pit.revenueDeduction,
    },
    anchorMinPerVisit: rules.anchorMinPerVisit ?? 200,
    anchorMinGreenline: rules.anchorMinGreenline ?? 100,
    pitPerVisitThreshold: rules.pitPerVisitThreshold ?? PIT_PER_VISIT_THRESHOLD,
    anchorPerVisitThreshold: rules.anchorPerVisitThreshold ?? ANCHOR_PER_VISIT_THRESHOLD,
    anchorBonusMultiplier: rules.anchorBonusMultiplier ?? ANCHOR_BONUS_MULTIPLIER,
    frequencyVisitsPerYear: rules.frequencyVisitsPerYear ?? {
      weekly: FREQUENCY_VISITS_PER_YEAR.weekly,
      biweekly: FREQUENCY_VISITS_PER_YEAR.biweekly,
      monthly: FREQUENCY_VISITS_PER_YEAR.monthly,
      quarterly: FREQUENCY_VISITS_PER_YEAR.quarterly,
      'one-time': FREQUENCY_VISITS_PER_YEAR['one-time'],
    },
    quotaTierCutoffs: rules.quotaTierCutoffs ?? {
      aboveQuota: DEFAULT_QUOTA_TIER_CUTOFFS.aboveQuota,
      doubleQuota: DEFAULT_QUOTA_TIER_CUTOFFS.doubleQuota,
    },
    weeksPerAnnualCommission: rules.weeksPerAnnualCommission ?? 52,
  };
}

export const CommissionRulesManager: React.FC = () => {
  const [rules, setRules] = useState<CommissionRules | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchRules();
  }, []);

  const fetchRules = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await commissionApi.getActiveRules();
      if (result) {
        setRules(hydrateV2Fields(result));
      } else {
        setError('No commission rules found.');
      }
    } catch (err) {
      console.error('[RULES] Failed to load:', err);
      setError('Failed to load commission rules');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!rules?._id) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await commissionApi.updateRules(rules._id, rules);
      if (response.error) {
        setError(response.error);
      } else {
        setSuccess('Commission rules updated successfully!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError('Failed to save commission rules');
    } finally {
      setSaving(false);
    }
  };

  // Numeric input helper — parses on change, preserves zero/empty correctly.
  const num = (value: number | undefined, fallback: number) =>
    String(value ?? fallback);
  const parseNum = (value: string) => parseFloat(value) || 0;

  const updateQuotaRate = (key: 'below' | 'above' | 'double', value: string) => {
    if (!rules) return;
    setRules({...rules, quotaRates: {...rules.quotaRates, [key]: parseNum(value)}});
  };

  const updateAgreement = (
    key: '3-year' | '1-year' | 'MTM-with-install' | 'MTM-no-install',
    value: string,
  ) => {
    if (!rules) return;
    setRules({
      ...rules,
      agreementMultipliers: {...rules.agreementMultipliers, [key]: parseNum(value)},
    });
  };

  const updatePerVisitPenalty = (key: PerVisitKey, value: string) => {
    if (!rules) return;
    const current = rules.perVisitPenalties || {Bread5: 50, Bread15: 75, Pit: 100};
    setRules({
      ...rules,
      perVisitPenalties: {...current, [key]: parseNum(value)},
    });
  };

  const updateFrequencyVisits = (key: FreqKey, value: string) => {
    if (!rules) return;
    const current = rules.frequencyVisitsPerYear || {
      weekly: 50,
      biweekly: 25,
      monthly: 12,
      quarterly: 4,
      'one-time': 1,
    };
    setRules({
      ...rules,
      frequencyVisitsPerYear: {...current, [key]: parseNum(value)},
    });
  };

  const updateQuotaTierCutoff = (key: CutoffKey, value: string) => {
    if (!rules) return;
    const current = rules.quotaTierCutoffs || {aboveQuota: 10000, doubleQuota: 20000};
    setRules({
      ...rules,
      quotaTierCutoffs: {...current, [key]: parseNum(value)},
    });
  };

  const updatePricingTier = (
    index: number,
    field: TierField,
    value: string | boolean,
  ) => {
    if (!rules) return;
    const current =
      rules.pricingTiers && rules.pricingTiers.length > 0
        ? rules.pricingTiers
        : DEFAULT_PRICING_TIERS;
    const next = [...current];
    if (field === 'label') {
      next[index] = {...next[index], label: String(value)};
    } else if (field === 'requiresApproval') {
      next[index] = {...next[index], requiresApproval: Boolean(value)};
    } else if (field === 'minRatio' || field === 'maxRatio') {
      // Inputs are PERCENT values (e.g. "110"); store as decimal ratio.
      const pct = parseFloat(String(value));
      const ratio = isFinite(pct) ? pct / 100 : 0;
      next[index] = {...next[index], [field]: ratio};
    } else {
      next[index] = {...next[index], [field]: parseNum(String(value))};
    }
    setRules({...rules, pricingTiers: next});
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.loadingText}>Loading commission rules...</Text>
      </View>
    );
  }

  if (!rules) {
    return (
      <View style={styles.centered}>
        <Ionicons name="warning-outline" size={32} color={Colors.textMuted} />
        <Text style={styles.loadingText}>{error ?? 'No commission rules found.'}</Text>
      </View>
    );
  }

  const tiers = rules.pricingTiers && rules.pricingTiers.length > 0
    ? rules.pricingTiers
    : DEFAULT_PRICING_TIERS;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <Ionicons name="settings-outline" size={20} color={Colors.primary} />
        <Text style={styles.header}>Commission Rules Configuration</Text>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {success && (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{success}</Text>
        </View>
      )}

      {/* Quota Achievement Rates */}
      <Section title="Quota Achievement Rates (%)">
        <NumberField
          label="Below Quota"
          value={num(rules.quotaRates.below, 3)}
          onChange={v => updateQuotaRate('below', v)}
        />
        <NumberField
          label="Above Quota"
          value={num(rules.quotaRates.above, 6)}
          onChange={v => updateQuotaRate('above', v)}
        />
        <NumberField
          label="Double Quota"
          value={num(rules.quotaRates.double, 9)}
          onChange={v => updateQuotaRate('double', v)}
        />
      </Section>

      {/* Agreement Term Multipliers */}
      <Section title="Agreement Term Multipliers (%)">
        <NumberField
          label="3-Year"
          value={num(rules.agreementMultipliers['3-year'], 135)}
          onChange={v => updateAgreement('3-year', v)}
        />
        <NumberField
          label="1-Year"
          value={num(rules.agreementMultipliers['1-year'], 100)}
          onChange={v => updateAgreement('1-year', v)}
        />
        <NumberField
          label="MTM + Install"
          value={num(rules.agreementMultipliers['MTM-with-install'], 100)}
          onChange={v => updateAgreement('MTM-with-install', v)}
        />
        <NumberField
          label="MTM No Install"
          value={num(rules.agreementMultipliers['MTM-no-install'], 50)}
          onChange={v => updateAgreement('MTM-no-install', v)}
        />
      </Section>

      {/* V2 — Per-Visit Penalties */}
      <Section
        title="Per-Visit Penalties (V2 — $)"
        subtitle="Subtracted from per-visit revenue for new Bread / Pit accounts. Existing accounts pay no penalty.">
        <NumberField
          label="Bread5 (5 min from Anchor)"
          value={num(rules.perVisitPenalties?.Bread5, 50)}
          onChange={v => updatePerVisitPenalty('Bread5', v)}
        />
        <NumberField
          label="Bread15 (15 min from Anchor)"
          value={num(rules.perVisitPenalties?.Bread15, 75)}
          onChange={v => updatePerVisitPenalty('Bread15', v)}
        />
        <NumberField
          label="Pit (no nearby Anchor)"
          value={num(rules.perVisitPenalties?.Pit, 100)}
          onChange={v => updatePerVisitPenalty('Pit', v)}
        />
      </Section>

      {/* V2 — Anchor Thresholds */}
      <Section title="Anchor Thresholds (V2 — per visit $)">
        <NumberField
          label="Anchor Min ($)"
          value={num(rules.anchorMinPerVisit, 200)}
          onChange={v =>
            setRules({...rules, anchorMinPerVisit: parseNum(v)})
          }
        />
        <NumberField
          label="Anchor Min Greenline ($)"
          value={num(rules.anchorMinGreenline, 100)}
          onChange={v =>
            setRules({...rules, anchorMinGreenline: parseNum(v)})
          }
        />
        <NumberField
          label="Pit Threshold ($)"
          value={num(rules.pitPerVisitThreshold, 100)}
          onChange={v =>
            setRules({...rules, pitPerVisitThreshold: parseNum(v)})
          }
        />
        <NumberField
          label="Anchor Threshold ($)"
          value={num(rules.anchorPerVisitThreshold, 200)}
          onChange={v =>
            setRules({...rules, anchorPerVisitThreshold: parseNum(v)})
          }
        />
        <NumberField
          label="Anchor Bonus Multiplier (×)"
          value={num(rules.anchorBonusMultiplier, 1.5)}
          onChange={v =>
            setRules({...rules, anchorBonusMultiplier: parseNum(v)})
          }
          step={0.05}
        />
      </Section>

      {/* V2 — Pricing Tiers */}
      <Section
        title="Pricing Tiers (V2 — % range → multiplier)"
        subtitle="Drives both quota credit and commission base. Range is the agreement's current/redline ratio expressed as a percentage. Spec: Redline $1 per $1, Greenline $2 per dollar.">
        {tiers.map((tier, idx) => {
          const minPct = (tier.minRatio * 100).toFixed(0);
          const maxPct = Number.isFinite(tier.maxRatio)
            ? (tier.maxRatio * 100).toFixed(0)
            : '9999';
          return (
            <View key={idx} style={styles.tierCard}>
              <Text style={styles.tierTitle}>{tier.label}</Text>
              <NumberField
                label="Label"
                value={tier.label}
                onChange={v => updatePricingTier(idx, 'label', v)}
                isText
              />
              <View style={styles.tierRow}>
                <NumberField
                  label="Min %"
                  value={minPct}
                  onChange={v => updatePricingTier(idx, 'minRatio', v)}
                  step={1}
                  style={styles.tierField}
                />
                <NumberField
                  label="Max %"
                  value={maxPct}
                  onChange={v => updatePricingTier(idx, 'maxRatio', v)}
                  step={1}
                  style={styles.tierField}
                />
                <NumberField
                  label="Multiplier"
                  value={String(tier.quotaMultiplier)}
                  onChange={v => updatePricingTier(idx, 'quotaMultiplier', v)}
                  step={0.05}
                  style={styles.tierField}
                />
              </View>
              <View style={styles.approvalRow}>
                <Text style={styles.fieldLabel}>Requires Approval</Text>
                <Switch
                  value={tier.requiresApproval}
                  onValueChange={v => updatePricingTier(idx, 'requiresApproval', v)}
                />
              </View>
            </View>
          );
        })}
      </Section>

      {/* V2 — Frequency Visits Per Year */}
      <Section
        title="Visits Per Year by Frequency (V2)"
        subtitle="Spec: weekly billing uses 50 weeks (holidays excluded), monthly 12, quarterly 4.">
        <NumberField
          label="Weekly"
          value={num(rules.frequencyVisitsPerYear?.weekly, 50)}
          onChange={v => updateFrequencyVisits('weekly', v)}
        />
        <NumberField
          label="Bi-Weekly"
          value={num(rules.frequencyVisitsPerYear?.biweekly, 25)}
          onChange={v => updateFrequencyVisits('biweekly', v)}
        />
        <NumberField
          label="Monthly"
          value={num(rules.frequencyVisitsPerYear?.monthly, 12)}
          onChange={v => updateFrequencyVisits('monthly', v)}
        />
        <NumberField
          label="Quarterly"
          value={num(rules.frequencyVisitsPerYear?.quarterly, 4)}
          onChange={v => updateFrequencyVisits('quarterly', v)}
        />
        <NumberField
          label="One-Time"
          value={num(rules.frequencyVisitsPerYear?.['one-time'], 1)}
          onChange={v => updateFrequencyVisits('one-time', v)}
        />
        <NumberField
          label="Weeks Per Annual Commission (display divisor)"
          value={num(rules.weeksPerAnnualCommission, 52)}
          onChange={v =>
            setRules({...rules, weeksPerAnnualCommission: parseNum(v)})
          }
        />
      </Section>

      {/* V2 — Quota Tier Cutoffs */}
      <Section
        title="Quota Tier Cutoffs (V2 — $)"
        subtitle="Piecewise commission rate splits at these annualized quota-credit positions.">
        <NumberField
          label="Above Quota Cutoff"
          value={num(rules.quotaTierCutoffs?.aboveQuota, 10000)}
          onChange={v => updateQuotaTierCutoff('aboveQuota', v)}
          step={500}
        />
        <NumberField
          label="Double Quota Cutoff"
          value={num(rules.quotaTierCutoffs?.doubleQuota, 20000)}
          onChange={v => updateQuotaTierCutoff('doubleQuota', v)}
          step={500}
        />
      </Section>

      {/* Other Settings */}
      <Section title="Other Settings">
        <NumberField
          label="Greenline Bonus (V1 legacy %)"
          value={num(rules.greenlineBonus, 1)}
          onChange={v =>
            setRules({...rules, greenlineBonus: parseNum(v)})
          }
        />
        <NumberField
          label="Renewal Bonus Rate (%)"
          value={num(rules.renewalBonusRate, 4)}
          onChange={v =>
            setRules({...rules, renewalBonusRate: parseNum(v)})
          }
        />
        <NumberField
          label="Renewal Min Years"
          value={num(rules.renewalMinYears, 2)}
          onChange={v =>
            setRules({...rules, renewalMinYears: parseNum(v)})
          }
        />
        <NumberField
          label="Inside Sales Deduction (%)"
          value={num(rules.insideSalesDeduction, -3)}
          onChange={v =>
            setRules({...rules, insideSalesDeduction: parseNum(v)})
          }
        />
        <NumberField
          label="Anchor Min Monthly Value (V1 legacy $)"
          value={num(rules.anchorMinMonthlyValue, 200)}
          onChange={v =>
            setRules({...rules, anchorMinMonthlyValue: parseNum(v)})
          }
        />
      </Section>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}>
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <>
            <Ionicons name="save-outline" size={18} color="#fff" />
            <Text style={styles.saveButtonText}>Save Commission Rules</Text>
          </>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
};

// ── Sub-components ────────────────────────────────────────────────────────

interface SectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}
function Section({title, subtitle, children}: SectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

interface NumberFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
  isText?: boolean;
  style?: any;
}
function NumberField({label, value, onChange, isText, style}: NumberFieldProps) {
  return (
    <View style={[styles.field, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType={isText ? 'default' : 'numeric'}
        placeholderTextColor={Colors.textMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.md,
    paddingBottom: Spacing.xl * 2,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
  },
  loadingText: {
    marginTop: Spacing.sm,
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  header: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  errorText: {color: '#991b1b', fontSize: FontSize.sm},
  successBox: {
    backgroundColor: '#f0fdf4',
    borderColor: '#86efac',
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  successText: {color: '#166534', fontSize: FontSize.sm},
  section: {
    backgroundColor: '#fff',
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginBottom: Spacing.sm,
  },
  sectionBody: {
    gap: Spacing.sm,
  },
  field: {
    marginTop: Spacing.xs,
  },
  fieldLabel: {
    fontSize: FontSize.xs,
    fontWeight: '600',
    color: Colors.textMuted,
    marginBottom: 2,
  },
  input: {
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: FontSize.sm,
    color: Colors.textPrimary,
  },
  tierCard: {
    backgroundColor: '#f9fafb',
    borderRadius: Radius.sm,
    padding: Spacing.sm,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  tierTitle: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  tierRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: Spacing.xs,
  },
  tierField: {
    flex: 1,
  },
  approvalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: Spacing.sm,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    gap: Spacing.xs,
    marginTop: Spacing.md,
  },
  saveButtonDisabled: {opacity: 0.6},
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: FontSize.md,
  },
});

export default CommissionRulesManager;
