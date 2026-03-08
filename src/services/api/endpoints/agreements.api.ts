import {apiClient} from '../client';

// ─── Types ────────────────────────────────────────────────────────────────────

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

// Matches the actual backend response shape:
// { success, total, totalGroups, page, limit, groups: [], _metadata }
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

// ─── API ──────────────────────────────────────────────────────────────────────

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
    // Always include logs and drafts unless explicitly disabled
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

  // fileType param is required by the backend to route the delete correctly
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

  // Upload a file attachment to an agreement.
  // Sends multipart/form-data with fields: file, agreementId, fileType.
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

  // Backend endpoint: PATCH /api/pdf/customer-headers/{id}/status
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
};
