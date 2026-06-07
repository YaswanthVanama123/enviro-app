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
