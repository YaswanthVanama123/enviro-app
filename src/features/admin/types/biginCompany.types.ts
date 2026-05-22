/**
 * Bigin Company Types for Mobile
 * Types for companies fetched from Zoho Bigin
 */

export interface BiginCompany {
  _id: string;
  biginId: string | null;
  companyName: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  country: string | null;
  industry: string | null;
  accountType: string | null;
  owner: string | null;
  ownerEmail: string | null;
  pipeline: string | null;
  stage: string | null;
  description: string | null;
  tags: string[];
  rawData: Record<string, unknown>;
  lastSyncedAt: string;
  syncSessionId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FetchStatus {
  isRunning: boolean;
  lastFetchAt: string | null;
  lastFetchResult: 'success' | 'failed' | null;
  progress: number;
  message: string;
  currentSessionId: string | null;
  totalCompanies: number;
  lastSyncedAt: string | null;
}

export interface CompanyStats {
  total: number;
  uniqueCities: number;
  uniqueStates: number;
  uniqueIndustries: number;
  uniqueOwners: number;
  cities: string[];
  states: string[];
  industries: string[];
  owners: string[];
  cityBreakdown: Array<{city: string; count: number}>;
  ownerBreakdown: Array<{owner: string; count: number}>;
}

export interface CompaniesListResponse {
  success: boolean;
  data: BiginCompany[];
  pagination: {
    total: number;
    skip: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface CompaniesQueryParams {
  search?: string;
  city?: string;
  state?: string;
  industry?: string;
  owner?: string;
  limit?: number;
  skip?: number;
}

// Helper function to format date
export function formatCompanyDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString();
}

// Helper function to format address
export function formatAddress(company: BiginCompany): string {
  const parts = [
    company.street,
    company.city,
    company.state,
    company.zipCode,
    company.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(', ') : '-';
}
