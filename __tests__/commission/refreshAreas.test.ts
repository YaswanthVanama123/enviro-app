import {
  expandServiceAreas,
} from '../../src/features/agreements/hooks/useAccountTypeDetection';
import {computeGlobalCommission} from '../../src/features/agreements/hooks/useServiceCommission';
import {resolveCommissionRules} from '../../src/features/admin/types/commission.types';

const refreshService = {
  refreshPowerScrub: {
    serviceId: 'refreshPowerScrub',
    isActive: true,
    frequency: 'weekly',
    contractTotal: 11200,
    areas: [
      {key: 'dumpster', isActive: true, frequency: 'weekly', perVisit: 100, contractTotal: 5200, originalContractTotal: 5200},
      {key: 'patio', isActive: true, frequency: 'monthly', perVisit: 500, contractTotal: 6000, originalContractTotal: 6000},
    ],
  },
};

describe('refresh power scrub — areas calculated as separate services (per-area frequency)', () => {
  it('expandServiceAreas splits a refresh service into one entry per enabled area', () => {
    const out = expandServiceAreas(refreshService);
    expect(out.refreshPowerScrub).toBeUndefined();
    expect(out.refreshPowerScrub__dumpster.frequency).toBe('weekly');
    expect(out.refreshPowerScrub__dumpster.contractTotal).toBe(5200);
    expect(out.refreshPowerScrub__patio.frequency).toBe('monthly');
    expect(out.refreshPowerScrub__patio.contractTotal).toBe(6000);
    expect(out.refreshPowerScrub__dumpster.areas).toBeUndefined();
  });

  it('commission IS computed for refresh, grouped by each area frequency (was: not computing)', () => {
    const rules = resolveCommissionRules(null);
    const cache = {
      1: {accountType: null}, // weekly
      3: {accountType: null}, // monthly
    } as any;
    const result = computeGlobalCommission(refreshService as any, cache, 12, 6, rules, 0, true, 0, 0);

    expect(result.serviceCount).toBe(2);
    const freqs = result.services.map(s => s.frequencyLabel).sort();
    expect(freqs).toContain('Weekly');
    expect(freqs).toContain('Monthly');
    expect(result.totalAnnualCommission).toBeGreaterThan(0);
  });

  it('leaves non-area services untouched', () => {
    const out = expandServiceAreas({saniclean: {isActive: true, frequency: 'weekly', contractTotal: 1000}});
    expect(out.saniclean.contractTotal).toBe(1000);
  });
});
