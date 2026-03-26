import React, {useCallback} from 'react';
import {
  ServiceCard, TotalsBlock, calcTotals,
  FREQ_OPTIONS, DropdownRow, FormDivider, NumberRow, ToggleRow,
} from './ServiceBase';

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
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

  const unitRate = freq === 'biweekly' ? altWeeklyRatePerUnit : weeklyRatePerUnit;
  const perVisitBase =
    podQuantity * unitRate +
    (isStandalone ? standaloneExtraWeekly : 0) +
    extraBagsPerWeek * extraBagPrice;

  const totals = calcTotals(perVisitBase, freq, contractMonths);

  const update = useCallback((fields: Record<string, any>) => {
    const nf  = fields.frequency ?? freq;
    const nq  = fields.podQuantity ?? podQuantity;
    const wr  = fields.weeklyRatePerUnit ?? weeklyRatePerUnit;
    const ar  = fields.altWeeklyRatePerUnit ?? altWeeklyRatePerUnit;
    const sa  = fields.isStandalone ?? isStandalone;
    const se  = fields.standaloneExtraWeeklyCharge ?? standaloneExtraWeekly;
    const eb  = fields.extraBagsPerWeek ?? extraBagsPerWeek;
    const ebp = fields.extraBagPrice ?? extraBagPrice;
    const nr  = nf === 'biweekly' ? ar : wr;
    const newBase = nq * nr + (sa ? se : 0) + eb * ebp;
    const newTotals = calcTotals(newBase, nf, contractMonths);
    const origWr  = cfg.weeklyRatePerUnit            ?? 3;
    const origAr  = cfg.altWeeklyRatePerUnit         ?? 8;
    const origSe  = cfg.standaloneExtraWeeklyCharge  ?? 40;
    const origEbp = cfg.extraBagPrice                ?? 2;
    const origNr  = nf === 'biweekly' ? origAr : origWr;
    const originalPerVisitBase = nq * origNr + (sa ? origSe : 0) + eb * origEbp;
    const originalContractTotal = calcTotals(originalPerVisitBase, nf, contractMonths).contractTotal;
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
      originalContractTotal,
    });
  }, [data, freq, podQuantity, weeklyRatePerUnit, altWeeklyRatePerUnit, isStandalone, standaloneExtraWeekly, extraBagsPerWeek, extraBagPrice, contractMonths, onChange]);

  return (
    <ServiceCard serviceId="sanipod" displayName="SaniPod" icon="cube-outline" iconColor="#7c3aed" iconBg="#ede9fe" onRemove={onRemove}>
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />
      <NumberRow label="Pod Quantity" value={podQuantity} onChange={v => update({podQuantity: v})} decimals={0} />
      <NumberRow label="Weekly Rate / Unit ($)" value={weeklyRatePerUnit} onChange={v => update({weeklyRatePerUnit: v})} prefix="$" decimals={2} />
      <NumberRow label="Alt Weekly Rate / Unit ($)" value={altWeeklyRatePerUnit} onChange={v => update({altWeeklyRatePerUnit: v})} prefix="$" decimals={2} />
      <NumberRow label="Extra Bags / Week" value={extraBagsPerWeek} onChange={v => update({extraBagsPerWeek: v})} decimals={0} />
      <ToggleRow label="Standalone Service" value={isStandalone} onChange={v => update({isStandalone: v})} subtitle="Charge standalone extra fee" />
      {isStandalone && (
        <NumberRow label="Standalone Extra / Week ($)" value={standaloneExtraWeekly} onChange={v => update({standaloneExtraWeeklyCharge: v})} prefix="$" decimals={2} />
      )}
      <TotalsBlock frequency={freq} perVisit={totals.perVisit} firstMonth={totals.firstMonth} monthlyRecurring={totals.monthlyRecurring} contractMonths={contractMonths} contractTotal={totals.contractTotal} />
    </ServiceCard>
  );
}
