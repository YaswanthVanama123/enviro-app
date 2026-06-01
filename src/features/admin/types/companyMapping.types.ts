

export interface CompanyMapping {
  _id: string;
  biginCompanyId: string;
  biginId: string;
  biginCompanyName: string;
  biginPhone: string | null;
  biginCity: string | null;
  biginState: string | null;
  routeStarCustomerId: string | null;
  routeStarId: string | null;
  routeStarCustomerName: string | null;
  routeStarCompany: string | null;
  routeStarCity: string | null;
  mappingStatus: 'mapped' | 'unmapped';
  mappedBy: string | null;
  mappedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MappingStats {
  total: number;
  mapped: number;
  unmapped: number;
}

export interface RouteStarCustomerOption {
  _id: string;
  routeStarId: string;
  name: string;
  company: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  isActive: boolean;
}

export type MappingFilterTab = 'all' | 'mapped' | 'unmapped';

export function formatMappingDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getMappingStatusColor(status: 'mapped' | 'unmapped'): string {
  return status === 'mapped' ? '#059669' : '#dc2626';
}

export function getMappingStatusBgColor(status: 'mapped' | 'unmapped'): string {
  return status === 'mapped' ? '#dcfce7' : '#fee2e2';
}
