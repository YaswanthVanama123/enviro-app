import React, {useCallback} from 'react';
import {
  ServiceCard, TotalsBlock, calcTotals,
  FREQ_OPTIONS, DropdownRow, FormDivider, NumberRow,
} from './ServiceBase';

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
}

export function CarpetForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  const freq               = data?.frequency          ?? 'monthly';
  const areaSqFt           = data?.areaSqFt           ?? 0;
  const firstUnitRate      = data?.firstUnitRate      ?? (cfg.basePrice ? cfg.basePrice / 500 : 0.5);
  const additionalUnitRate = data?.additionalUnitRate ?? (cfg.additionalUnitPrice ? cfg.additionalUnitPrice / 500 : 0.25);
  const perVisitMinimum    = data?.perVisitMinimum    ?? cfg.minimumChargePerVisit ?? 250;

  const FIRST_UNIT = 500;
  const rawCost = areaSqFt <= FIRST_UNIT
    ? areaSqFt * firstUnitRate
    : FIRST_UNIT * firstUnitRate + (areaSqFt - FIRST_UNIT) * additionalUnitRate;
  const perVisitBase = Math.max(rawCost, perVisitMinimum);
  const totals = calcTotals(perVisitBase, freq, contractMonths);

  const update = useCallback((fields: Record<string, any>) => {
    const na = fields.areaSqFt           ?? areaSqFt;
    const fr = fields.firstUnitRate      ?? firstUnitRate;
    const ar = fields.additionalUnitRate ?? additionalUnitRate;
    const mn = fields.perVisitMinimum    ?? perVisitMinimum;
    const nf = fields.frequency          ?? freq;
    const raw = na <= FIRST_UNIT ? na * fr : FIRST_UNIT * fr + (na - FIRST_UNIT) * ar;
    const newTotals = calcTotals(Math.max(raw, mn), nf, contractMonths);
    onChange({
      serviceId: 'carpetclean',
      displayName: 'Carpet Cleaning',
      isActive: na > 0,
      contractMonths,
      ...data,
      ...fields,
      frequency: nf,
      perVisit: newTotals.perVisit,
      monthlyRecurring: newTotals.monthlyRecurring,
      contractTotal: newTotals.contractTotal,
    });
  }, [data, freq, areaSqFt, firstUnitRate, additionalUnitRate, perVisitMinimum, contractMonths, onChange]);

  return (
    <ServiceCard serviceId="carpetclean" displayName="Carpet Cleaning" icon="grid-outline" iconColor="#92400e" iconBg="#fef3c7" onRemove={onRemove}>
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />
      <NumberRow label="Area (sq ft)" value={areaSqFt} onChange={v => update({areaSqFt: v})} suffix="sq ft" decimals={0} />
      <NumberRow label="First 500 sq ft Rate ($)" value={firstUnitRate} onChange={v => update({firstUnitRate: v})} prefix="$" decimals={4} />
      <NumberRow label="Additional Rate ($/sq ft)" value={additionalUnitRate} onChange={v => update({additionalUnitRate: v})} prefix="$" decimals={4} />
      <NumberRow label="Per Visit Minimum ($)" value={perVisitMinimum} onChange={v => update({perVisitMinimum: v})} prefix="$" decimals={2} />
      <TotalsBlock frequency={freq} perVisit={totals.perVisit} firstMonth={totals.firstMonth} monthlyRecurring={totals.monthlyRecurring} contractMonths={contractMonths} contractTotal={totals.contractTotal} />
    </ServiceCard>
  );
}
