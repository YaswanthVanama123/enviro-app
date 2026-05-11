import React, {useCallback} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {
  ServiceCard, TotalsBlock, getFreqMultiplier,
  FREQ_OPTIONS, DropdownRow, FormDivider, CalcRow, NumberRow, ToggleRow,
} from './ServiceBase';
import {Colors} from '../../../../../theme/colors';
import {Spacing} from '../../../../../theme/spacing';
import {FontSize} from '../../../../../theme/typography';

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
}

/**
 * Compute saniscrub contract totals with installation, non-bathroom area,
 * and twicePerMonth discount logic (mirrors web version).
 */
function calcSaniscrubTotals(
  fixtureCount: number,
  fixtureRate: number,
  minimumCharge: number,
  applyMinimum: boolean,
  nonBathSqFt: number,
  nonBathFirstRate: number,
  nonBathAdditionalRate: number,
  nonBathBlockSize: number,
  useExactSqFt: boolean,
  includeInstall: boolean,
  isDirty: boolean,
  dirtyMultiplier: number,
  cleanMultiplier: number,
  hasSaniClean: boolean,
  twicePerMonthDiscount: number,
  frequency: string,
  contractMonths: number,
) {
  const mult = getFreqMultiplier(frequency);
  const isOneTime = frequency === 'oneTime';
  const isEveryFourWeeks = frequency === 'everyFourWeeks';

  // Fixture base amount
  const rawFixture = fixtureCount * fixtureRate;
  const fixtureBase = fixtureCount > 0 && applyMinimum && minimumCharge > 0
    ? Math.max(rawFixture, minimumCharge)
    : rawFixture;

  // Non-bathroom per-visit
  let nonBathPerVisit = 0;
  if (nonBathSqFt > 0 && nonBathBlockSize > 0) {
    if (nonBathSqFt <= nonBathBlockSize) {
      nonBathPerVisit = nonBathFirstRate;
    } else {
      const extraSqFt = nonBathSqFt - nonBathBlockSize;
      if (useExactSqFt) {
        const ratePerSqFt = nonBathAdditionalRate / nonBathBlockSize;
        nonBathPerVisit = nonBathFirstRate + (extraSqFt * ratePerSqFt);
      } else {
        const additionalBlocks = Math.ceil(extraSqFt / nonBathBlockSize);
        nonBathPerVisit = nonBathFirstRate + (additionalBlocks * nonBathAdditionalRate);
      }
    }
  }

  const perVisit = fixtureBase + nonBathPerVisit;

  // Installation
  const installMultiplier = isDirty ? dirtyMultiplier : cleanMultiplier;
  const installOneTime = includeInstall && perVisit > 0 ? perVisit * installMultiplier : 0;

  // Monthly visits
  const monthlyVisits = mult; // e.g., 4.33 for weekly, 2 for twicePerMonth

  // First month & contract total
  let firstMonth = 0;
  let monthlyRecurring = isOneTime ? 0 : perVisit * mult;
  let contractTotal = 0;

  if (isOneTime) {
    if (includeInstall && installOneTime > 0) {
      firstMonth = installOneTime;
    } else {
      firstMonth = perVisit;
    }
    contractTotal = firstMonth;
  } else if (frequency === 'twicePerMonth') {
    let monthlyRec = perVisit * mult;
    if (hasSaniClean && twicePerMonthDiscount > 0) {
      monthlyRec = Math.max(0, monthlyRec - twicePerMonthDiscount);
    }
    monthlyRecurring = monthlyRec;

    if (includeInstall && installOneTime > 0) {
      firstMonth = installOneTime + Math.max(mult - 1, 0) * perVisit;
      if (hasSaniClean && twicePerMonthDiscount > 0) {
        firstMonth = Math.max(0, firstMonth - twicePerMonthDiscount);
      }
      contractTotal = firstMonth + Math.max(contractMonths - 1, 0) * monthlyRec;
    } else {
      firstMonth = monthlyRec;
      contractTotal = contractMonths * monthlyRec;
    }
  } else if (frequency === 'weekly' || frequency === 'biweekly') {
    if (includeInstall && installOneTime > 0) {
      firstMonth = installOneTime + Math.max(mult - 1, 0) * perVisit;
      contractTotal = firstMonth + Math.max(contractMonths - 1, 0) * mult * perVisit;
    } else {
      firstMonth = mult * perVisit;
      contractTotal = contractMonths * mult * perVisit;
    }
  } else if (frequency === 'monthly') {
    if (includeInstall && installOneTime > 0) {
      firstMonth = installOneTime;
      contractTotal = firstMonth + Math.max(contractMonths - 1, 0) * perVisit;
    } else {
      firstMonth = perVisit;
      contractTotal = contractMonths * perVisit;
    }
  } else if (isEveryFourWeeks) {
    const totalVisits = Math.round(contractMonths * 1.0833);
    if (includeInstall && installOneTime > 0) {
      firstMonth = installOneTime;
      contractTotal = installOneTime + Math.max(totalVisits - 1, 0) * perVisit;
    } else {
      firstMonth = perVisit;
      contractTotal = totalVisits * perVisit;
    }
  } else {
    // bimonthly, quarterly, biannual, annual
    const totalVisits = Math.round(contractMonths * mult);
    if (includeInstall && installOneTime > 0) {
      firstMonth = installOneTime;
      contractTotal = installOneTime + Math.max(totalVisits - 1, 0) * perVisit;
    } else {
      firstMonth = perVisit;
      contractTotal = totalVisits * perVisit;
    }
  }

  return {perVisit, firstMonth, monthlyRecurring, contractTotal, installOneTime, nonBathPerVisit};
}

export function SaniscrubForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  const freq                   = data?.frequency              ?? 'weekly';
  const qty                    = data?.qty                    ?? 0;
  const rate                   = data?.rate                   ?? cfg.bathroomPricing?.monthly?.ratePerFixture ?? 25;
  const minimumChargePerVisit  = data?.minimumChargePerVisit  ?? cfg.bathroomPricing?.monthly?.minimumCharge ?? 0;
  const applyMinimum           = data?.applyMinimum !== false;

  // Non-bathroom
  const nonBathSqFt            = data?.nonBathSqFt            ?? 0;
  const nonBathFirstRate       = data?.nonBathFirstRate       ?? cfg.nonBathroomSqFtPricingRule?.priceFirstBlock ?? 250;
  const nonBathAdditionalRate  = data?.nonBathAdditionalRate  ?? cfg.nonBathroomSqFtPricingRule?.priceAdditionalBlock ?? 125;
  const nonBathBlockSize       = cfg.nonBathroomSqFtPricingRule?.sqFtBlockUnit ?? 500;
  const useExactSqFt           = data?.useExactSqFt           ?? false;

  // Installation
  const includeInstall         = data?.includeInstall         ?? false;
  const isDirty                = data?.isDirty                ?? false;
  const dirtyMultiplier        = data?.dirtyMultiplier        ?? cfg.installationPricing?.installMultiplierDirtyOrFirstTime ?? 3;
  const cleanMultiplier        = data?.cleanMultiplier        ?? 1;

  // Twice-per-month discount
  const hasSaniClean           = data?.hasSaniClean           ?? false;
  const twicePerMonthDiscount  = cfg.twicePerMonthPricing?.discountFromMonthlyRate ?? 15;

  const totals = calcSaniscrubTotals(
    qty, rate, minimumChargePerVisit, applyMinimum,
    nonBathSqFt, nonBathFirstRate, nonBathAdditionalRate, nonBathBlockSize, useExactSqFt,
    includeInstall, isDirty, dirtyMultiplier, cleanMultiplier,
    hasSaniClean, twicePerMonthDiscount,
    freq, contractMonths,
  );

  const update = useCallback((fields: Record<string, any>) => {
    const nq   = fields.qty                   ?? qty;
    const nr   = fields.rate                  ?? rate;
    const mn   = fields.minimumChargePerVisit ?? minimumChargePerVisit;
    const nf   = fields.frequency             ?? freq;
    const applyMin = (fields.applyMinimum !== undefined ? fields.applyMinimum : data?.applyMinimum) !== false;
    const nSqFt   = fields.nonBathSqFt           ?? nonBathSqFt;
    const nFirst  = fields.nonBathFirstRate       ?? nonBathFirstRate;
    const nAdd    = fields.nonBathAdditionalRate  ?? nonBathAdditionalRate;
    const nExact  = fields.useExactSqFt !== undefined ? fields.useExactSqFt : useExactSqFt;
    const nInst   = fields.includeInstall !== undefined ? fields.includeInstall : includeInstall;
    const nDirty  = fields.isDirty !== undefined ? fields.isDirty : isDirty;
    const nDirtyM = fields.dirtyMultiplier    ?? dirtyMultiplier;
    const nCleanM = fields.cleanMultiplier    ?? cleanMultiplier;
    const nSani   = fields.hasSaniClean !== undefined ? fields.hasSaniClean : hasSaniClean;

    const newTotals = calcSaniscrubTotals(
      nq, nr, mn, applyMin,
      nSqFt, nFirst, nAdd, nonBathBlockSize, nExact,
      nInst, nDirty, nDirtyM, nCleanM,
      nSani, twicePerMonthDiscount,
      nf, contractMonths,
    );

    // Baseline at admin rates (no rate changes)
    const origRate  = cfg.bathroomPricing?.monthly?.ratePerFixture ?? 25;
    const origMin   = cfg.bathroomPricing?.monthly?.minimumCharge ?? 0;
    const origFirst = cfg.nonBathroomSqFtPricingRule?.priceFirstBlock ?? 250;
    const origAdd   = cfg.nonBathroomSqFtPricingRule?.priceAdditionalBlock ?? 125;
    const origDirtyM = cfg.installationPricing?.installMultiplierDirtyOrFirstTime ?? 3;

    const origTotals = calcSaniscrubTotals(
      nq, origRate, origMin, applyMin,
      nSqFt, origFirst, origAdd, nonBathBlockSize, nExact,
      nInst, nDirty, origDirtyM, 1,
      nSani, twicePerMonthDiscount,
      nf, contractMonths,
    );

    onChange({
      serviceId: 'saniscrub',
      displayName: 'SaniScrub',
      isActive: nq > 0 || nSqFt > 0,
      contractMonths,
      ...data,
      ...fields,
      frequency: nf,
      applyMinimum: applyMin,
      perVisit: newTotals.perVisit,
      monthlyRecurring: newTotals.monthlyRecurring,
      contractTotal: newTotals.contractTotal,
      originalContractTotal: origTotals.contractTotal,
    });
  }, [data, freq, qty, rate, minimumChargePerVisit, applyMinimum, nonBathSqFt, nonBathFirstRate, nonBathAdditionalRate, useExactSqFt, includeInstall, isDirty, dirtyMultiplier, cleanMultiplier, hasSaniClean, nonBathBlockSize, twicePerMonthDiscount, contractMonths, onChange, cfg]);

  const rawCost = qty * rate;

  return (
    <ServiceCard
      serviceId="saniscrub"
      displayName="SaniScrub"
      icon="water-outline"
      iconColor="#0ea5e9"
      iconBg="#e0f2fe"
      onRemove={onRemove}
      notes={data?.notes ?? ''}
      onNotesChange={v => update({notes: v})}>
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />
      <CalcRow label="Fixtures" qty={qty} onQtyChange={v => update({qty: v})} rate={rate} onRateChange={v => update({rate: v})} total={rawCost} />
      <NumberRow label="Minimum Per Visit" value={minimumChargePerVisit} onChange={v => update({minimumChargePerVisit: v})} prefix="$" decimals={2} />
      <ToggleRow label="Apply Minimum" value={applyMinimum} onChange={v => update({applyMinimum: v})} subtitle="Use per-visit minimum charge when cost is lower" />
      <FormDivider />
      <NumberRow label="Non-Bathroom Sq Ft" value={nonBathSqFt} onChange={v => update({nonBathSqFt: v})} decimals={0} />
      {nonBathSqFt > 0 && (
        <>
          <NumberRow label="First Block Rate" value={nonBathFirstRate} onChange={v => update({nonBathFirstRate: v})} prefix="$" decimals={2} />
          <NumberRow label="Additional Block Rate" value={nonBathAdditionalRate} onChange={v => update({nonBathAdditionalRate: v})} prefix="$" decimals={2} />
          <ToggleRow label="Exact Sq Ft Calc" value={useExactSqFt} onChange={v => update({useExactSqFt: v})} subtitle="Use exact sq ft instead of block rounding" />
          <View style={styles.readOnlyRow}>
            <Text style={styles.readOnlyLabel}>Non-Bath Cost</Text>
            <Text style={styles.readOnlyValue}>${totals.nonBathPerVisit.toFixed(2)}</Text>
          </View>
        </>
      )}
      <FormDivider />
      <ToggleRow label="Include Install" value={includeInstall} onChange={v => update({includeInstall: v})} subtitle="One-time installation charge" />
      {includeInstall && (
        <>
          <ToggleRow label="Dirty Install" value={isDirty} onChange={v => update({isDirty: v})} subtitle="First-time/dirty multiplier" />
          <NumberRow label="Dirty Multiplier" value={dirtyMultiplier} onChange={v => update({dirtyMultiplier: v})} decimals={1} />
          <View style={styles.readOnlyRow}>
            <Text style={styles.readOnlyLabel}>Installation Total</Text>
            <Text style={styles.readOnlyValue}>${totals.installOneTime.toFixed(2)}</Text>
          </View>
        </>
      )}
      <FormDivider />
      <ToggleRow label="Combined w/ SaniClean" value={hasSaniClean} onChange={v => update({hasSaniClean: v})} subtitle="Apply 2×/month discount" />
      <TotalsBlock
        frequency={freq}
        perVisit={totals.perVisit}
        firstMonth={totals.firstMonth}
        monthlyRecurring={totals.monthlyRecurring}
        contractMonths={contractMonths}
        contractTotal={totals.contractTotal}
      />
    </ServiceCard>
  );
}

const styles = StyleSheet.create({
  readOnlyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  readOnlyLabel: {
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  readOnlyValue: {
    fontSize: FontSize.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
