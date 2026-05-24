/**
 * Bigin Audit Types for Mobile
 * Types for audit logs scraped from Zoho Bigin
 */

export interface BiginAuditLog {
  _id: string;
  biginId: string | null;
  timestamp: string;
  user: string;
  userEmail: string | null;
  action: string;
  module: string | null;
  recordName: string | null;
  recordId: string | null;
  details: string | null;
  ipAddress: string | null;
  rawData: Record<string, unknown>;
  scrapeSessionId: string | null;
  scrapedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScrapeStatus {
  isRunning: boolean;
  lastScrapeAt: string | null;
  lastScrapeResult: 'success' | 'failed' | null;
  progress: number;
  message: string;
  currentSessionId: string | null;
  totalLogs: number;
  latestLogTimestamp: string | null;
  lastSession: {
    sessionId: string;
    status: string;
    logsScraped: number;
    completedAt: string | null;
  } | null;
}

export interface AuditStats {
  total: number;
  storageSize: number;
  uniqueUsers: number;
  uniqueActions: number;
  uniqueModules: number;
  last24Hours: number;
  last7Days: number;
  users: string[];
  actions: string[];
  modules: string[];
  pipelines: string[];
  actionBreakdown: Array<{ action: string; count: number }>;
  userBreakdown: Array<{ user: string; count: number }>;
}

export interface AuditLogsListResponse {
  success: boolean;
  data: BiginAuditLog[];
  pagination: {
    total: number;
    skip: number;
    limit: number;
    hasMore: boolean;
  };
}

export interface AuditLogsQueryParams {
  search?: string;
  user?: string;
  action?: string;
  module?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  skip?: number;
}

// Helper function to get action color
export function getActionColor(action: string): string {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('create') || lowerAction.includes('add')) {
    return '#16a34a'; // green
  }
  if (lowerAction.includes('delete') || lowerAction.includes('remove')) {
    return '#dc2626'; // red
  }
  if (lowerAction.includes('update') || lowerAction.includes('edit') || lowerAction.includes('modify')) {
    return '#2563eb'; // blue
  }
  if (lowerAction.includes('login') || lowerAction.includes('logout')) {
    return '#d97706'; // orange
  }
  return '#64748b'; // gray
}

// Helper function to get action background color
export function getActionBackgroundColor(action: string): string {
  const lowerAction = action.toLowerCase();
  if (lowerAction.includes('create') || lowerAction.includes('add')) {
    return '#dcfce7'; // green light
  }
  if (lowerAction.includes('delete') || lowerAction.includes('remove')) {
    return '#fee2e2'; // red light
  }
  if (lowerAction.includes('update') || lowerAction.includes('edit') || lowerAction.includes('modify')) {
    return '#dbeafe'; // blue light
  }
  if (lowerAction.includes('login') || lowerAction.includes('logout')) {
    return '#fef3c7'; // orange light
  }
  return '#f1f5f9'; // gray light
}

// Helper function to format date
export function formatAuditDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleString();
}

// Helper function to format bytes to human-readable size
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
