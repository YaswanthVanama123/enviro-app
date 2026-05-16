/**
 * Commission Calculator Tests
 * Tests for commission calculation logic used in the EnviroApp
 */

import type {
  CommissionCalculationInput,
  CommissionCalculationResult,
  CommissionRules,
  AccountType,
  AgreementTerm,
  QuotaLevel,
  PricingLine,
  BusinessType,
} from '../../src/features/admin/types/commission.types';

// Default commission rules (mirroring backend defaults)
const DEFAULT_RULES: CommissionRules = {
  quotaRates: {
    below: 3,
    above: 6,
    double: 9,
  },
  agreementMultipliers: {
    '3-year': 135,
    '1-year': 100,
    'MTM-with-install': 100,
    'MTM-no-install': 50,
  },
  accountTypeAdjustments: {
    Anchor: 0,
    Bread5: -1,
    Bread15: -0.5,
    Pit: 0,
  },
  greenlineBonus: 1,
  renewalBonusRate: 4,
  renewalMinYears: 2,
  insideSalesDeduction: -3,
  anchorMinMonthlyValue: 200,
};

// Commission calculation function (mirroring backend/component logic)
function calculateCommission(
  input: CommissionCalculationInput,
  rules: CommissionRules = DEFAULT_RULES,
): CommissionCalculationResult {
  const baseRate = rules.quotaRates[input.quotaLevel] || 3;
  const agreementMultiplier =
    rules.agreementMultipliers[input.agreementTerm] || 100;
  const accountTypeAdjustment =
    rules.accountTypeAdjustments[input.accountType] || 0;
  const greenlineBonus =
    input.pricingLine === 'Greenline' ? rules.greenlineBonus : 0;
  const renewalBonus =
    input.businessType === 'renewal' &&
    input.yearsAsCustomer !== undefined &&
    input.yearsAsCustomer >= rules.renewalMinYears
      ? rules.renewalBonusRate
      : 0;
  const insideSalesDeduction = input.isInsideSales
    ? rules.insideSalesDeduction
    : 0;

  const effectiveBaseRate =
    baseRate +
    accountTypeAdjustment +
    greenlineBonus +
    renewalBonus +
    insideSalesDeduction;
  const finalCommissionRate = effectiveBaseRate * (agreementMultiplier / 100);
  const monthlyCommission = input.monthlyValue * (finalCommissionRate / 100);
  const annualCommission = monthlyCommission * 12;

  return {
    input,
    breakdown: {
      baseRate,
      agreementMultiplier,
      accountTypeAdjustment,
      greenlineBonus,
      renewalBonus,
      insideSalesDeduction,
    },
    effectiveBaseRate,
    finalCommissionRate,
    monthlyCommission,
    annualCommission,
  };
}

// Helper to create input with defaults
function createInput(
  overrides: Partial<CommissionCalculationInput> = {},
): CommissionCalculationInput {
  return {
    monthlyValue: 500,
    agreementTerm: '1-year',
    accountType: 'Anchor',
    pricingLine: 'Redline',
    quotaLevel: 'above',
    businessType: 'new',
    isInsideSales: false,
    ...overrides,
  };
}

describe('Commission Calculator', () => {
  describe('Quota Levels', () => {
    it('calculates 3% base rate for below quota', () => {
      const input = createInput({quotaLevel: 'below'});
      const result = calculateCommission(input);
      expect(result.breakdown.baseRate).toBe(3);
      expect(result.finalCommissionRate).toBe(3);
    });

    it('calculates 6% base rate for above quota', () => {
      const input = createInput({quotaLevel: 'above'});
      const result = calculateCommission(input);
      expect(result.breakdown.baseRate).toBe(6);
      expect(result.finalCommissionRate).toBe(6);
    });

    it('calculates 9% base rate for double quota', () => {
      const input = createInput({quotaLevel: 'double'});
      const result = calculateCommission(input);
      expect(result.breakdown.baseRate).toBe(9);
      expect(result.finalCommissionRate).toBe(9);
    });
  });

  describe('Agreement Terms', () => {
    it('applies 135% multiplier for 3-year agreement', () => {
      const input = createInput({agreementTerm: '3-year', quotaLevel: 'above'});
      const result = calculateCommission(input);
      expect(result.breakdown.agreementMultiplier).toBe(135);
      expect(result.finalCommissionRate).toBeCloseTo(8.1, 2);
    });

    it('applies 100% multiplier for 1-year agreement', () => {
      const input = createInput({agreementTerm: '1-year', quotaLevel: 'above'});
      const result = calculateCommission(input);
      expect(result.breakdown.agreementMultiplier).toBe(100);
      expect(result.finalCommissionRate).toBe(6);
    });

    it('applies 100% multiplier for MTM with install', () => {
      const input = createInput({
        agreementTerm: 'MTM-with-install',
        quotaLevel: 'above',
      });
      const result = calculateCommission(input);
      expect(result.breakdown.agreementMultiplier).toBe(100);
      expect(result.finalCommissionRate).toBe(6);
    });

    it('applies 50% multiplier for MTM no install', () => {
      const input = createInput({
        agreementTerm: 'MTM-no-install',
        quotaLevel: 'above',
      });
      const result = calculateCommission(input);
      expect(result.breakdown.agreementMultiplier).toBe(50);
      expect(result.finalCommissionRate).toBe(3);
    });
  });

  describe('Account Types', () => {
    it('applies no adjustment for Anchor accounts', () => {
      const input = createInput({accountType: 'Anchor'});
      const result = calculateCommission(input);
      expect(result.breakdown.accountTypeAdjustment).toBe(0);
    });

    it('applies -1% adjustment for Bread5 accounts', () => {
      const input = createInput({accountType: 'Bread5', quotaLevel: 'above'});
      const result = calculateCommission(input);
      expect(result.breakdown.accountTypeAdjustment).toBe(-1);
      expect(result.finalCommissionRate).toBe(5);
    });

    it('applies -0.5% adjustment for Bread15 accounts', () => {
      const input = createInput({accountType: 'Bread15', quotaLevel: 'above'});
      const result = calculateCommission(input);
      expect(result.breakdown.accountTypeAdjustment).toBe(-0.5);
      expect(result.finalCommissionRate).toBe(5.5);
    });

    it('applies no adjustment for Pit accounts', () => {
      const input = createInput({accountType: 'Pit'});
      const result = calculateCommission(input);
      expect(result.breakdown.accountTypeAdjustment).toBe(0);
    });
  });

  describe('Pricing Lines', () => {
    it('applies no bonus for Redline pricing', () => {
      const input = createInput({pricingLine: 'Redline'});
      const result = calculateCommission(input);
      expect(result.breakdown.greenlineBonus).toBe(0);
    });

    it('applies +1% bonus for Greenline pricing', () => {
      const input = createInput({pricingLine: 'Greenline', quotaLevel: 'above'});
      const result = calculateCommission(input);
      expect(result.breakdown.greenlineBonus).toBe(1);
      expect(result.finalCommissionRate).toBe(7);
    });
  });

  describe('Business Type & Renewals', () => {
    it('applies no renewal bonus for new business', () => {
      const input = createInput({businessType: 'new'});
      const result = calculateCommission(input);
      expect(result.breakdown.renewalBonus).toBe(0);
    });

    it('applies no renewal bonus for renewal with less than 2 years', () => {
      const input = createInput({
        businessType: 'renewal',
        yearsAsCustomer: 1,
      });
      const result = calculateCommission(input);
      expect(result.breakdown.renewalBonus).toBe(0);
    });

    it('applies +4% renewal bonus for 2+ year customer', () => {
      const input = createInput({
        businessType: 'renewal',
        yearsAsCustomer: 2,
        quotaLevel: 'above',
      });
      const result = calculateCommission(input);
      expect(result.breakdown.renewalBonus).toBe(4);
      expect(result.finalCommissionRate).toBe(10);
    });

    it('applies renewal bonus for customers with many years', () => {
      const input = createInput({
        businessType: 'renewal',
        yearsAsCustomer: 10,
        quotaLevel: 'above',
      });
      const result = calculateCommission(input);
      expect(result.breakdown.renewalBonus).toBe(4);
    });
  });

  describe('Inside Sales', () => {
    it('applies no deduction when not inside sales', () => {
      const input = createInput({isInsideSales: false});
      const result = calculateCommission(input);
      expect(result.breakdown.insideSalesDeduction).toBe(0);
    });

    it('applies -3% deduction for inside sales', () => {
      const input = createInput({isInsideSales: true, quotaLevel: 'above'});
      const result = calculateCommission(input);
      expect(result.breakdown.insideSalesDeduction).toBe(-3);
      expect(result.finalCommissionRate).toBe(3);
    });
  });

  describe('Combined Scenarios', () => {
    it('calculates maximum commission scenario', () => {
      const input = createInput({
        monthlyValue: 1000,
        quotaLevel: 'double',
        agreementTerm: '3-year',
        accountType: 'Anchor',
        pricingLine: 'Greenline',
        businessType: 'renewal',
        yearsAsCustomer: 5,
        isInsideSales: false,
      });
      const result = calculateCommission(input);

      // 9% base + 0% account + 1% greenline + 4% renewal + 0% inside = 14% effective
      // 14% * 135% = 18.9% final
      expect(result.effectiveBaseRate).toBe(14);
      expect(result.finalCommissionRate).toBeCloseTo(18.9, 2);
      expect(result.monthlyCommission).toBeCloseTo(189, 2);
      expect(result.annualCommission).toBeCloseTo(2268, 2);
    });

    it('calculates minimum commission scenario', () => {
      const input = createInput({
        monthlyValue: 200,
        quotaLevel: 'below',
        agreementTerm: 'MTM-no-install',
        accountType: 'Bread5',
        pricingLine: 'Redline',
        businessType: 'new',
        isInsideSales: true,
      });
      const result = calculateCommission(input);

      // 3% base - 1% account + 0% greenline + 0% renewal - 3% inside = -1% effective
      // -1% * 50% = -0.5% final
      expect(result.effectiveBaseRate).toBe(-1);
      expect(result.finalCommissionRate).toBe(-0.5);
      expect(result.monthlyCommission).toBe(-1);
    });

    it('calculates typical sales scenario', () => {
      const input = createInput({
        monthlyValue: 500,
        quotaLevel: 'above',
        agreementTerm: '1-year',
        accountType: 'Anchor',
        pricingLine: 'Redline',
        businessType: 'new',
        isInsideSales: false,
      });
      const result = calculateCommission(input);

      expect(result.effectiveBaseRate).toBe(6);
      expect(result.finalCommissionRate).toBe(6);
      expect(result.monthlyCommission).toBe(30);
      expect(result.annualCommission).toBe(360);
    });

    it('handles Bread15 with greenline and renewal', () => {
      const input = createInput({
        monthlyValue: 300,
        quotaLevel: 'above',
        agreementTerm: '3-year',
        accountType: 'Bread15',
        pricingLine: 'Greenline',
        businessType: 'renewal',
        yearsAsCustomer: 3,
        isInsideSales: false,
      });
      const result = calculateCommission(input);

      // 6% base - 0.5% account + 1% greenline + 4% renewal = 10.5% effective
      // 10.5% * 135% = 14.175% final
      expect(result.effectiveBaseRate).toBe(10.5);
      expect(result.finalCommissionRate).toBeCloseTo(14.175);
      expect(result.monthlyCommission).toBeCloseTo(42.525);
    });

    it('handles inside sales with 3-year agreement', () => {
      const input = createInput({
        monthlyValue: 400,
        quotaLevel: 'above',
        agreementTerm: '3-year',
        accountType: 'Anchor',
        pricingLine: 'Redline',
        businessType: 'new',
        isInsideSales: true,
      });
      const result = calculateCommission(input);

      // 6% base + 0% account + 0% greenline + 0% renewal - 3% inside = 3% effective
      // 3% * 135% = 4.05% final
      expect(result.effectiveBaseRate).toBe(3);
      expect(result.finalCommissionRate).toBeCloseTo(4.05, 2);
      expect(result.monthlyCommission).toBeCloseTo(16.2, 2);
    });
  });

  describe('Edge Cases', () => {
    it('handles zero monthly value', () => {
      const input = createInput({monthlyValue: 0});
      const result = calculateCommission(input);
      expect(result.monthlyCommission).toBe(0);
      expect(result.annualCommission).toBe(0);
    });

    it('handles very large monthly values', () => {
      const input = createInput({
        monthlyValue: 100000,
        quotaLevel: 'double',
        agreementTerm: '3-year',
      });
      const result = calculateCommission(input);
      // 9% * 135% = 12.15%
      expect(result.monthlyCommission).toBe(12150);
      expect(result.annualCommission).toBe(145800);
    });

    it('handles decimal monthly values', () => {
      const input = createInput({
        monthlyValue: 333.33,
        quotaLevel: 'above',
      });
      const result = calculateCommission(input);
      // 6% * 100% = 6%
      expect(result.monthlyCommission).toBeCloseTo(19.9998);
    });

    it('handles renewal with exactly minimum years', () => {
      const input = createInput({
        businessType: 'renewal',
        yearsAsCustomer: 2,
        quotaLevel: 'above',
      });
      const result = calculateCommission(input);
      expect(result.breakdown.renewalBonus).toBe(4);
    });

    it('handles renewal with years just below minimum', () => {
      const input = createInput({
        businessType: 'renewal',
        yearsAsCustomer: 1.9,
        quotaLevel: 'above',
      });
      const result = calculateCommission(input);
      expect(result.breakdown.renewalBonus).toBe(0);
    });
  });

  describe('Breakdown Validation', () => {
    it('includes all breakdown components', () => {
      const input = createInput({
        quotaLevel: 'above',
        agreementTerm: '3-year',
        accountType: 'Bread5',
        pricingLine: 'Greenline',
        businessType: 'renewal',
        yearsAsCustomer: 3,
        isInsideSales: true,
      });
      const result = calculateCommission(input);

      expect(result.breakdown).toHaveProperty('baseRate');
      expect(result.breakdown).toHaveProperty('agreementMultiplier');
      expect(result.breakdown).toHaveProperty('accountTypeAdjustment');
      expect(result.breakdown).toHaveProperty('greenlineBonus');
      expect(result.breakdown).toHaveProperty('renewalBonus');
      expect(result.breakdown).toHaveProperty('insideSalesDeduction');

      expect(result.breakdown.baseRate).toBe(6);
      expect(result.breakdown.agreementMultiplier).toBe(135);
      expect(result.breakdown.accountTypeAdjustment).toBe(-1);
      expect(result.breakdown.greenlineBonus).toBe(1);
      expect(result.breakdown.renewalBonus).toBe(4);
      expect(result.breakdown.insideSalesDeduction).toBe(-3);
    });

    it('calculates effective base rate correctly', () => {
      const input = createInput({
        quotaLevel: 'above',
        accountType: 'Bread5',
        pricingLine: 'Greenline',
        businessType: 'renewal',
        yearsAsCustomer: 5,
        isInsideSales: true,
      });
      const result = calculateCommission(input);

      // 6% - 1% + 1% + 4% - 3% = 7%
      const expectedEffectiveRate =
        result.breakdown.baseRate +
        result.breakdown.accountTypeAdjustment +
        result.breakdown.greenlineBonus +
        result.breakdown.renewalBonus +
        result.breakdown.insideSalesDeduction;
      expect(result.effectiveBaseRate).toBe(expectedEffectiveRate);
      expect(result.effectiveBaseRate).toBe(7);
    });
  });

  describe('Annual Commission Calculations', () => {
    it('correctly multiplies monthly by 12 for annual', () => {
      const input = createInput({
        monthlyValue: 1000,
        quotaLevel: 'above',
        agreementTerm: '1-year',
      });
      const result = calculateCommission(input);

      // 6% * $1000 = $60/month
      expect(result.monthlyCommission).toBe(60);
      expect(result.annualCommission).toBe(720);
    });

    it('handles various monthly values for annual calculation', () => {
      const testCases = [
        {monthlyValue: 100, expectedMonthly: 6, expectedAnnual: 72},
        {monthlyValue: 250, expectedMonthly: 15, expectedAnnual: 180},
        {monthlyValue: 500, expectedMonthly: 30, expectedAnnual: 360},
        {monthlyValue: 1000, expectedMonthly: 60, expectedAnnual: 720},
      ];

      testCases.forEach(({monthlyValue, expectedMonthly, expectedAnnual}) => {
        const input = createInput({monthlyValue, quotaLevel: 'above'});
        const result = calculateCommission(input);
        expect(result.monthlyCommission).toBe(expectedMonthly);
        expect(result.annualCommission).toBe(expectedAnnual);
      });
    });
  });

  describe('Form Validation Scenarios', () => {
    it('validates all account types are handled', () => {
      const accountTypes: AccountType[] = ['Anchor', 'Bread5', 'Bread15', 'Pit'];
      accountTypes.forEach(accountType => {
        const input = createInput({accountType});
        const result = calculateCommission(input);
        expect(result.breakdown.accountTypeAdjustment).toBeDefined();
      });
    });

    it('validates all agreement terms are handled', () => {
      const terms: AgreementTerm[] = [
        '3-year',
        '1-year',
        'MTM-with-install',
        'MTM-no-install',
      ];
      terms.forEach(agreementTerm => {
        const input = createInput({agreementTerm});
        const result = calculateCommission(input);
        expect(result.breakdown.agreementMultiplier).toBeDefined();
      });
    });

    it('validates all quota levels are handled', () => {
      const levels: QuotaLevel[] = ['below', 'above', 'double'];
      levels.forEach(quotaLevel => {
        const input = createInput({quotaLevel});
        const result = calculateCommission(input);
        expect(result.breakdown.baseRate).toBeDefined();
      });
    });

    it('validates all pricing lines are handled', () => {
      const lines: PricingLine[] = ['Redline', 'Greenline'];
      lines.forEach(pricingLine => {
        const input = createInput({pricingLine});
        const result = calculateCommission(input);
        expect(result.breakdown.greenlineBonus).toBeDefined();
      });
    });

    it('validates all business types are handled', () => {
      const types: BusinessType[] = ['new', 'renewal'];
      types.forEach(businessType => {
        const input = createInput({businessType, yearsAsCustomer: 3});
        const result = calculateCommission(input);
        expect(result.breakdown.renewalBonus).toBeDefined();
      });
    });
  });

  describe('Input Preservation', () => {
    it('preserves input in result', () => {
      const input = createInput({
        monthlyValue: 750,
        quotaLevel: 'double',
        agreementTerm: '3-year',
        accountType: 'Bread15',
        pricingLine: 'Greenline',
        businessType: 'renewal',
        yearsAsCustomer: 4,
        isInsideSales: true,
      });
      const result = calculateCommission(input);

      expect(result.input).toEqual(input);
      expect(result.input.monthlyValue).toBe(750);
      expect(result.input.quotaLevel).toBe('double');
      expect(result.input.agreementTerm).toBe('3-year');
      expect(result.input.accountType).toBe('Bread15');
      expect(result.input.pricingLine).toBe('Greenline');
      expect(result.input.businessType).toBe('renewal');
      expect(result.input.yearsAsCustomer).toBe(4);
      expect(result.input.isInsideSales).toBe(true);
    });
  });
});

describe('Commission Rules Configuration', () => {
  describe('Custom Rules', () => {
    it('uses custom quota rates', () => {
      const customRules: CommissionRules = {
        ...DEFAULT_RULES,
        quotaRates: {below: 2, above: 5, double: 8},
      };
      const input = createInput({quotaLevel: 'above'});
      const result = calculateCommission(input, customRules);
      expect(result.breakdown.baseRate).toBe(5);
    });

    it('uses custom agreement multipliers', () => {
      const customRules: CommissionRules = {
        ...DEFAULT_RULES,
        agreementMultipliers: {
          ...DEFAULT_RULES.agreementMultipliers,
          '3-year': 150,
        },
      };
      const input = createInput({agreementTerm: '3-year', quotaLevel: 'above'});
      const result = calculateCommission(input, customRules);
      expect(result.breakdown.agreementMultiplier).toBe(150);
      expect(result.finalCommissionRate).toBe(9);
    });

    it('uses custom greenline bonus', () => {
      const customRules: CommissionRules = {
        ...DEFAULT_RULES,
        greenlineBonus: 2,
      };
      const input = createInput({pricingLine: 'Greenline', quotaLevel: 'above'});
      const result = calculateCommission(input, customRules);
      expect(result.breakdown.greenlineBonus).toBe(2);
      expect(result.finalCommissionRate).toBe(8);
    });

    it('uses custom renewal settings', () => {
      const customRules: CommissionRules = {
        ...DEFAULT_RULES,
        renewalBonusRate: 5,
        renewalMinYears: 1,
      };
      const input = createInput({
        businessType: 'renewal',
        yearsAsCustomer: 1,
        quotaLevel: 'above',
      });
      const result = calculateCommission(input, customRules);
      expect(result.breakdown.renewalBonus).toBe(5);
    });

    it('uses custom inside sales deduction', () => {
      const customRules: CommissionRules = {
        ...DEFAULT_RULES,
        insideSalesDeduction: -4,
      };
      const input = createInput({isInsideSales: true, quotaLevel: 'above'});
      const result = calculateCommission(input, customRules);
      expect(result.breakdown.insideSalesDeduction).toBe(-4);
      expect(result.finalCommissionRate).toBe(2);
    });
  });
});

describe('Real-World Commission Scenarios', () => {
  describe('Sales Rep Scenarios', () => {
    it('handles new field sales rep at above quota with 3-year deal', () => {
      const input = createInput({
        monthlyValue: 450,
        quotaLevel: 'above',
        agreementTerm: '3-year',
        accountType: 'Anchor',
        pricingLine: 'Redline',
        businessType: 'new',
        isInsideSales: false,
      });
      const result = calculateCommission(input);

      // 6% * 135% = 8.1%
      expect(result.finalCommissionRate).toBeCloseTo(8.1, 2);
      expect(result.monthlyCommission).toBeCloseTo(36.45, 2);
      expect(result.annualCommission).toBeCloseTo(437.4, 2);
    });

    it('handles inside sales rep with Bread5 account MTM', () => {
      const input = createInput({
        monthlyValue: 250,
        quotaLevel: 'above',
        agreementTerm: 'MTM-no-install',
        accountType: 'Bread5',
        pricingLine: 'Redline',
        businessType: 'new',
        isInsideSales: true,
      });
      const result = calculateCommission(input);

      // (6% - 1% - 3%) * 50% = 1%
      expect(result.effectiveBaseRate).toBe(2);
      expect(result.finalCommissionRate).toBe(1);
      expect(result.monthlyCommission).toBe(2.5);
    });

    it('handles renewal specialist with long-term customer', () => {
      const input = createInput({
        monthlyValue: 800,
        quotaLevel: 'double',
        agreementTerm: '3-year',
        accountType: 'Anchor',
        pricingLine: 'Greenline',
        businessType: 'renewal',
        yearsAsCustomer: 7,
        isInsideSales: false,
      });
      const result = calculateCommission(input);

      // 9% + 1% + 4% = 14% effective
      // 14% * 135% = 18.9% final
      expect(result.effectiveBaseRate).toBe(14);
      expect(result.finalCommissionRate).toBeCloseTo(18.9, 2);
      expect(result.monthlyCommission).toBeCloseTo(151.2, 2);
      expect(result.annualCommission).toBeCloseTo(1814.4, 2);
    });

    it('handles account manager with Pit account conversion', () => {
      const input = createInput({
        monthlyValue: 350,
        quotaLevel: 'below',
        agreementTerm: '1-year',
        accountType: 'Pit',
        pricingLine: 'Redline',
        businessType: 'new',
        isInsideSales: false,
      });
      const result = calculateCommission(input);

      // 3% * 100% = 3%
      expect(result.finalCommissionRate).toBe(3);
      expect(result.monthlyCommission).toBe(10.5);
    });
  });

  describe('Account Type Impact Analysis', () => {
    it('shows commission difference between account types', () => {
      const baseInput = {
        monthlyValue: 500,
        quotaLevel: 'above' as QuotaLevel,
        agreementTerm: '1-year' as AgreementTerm,
        pricingLine: 'Redline' as PricingLine,
        businessType: 'new' as BusinessType,
        isInsideSales: false,
      };

      const anchorResult = calculateCommission({
        ...baseInput,
        accountType: 'Anchor',
      });
      const bread5Result = calculateCommission({
        ...baseInput,
        accountType: 'Bread5',
      });
      const bread15Result = calculateCommission({
        ...baseInput,
        accountType: 'Bread15',
      });
      const pitResult = calculateCommission({...baseInput, accountType: 'Pit'});

      expect(anchorResult.monthlyCommission).toBe(30); // 6%
      expect(bread5Result.monthlyCommission).toBe(25); // 5%
      expect(bread15Result.monthlyCommission).toBe(27.5); // 5.5%
      expect(pitResult.monthlyCommission).toBe(30); // 6%
    });
  });

  describe('Agreement Term Impact Analysis', () => {
    it('shows commission difference between agreement terms', () => {
      const baseInput = {
        monthlyValue: 500,
        quotaLevel: 'above' as QuotaLevel,
        accountType: 'Anchor' as AccountType,
        pricingLine: 'Redline' as PricingLine,
        businessType: 'new' as BusinessType,
        isInsideSales: false,
      };

      const threeYearResult = calculateCommission({
        ...baseInput,
        agreementTerm: '3-year',
      });
      const oneYearResult = calculateCommission({
        ...baseInput,
        agreementTerm: '1-year',
      });
      const mtmWithInstallResult = calculateCommission({
        ...baseInput,
        agreementTerm: 'MTM-with-install',
      });
      const mtmNoInstallResult = calculateCommission({
        ...baseInput,
        agreementTerm: 'MTM-no-install',
      });

      expect(threeYearResult.finalCommissionRate).toBeCloseTo(8.1, 2); // 6% * 135%
      expect(oneYearResult.finalCommissionRate).toBe(6); // 6% * 100%
      expect(mtmWithInstallResult.finalCommissionRate).toBe(6); // 6% * 100%
      expect(mtmNoInstallResult.finalCommissionRate).toBe(3); // 6% * 50%
    });
  });

  describe('Quota Level Progression', () => {
    it('shows commission progression through quota levels', () => {
      const baseInput = {
        monthlyValue: 500,
        agreementTerm: '1-year' as AgreementTerm,
        accountType: 'Anchor' as AccountType,
        pricingLine: 'Redline' as PricingLine,
        businessType: 'new' as BusinessType,
        isInsideSales: false,
      };

      const belowResult = calculateCommission({...baseInput, quotaLevel: 'below'});
      const aboveResult = calculateCommission({...baseInput, quotaLevel: 'above'});
      const doubleResult = calculateCommission({...baseInput, quotaLevel: 'double'});

      expect(belowResult.finalCommissionRate).toBe(3);
      expect(aboveResult.finalCommissionRate).toBe(6);
      expect(doubleResult.finalCommissionRate).toBe(9);

      // Each level should be 3% higher
      expect(aboveResult.finalCommissionRate - belowResult.finalCommissionRate).toBe(
        3,
      );
      expect(
        doubleResult.finalCommissionRate - aboveResult.finalCommissionRate,
      ).toBe(3);
    });
  });
});
