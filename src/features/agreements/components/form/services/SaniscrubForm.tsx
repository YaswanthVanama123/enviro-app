import React, {useCallback} from 'react';
import {
  ServiceCard, TotalsBlock, calcTotals,
  FREQ_OPTIONS, DropdownRow, FormDivider, CalcRow, NumberRow, ToggleRow,
} from './ServiceBase';

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
}

export function SaniscrubForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  const freq                  = data?.frequency             ?? 'weekly';
  const qty                   = data?.qty                   ?? 0;
  const rate                  = data?.rate                  ?? cfg.bathroomPricing?.monthly?.ratePerFixture ?? 25;
  const minimumChargePerVisit = data?.minimumChargePerVisit ?? cfg.bathroomPricing?.monthly?.minimumCharge ?? 0;
  const applyMinimum          = data?.applyMinimum !== false;

  const rawCost      = qty * rate;
  const perVisitBase = applyMinimum && minimumChargePerVisit > 0 ? Math.max(rawCost, minimumChargePerVisit) : rawCost;
  const totals = calcTotals(perVisitBase, freq, contractMonths);

  const update = useCallback((fields: Record<string, any>) => {
    const nq = fields.qty                   ?? qty;
    const nr = fields.rate                  ?? rate;
    const mn = fields.minimumChargePerVisit ?? minimumChargePerVisit;
    const nf = fields.frequency             ?? freq;
    const applyMin = (fields.applyMinimum !== undefined ? fields.applyMinimum : data?.applyMinimum) !== false;
    const raw      = nq * nr;
    const newBase  = applyMin && mn > 0 ? Math.max(raw, mn) : raw;
    const newTotals = calcTotals(newBase, nf, contractMonths);
    const origRate  = cfg.bathroomPricing?.monthly?.ratePerFixture ?? 25;
    const origMin   = cfg.bathroomPricing?.monthly?.minimumCharge ?? 0;
    const origRaw   = nq * origRate;
    const originalPerVisitBase = applyMin && origMin > 0 ? Math.max(origRaw, origMin) : origRaw;
    const originalContractTotal = calcTotals(originalPerVisitBase, nf, contractMonths).contractTotal;
    onChange({
      serviceId: 'saniscrub',
      displayName: 'SaniScrub',
      isActive: nq > 0,
      contractMonths,
      ...data,
      ...fields,
      frequency: nf,
      applyMinimum: applyMin,
      perVisit: newTotals.perVisit,
      monthlyRecurring: newTotals.monthlyRecurring,
      contractTotal: newTotals.contractTotal,
      originalContractTotal,
    });
  }, [data, freq, qty, rate, minimumChargePerVisit, applyMinimum, contractMonths, onChange]);

  return (
    <ServiceCard
      serviceId="saniscrub"
      displayName="SaniScrub"
      icon="water-outline"
      iconColor="#0ea5e9"
      iconBg="#e0f2fe"
      onRemove={onRemove}>
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />
      <CalcRow label="Units" qty={qty} onQtyChange={v => update({qty: v})} rate={rate} onRateChange={v => update({rate: v})} total={rawCost} />
      <NumberRow label="Minimum Per Visit" value={minimumChargePerVisit} onChange={v => update({minimumChargePerVisit: v})} prefix="$" decimals={2} />
      <ToggleRow label="Apply Minimum" value={applyMinimum} onChange={v => update({applyMinimum: v})} subtitle="Use per-visit minimum charge when cost is lower" />
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
