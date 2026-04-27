import {API_BASE_URL} from '../../../config';
import {apiClient} from '../client';

export type FileType =
  | 'main_pdf'
  | 'attached_pdf'
  | 'version_pdf'
  | 'version_log';

export type AgreementStatus =
  | 'draft'
  | 'saved'
  | 'in_progress'
  | 'pending_approval'
  | 'approved_salesman'
  | 'approved_admin'
  | 'finalized'
  | 'active'
  | 'completed';

export interface ZohoInfo {
  biginDealId: string | null;
  biginFileId: string | null;
  crmDealId: string | null;
  crmFileId: string | null;
}

export interface SavedFileListItem {
  id: string;
  agreementId?: string;
  versionId?: string;
  fileName: string;
  fileType: FileType;
  title: string;
  status: AgreementStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  fileSize: number;
  pdfStoredAt: string | null;
  hasPdf: boolean;
  description?: string;
  versionNumber?: number;
  isLatestVersion?: boolean;
  canChangeStatus?: boolean;
  zohoInfo: ZohoInfo;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
}

export interface SavedFileGroup {
  id: string;
  agreementTitle: string;
  agreementStatus: AgreementStatus;
  fileCount: number;
  latestUpdate: string;
  statuses: string[];
  hasUploads: boolean;
  files: SavedFileListItem[];
  hasVersions: boolean;
  isDraftOnly: boolean;
  isDeleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  startDate?: string | null;
  contractMonths?: number | null;
}

export interface GroupedSavedFilesResult {
  success: boolean;
  total: number;
  totalGroups: number;
  page: number;
  limit: number;
  groups: SavedFileGroup[];
}

export interface GetSavedFilesOptions {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  isDeleted?: boolean;
  isTrashView?: boolean;
  includeLogs?: boolean;
  includeDrafts?: boolean;
}

export const agreementsApi = {
  async getGrouped(
    options: GetSavedFilesOptions = {},
  ): Promise<GroupedSavedFilesResult | null> {
    const params = new URLSearchParams();
    if (options.page !== undefined) {params.set('page', String(options.page));}
    if (options.limit !== undefined) {params.set('limit', String(options.limit));}
    if (options.search) {params.set('search', options.search);}
    if (options.status) {params.set('status', options.status);}
    if (options.isDeleted !== undefined) {
      params.set('isDeleted', String(options.isDeleted));
    }
    if (options.isTrashView !== undefined) {
      params.set('isTrashView', String(options.isTrashView));
    }
    params.set('includeLogs', String(options.includeLogs ?? true));
    params.set('includeDrafts', String(options.includeDrafts ?? true));

    const query = params.toString();
    const res = await apiClient.get<GroupedSavedFilesResult>(
      `/api/pdf/saved-files/grouped${query ? `?${query}` : ''}`,
    );
    return res.data ?? null;
  },

  async deleteAgreement(agreementId: string): Promise<boolean> {
    const res = await apiClient.patch(
      `/api/pdf/agreements/${agreementId}/delete`,
      {},
    );
    return !res.error;
  },

  async deleteFile(fileId: string, fileType: FileType): Promise<boolean> {
    const res = await apiClient.patch(
      `/api/pdf/files/${fileId}/delete?fileType=${fileType}`,
      {},
    );
    return !res.error;
  },

  async restoreAgreement(agreementId: string): Promise<boolean> {
    const res = await apiClient.patch(`/api/pdf/agreements/${agreementId}/restore`, {});
    return !res.error;
  },

  async restoreFile(fileId: string, fileType: FileType): Promise<boolean> {
    const res = await apiClient.patch(`/api/pdf/files/${fileId}/restore?fileType=${fileType}`, {});
    return !res.error;
  },

  async permanentlyDeleteAgreement(agreementId: string): Promise<boolean> {
    const res = await apiClient.delete(`/api/pdf/agreements/${agreementId}/permanent-delete`);
    return !res.error;
  },

  async permanentlyDeleteFile(fileId: string, fileType: FileType): Promise<boolean> {
    const res = await apiClient.delete(`/api/pdf/files/${fileId}/permanent-delete?fileType=${fileType}`);
    return !res.error;
  },

  async uploadAttachment(
    agreementId: string,
    file: {uri: string; name: string; type: string},
  ): Promise<boolean> {
    const form = new FormData();
    form.append('file', {
      uri: file.uri,
      name: file.name,
      type: file.type,
    } as any);
    form.append('agreementId', agreementId);
    form.append('fileType', 'attached_pdf');

    const res = await apiClient.postFormData('/api/pdf/files/upload', form);
    return !res.error;
  },

  async updateAgreementStatus(
    agreementId: string,
    status: AgreementStatus,
  ): Promise<boolean> {
    const res = await apiClient.patch(
      `/api/pdf/customer-headers/${agreementId}/status`,
      {status},
    );
    return !res.error;
  },

  async updateVersionStatus(
    versionId: string,
    status: AgreementStatus,
  ): Promise<boolean> {
    const res = await apiClient.patch(`/api/versions/${versionId}/status`, {status});
    return !res.error;
  },

  async updateAttachedFileStatus(
    fileId: string,
    status: AgreementStatus,
  ): Promise<boolean> {
    const res = await apiClient.patch(`/api/manual-upload/${fileId}/status`, {status});
    return !res.error;
  },

  async getApprovalDocumentsGrouped(): Promise<GroupedSavedFilesResult & {totalFiles?: number} | null> {
    const res = await apiClient.get<GroupedSavedFilesResult & {totalFiles?: number}>(
      '/api/pdf/approval-documents/grouped',
    );
    return res.data ?? null;
  },
};

export interface ZohoUploadStatus {
  isFirstTime: boolean;
  mapping?: {
    companyName: string;
    companyId: string;
    dealName: string;
    dealId: string;
    currentVersion: number;
    nextVersion: number;
    lastUploadedAt: string;
  };
}

export interface ZohoCompany {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface ZohoUploadResult {
  success: boolean;
  message: string;
  error?: string;
}

export interface ZohoFirstTimePayload {
  companyId: string;
  companyName: string;
  dealName: string;
  noteText: string;
}

export interface ZohoUpdatePayload {
  noteText: string;
  dealId?: string;
}

export interface ZohoUser {
  id: string;
  name: string;
  email: string;
}

export interface ZohoCreateTaskPayload {
  subject: string;
  dueDate?: string;
  status?: 'Not Started' | 'In Progress' | 'Completed' | 'Waiting' | 'Deferred';
  priority?: 'High' | 'Medium' | 'Low';
  description?: string;
  ownerId?: string;
  seModule?: string;
  reminder?: boolean;
  reminderWhen?: string;
  reminderTime?: string;
  repeat?: boolean;
  repeatFrequency?: string;
  repeatUntil?: string;
  companyName?: string;
  agreementId?: string;
}

export interface ZohoTask {
  id: string;
  subject: string;
  dueDate?: string;
  status: string;
  priority: string;
}

export const zohoApi = {
  async getStatus(agreementId: string): Promise<ZohoUploadStatus | null> {
    const res = await apiClient.get<ZohoUploadStatus>(
      `/api/zoho-upload/${agreementId}/status`,
    );
    return res.data ?? null;
  },

  async getCompanies(search?: string, page = 1): Promise<ZohoCompany[]> {
    const params = new URLSearchParams({page: String(page)});
    if (search) {params.set('search', search);}
    const res = await apiClient.get<{companies: ZohoCompany[]}>(
      `/api/zoho-upload/companies?${params.toString()}`,
    );
    return res.data?.companies ?? [];
  },

  async firstTimeUpload(
    agreementId: string,
    payload: ZohoFirstTimePayload,
  ): Promise<ZohoUploadResult> {
    const res = await apiClient.post<ZohoUploadResult>(
      `/api/zoho-upload/${agreementId}/first-time`,
      payload,
    );
    return res.data ?? {success: false, message: res.error ?? 'Upload failed'};
  },

  async updateUpload(
    agreementId: string,
    payload: ZohoUpdatePayload,
  ): Promise<ZohoUploadResult> {
    const res = await apiClient.post<ZohoUploadResult>(
      `/api/zoho-upload/${agreementId}/update`,
      payload,
    );
    return res.data ?? {success: false, message: res.error ?? 'Update failed'};
  },

  async getUsers(): Promise<ZohoUser[]> {
    const res = await apiClient.get<{success: boolean; users: ZohoUser[]}>(
      '/api/zoho-upload/users',
    );
    return res.data?.users ?? [];
  },

  async createTask(
    agreementId: string,
    payload: ZohoCreateTaskPayload,
  ): Promise<{success: boolean; task?: ZohoTask; error?: string}> {
    const res = await apiClient.post<{success: boolean; task?: ZohoTask; error?: string}>(
      `/api/zoho-upload/${agreementId}/tasks`,
      payload,
    );
    return res.data ?? {success: false, error: res.error ?? 'Task creation failed'};
  },

  async createTaskForCompany(
    companyId: string,
    payload: ZohoCreateTaskPayload,
  ): Promise<{success: boolean; task?: ZohoTask; error?: string}> {
    const res = await apiClient.post<{success: boolean; task?: ZohoTask; error?: string}>(
      `/api/zoho-upload/companies/${companyId}/tasks`,
      payload,
    );
    return res.data ?? {success: false, error: res.error ?? 'Task creation failed'};
  },
};

export function getFileDownloadUrl(
  file: SavedFileListItem,
  token: string | null,
): string | null {
  if (!file.id) {return null;}
  const tok = token ? `?token=${encodeURIComponent(token)}` : '';
  switch (file.fileType) {
    case 'version_pdf':
      return `${API_BASE_URL}/api/versions/${file.versionId ?? file.id}/download${tok}`;
    case 'attached_pdf':
      return `${API_BASE_URL}/api/manual-upload/${file.id}/download${tok}`;
    case 'version_log':
      return `${API_BASE_URL}/api/pdf/logs/${file.id}/download${tok}`;
    case 'main_pdf':
    default:
      return `${API_BASE_URL}/api/pdf/viewer/download/${file.id}${tok}`;
  }
}
