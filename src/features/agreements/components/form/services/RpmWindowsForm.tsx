import React, {useCallback} from 'react';
import {
  ServiceCard, TotalsBlock, calcTotals,
  FREQ_OPTIONS, DropdownRow, FormDivider, CalcRow,
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

  const freq          = data?.frequency     ?? 'monthly';
  const numWindows    = data?.numWindows    ?? 0;
  const ratePerWindow = data?.ratePerWindow ?? cfg.windowRates?.small ?? 1.5;

  const perVisitBase = numWindows * ratePerWindow;
  const totals = calcTotals(perVisitBase, freq, contractMonths);

  const update = useCallback((fields: Record<string, any>) => {
    const nw = fields.numWindows    ?? numWindows;
    const rw = fields.ratePerWindow ?? ratePerWindow;
    const nf = fields.frequency     ?? freq;
    const newTotals = calcTotals(nw * rw, nf, contractMonths);
    onChange({
      serviceId: 'rpmWindows',
      displayName: 'RPM Windows',
      isActive: nw > 0,
      contractMonths,
      ...data,
      ...fields,
      frequency: nf,
      perVisit: newTotals.perVisit,
      monthlyRecurring: newTotals.monthlyRecurring,
      contractTotal: newTotals.contractTotal,
    });
  }, [data, freq, numWindows, ratePerWindow, contractMonths, onChange]);

  return (
    <ServiceCard serviceId="rpmWindows" displayName="RPM Windows" icon="albums-outline" iconColor="#0369a1" iconBg="#e0f2fe" onRemove={onRemove}>
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />
      <CalcRow label="Windows" qty={numWindows} onQtyChange={v => update({numWindows: v})} rate={ratePerWindow} onRateChange={v => update({ratePerWindow: v})} total={numWindows * ratePerWindow} />
      <TotalsBlock frequency={freq} perVisit={totals.perVisit} firstMonth={totals.firstMonth} monthlyRecurring={totals.monthlyRecurring} contractMonths={contractMonths} contractTotal={totals.contractTotal} />
    </ServiceCard>
  );
}
