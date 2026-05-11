import React, {useCallback} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {
  ServiceCard, TotalsBlock, getFreqMultiplier,
  FREQ_OPTIONS, DropdownRow, FormDivider, NumberRow, ToggleRow,
} from './ServiceBase';

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
}

/**
 * Compute sanipod contract total with proper first-visit install logic.
 * When there are install pods, first visit only charges service for (pods - installQty),
 * while ongoing visits charge for all pods.
 */
function calcSanipodTotals(
  pods: number,
  weeklyRate: number,
  altRate: number,
  isStandalone: boolean,
  standaloneExtra: number,
  bagsPerWeek: number,
  bagPrice: number,
  extraBagsRecurring: boolean,
  isNewInstall: boolean,
  installQty: number,
  installRate: number,
  frequency: string,
  contractMonths: number,
) {
  const mult = getFreqMultiplier(frequency);
  const isOneTime = frequency === 'oneTime';
  const isEveryFourWeeks = frequency === 'everyFourWeeks';

  // Ongoing per-visit: all pods + standalone + bags (if recurring)
  const weeklyBags = extraBagsRecurring ? bagsPerWeek * bagPrice : 0;
  const optA = pods * altRate + weeklyBags;
  const optB = pods * weeklyRate + (isStandalone ? standaloneExtra : 0) + weeklyBags;
  const weeklyService = Math.min(optA, optB);
  const perVisit = isStandalone ? Math.max(weeklyService, standaloneExtra) : weeklyService;

  // Install cost
  const effectiveInstallQty = isNewInstall ? installQty : 0;
  const installCost = effectiveInstallQty > 0 ? effectiveInstallQty * installRate : 0;

  // First visit: deduct install pods from service pods (mirrors web logic)
  let firstVisit: number;
  if (effectiveInstallQty > 0) {
    const servicePods = Math.max(0, pods - effectiveInstallQty);
    let firstVisitServiceCost = 0;
    if (servicePods > 0) {
      // Use same option (A/B) as determined by per-visit comparison (all pods)
      const usingOptA = optA <= optB;
      if (usingOptA) {
        firstVisitServiceCost = servicePods * altRate;
      } else {
        firstVisitServiceCost = servicePods * weeklyRate + (isStandalone ? standaloneExtra : 0);
      }
    }
    const firstVisitBagsCost = bagsPerWeek > 0 ? bagsPerWeek * bagPrice : 0;
    const oneTimeBags = extraBagsRecurring ? 0 : bagsPerWeek * bagPrice;
    firstVisit = installCost + firstVisitServiceCost + firstVisitBagsCost + oneTimeBags;
  } else {
    const oneTimeBags = extraBagsRecurring ? 0 : bagsPerWeek * bagPrice;
    firstVisit = perVisit + oneTimeBags;
  }

  // Monthly ongoing
  const monthlyRecurring = isOneTime ? 0 : perVisit * mult;

  // First month
  let firstMonth: number;
  if (isOneTime || frequency === 'monthly') {
    firstMonth = firstVisit;
  } else {
    firstMonth = firstVisit + Math.max(mult - 1, 0) * perVisit;
  }

  // Contract total
  let contractTotal: number;
  if (isOneTime) {
    contractTotal = firstVisit;
  } else if (isEveryFourWeeks) {
    const totalVisits = Math.round(contractMonths * 1.0833);
    if (effectiveInstallQty > 0) {
      contractTotal = firstVisit + Math.max(totalVisits - 1, 0) * perVisit;
    } else {
      contractTotal = totalVisits * perVisit;
    }
  } else if (contractMonths <= 0) {
    contractTotal = 0;
  } else {
    contractTotal = firstMonth + Math.max(contractMonths - 1, 0) * monthlyRecurring;
  }

  return {perVisit, firstMonth, monthlyRecurring, contractTotal, installCost, firstVisit};
}

export function SanipodForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  const freq                  = data?.frequency                   ?? cfg.defaultFrequency             ?? 'weekly';
  const podQuantity           = data?.podQuantity                 ?? 0;
  const weeklyRatePerUnit     = data?.weeklyRatePerUnit           ?? cfg.weeklyRatePerUnit             ?? 3;
  const altWeeklyRatePerUnit  = data?.altWeeklyRatePerUnit        ?? cfg.altWeeklyRatePerUnit          ?? 8;
  const isStandalone          = data?.isStandalone                ?? false;
  const standaloneExtraWeekly = data?.standaloneExtraWeeklyCharge ?? cfg.standaloneExtraWeeklyCharge   ?? 40;
  const extraBagsPerWeek      = data?.extraBagsPerWeek            ?? 0;
  const extraBagPrice         = data?.extraBagPrice               ?? cfg.extraBagPrice                 ?? 2;
  const extraBagsRecurring    = data?.extraBagsRecurring          ?? true;
  const isNewInstall          = data?.isNewInstall                ?? false;
  const installQuantity       = data?.installQuantity             ?? 0;
  const installRatePerPod     = data?.installRatePerPod           ?? cfg.installChargePerUnit          ?? 25;

  const totals = calcSanipodTotals(
    podQuantity, weeklyRatePerUnit, altWeeklyRatePerUnit,
    isStandalone, standaloneExtraWeekly,
    extraBagsPerWeek, extraBagPrice, extraBagsRecurring,
    isNewInstall, installQuantity, installRatePerPod,
    freq, contractMonths,
  );

  const update = useCallback((fields: Record<string, any>) => {
    const nf   = fields.frequency                   ?? freq;
    const nq   = fields.podQuantity                 ?? podQuantity;
    const wr   = fields.weeklyRatePerUnit           ?? weeklyRatePerUnit;
    const ar   = fields.altWeeklyRatePerUnit        ?? altWeeklyRatePerUnit;
    const sa   = fields.isStandalone                ?? isStandalone;
    const se   = fields.standaloneExtraWeeklyCharge ?? standaloneExtraWeekly;
    const eb   = fields.extraBagsPerWeek            ?? extraBagsPerWeek;
    const ebp  = fields.extraBagPrice               ?? extraBagPrice;
    const ebr  = fields.extraBagsRecurring          ?? extraBagsRecurring;
    const ni   = fields.isNewInstall                ?? isNewInstall;
    const iq   = fields.installQuantity             ?? installQuantity;
    const ir   = fields.installRatePerPod           ?? installRatePerPod;

    const newTotals = calcSanipodTotals(nq, wr, ar, sa, se, eb, ebp, ebr, ni, iq, ir, nf, contractMonths);

    // Baseline: same calc with admin rates
    const origWr  = cfg.weeklyRatePerUnit            ?? 3;
    const origAr  = cfg.altWeeklyRatePerUnit         ?? 8;
    const origSe  = cfg.standaloneExtraWeeklyCharge  ?? 40;
    const origEbp = cfg.extraBagPrice                ?? 2;
    const origIr  = cfg.installChargePerUnit         ?? 25;
    const origTotals = calcSanipodTotals(nq, origWr, origAr, sa, origSe, eb, origEbp, ebr, ni, iq, origIr, nf, contractMonths);

    onChange({
      serviceId: 'sanipod',
      displayName: 'SaniPod',
      isActive: nq > 0,
      contractMonths,
      ...data,
      ...fields,
      frequency: nf,
      perVisit: newTotals.perVisit,
      monthlyRecurring: newTotals.monthlyRecurring,
      contractTotal: newTotals.contractTotal,
      originalContractTotal: origTotals.contractTotal,
    });
  }, [data, freq, podQuantity, weeklyRatePerUnit, altWeeklyRatePerUnit, isStandalone, standaloneExtraWeekly, extraBagsPerWeek, extraBagPrice, extraBagsRecurring, isNewInstall, installQuantity, installRatePerPod, contractMonths, onChange, cfg]);

  // Greenline badge: baseline with admin rates
  const origWr  = cfg.weeklyRatePerUnit            ?? 3;
  const origAr  = cfg.altWeeklyRatePerUnit         ?? 8;
  const origSe  = cfg.standaloneExtraWeeklyCharge  ?? 40;
  const origEbp = cfg.extraBagPrice                ?? 2;
  const origIr  = cfg.installChargePerUnit         ?? 25;
  const origTotals = calcSanipodTotals(podQuantity, origWr, origAr, isStandalone, origSe, extraBagsPerWeek, origEbp, extraBagsRecurring, isNewInstall, installQuantity, origIr, freq, contractMonths);
  const isGreenline = totals.contractTotal > origTotals.contractTotal * 1.30;

  return (
    <ServiceCard serviceId="sanipod" displayName="SaniPod" icon="cube-outline" iconColor="#7c3aed" iconBg="#ede9fe" onRemove={onRemove} notes={data?.notes ?? ''} onNotesChange={v => update({notes: v})}>
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />
      <NumberRow label="Pod Quantity" value={podQuantity} onChange={v => update({podQuantity: v})} decimals={0} />
      <NumberRow label="Weekly Rate / Unit" value={weeklyRatePerUnit} onChange={v => update({weeklyRatePerUnit: v})} prefix="$" decimals={2} />
      <NumberRow label="Alt Weekly Rate / Unit" value={altWeeklyRatePerUnit} onChange={v => update({altWeeklyRatePerUnit: v})} prefix="$" decimals={2} />
      <NumberRow label="Extra Bags / Week" value={extraBagsPerWeek} onChange={v => update({extraBagsPerWeek: v})} decimals={0} />
      <NumberRow label="Extra Bag Price" value={extraBagPrice} onChange={v => update({extraBagPrice: v})} prefix="$" decimals={2} />
      <ToggleRow label="Bags Recurring" value={extraBagsRecurring} onChange={v => update({extraBagsRecurring: v})} subtitle="Charge bags every visit" />
      <ToggleRow label="Standalone Service" value={isStandalone} onChange={v => update({isStandalone: v})} subtitle="Charge standalone extra fee" />
      {isStandalone && (
        <NumberRow label="Standalone Extra / Week" value={standaloneExtraWeekly} onChange={v => update({standaloneExtraWeeklyCharge: v})} prefix="$" decimals={2} />
      )}
      <FormDivider />
      <ToggleRow label="New Install" value={isNewInstall} onChange={v => update({isNewInstall: v})} subtitle="Include installation charge" />
      {isNewInstall && (
        <>
          <NumberRow label="Install Pods" value={installQuantity} onChange={v => update({installQuantity: v})} decimals={0} />
          <NumberRow label="Install Rate / Pod" value={installRatePerPod} onChange={v => update({installRatePerPod: v})} prefix="$" decimals={2} />
        </>
      )}
      <TotalsBlock frequency={freq} perVisit={totals.perVisit} firstMonth={totals.firstMonth} monthlyRecurring={totals.monthlyRecurring} contractMonths={contractMonths} contractTotal={totals.contractTotal} />
      {podQuantity > 0 && (
        <View style={styles.badgeRow}>
          <View style={[styles.badge, isGreenline ? styles.greenBadge : styles.redBadge]}>
            <Text style={[styles.badgeText, isGreenline ? styles.greenText : styles.redText]}>
              {isGreenline ? '🟢 Greenline Pricing' : '🔴 Redline Pricing'}
            </Text>
          </View>
        </View>
      )}
    </ServiceCard>
  );
}

const styles = StyleSheet.create({
  badgeRow: {paddingHorizontal: 16, paddingVertical: 8},
  badge: {alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6},
  greenBadge: {backgroundColor: '#e8f5e9'},
  redBadge: {backgroundColor: '#ffebee'},
  badgeText: {fontSize: 13, fontWeight: '600'},
  greenText: {color: '#388e3c'},
  redText: {color: '#d32f2f'},
});
