import {apiClient} from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Product {
  key: string;
  name: string;
  familyKey: string;
  basePrice: {
    amount: number;
    currency: string;
    uom: string;
    unitSizeLabel?: string;
  };
  warrantyPricePerUnit?: {
    amount: number;
    currency: string;
    billingPeriod?: string;
  };
  description?: string;
  displayByAdmin?: boolean;
  quantityPerCase?: number;
  quantityPerCaseLabel?: string;
}

export interface ProductFamily {
  key: string;
  label: string;
  sortOrder?: number;
  products: Product[];
}

export interface ProductCatalog {
  _id?: string;
  version?: string;
  lastUpdated?: string;
  families: ProductFamily[];
  isActive?: boolean;
}

export interface ServiceConfig {
  _id: string;
  serviceId: string;
  label: string;
  version?: string;
  description?: string;
  isActive: boolean;
  adminByDisplay?: boolean;
  tags?: string[];
  config?: any;
  updatedAt?: string;
  createdAt?: string;
}

export interface PricingBackup {
  changeDayId: string;
  createdAt: string;
  serviceConfigsCount?: number;
  productFamiliesCount?: number;
  totalProducts?: number;
  note?: string;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export const pricingApi = {
  async getProductCatalog(): Promise<ProductCatalog | null> {
    const res = await apiClient.get<ProductCatalog>('/api/product-catalog/active');
    return res.data ?? null;
  },

  async getAllServiceConfigs(): Promise<ServiceConfig[] | null> {
    const res = await apiClient.get<any>('/api/service-configs');
    if (res.error || !res.data) {return null;}
    const list = Array.isArray(res.data) ? res.data
      : Array.isArray(res.data.serviceConfigs) ? res.data.serviceConfigs
      : null;
    return list;
  },

  async getServicePricing(): Promise<ServiceConfig[]> {
    // /api/service-configs/pricing returns {serviceConfigs, serviceAgreementTemplate}
    const res = await apiClient.get<any>('/api/service-configs/pricing');
    if (!res.error && res.data?.serviceConfigs) {
      return res.data.serviceConfigs;
    }
    // fallback to /api/service-configs
    const res2 = await apiClient.get<any>('/api/service-configs');
    if (res2.error || !res2.data) {return [];}
    return Array.isArray(res2.data) ? res2.data
      : Array.isArray(res2.data.serviceConfigs) ? res2.data.serviceConfigs
      : [];
  },

  async getBackupList(): Promise<PricingBackup[]> {
    const res = await apiClient.get<any>('/api/pricing-backup/list');
    if (res.error || !res.data) {return [];}
    return res.data.backups ?? (Array.isArray(res.data) ? res.data : []);
  },

  async createBackup(note?: string): Promise<boolean> {
    const res = await apiClient.post('/api/pricing-backup/create', {
      note: note ?? 'Manual backup from mobile',
    });
    return !res.error;
  },

  async restoreBackup(changeDayId: string): Promise<boolean> {
    const res = await apiClient.post('/api/pricing-backup/restore', {changeDayId});
    return !res.error;
  },

  async addProduct(
    familyKey: string,
    product: {
      key: string;
      name: string;
      kind?: string;
      basePrice: {amount: number; currency: string; uom: string};
      warrantyPricePerUnit?: {amount: number; currency: string; billingPeriod: string};
      displayByAdmin?: boolean;
      description?: string;
    },
  ): Promise<{ok: boolean; error?: string}> {
    const res = await apiClient.post('/api/product-catalog/products', {familyKey, ...product});
    if (res.error) {return {ok: false, error: res.error};}
    return {ok: true};
  },

  async updateServiceConfig(
    id: string,
    data: {
      label?: string;
      description?: string;
      version?: string;
      isActive?: boolean;
      tags?: string[];
    },
  ): Promise<{ok: boolean; error?: string}> {
    const res = await apiClient.put(`/api/service-configs/${id}/partial`, data);
    if (res.error) {return {ok: false, error: res.error};}
    return {ok: true};
  },
};
