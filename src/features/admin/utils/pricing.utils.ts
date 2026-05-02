export type MainTab = 'pricing' | 'services' | 'catalog' | 'backup' | 'reference';

export type ServiceSubTab = 'unit' | 'minimums' | 'multipliers' | 'frequencies';

export type BackupSubTab = 'list' | 'stats' | 'health';

export interface ConfigField {
  key: string;
  label: string;
  description: string;
  value: string;
  category: ServiceSubTab;
}

export const MAIN_TABS: {key: MainTab; label: string; icon: string}[] = [
  {key: 'pricing',   label: 'Pricing Tables',     icon: 'pricetag-outline'},
  {key: 'services',  label: 'Service Configs',     icon: 'settings-outline'},
  {key: 'catalog',   label: 'Product Catalog',     icon: 'cube-outline'},
  {key: 'backup',    label: 'Backup',              icon: 'cloud-upload-outline'},
  {key: 'reference', label: 'Services Reference',  icon: 'book-outline'},
];

export const SERVICE_SUBTABS: {key: ServiceSubTab; label: string; icon: string}[] = [
  {key: 'unit',        label: 'Unit Pricing',        icon: 'pricetag-outline'},
  {key: 'minimums',    label: 'Minimums',             icon: 'cash-outline'},
  {key: 'multipliers', label: 'Install Multipliers',  icon: 'flash-outline'},
  {key: 'frequencies', label: 'Service Frequencies',  icon: 'calendar-outline'},
];

export const NESTED_CATEGORY: Record<string, ServiceSubTab> = {
  unitPricing:        'unit',
  unit:               'unit',
  minimums:           'minimums',
  minimum:            'minimums',
  installMultipliers: 'multipliers',
  multipliers:        'multipliers',
  serviceFrequencies: 'frequencies',
  frequencies:        'frequencies',
  frequency:          'frequencies',
};

export const KIND_OPTIONS = [
  {label: 'Degreaser',     value: 'degreaser'},
  {label: 'Disinfectant',  value: 'disinfectant'},
  {label: 'Floor Cleaner', value: 'floorCleaner'},
  {label: 'Soap',          value: 'soap'},
  {label: 'Dispenser',     value: 'dispenser'},
  {label: 'Paper',         value: 'paper'},
  {label: 'Chemical',      value: 'chemical'},
  {label: 'Other',         value: 'other'},
];

export const UOM_OPTIONS = [
  {label: 'Gallon',  value: 'gallon'},
  {label: 'Case',    value: 'case'},
  {label: 'Each',    value: 'each'},
  {label: 'Oz',      value: 'oz'},
  {label: 'Lb',      value: 'lb'},
  {label: 'Bottle',  value: 'bottle'},
  {label: 'Pack',    value: 'pack'},
  {label: 'Sq Ft',   value: 'sqft'},
];

export const BILLING_OPTIONS = [
  {label: 'Monthly',  value: 'monthly'},
  {label: 'Annual',   value: 'annual'},
  {label: 'One-time', value: 'one_time'},
];

export const FAMILY_ICONS: Record<string, string> = {
  floorProducts:      'water-outline',
  saniProducts:       'shield-checkmark-outline',
  dispensers:         'server-outline',
  threeSinkComponents:'layers-outline',
  otherChemicals:     'flask-outline',
  soapProducts:       'sparkles-outline',
  paper:              'document-outline',
  extrasFacilities:   'grid-outline',
};

export const FAMILY_COLORS: Record<string, string> = {
  floorProducts:      '#3b82f6',
  saniProducts:       '#10b981',
  dispensers:         '#8b5cf6',
  threeSinkComponents:'#f59e0b',
  otherChemicals:     '#ef4444',
  soapProducts:       '#ec4899',
  paper:              '#6366f1',
  extrasFacilities:   '#14b8a6',
};

export const SERVICE_COLORS: Record<string, string> = {
  saniclean:          '#ef4444',
  saniscrub:          '#f97316',
  sanipod:            '#eab308',
  foaming_drain:      '#22c55e',
  grease_trap:        '#14b8a6',
  microfiber_mopping: '#3b82f6',
  rpm_windows:        '#6366f1',
  carpet_cleaning:    '#8b5cf6',
  janitorial:         '#ec4899',
  strip_wax:          '#f59e0b',
  electrostatic:      '#10b981',
  refresh_power:      '#0ea5e9',
};

export const SKELETON_BG = '#e5e7eb';

export function fmt(amount: number | undefined): string {
  if (!amount || amount === 0) {return '—';}
  return '$' + amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

export function timeAgo(iso: string | undefined): string {
  if (!iso) {return '—';}
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days === 0) {return 'today';}
  if (days === 1) {return '1 day ago';}
  if (days < 30) {return `${days} days ago`;}
  const m = Math.floor(days / 30);
  if (m < 12) {return `${m}mo ago`;}
  return `${Math.floor(m / 12)}y ago`;
}

export function formatDate(iso: string | undefined): string {
  if (!iso) {return '—';}
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  } catch {return iso;}
}

export function camelToLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

export function formatConfigValue(key: string, val: any): string {
  if (val === null || val === undefined) {return '—';}
  if (typeof val === 'boolean') {return val ? 'Yes' : 'No';}
  if (typeof val === 'number') {
    const lk = key.toLowerCase();
    if (lk.includes('price') || lk.includes('charge') || lk.includes('cost') ||
        lk.includes('fee') || lk.includes('minimum') || lk.includes('rate') ||
        lk.includes('base') || lk.includes('additional') || lk.includes('amount')) {
      return '$' + Number(val).toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2});
    }
    if (lk.includes('sqft') || lk.includes('sq_ft') || lk.includes('unit') && lk.includes('sq')) {
      return `${val.toFixed ? val.toFixed(2) : val} sq ft`;
    }
    if (lk.includes('multiplier') || lk.includes('factor')) {
      return `${val.toFixed ? val.toFixed(2) : val} ×`;
    }
    return String(val);
  }
  if (typeof val === 'string') {return val || '—';}
  return JSON.stringify(val);
}

export function flattenConfig(obj: any): Array<{label: string; value: string}> {
  if (!obj || typeof obj !== 'object') {return [];}
  const rows: Array<{label: string; value: string}> = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_') || typeof v === 'function') {continue;}
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      for (const [k2, v2] of Object.entries(v as object)) {
        if (typeof v2 !== 'object' && typeof v2 !== 'function') {
          rows.push({label: camelToLabel(k2), value: formatConfigValue(k2, v2)});
        }
      }
    } else if (!Array.isArray(v)) {
      rows.push({label: camelToLabel(k), value: formatConfigValue(k, v)});
    }
  }
  return rows;
}

export function categorizeField(key: string): ServiceSubTab {
  const lk = key.toLowerCase();
  if (lk.includes('frequency') || lk.includes('freq') || lk.includes('schedule') || lk.includes('interval') || lk.includes('visit')) {
    return 'frequencies';
  }
  if (lk.includes('multiplier') || lk.includes('install') || lk.includes('factor') || lk.includes('dirty') || lk.includes('clean')) {
    return 'multipliers';
  }
  if (lk.includes('minimum') || lk.startsWith('min')) {
    return 'minimums';
  }
  return 'unit';
}

export function getFieldDescription(key: string): string {
  const lk = key.toLowerCase();
  if (lk.includes('basesqft') || lk === 'basesqftunit') {return 'Base square footage unit for pricing (typically 500 sq ft)';}
  if (lk === 'baseprice') {return 'Price charged for the base square footage unit';}
  if (lk.includes('additionalsqft')) {return 'Additional square footage unit beyond the base';}
  if (lk.includes('additionalunit') && lk.includes('price')) {return 'Price for each additional unit beyond the base';}
  if (lk.includes('minimumcharge')) {return 'Minimum charge per service visit';}
  if (lk.includes('minimumsq')) {return 'Minimum square footage required for service';}
  if (lk.includes('dirty') && lk.includes('install')) {return 'Multiplier applied for dirty install conditions';}
  if (lk.includes('clean') && lk.includes('install')) {return 'Multiplier applied for clean install conditions';}
  if (lk.includes('multiplier')) {return 'Pricing multiplier applied to base rate';}
  if (lk.includes('frequency') || lk.includes('freq')) {return 'Service visit frequency option';}
  return '';
}

export function extractConfigFields(config: any): ConfigField[] {
  if (!config || typeof config !== 'object') {return [];}
  const result: ConfigField[] = [];

  const hasNested = Object.keys(config).some(k => k in NESTED_CATEGORY && typeof config[k] === 'object' && config[k] !== null);

  if (hasNested) {
    for (const [catKey, catVal] of Object.entries(config)) {
      const category = NESTED_CATEGORY[catKey];
      if (!category || typeof catVal !== 'object' || catVal === null) {continue;}
      for (const [fk, fv] of Object.entries(catVal as object)) {
        if (fk.startsWith('_') || typeof fv === 'function' || typeof fv === 'object') {continue;}
        result.push({key: fk, label: camelToLabel(fk), description: getFieldDescription(fk), value: formatConfigValue(fk, fv), category});
      }
    }
  } else {
    for (const [k, v] of Object.entries(config)) {
      if (k.startsWith('_') || typeof v === 'function') {continue;}
      if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
        for (const [k2, v2] of Object.entries(v as object)) {
          if (typeof v2 !== 'object' && typeof v2 !== 'function') {
            result.push({key: k2, label: camelToLabel(k2), description: getFieldDescription(k2), value: formatConfigValue(k2, v2), category: categorizeField(k2)});
          }
        }
      } else if (!Array.isArray(v)) {
        result.push({key: k, label: camelToLabel(k), description: getFieldDescription(k), value: formatConfigValue(k, v), category: categorizeField(k)});
      }
    }
  }
  return result;
}

export function serviceColor(serviceId: string): string {
  return SERVICE_COLORS[serviceId.toLowerCase()] ?? '#2563eb';
}

export function getTriggerLabel(t?: string): string {
  switch (t) {
    case 'pricefix_update': return 'PriceFix';
    case 'product_catalog_update': return 'Catalog';
    case 'service_config_update': return 'Services';
    case 'manual': return 'Manual';
    case 'scheduled': return 'Scheduled';
    default: return t ?? 'Unknown';
  }
}

export function getTriggerColor(t?: string): string {
  switch (t) {
    case 'pricefix_update': return '#2563eb';
    case 'product_catalog_update': return '#7c3aed';
    case 'service_config_update': return '#0891b2';
    case 'manual': return '#16a34a';
    case 'scheduled': return '#d97706';
    default: return '#6b7280';
  }
}

export function formatFileSize(bytes?: number): string {
  if (!bytes) {return '—';}
  if (bytes < 1024) {return `${bytes} B`;}
  if (bytes < 1024 * 1024) {return `${(bytes / 1024).toFixed(1)} KB`;}
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
