import {apiClient} from '../client';

export type EmailDocumentType = 'agreement' | 'version' | 'manual-upload' | 'auto-detect';

export interface SendEmailPayload {
  to: string;
  subject: string;
  body: string;
  documentId: string;
  documentType?: EmailDocumentType;
  watermark?: boolean;
}

export const emailApi = {
  async sendWithPdf(data: SendEmailPayload): Promise<{ok: boolean; message?: string}> {
    const res = await apiClient.post<{success: boolean; message?: string}>('/api/email/send', {
      to: data.to,
      subject: data.subject,
      body: data.body,
      documentId: data.documentId,
      documentType: data.documentType ?? 'auto-detect',
      watermark: data.watermark ?? false,
    });
    if (res.error || !res.data?.success) {
      return {ok: false, message: res.error || res.data?.message || 'Failed to send email'};
    }
    return {ok: true, message: res.data?.message};
  },
};
