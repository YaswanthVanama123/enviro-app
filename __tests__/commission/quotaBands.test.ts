import {computeQuotaTierPortions} from '../../src/features/agreements/hooks/useServiceCommission';

const RATES = {below: 3, above: 6, double: 9};
const portion = (
  prior: number,
  agreementQuotaCredit: number,
  quotaTarget: number,
  level: 'below' | 'above' | 'double',
) =>
  computeQuotaTierPortions(prior, agreementQuotaCredit, quotaTarget, RATES).find(p => p.level === level)!
    .quotaCredit;

describe('mobile quota banding — bounds [0, quotaTarget, 2x quotaTarget] (matches webapp + spec)', () => {
  it('spec: target 10k, prior 5k, agreement 20k -> 5k@3% + 10k@6% + 5k@9%', () => {
    expect(portion(5000, 20000, 10000, 'below')).toBe(5000);
    expect(portion(5000, 20000, 10000, 'above')).toBe(10000);
    expect(portion(5000, 20000, 10000, 'double')).toBe(5000);
  });

  it('spec: target 10k, prior 0, agreement 25k -> first 10k@3% + next 10k@6% + 5k@9%', () => {
    expect(portion(0, 25000, 10000, 'below')).toBe(10000);
    expect(portion(0, 25000, 10000, 'above')).toBe(10000);
    expect(portion(0, 25000, 10000, 'double')).toBe(5000);
  });

  it('spec: target 10k, prior 0, agreement 8k -> all below band (3%)', () => {
    expect(portion(0, 8000, 10000, 'below')).toBe(8000);
    expect(portion(0, 8000, 10000, 'above')).toBe(0);
    expect(portion(0, 8000, 10000, 'double')).toBe(0);
  });

  it('below-target rep is NOT flat 9%: prior 25k, target 50k, agreement 30k', () => {
    expect(portion(25000, 30000, 50000, 'below')).toBe(25000);
    expect(portion(25000, 30000, 50000, 'above')).toBe(5000);
    expect(portion(25000, 30000, 50000, 'double')).toBe(0);
  });
});
