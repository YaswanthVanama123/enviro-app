import {apiClient} from '../client';
import {
  FREQUENCY_LABELS,
  FREQUENCY_OPTIONS,
  FREQUENCY_MONTHLY_MULTIPLIER,
} from '../../../shared/constants/frequency';

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
  quotaCredit?: number;
  priorQuotaCredit?: number;
}

export interface CommissionData {
  weeklyCommission: number;
  annualCommission: number;
  contractCommission: number;
  finalCommissionRate: number;
  agreementMultiplier: number;
  baseRate: number;
  serviceBreakdown: Array<{
    serviceName: string;
    accountType: string | null;
    perVisitCommission: number;
    annualCommission: number;
  }>;
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
    products?: any[];
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
  commission?: CommissionData | null;
  includeProductsTable?: boolean;
  status?: string;
}

export const DEFAULT_HEADER_ROWS: HeaderRow[] = [
  {labelLeft: 'CUSTOMER NAME:', valueLeft: '', labelRight: 'CUSTOMER CONTACT:', valueRight: ''},
  {labelLeft: 'CUSTOMER NUMBER:', valueLeft: '', labelRight: 'POC EMAIL:', valueRight: ''},
  {labelLeft: 'POC NAME:', valueLeft: '', labelRight: 'POC PHONE:', valueRight: ''},
];

export const FREQ_MULTIPLIER: Record<string, number> = FREQUENCY_MONTHLY_MULTIPLIER;

export const FREQ_LABELS: Record<string, string> = FREQUENCY_LABELS;

export const FREQ_OPTIONS = FREQUENCY_OPTIONS;

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

  // Save AND recompile the PDF (Save & Generate PDF on an existing agreement).
  async updateAndRecompileAgreement(id: string, payload: FormPayload): Promise<boolean> {
    console.log('[API] PUT /api/pdf/customer-headers/' + id + '?recompile=true (generate PDF)');
    const res = await apiClient.putRaw(`/api/pdf/customer-headers/${id}?recompile=true`, payload);
    if (res.error) {
      console.warn('[API] recompile failed:', res.error);
    } else {
      console.log('[API] recompile OK, status:', res.status);
    }
    return !res.error;
  },

  // Whether this agreement has no versions yet (first-time → auto-create v1).
  async checkVersionStatus(id: string): Promise<{isFirstTime: boolean} | null> {
    const res = await apiClient.get<any>(`/api/versions/${id}/check-status`);
    if (res.error || !res.data) {
      return null;
    }
    return res.data;
  },

  // Create a version — this is what produces the PDF file shown in the folder.
  async createVersion(
    id: string,
    options: {changeNotes?: string; replaceRecent?: boolean; isFirstTime?: boolean},
  ): Promise<any | null> {
    console.log('[API] POST /api/versions/' + id + '/create-version', options);
    const res = await apiClient.post<any>(`/api/versions/${id}/create-version`, options);
    if (res.error) {
      console.warn('[API] createVersion failed:', res.error);
      return null;
    }
    console.log('[API] createVersion OK, status:', res.status);
    return res.data ?? {};
  },

  // Price-change version logs (same endpoints as the web app's fileLogger).
  async getVersionLogs(agreementId: string): Promise<{success: boolean; logs: any[]} | null> {
    const res = await apiClient.get<any>(`/api/pdf/logs/agreement/${agreementId}`);
    if (res.error || !res.data) {
      return null;
    }
    return res.data;
  },

  async createVersionLog(request: any): Promise<any> {
    console.log('[API] POST /api/pdf/logs/create — changes:', request?.currentChanges?.length ?? 0);
    const res = await apiClient.post<any>('/api/pdf/logs/create', request);
    if (res.error) {
      console.warn('[API] createVersionLog failed:', res.error);
      throw new Error(res.error);
    }
    console.log('[API] createVersionLog OK, status:', res.status);
    return res.data;
  },

  async getServiceConfig(serviceId: string): Promise<any | null> {
    const res = await apiClient.get<any>(`/api/service-configs/active?serviceId=${serviceId}`);
    if (res.error || !res.data) {return null;}
    const raw = Array.isArray(res.data) ? res.data[0] : res.data;
    return raw ?? null;
  },

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

  async getAdminHeaders(): Promise<any | null> {
    const ADMIN_TEMPLATE_ID = '692dc43b3811afcdae0d5547';
    console.log('[API] GET /api/pdf/admin-headers/' + ADMIN_TEMPLATE_ID);
    const directRes = await apiClient.get<any>(`/api/pdf/admin-headers/${ADMIN_TEMPLATE_ID}`);
    if (!directRes.error && directRes.data) {
      console.log('[API] /api/pdf/admin-headers direct response: id =', directRes.data._id ?? 'unknown');
      return directRes.data;
    }
    console.warn('[API] /api/pdf/admin-headers direct fetch failed, falling back to list:', directRes.error);

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

  async getAgreementForEdit(id: string): Promise<any | null> {
    const res = await apiClient.get<any>(`/api/pdf/customer-headers/${id}/edit-format`);
    if (res.error || !res.data) {return null;}
    return res.data;
  },

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
