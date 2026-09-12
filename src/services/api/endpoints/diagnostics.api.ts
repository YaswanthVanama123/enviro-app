import {apiClient} from '../client';

const BASE_PATH = '/api/diagnostics';

export type ConnectionState =
  | 'connected'
  | 'connecting'
  | 'disconnecting'
  | 'disconnected'
  | 'reachable'
  | 'not_configured'
  | 'disabled'
  | 'self'
  | 'error'
  | 'unknown';

export interface ConnectionCheck {
  key: string;
  label: string;
  required: boolean;
  configured: boolean;
  ok: boolean;
  state: ConnectionState;
  latencyMs?: number;
  database?: string;
  host?: string | null;
  target?: string;
  collections?: Record<string, number>;
  note?: string;
  httpStatus?: number;
  error?: string;
}

export interface ConnectionDiagnostics {
  status: 'ok' | 'degraded' | 'error';
  environment: string;
  checkedAt: string;
  summary: {
    total: number;
    healthy: number;
    failing: number;
    requiredFailing: number;
  };
  checks: ConnectionCheck[];
}

export const diagnosticsApi = {
  async getConnections(): Promise<ConnectionDiagnostics | null> {
    const res = await apiClient.get<ConnectionDiagnostics>(`${BASE_PATH}/connections`);
    const body = res.data as any;
    return body?.success ? (body as ConnectionDiagnostics) : null;
  },
};

export default diagnosticsApi;
