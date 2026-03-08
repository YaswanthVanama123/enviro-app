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

export function SaniscrubForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  const freq = data?.frequency ?? 'weekly';
  const qty  = data?.qty  ?? 0;
  const rate = data?.rate ?? cfg.bathroomPricing?.monthly?.ratePerFixture ?? 25;

  const perVisitBase = qty * rate;
  const totals = calcTotals(perVisitBase, freq, contractMonths);

  const update = useCallback((fields: Record<string, any>) => {
    const nq = fields.qty  ?? qty;
    const nr = fields.rate ?? rate;
    const nf = fields.frequency ?? freq;
    const newTotals = calcTotals(nq * nr, nf, contractMonths);
    onChange({
      serviceId: 'saniscrub',
      displayName: 'SaniScrub',
      isActive: nq > 0,
      contractMonths,
      ...data,
      ...fields,
      frequency: nf,
      perVisit: newTotals.perVisit,
      monthlyRecurring: newTotals.monthlyRecurring,
      contractTotal: newTotals.contractTotal,
    });
  }, [data, freq, qty, rate, contractMonths, onChange]);

  return (
    <ServiceCard
      serviceId="saniscrub"
      displayName="SaniScrub"
      icon="water-outline"
      iconColor="#0ea5e9"
      iconBg="#e0f2fe"
      onRemove={onRemove}>
      <DropdownRow
        label="Frequency"
        value={freq}
        options={FREQ_OPTIONS}
        onChange={v => update({frequency: v})}
      />
      <FormDivider />
      <CalcRow
        label="Units"
        qty={qty}
        onQtyChange={v => update({qty: v})}
        rate={rate}
        onRateChange={v => update({rate: v})}
        total={qty * rate}
      />
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
