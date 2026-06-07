// Single source of truth for service frequencies across the app.
// Import { FREQUENCY_OPTIONS, FREQUENCY_LABELS, FrequencyKey } from here.

export type FrequencyKey =
  | 'oneTime'
  | 'weekly'
  | 'biweekly'
  | 'twicePerMonth'
  | 'monthly'
  | 'everyFourWeeks'
  | 'bimonthly'
  | 'quarterly'
  | 'biannual'
  | 'annual';

export const FREQUENCY_KEYS: FrequencyKey[] = [
  'oneTime',
  'weekly',
  'biweekly',
  'twicePerMonth',
  'monthly',
  'everyFourWeeks',
  'bimonthly',
  'quarterly',
  'biannual',
  'annual',
];

export const FREQUENCY_LABELS: Record<FrequencyKey, string> = {
  oneTime: 'One Time',
  weekly: 'Weekly',
  biweekly: 'Bi-Weekly',
  twicePerMonth: '2× / Month',
  monthly: 'Monthly',
  everyFourWeeks: 'Every 4 Weeks',
  bimonthly: 'Bi-Monthly',
  quarterly: 'Quarterly',
  biannual: 'Bi-Annual',
  annual: 'Annual',
};

export const FREQUENCY_OPTIONS: {value: FrequencyKey; label: string}[] = FREQUENCY_KEYS.map(
  key => ({value: key, label: FREQUENCY_LABELS[key]}),
);

// Monthly-recurring conversion multipliers (visits per month).
export const FREQUENCY_MONTHLY_MULTIPLIER: Record<FrequencyKey, number> = {
  oneTime: 1,
  weekly: 4.33,
  biweekly: 2.165,
  twicePerMonth: 2.0,
  monthly: 1.0,
  everyFourWeeks: 1.0833,
  bimonthly: 0.5,
  quarterly: 0.33,
  biannual: 0.17,
  annual: 1 / 12,
};

// Visits per year for each frequency (universal across services).
export const FREQUENCY_VISITS_PER_YEAR: Record<FrequencyKey, number> = {
  oneTime: 1,
  weekly: 52,
  biweekly: 26,
  twicePerMonth: 24,
  monthly: 12,
  everyFourWeeks: 13,
  bimonthly: 6,
  quarterly: 4,
  biannual: 2,
  annual: 1,
};

// Frequencies billed as a monthly recurring charge vs. per-visit.
export const MONTHLY_AND_BELOW: FrequencyKey[] = [
  'weekly',
  'biweekly',
  'twicePerMonth',
  'monthly',
  'everyFourWeeks',
];
export const ABOVE_MONTHLY: FrequencyKey[] = ['bimonthly', 'quarterly', 'biannual', 'annual'];

export function isMonthlyModeFrequency(key: FrequencyKey): boolean {
  return MONTHLY_AND_BELOW.includes(key);
}

export function visitsInContract(key: FrequencyKey, contractMonths: number): number {
  if (key === 'oneTime') {
    return 1;
  }
  return Math.round((FREQUENCY_VISITS_PER_YEAR[key] * contractMonths) / 12);
}
