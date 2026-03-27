import {apiClient} from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HeaderRow {
  labelLeft: string;
  valueLeft: string;
  labelRight: string;
  valueRight: string;
}

export interface GlobalSummary {
  contractMonths: number;
  tripCharge: number;
  tripChargeFrequency: number;
  parkingCharge: number;
  parkingChargeFrequency: number;
  serviceAgreementTotal: number;
  productMonthlyTotal: number;
  productContractTotal: number;
}

export interface ServiceAgreementData {
  includeInPdf: boolean;
  retainDispensers: boolean;
  disposeDispensers: boolean;
  term1: string;
  term2: string;
  term3: string;
  term4: string;
  term5: string;
  term6: string;
  term7: string;
  noteText: string;
  titleText: string;
  subtitleText: string;
}

export interface FormPayload {
  headerTitle: string;
  headerRows: HeaderRow[];
  products: {
    smallProducts: any[];
    dispensers: any[];
    bigProducts: any[];
  };
  services: Record<string, any>;
  agreement: {
    enviroOf: string;
    customerExecutedOn: string;
    additionalMonths: number;
    paymentOption: string;
    paymentNote: string;
    startDate: string;
  };
  serviceAgreement?: ServiceAgreementData;
  summary: GlobalSummary;
}

// ─── Default header rows matching webapp customer section ─────────────────────

export const DEFAULT_HEADER_ROWS: HeaderRow[] = [
  {labelLeft: 'CUSTOMER NAME:', valueLeft: '', labelRight: 'CUSTOMER CONTACT:', valueRight: ''},
  {labelLeft: 'CUSTOMER NUMBER:', valueLeft: '', labelRight: 'POC EMAIL:', valueRight: ''},
  {labelLeft: 'POC NAME:', valueLeft: '', labelRight: 'POC PHONE:', valueRight: ''},
];

// ─── Frequency multipliers (visits per month) ─────────────────────────────────

export const FREQ_MULTIPLIER: Record<string, number> = {
  oneTime:      1,
  weekly:       4.33,
  biweekly:     2.165,
  twicePerMonth:2.0,
  monthly:      1.0,
  bimonthly:    0.5,
  quarterly:    0.33,
  biannual:     0.17,
  annual:       1 / 12,
};

export const FREQ_LABELS: Record<string, string> = {
  oneTime:      'One Time',
  weekly:       'Weekly',
  biweekly:     'Bi-Weekly',
  twicePerMonth:'2× / Month',
  monthly:      'Monthly',
  bimonthly:    'Bi-Monthly',
  quarterly:    'Quarterly',
  biannual:     'Bi-Annual',
  annual:       'Annual',
};

export const FREQ_OPTIONS = Object.entries(FREQ_LABELS).map(([value, label]) => ({value, label}));

// ─── API ──────────────────────────────────────────────────────────────────────

export const formApi = {
  async createAgreement(payload: FormPayload): Promise<{id: string} | null> {
    const res = await apiClient.post<any>('/api/pdf/customer-header', payload);
    if (res.error || !res.data) {return null;}
    const id = res.data.id || res.data._id || res.data.agreementId;
    return id ? {id} : null;
  },

  async updateAgreement(id: string, payload: FormPayload): Promise<boolean> {
    const res = await apiClient.put(`/api/pdf/customer-headers/${id}`, payload);
    return !res.error;
  },

  async getServiceConfig(serviceId: string): Promise<any | null> {
    const res = await apiClient.get<any>(`/api/service-configs/active?serviceId=${serviceId}`);
    if (res.error || !res.data) {return null;}
    const raw = Array.isArray(res.data) ? res.data[0] : res.data;
    return raw ?? null;
  },

  // Returns service pricing configs + service agreement template in one call
  async getAllServicePricing(): Promise<{
    serviceConfigs: any[];
    serviceAgreementTemplate: any | null;
  } | null> {
    console.log('[API] GET /api/service-configs/pricing');
    const res = await apiClient.get<any>('/api/service-configs/pricing');
    if (res.error || !res.data) {
      console.warn('[API] /api/service-configs/pricing error:', res.error);
      return null;
    }
    console.log('[API] /api/service-configs/pricing response:', {
      serviceConfigsCount: res.data.serviceConfigs?.length ?? 0,
      hasTemplate: !!res.data.serviceAgreementTemplate,
    });
    return {
      serviceConfigs: res.data.serviceConfigs ?? [],
      serviceAgreementTemplate: res.data.serviceAgreementTemplate ?? null,
    };
  },

  // Returns the active/first admin header document (for default form template)
  async getAdminHeaders(): Promise<any | null> {
    // Primary: fetch by known template ID (same approach as webapp)
    const ADMIN_TEMPLATE_ID = '692dc43b3811afcdae0d5547';
    console.log('[API] GET /api/pdf/admin-headers/' + ADMIN_TEMPLATE_ID);
    const directRes = await apiClient.get<any>(`/api/pdf/admin-headers/${ADMIN_TEMPLATE_ID}`);
    if (!directRes.error && directRes.data) {
      console.log('[API] /api/pdf/admin-headers direct response: id =', directRes.data._id ?? 'unknown');
      return directRes.data;
    }
    console.warn('[API] /api/pdf/admin-headers direct fetch failed, falling back to list:', directRes.error);

    // Fallback: list endpoint — response shape is { total, page, limit, items: [...] }
    console.log('[API] GET /api/pdf/admin-headers (list fallback)');
    const res = await apiClient.get<any>('/api/pdf/admin-headers?page=1&limit=20');
    if (res.error || !res.data) {
      console.warn('[API] /api/pdf/admin-headers list error:', res.error);
      return null;
    }
    const list: any[] = Array.isArray(res.data) ? res.data
      : Array.isArray(res.data.items) ? res.data.items
      : Array.isArray(res.data.data) ? res.data.data
      : [];
    const found = list.find((h: any) => h.isActive) ?? list[0] ?? null;
    console.log('[API] /api/pdf/admin-headers list response: list length =', list.length, '| picked id =', found?._id ?? 'none');
    return found;
  },

  // Returns the active product catalog (families + products)
  async getProductCatalog(): Promise<any | null> {
    console.log('[API] GET /api/product-catalog/active');
    const res = await apiClient.get<any>('/api/product-catalog/active');
    if (res.error || !res.data) {
      console.warn('[API] /api/product-catalog/active error:', res.error);
      return null;
    }
    console.log('[API] /api/product-catalog/active response: families =', res.data.families?.length ?? 0);
    return res.data ?? null;
  },

  // Returns all service configs with display/active flags for the service picker
  async getAllServiceConfigs(): Promise<any[] | null> {
    console.log('[API] GET /api/service-configs');
    const res = await apiClient.get<any>('/api/service-configs');
    if (res.error || !res.data) {
      console.warn('[API] /api/service-configs error:', res.error);
      return null;
    }
    const list = Array.isArray(res.data) ? res.data
      : Array.isArray(res.data.serviceConfigs) ? res.data.serviceConfigs
      : null;
    console.log('[API] /api/service-configs response: count =', list?.length ?? 0);
    return list;
  },
};
