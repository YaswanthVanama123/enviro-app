import React, {useCallback} from 'react';
import {
  ServiceCard, TotalsBlock, calcTotals,
  FREQ_OPTIONS, DropdownRow, FormDivider, CalcRow, ToggleRow,
} from './ServiceBase';

interface Props {
  data: any;
  onChange: (data: any) => void;
  contractMonths: number;
  onRemove: () => void;
  pricingConfig?: any;
}

export function FoamingDrainForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  const freq               = data?.frequency          ?? 'weekly';
  const standardDrainCount = data?.standardDrainCount ?? 0;
  const greaseTrapCount    = data?.greaseTrapCount    ?? 0;
  const greenDrainCount    = data?.greenDrainCount    ?? 0;
  const standardDrainRate  = data?.standardDrainRate  ?? cfg.standardDrainRate      ?? 10;
  const greaseWeeklyRate   = data?.greaseWeeklyRate   ?? cfg.greaseTrapWeeklyRate   ?? 125;
  const greenWeeklyRate    = data?.greenWeeklyRate    ?? cfg.greenDrainWeeklyRate   ?? 5;
  const needsPlumbing      = data?.needsPlumbing      ?? false;
  const plumbingDrainCount = data?.plumbingDrainCount ?? 0;
  const plumbingAddonRate  = data?.plumbingAddonRate  ?? cfg.plumbingAddonRate      ?? 10;

  const perVisitBase =
    standardDrainCount * standardDrainRate +
    greaseTrapCount    * greaseWeeklyRate   +
    greenDrainCount    * greenWeeklyRate    +
    (needsPlumbing ? plumbingDrainCount * plumbingAddonRate : 0);

  const totals = calcTotals(perVisitBase, freq, contractMonths);

  const update = useCallback((fields: Record<string, any>) => {
    const sd  = fields.standardDrainCount ?? standardDrainCount;
    const gt  = fields.greaseTrapCount    ?? greaseTrapCount;
    const gn  = fields.greenDrainCount    ?? greenDrainCount;
    const np  = fields.needsPlumbing      ?? needsPlumbing;
    const pd  = fields.plumbingDrainCount ?? plumbingDrainCount;
    const sdr = fields.standardDrainRate  ?? standardDrainRate;
    const gwr = fields.greaseWeeklyRate   ?? greaseWeeklyRate;
    const gnr = fields.greenWeeklyRate    ?? greenWeeklyRate;
    const par = fields.plumbingAddonRate  ?? plumbingAddonRate;
    const nf  = fields.frequency          ?? freq;
    const newBase = sd * sdr + gt * gwr + gn * gnr + (np ? pd * par : 0);
    const newTotals = calcTotals(newBase, nf, contractMonths);
    onChange({
      serviceId: 'foamingDrain',
      displayName: 'Foaming Drain',
      isActive: sd > 0 || gt > 0 || gn > 0,
      contractMonths,
      ...data,
      ...fields,
      frequency: nf,
      perVisit: newTotals.perVisit,
      monthlyRecurring: newTotals.monthlyRecurring,
      contractTotal: newTotals.contractTotal,
    });
  }, [data, freq, standardDrainCount, greaseTrapCount, greenDrainCount, standardDrainRate, greaseWeeklyRate, greenWeeklyRate, needsPlumbing, plumbingDrainCount, plumbingAddonRate, contractMonths, onChange]);

  return (
    <ServiceCard
      serviceId="foamingDrain"
      displayName="Foaming Drain"
      icon="flask-outline"
      iconColor="#10b981"
      iconBg="#d1fae5"
      onRemove={onRemove}>
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />
      <CalcRow label="Standard Drains" qty={standardDrainCount} onQtyChange={v => update({standardDrainCount: v})} rate={standardDrainRate} onRateChange={v => update({standardDrainRate: v})} total={standardDrainCount * standardDrainRate} />
      <CalcRow label="Grease Drains"   qty={greaseTrapCount}    onQtyChange={v => update({greaseTrapCount: v})}    rate={greaseWeeklyRate}   onRateChange={v => update({greaseWeeklyRate: v})}   total={greaseTrapCount * greaseWeeklyRate} />
      <CalcRow label="Green Drains"    qty={greenDrainCount}    onQtyChange={v => update({greenDrainCount: v})}    rate={greenWeeklyRate}    onRateChange={v => update({greenWeeklyRate: v})}    total={greenDrainCount * greenWeeklyRate} />
      <ToggleRow label="Extra Plumbing" value={needsPlumbing} onChange={v => update({needsPlumbing: v})} subtitle="Add plumbing drain add-on" />
      {needsPlumbing && (
        <CalcRow label="Plumbing Drains" qty={plumbingDrainCount} onQtyChange={v => update({plumbingDrainCount: v})} rate={plumbingAddonRate} onRateChange={v => update({plumbingAddonRate: v})} total={plumbingDrainCount * plumbingAddonRate} />
      )}
      <TotalsBlock frequency={freq} perVisit={totals.perVisit} firstMonth={totals.firstMonth} monthlyRecurring={totals.monthlyRecurring} contractMonths={contractMonths} contractTotal={totals.contractTotal} />
    </ServiceCard>
  );
}
