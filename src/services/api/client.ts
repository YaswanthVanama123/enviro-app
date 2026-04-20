import {API_BASE_URL} from '../../config';

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

type UnauthorizedCallback = () => void;

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private onUnauthorized: UnauthorizedCallback | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setUnauthorizedCallback(cb: UnauthorizedCallback | null) {
    this.onUnauthorized = cb;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  private handleUnauthorized(status: number, endpoint: string) {
    const isProtected =
      endpoint.includes('/admin') ||
      endpoint.includes('/api/pdf') ||
      endpoint.includes('/api/email') ||
      endpoint.includes('/api/upload') ||
      endpoint.includes('/api/service-configs');

    if ((status === 401 || status === 403) && isProtected && this.onUnauthorized) {
      this.onUnauthorized();
    }
  }

  private getHeaders(contentType = 'application/json'): Record<string, string> {
    const headers: Record<string, string> = {'Content-Type': contentType};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }
    return headers;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        this.handleUnauthorized(res.status, endpoint);
        return {error: data.message || 'Request failed', status: res.status};
      }
      return {data, status: res.status};
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Network error',
        status: 0,
      };
    }
  }

  async post<T, D = any>(endpoint: string, body: D): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        this.handleUnauthorized(res.status, endpoint);
        return {error: data.message || 'Request failed', status: res.status};
      }
      return {data, status: res.status};
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Network error',
        status: 0,
      };
    }
  }

  async put<T, D = any>(endpoint: string, body: D): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        this.handleUnauthorized(res.status, endpoint);
        return {error: data.message || 'Request failed', status: res.status};
      }
      return {data, status: res.status};
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Network error',
        status: 0,
      };
    }
  }

  async patch<T, D = any>(endpoint: string, body: D): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: JSON.stringify(body),
      });
      const text = await res.text();
      let data: any = null;
      try {data = JSON.parse(text);} catch {}
      if (!res.ok) {
        this.handleUnauthorized(res.status, endpoint);
        return {error: data?.message || `HTTP ${res.status}: ${endpoint}`, status: res.status};
      }
      return {data, status: res.status};
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Network error',
        status: 0,
      };
    }
  }

  async postFormData<T>(endpoint: string, body: FormData): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {};
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body,
      });
      const data = await res.json();
      if (!res.ok) {
        this.handleUnauthorized(res.status, endpoint);
        return {error: data.message || 'Upload failed', status: res.status};
      }
      return {data, status: res.status};
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Network error',
        status: 0,
      };
    }
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const res = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        this.handleUnauthorized(res.status, endpoint);
        return {error: data.message || 'Request failed', status: res.status};
      }
      return {data, status: res.status};
    } catch (err) {
      return {
        error: err instanceof Error ? err.message : 'Network error',
        status: 0,
      };
    }
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
