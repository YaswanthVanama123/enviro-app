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

export function RpmWindowsForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  const freq                   = data?.frequency              ?? 'monthly';
  const numWindows             = data?.numWindows             ?? 0;
  const ratePerWindow          = data?.ratePerWindow          ?? cfg.windowRates?.small ?? 1.5;
  const minimumChargePerVisit  = data?.minimumChargePerVisit  ?? cfg.minimumChargePerVisit ?? 0;
  const applyMinimum           = data?.applyMinimum !== false;

  const rawCost     = numWindows * ratePerWindow;
  const perVisitBase = applyMinimum && minimumChargePerVisit > 0 ? Math.max(rawCost, minimumChargePerVisit) : rawCost;
  const totals = calcTotals(perVisitBase, freq, contractMonths);

  const update = useCallback((fields: Record<string, any>) => {
    const nw  = fields.numWindows            ?? numWindows;
    const rw  = fields.ratePerWindow         ?? ratePerWindow;
    const mn  = fields.minimumChargePerVisit ?? minimumChargePerVisit;
    const nf  = fields.frequency             ?? freq;
    const applyMin = (fields.applyMinimum !== undefined ? fields.applyMinimum : data?.applyMinimum) !== false;
    const raw      = nw * rw;
    const newBase  = applyMin && mn > 0 ? Math.max(raw, mn) : raw;
    const newTotals = calcTotals(newBase, nf, contractMonths);
    const origRate  = cfg.windowRates?.small ?? 1.5;
    const origMin   = cfg.minimumChargePerVisit ?? 0;
    const origRaw   = nw * origRate;
    const originalPerVisitBase = applyMin && origMin > 0 ? Math.max(origRaw, origMin) : origRaw;
    const originalContractTotal = calcTotals(originalPerVisitBase, nf, contractMonths).contractTotal;
    onChange({
      serviceId: 'rpmWindows',
      displayName: 'RPM Windows',
      isActive: nw > 0,
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
  }, [data, freq, numWindows, ratePerWindow, minimumChargePerVisit, applyMinimum, contractMonths, onChange]);

  return (
    <ServiceCard serviceId="rpmWindows" displayName="RPM Windows" icon="albums-outline" iconColor="#0369a1" iconBg="#e0f2fe" onRemove={onRemove} notes={data?.notes ?? ''} onNotesChange={v => update({notes: v})}>
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />
      <CalcRow label="Windows" qty={numWindows} onQtyChange={v => update({numWindows: v})} rate={ratePerWindow} onRateChange={v => update({ratePerWindow: v})} total={rawCost} />
      <NumberRow label="Minimum Per Visit" value={minimumChargePerVisit} onChange={v => update({minimumChargePerVisit: v})} prefix="$" decimals={2} />
      <ToggleRow label="Apply Minimum" value={applyMinimum} onChange={v => update({applyMinimum: v})} subtitle="Use per-visit minimum charge when cost is lower" />
      <TotalsBlock frequency={freq} perVisit={totals.perVisit} firstMonth={totals.firstMonth} monthlyRecurring={totals.monthlyRecurring} contractMonths={contractMonths} contractTotal={totals.contractTotal} />
    </ServiceCard>
  );
}
