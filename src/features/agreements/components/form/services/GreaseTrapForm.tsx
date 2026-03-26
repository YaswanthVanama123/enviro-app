import React, {useCallback} from 'react';
import {
  ServiceCard, TotalsBlock, calcTotals,
  FREQ_OPTIONS, DropdownRow, FormDivider, CalcRow, NumberRow,
} from './ServiceBase';

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
}

export function GreaseTrapForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  const freq          = data?.frequency    ?? 'monthly';
  const numberOfTraps = data?.numberOfTraps ?? 0;
  const sizeOfTraps   = data?.sizeOfTraps   ?? 0;
  const perTrapRate   = data?.perTrapRate   ?? cfg.perTrapRate   ?? 50;
  const perGallonRate = data?.perGallonRate ?? cfg.perGallonRate ?? 2;

  const perVisitBase = numberOfTraps * perTrapRate + sizeOfTraps * perGallonRate;
  const totals = calcTotals(perVisitBase, freq, contractMonths);

  const update = useCallback((fields: Record<string, any>) => {
    const nt = fields.numberOfTraps ?? numberOfTraps;
    const st = fields.sizeOfTraps   ?? sizeOfTraps;
    const pt = fields.perTrapRate   ?? perTrapRate;
    const pg = fields.perGallonRate ?? perGallonRate;
    const nf = fields.frequency     ?? freq;
    const newTotals = calcTotals(nt * pt + st * pg, nf, contractMonths);
    const origPt = cfg.perTrapRate   ?? 50;
    const origPg = cfg.perGallonRate ?? 2;
    const originalPerVisitBase = nt * origPt + st * origPg;
    const originalContractTotal = calcTotals(originalPerVisitBase, nf, contractMonths).contractTotal;
    onChange({
      serviceId: 'greaseTrap',
      displayName: 'Grease Trap',
      isActive: nt > 0,
      contractMonths,
      ...data,
      ...fields,
      frequency: nf,
      perVisit: newTotals.perVisit,
      monthlyRecurring: newTotals.monthlyRecurring,
      contractTotal: newTotals.contractTotal,
      originalContractTotal,
    });
  }, [data, freq, numberOfTraps, sizeOfTraps, perTrapRate, perGallonRate, contractMonths, onChange]);

  return (
    <ServiceCard serviceId="greaseTrap" displayName="Grease Trap" icon="trash-bin-outline" iconColor="#d97706" iconBg="#fef3c7" onRemove={onRemove}>
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />
      <CalcRow label="Number of Traps" qty={numberOfTraps} onQtyChange={v => update({numberOfTraps: v})} rate={perTrapRate} onRateChange={v => update({perTrapRate: v})} total={numberOfTraps * perTrapRate} />
      <NumberRow label="Trap Size (gallons)" value={sizeOfTraps} onChange={v => update({sizeOfTraps: v})} decimals={0} />
      <NumberRow label="Rate per Gallon" value={perGallonRate} onChange={v => update({perGallonRate: v})} prefix="$" decimals={4} />
      <TotalsBlock frequency={freq} perVisit={totals.perVisit} firstMonth={totals.firstMonth} monthlyRecurring={totals.monthlyRecurring} contractMonths={contractMonths} contractTotal={totals.contractTotal} />
    </ServiceCard>
  );
}
