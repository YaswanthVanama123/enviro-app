import {apiClient} from '../client';

const BASE_PATH = '/api/production-push';

export interface ProductionPushStatus {
  configured: boolean;
  targetApiUrl: string | null;
}

export interface ProductionPushPreview {
  agreementId: string;
  title: string;
  status: string;
  counts: {
    versions: number;
    attachedFiles: number;
    changeLogs: number;
  };
  totalPdfBytes: number;
  estimatedPayloadBytes: number;
  target: string;
  configured: boolean;
}

export interface ProductionPushResult {
  agreementId: string;
  title: string;
  versions: number;
  attachedFiles: number;
  changeLogs: number;
  totalPdfBytes: number;
  target: string;
  pushedAt: string;
  pushedBy: string;
}

let statusPromise: Promise<ProductionPushStatus | null> | null = null;

export const productionPushApi = {  async getStatus(): Promise<ProductionPushStatus | null> {
    const res = await apiClient.get<{
      success: boolean;
      configured: boolean;
      targetApiUrl: string | null;
    }>(`${BASE_PATH}/status`);
    const body = res.data as any;
    if (!body) {
      return null;
    }
    return {
      configured: !!body.configured,
      targetApiUrl: body.targetApiUrl ?? null,
    };
  },

  getStatusCached(): Promise<ProductionPushStatus | null> {
    if (!statusPromise) {
      statusPromise = productionPushApi.getStatus().catch(() => null);
    }
    return statusPromise;
  },

  resetStatusCache() {
    statusPromise = null;
  },

  async preview(agreementId: string): Promise<ProductionPushPreview | null> {
    const res = await apiClient.get<{
      success: boolean;
      preview: ProductionPushPreview;
    }>(`${BASE_PATH}/${encodeURIComponent(agreementId)}/preview`);
    const body = res.data as any;
    return body?.success ? body.preview : null;
  },

  async push(agreementId: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
    result?: ProductionPushResult;
  }> {
    const res = await apiClient.post<{
      success: boolean;
      message: string;
      result: ProductionPushResult;
    }>(`${BASE_PATH}/${encodeURIComponent(agreementId)}`, {
      confirmAgreementId: agreementId,
    });
    const body = res.data as any;
    if (body?.success) {
      return {success: true, message: body.message, result: body.result};
    }
    return {success: false, error: body?.error ?? res.error ?? 'Push failed'};
  },
};

export default productionPushApi;
