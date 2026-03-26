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

export function SanicleanForm({data, onChange, contractMonths, onRemove, pricingConfig}: Props) {
  const cfg = pricingConfig?.config ?? {};

  const freq                  = data?.frequency             ?? 'weekly';
  const sinks                 = data?.sinks                 ?? 0;
  const urinals               = data?.urinals               ?? 0;
  const maleToilets           = data?.maleToilets           ?? 0;
  const femaleToilets         = data?.femaleToilets         ?? 0;
  const fixtureRate           = cfg.geographicPricing?.insideBeltway?.ratePerFixture ?? 7;
  const sinkRate              = data?.sinkRate              ?? fixtureRate;
  const urinalRate            = data?.urinalRate            ?? fixtureRate;
  const maleRate              = data?.maleRate              ?? fixtureRate;
  const femaleRate            = data?.femaleRate            ?? fixtureRate;
  const minimumChargePerVisit = data?.minimumChargePerVisit ?? cfg.smallBathroomMinimums?.minimumPriceUnderThreshold ?? 0;
  const applyMinimum          = data?.applyMinimum !== false;

  const rawCost =
    sinks * sinkRate +
    urinals * urinalRate +
    maleToilets * maleRate +
    femaleToilets * femaleRate;

  const perVisitBase = applyMinimum && minimumChargePerVisit > 0 ? Math.max(rawCost, minimumChargePerVisit) : rawCost;
  const totals = calcTotals(perVisitBase, freq, contractMonths);

  const update = useCallback((fields: Record<string, any>) => {
    const nf  = fields.frequency             ?? freq;
    const ns  = fields.sinks                 ?? sinks;
    const nu  = fields.urinals               ?? urinals;
    const nm  = fields.maleToilets           ?? maleToilets;
    const nfe = fields.femaleToilets         ?? femaleToilets;
    const nsr = fields.sinkRate              ?? sinkRate;
    const nur = fields.urinalRate            ?? urinalRate;
    const nmr = fields.maleRate              ?? maleRate;
    const nfr = fields.femaleRate            ?? femaleRate;
    const mn  = fields.minimumChargePerVisit ?? minimumChargePerVisit;
    const applyMin = (fields.applyMinimum !== undefined ? fields.applyMinimum : data?.applyMinimum) !== false;
    const raw      = ns * nsr + nu * nur + nm * nmr + nfe * nfr;
    const newBase  = applyMin && mn > 0 ? Math.max(raw, mn) : raw;
    const newTotals = calcTotals(newBase, nf, contractMonths);
    const origRate  = cfg.geographicPricing?.insideBeltway?.ratePerFixture ?? 7;
    const origMin   = cfg.smallBathroomMinimums?.minimumPriceUnderThreshold ?? 0;
    const origRaw   = ns * origRate + nu * origRate + nm * origRate + nfe * origRate;
    const originalPerVisitBase = applyMin && origMin > 0 ? Math.max(origRaw, origMin) : origRaw;
    const originalContractTotal = calcTotals(originalPerVisitBase, nf, contractMonths).contractTotal;
    onChange({
      serviceId: 'saniclean',
      displayName: 'Saniclean',
      isActive: true,
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
  }, [data, freq, sinks, urinals, maleToilets, femaleToilets, sinkRate, urinalRate, maleRate, femaleRate, minimumChargePerVisit, applyMinimum, contractMonths, onChange]);

  return (
    <ServiceCard
      serviceId="saniclean"
      displayName="Saniclean"
      icon="shield-checkmark-outline"
      iconColor="#7c3aed"
      iconBg="#ede9fe"
      onRemove={onRemove}>
      <DropdownRow label="Frequency" value={freq} options={FREQ_OPTIONS} onChange={v => update({frequency: v})} />
      <FormDivider />
      <CalcRow label="Sinks"          qty={sinks}         onQtyChange={v => update({sinks: v})}         rate={sinkRate}    onRateChange={v => update({sinkRate: v})}    total={sinks * sinkRate} />
      <CalcRow label="Urinals"        qty={urinals}       onQtyChange={v => update({urinals: v})}       rate={urinalRate}  onRateChange={v => update({urinalRate: v})}  total={urinals * urinalRate} />
      <CalcRow label="Male Toilets"   qty={maleToilets}   onQtyChange={v => update({maleToilets: v})}   rate={maleRate}    onRateChange={v => update({maleRate: v})}    total={maleToilets * maleRate} />
      <CalcRow label="Female Toilets" qty={femaleToilets} onQtyChange={v => update({femaleToilets: v})} rate={femaleRate}  onRateChange={v => update({femaleRate: v})}  total={femaleToilets * femaleRate} />
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
