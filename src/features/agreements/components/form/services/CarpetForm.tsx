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

export function CarpetForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  const freq               = data?.frequency          ?? 'monthly';
  const areaSqFt           = data?.areaSqFt           ?? 0;
  const firstUnitRate      = data?.firstUnitRate      ?? (cfg.basePrice ? cfg.basePrice / 500 : 0.5);
  const additionalUnitRate = data?.additionalUnitRate ?? (cfg.additionalUnitPrice ? cfg.additionalUnitPrice / 500 : 0.25);
  const perVisitMinimum    = data?.perVisitMinimum    ?? cfg.minimumChargePerVisit ?? 250;
  const applyMinimum       = data?.applyMinimum !== false;

  const FIRST_UNIT = 500;
  const rawCost = areaSqFt <= FIRST_UNIT
    ? areaSqFt * firstUnitRate
    : FIRST_UNIT * firstUnitRate + (areaSqFt - FIRST_UNIT) * additionalUnitRate;
  const perVisitBase = applyMinimum ? Math.max(rawCost, perVisitMinimum) : rawCost;
  const totals = calcTotals(perVisitBase, freq, contractMonths);

  const update = useCallback((fields: Record<string, any>) => {
    const na = fields.areaSqFt           ?? areaSqFt;
    const fr = fields.firstUnitRate      ?? firstUnitRate;
    const ar = fields.additionalUnitRate ?? additionalUnitRate;
    const mn = fields.perVisitMinimum    ?? perVisitMinimum;
    const nf = fields.frequency          ?? freq;
    const applyMin = (fields.applyMinimum !== undefined ? fields.applyMinimum : data?.applyMinimum) !== false;
    const raw = na <= FIRST_UNIT ? na * fr : FIRST_UNIT * fr + (na - FIRST_UNIT) * ar;
    const newTotals = calcTotals(applyMin ? Math.max(raw, mn) : raw, nf, contractMonths);
    const origFirstRate = cfg.basePrice ? cfg.basePrice / 500 : 0.5;
    const origAdditionalRate = cfg.additionalUnitPrice ? cfg.additionalUnitPrice / 500 : 0.25;
    const origMin = cfg.minimumChargePerVisit ?? 250;
    const origRaw = na <= FIRST_UNIT ? na * origFirstRate : FIRST_UNIT * origFirstRate + (na - FIRST_UNIT) * origAdditionalRate;
    const originalPerVisitBase = applyMin ? Math.max(origRaw, origMin) : origRaw;
    const originalContractTotal = calcTotals(originalPerVisitBase, nf, contractMonths).contractTotal;
    onChange({
      serviceId: 'carpetclean',
      displayName: 'Carpet Cleaning',
      isActive: na > 0,
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
  }, [data, freq, areaSqFt, firstUnitRate, additionalUnitRate, perVisitMinimum, applyMinimum, contractMonths, onChange]);

  return (
    <ServiceCard serviceId="carpetclean" displayName="Carpet Cleaning" icon="grid-outline" iconColor="#92400e" iconBg="#fef3c7" onRemove={onRemove}>
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />
      <NumberRow label="Area (sq ft)" value={areaSqFt} onChange={v => update({areaSqFt: v})} suffix="sq ft" decimals={0} />
      <NumberRow label="First 500 sq ft Rate" value={firstUnitRate} onChange={v => update({firstUnitRate: v})} prefix="$" decimals={4} />
      <NumberRow label="Additional Rate (per sq ft)" value={additionalUnitRate} onChange={v => update({additionalUnitRate: v})} prefix="$" decimals={4} />
      <NumberRow label="Per Visit Minimum" value={perVisitMinimum} onChange={v => update({perVisitMinimum: v})} prefix="$" decimals={2} />
      <ToggleRow label="Apply Minimum" value={applyMinimum} onChange={v => update({applyMinimum: v})} subtitle="Use per-visit minimum charge when cost is lower" />
      <TotalsBlock frequency={freq} perVisit={totals.perVisit} firstMonth={totals.firstMonth} monthlyRecurring={totals.monthlyRecurring} contractMonths={contractMonths} contractTotal={totals.contractTotal} />
    </ServiceCard>
  );
}
