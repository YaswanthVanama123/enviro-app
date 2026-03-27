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

export function MicrofiberMoppingForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  const freq                  = data?.frequency             ?? 'weekly';
  const qty                   = data?.qty                   ?? 0;
  const rate                  = data?.rate                  ?? cfg.includedBathroomRate ?? 10;
  const minimumChargePerVisit = data?.minimumChargePerVisit ?? cfg.minimumChargePerVisit ?? 0;
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
    const origRate  = cfg.includedBathroomRate ?? 10;
    const origMin   = cfg.minimumChargePerVisit ?? 0;
    const origRaw   = nq * origRate;
    const originalPerVisitBase = applyMin && origMin > 0 ? Math.max(origRaw, origMin) : origRaw;
    const originalContractTotal = calcTotals(originalPerVisitBase, nf, contractMonths).contractTotal;
    onChange({
      serviceId: 'microfiberMopping',
      displayName: 'Microfiber Mopping',
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
    <ServiceCard serviceId="microfiberMopping" displayName="Microfiber Mopping" icon="brush-outline" iconColor="#2563eb" iconBg="#dbeafe" onRemove={onRemove} notes={data?.notes ?? ''} onNotesChange={v => update({notes: v})}>
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />
      <CalcRow label="Locations" qty={qty} onQtyChange={v => update({qty: v})} rate={rate} onRateChange={v => update({rate: v})} total={rawCost} />
      <NumberRow label="Minimum Per Visit" value={minimumChargePerVisit} onChange={v => update({minimumChargePerVisit: v})} prefix="$" decimals={2} />
      <ToggleRow label="Apply Minimum" value={applyMinimum} onChange={v => update({applyMinimum: v})} subtitle="Use per-visit minimum charge when cost is lower" />
      <TotalsBlock frequency={freq} perVisit={totals.perVisit} firstMonth={totals.firstMonth} monthlyRecurring={totals.monthlyRecurring} contractMonths={contractMonths} contractTotal={totals.contractTotal} />
    </ServiceCard>
  );
}
