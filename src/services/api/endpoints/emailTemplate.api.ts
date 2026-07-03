import {apiClient} from '../client';

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  isActive: boolean;
  updatedAt: string;
}

export const emailTemplateApi = {
  async getActiveTemplate(): Promise<EmailTemplate | null> {
    const res = await apiClient.get<{template: EmailTemplate}>('/api/email-template/active');
    if (res.error || !res.data?.template) return null;
    return res.data.template;
  },

  async updateTemplate(
    subject: string,
    body: string,
  ): Promise<{ok: boolean; template?: EmailTemplate; message?: string}> {
    const res = await apiClient.put<{success: boolean; template: EmailTemplate}>(
      '/api/email-template',
      {subject, body},
    );
    if (res.error || !res.data?.success) return {ok: false, message: res.error};
    return {ok: true, template: res.data.template};
  },
};
