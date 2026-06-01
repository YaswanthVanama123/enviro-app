

export interface RouteStarCustomer {
  _id: string;
  routeStarId: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  email: string;
  company: string;
  isActive: boolean;
  isPaperless: boolean;
  grouping: string;
  onRoute: string;
  createdInRouteStar: string;
  account: string;
  salesRep: string;
  customerType: string;
  balance: number;
  detailUrl: string;
  lastSyncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSyncStatus {
  isRunning: boolean;
  progress: number;
  message: string;
  lastSyncAt: string | null;
  lastSyncResult: 'success' | 'partial' | 'failed' | null;
  lastSyncCount: number;
  error: string | null;
}

export interface CustomerStats {
  total: number;
  active: number;
  inactive: number;
  uniqueStates: number;
  states: string[];
}

export interface CustomersListResponse {
  success: boolean;
  data: RouteStarCustomer[];
  pagination: {
    total: number;
    skip: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface CustomersQueryParams {
  search?: string;
  state?: string;
  isActive?: boolean;
  limit?: number;
  skip?: number;
}

export function getCustomerStatusColor(isActive: boolean): string {
  return isActive ? '#16a34a' : '#dc2626';
}

export function getCustomerStatusBgColor(isActive: boolean): string {
  return isActive ? '#dcfce7' : '#fee2e2';
}

export function getSyncResultColor(
  result: 'success' | 'partial' | 'failed' | null,
): string {
  switch (result) {
    case 'success':
      return '#16a34a';
    case 'partial':
      return '#f59e0b';
    case 'failed':
      return '#dc2626';
    default:
      return '#6b7280';
  }
}

export function getSyncResultBgColor(
  result: 'success' | 'partial' | 'failed' | null,
): string {
  switch (result) {
    case 'success':
      return '#dcfce7';
    case 'partial':
      return '#fef3c7';
    case 'failed':
      return '#fee2e2';
    default:
      return '#f3f4f6';
  }
}

export function formatPhoneNumber(phone: string): string {
  if (!phone) return '-';
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

export function getFullAddress(customer: RouteStarCustomer): string {
  const parts = [
    customer.address,
    customer.city,
    customer.state,
    customer.zipCode,
  ].filter(Boolean);
  return parts.join(', ') || '-';
}
