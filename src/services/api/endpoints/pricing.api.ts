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

export interface PricingBackupChangedBy {
  _id: string;
  username: string;
  email: string;
}

export interface PricingBackup {
  changeDayId: string;
  createdAt: string;
  // Legacy simple fields
  serviceConfigsCount?: number;
  productFamiliesCount?: number;
  totalProducts?: number;
  note?: string;
  // Full fields
  _id?: string;
  changeDay?: string;
  firstChangeTimestamp?: string;
  backupTrigger?: 'pricefix_update' | 'product_catalog_update' | 'service_config_update' | 'manual' | 'scheduled';
  changedBy?: PricingBackupChangedBy;
  changeContext?: {
    changedAreas: string[];
    changeDescription: string;
    changeCount: number;
  };
  snapshotMetadata?: {
    includedDataTypes: {priceFix: boolean; productCatalog: boolean; serviceConfigs: boolean};
    documentCounts: {priceFixCount: number; productCatalogCount: number; serviceConfigCount: number};
    originalSize: number;
    compressedSize: number;
    compressionRatio: number;
  };
  restorationInfo?: {
    hasBeenRestored: boolean;
    lastRestoredAt?: string;
    restoredBy?: PricingBackupChangedBy;
    restorationNotes?: string;
  };
  updatedAt?: string;
}

export interface BackupSystemHealth {
  status: 'healthy' | 'warning' | 'unhealthy' | 'unknown';
  checks: {
    backupModelAccessible: boolean;
    totalBackups: number;
    retentionPolicyCompliant: boolean;
    hasBackupToday: boolean;
    mostRecentBackup?: {changeDay: string; createdAt: string; trigger: string};
  };
  warnings: string[];
}

export interface BackupTriggerStats {
  trigger: string;
  count: number;
  percentage: number;
}

export interface BackupStatistics {
  totalBackups: number;
  storageEfficiency: number;
  totalOriginalSize: number;
  totalCompressedSize: number;
  systemHealth: 'healthy' | 'warning' | 'unhealthy';
  triggerBreakdown: BackupTriggerStats[];
  recentBackups: PricingBackup[];
  compressionAnalysis: {best: number; worst: number; average: number};
}

export interface ServiceAgreementTemplate {
  id?: string;
  name?: string;
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
  retainDispensersLabel: string;
  disposeDispensersLabel: string;
  emSalesRepLabel: string;
  insideSalesRepLabel: string;
  authorityText: string;
  customerContactLabel: string;
  customerSignatureLabel: string;
  customerDateLabel: string;
  emFranchiseeLabel: string;
  emSignatureLabel: string;
  emDateLabel: string;
  pageNumberText: string;
  isActive?: boolean;
  updatedAt?: string;
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
    const res = await apiClient.get<any>('/api/pricing-backup/list?limit=50');
    if (res.error || !res.data) {return [];}
    const payload = res.data.data ?? res.data;
    return payload.backups ?? (Array.isArray(payload) ? payload : []);
  },

  async getBackupDetails(changeDayId: string): Promise<PricingBackup | null> {
    const res = await apiClient.get<any>(`/api/pricing-backup/details/${changeDayId}`);
    if (res.error || !res.data) {return null;}
    return res.data.data ?? res.data ?? null;
  },

  async getBackupHealth(): Promise<BackupSystemHealth | null> {
    const res = await apiClient.get<any>('/api/pricing-backup/health');
    if (res.error || !res.data) {return null;}
    return res.data.data ?? res.data ?? null;
  },

  async getBackupStatistics(): Promise<BackupStatistics | null> {
    const res = await apiClient.get<any>('/api/pricing-backup/statistics');
    if (res.error || !res.data) {return null;}
    const d = res.data.data ?? res.data;
    if (!d) {return null;}
    const si = d.sizeStatistics ?? {};
    const ts: {_id: string; count: number}[] = d.triggerStatistics ?? [];
    const total = ts.reduce((sum, t) => sum + t.count, 0);
    return {
      totalBackups: d.totalBackups ?? 0,
      storageEfficiency: si.avgCompressionRatio != null ? (1 - si.avgCompressionRatio) * 100 : 0,
      totalOriginalSize: si.totalOriginalSize ?? 0,
      totalCompressedSize: si.totalCompressedSize ?? 0,
      systemHealth: d.retentionCompliance ? 'healthy' : 'warning',
      triggerBreakdown: ts.map(t => ({
        trigger: t._id,
        count: t.count,
        percentage: total > 0 ? (t.count / total) * 100 : 0,
      })),
      recentBackups: d.recentBackups ?? [],
      compressionAnalysis: {
        best: si.minCompressionRatio != null ? (1 - si.minCompressionRatio) * 100 : 0,
        worst: si.maxCompressionRatio != null ? (1 - si.maxCompressionRatio) * 100 : 0,
        average: si.avgCompressionRatio != null ? (1 - si.avgCompressionRatio) * 100 : 0,
      },
    };
  },

  async createBackup(description?: string): Promise<boolean> {
    const res = await apiClient.post('/api/pricing-backup/create', {
      changeDescription: description ?? 'Manual backup from mobile',
    });
    return !res.error;
  },

  async restoreBackup(changeDayId: string, restorationNotes?: string): Promise<boolean> {
    const res = await apiClient.post('/api/pricing-backup/restore', {changeDayId, restorationNotes});
    return !res.error;
  },

  async enforceRetentionPolicy(): Promise<boolean> {
    const res = await apiClient.post('/api/pricing-backup/enforce-retention', {});
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

  async updateProductCatalog(
    catalogId: string,
    data: {families: ProductFamily[]; version?: string},
  ): Promise<{ok: boolean; error?: string}> {
    const res = await apiClient.put(`/api/product-catalog/${catalogId}`, data);
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

  async getServiceAgreementTemplate(): Promise<ServiceAgreementTemplate | null> {
    const res = await apiClient.get<any>('/api/service-agreement-template/active');
    if (res.error || !res.data) {return null;}
    return res.data.template ?? res.data;
  },

  async updateServiceAgreementTemplate(data: Partial<ServiceAgreementTemplate>): Promise<boolean> {
    const res = await apiClient.put('/api/service-agreement-template', data);
    return !res.error;
  },
};
