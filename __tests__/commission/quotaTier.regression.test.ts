import {
  resolveCommissionRules,
  DEFAULT_QUOTA_TARGET,
} from '../../src/features/admin/types/commission.types';
import {
  computeCommissionTiers,
  progressiveQuotaCommissionRate,
} from '../../src/features/agreements/hooks/useServiceCommission';

const RATES = {below: 3, above: 6, double: 9};

describe('quota tier regression — 3/6/9 thresholds must apply', () => {
  describe('resolveCommissionRules.quotaTarget', () => {
    it('falls back to default when quotaTarget is 0 (was the bug: 0 disabled the tier engine)', () => {
      expect(resolveCommissionRules({quotaTarget: 0}).quotaTarget).toBe(DEFAULT_QUOTA_TARGET);
    });
    it('falls back to default when quotaTarget is missing', () => {
      expect(resolveCommissionRules(null).quotaTarget).toBe(DEFAULT_QUOTA_TARGET);
    });
    it('preserves a valid configured quotaTarget', () => {
      expect(resolveCommissionRules({quotaTarget: 30000}).quotaTarget).toBe(30000);
    });
  });

  describe('progressive banding applies below/above/double rates', () => {
    it('entirely below quota → blended rate is the below rate (3%)', () => {
      expect(progressiveQuotaCommissionRate(0, 30000, 50000, RATES, 99)).toBeCloseTo(3, 5);
    });

    it('spanning below + above → blended between 3% and 6%', () => {
      const rate = progressiveQuotaCommissionRate(0, 60000, 50000, RATES, 99);
      expect(rate).toBeGreaterThan(3);
      expect(rate).toBeLessThan(6);
    });

    it('returns the fallback only when quotaTarget <= 0 (the disabled-engine path)', () => {
      expect(progressiveQuotaCommissionRate(0, 30000, 0, RATES, 6)).toBe(6);
    });

    it('tier portions split a below-quota agreement entirely into the below band', () => {
      const tiers = computeCommissionTiers(0, 30000, 50000, RATES, 100);
      const below = tiers.find(t => t.level === 'below')!;
      const above = tiers.find(t => t.level === 'above')!;
      expect(below.base).toBe(30000);
      expect(below.commission).toBeCloseTo(900, 5);
      expect(above.base).toBe(0);
    });

    it('tier portions split across below + above at the quota boundary', () => {
      const tiers = computeCommissionTiers(0, 60000, 50000, RATES, 100);
      const below = tiers.find(t => t.level === 'below')!;
      const above = tiers.find(t => t.level === 'above')!;
      expect(below.base).toBe(50000);
      expect(below.commission).toBeCloseTo(1500, 5);
      expect(above.base).toBe(10000);
      expect(above.commission).toBeCloseTo(600, 5);
    });
  });
});
