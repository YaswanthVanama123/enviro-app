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

export function SanicleanForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  const freq          = data?.frequency        ?? 'weekly';
  const sinks         = data?.sinks            ?? 0;
  const urinals       = data?.urinals          ?? 0;
  const maleToilets   = data?.maleToilets      ?? 0;
  const femaleToilets = data?.femaleToilets    ?? 0;
  const fixtureRate   = cfg.geographicPricing?.insideBeltway?.ratePerFixture ?? 7;
  const sinkRate      = data?.sinkRate         ?? fixtureRate;
  const urinalRate    = data?.urinalRate       ?? fixtureRate;
  const maleRate      = data?.maleRate         ?? fixtureRate;
  const femaleRate    = data?.femaleRate       ?? fixtureRate;

  const perVisitBase =
    sinks * sinkRate +
    urinals * urinalRate +
    maleToilets * maleRate +
    femaleToilets * femaleRate;

  const totals = calcTotals(perVisitBase, freq, contractMonths);

  const update = useCallback((fields: Record<string, any>) => {
    const nf  = fields.frequency      ?? freq;
    const ns  = fields.sinks          ?? sinks;
    const nu  = fields.urinals        ?? urinals;
    const nm  = fields.maleToilets    ?? maleToilets;
    const nfe = fields.femaleToilets  ?? femaleToilets;
    const nsr = fields.sinkRate       ?? sinkRate;
    const nur = fields.urinalRate     ?? urinalRate;
    const nmr = fields.maleRate       ?? maleRate;
    const nfr = fields.femaleRate     ?? femaleRate;
    const newBase = ns * nsr + nu * nur + nm * nmr + nfe * nfr;
    const newTotals = calcTotals(newBase, nf, contractMonths);
    onChange({
      serviceId: 'saniclean',
      displayName: 'Saniclean',
      isActive: true,
      contractMonths,
      ...data,
      ...fields,
      frequency: nf,
      perVisit: newTotals.perVisit,
      monthlyRecurring: newTotals.monthlyRecurring,
      contractTotal: newTotals.contractTotal,
    });
  }, [data, freq, sinks, urinals, maleToilets, femaleToilets, sinkRate, urinalRate, maleRate, femaleRate, contractMonths, onChange]);

  return (
    <ServiceCard
      serviceId="saniclean"
      displayName="Saniclean"
      icon="shield-checkmark-outline"
      iconColor="#7c3aed"
      iconBg="#ede9fe"
      onRemove={onRemove}>
      <DropdownRow
        label="Frequency"
        value={freq}
        options={FREQ_OPTIONS}
        onChange={v => update({frequency: v})}
      />
      <FormDivider />
      <CalcRow
        label="Sinks"
        qty={sinks}
        onQtyChange={v => update({sinks: v})}
        rate={sinkRate}
        onRateChange={v => update({sinkRate: v})}
        total={sinks * sinkRate}
      />
      <CalcRow
        label="Urinals"
        qty={urinals}
        onQtyChange={v => update({urinals: v})}
        rate={urinalRate}
        onRateChange={v => update({urinalRate: v})}
        total={urinals * urinalRate}
      />
      <CalcRow
        label="Male Toilets"
        qty={maleToilets}
        onQtyChange={v => update({maleToilets: v})}
        rate={maleRate}
        onRateChange={v => update({maleRate: v})}
        total={maleToilets * maleRate}
      />
      <CalcRow
        label="Female Toilets"
        qty={femaleToilets}
        onQtyChange={v => update({femaleToilets: v})}
        rate={femaleRate}
        onRateChange={v => update({femaleRate: v})}
        total={femaleToilets * femaleRate}
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
