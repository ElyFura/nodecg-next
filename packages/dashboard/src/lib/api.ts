/**
 * API Client for NodeCG Dashboard
 * Handles all HTTP requests to the backend server
 */

/* eslint-disable no-undef */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchJSON<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      credentials: 'include', // Send cookies for authentication
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new ApiError(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`,
        response.status,
        errorData
      );
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(error instanceof Error ? error.message : 'Network error', 0);
  }
}

// Dashboard Stats API
export interface DashboardStats {
  bundles: number;
  replicants: number;
  users: number;
  status: 'online' | 'offline' | 'error';
  uptime: number;
}

export async function getStats(): Promise<DashboardStats> {
  return fetchJSON<DashboardStats>('/api/stats');
}

// Bundles API
export interface DashboardPanel {
  name: string;
  title: string;
  file: string;
  width: number;
  url: string;
}

export interface BundleGraphic {
  file: string;
  width: number;
  height: number;
  url: string;
}

export interface Bundle {
  name: string;
  version: string;
  description: string;
  author: string;
  homepage?: string;
  git?: {
    url: string;
    branch: string;
  };
  compatibleRange?: string;
  dependencies?: string[];
  bundleDependencies?: Record<string, string>;
  panelCount: number;
  graphicCount: number;
  extensionPath?: string;
  hasExtension: boolean;
  hasDashboard: boolean;
  hasGraphics: boolean;
  dashboardPanels: DashboardPanel[];
  graphics: BundleGraphic[];
}

export interface BundlesResponse {
  bundles: Bundle[];
  total: number;
}

export async function getBundles(): Promise<BundlesResponse> {
  return fetchJSON<BundlesResponse>('/api/bundles');
}

export async function reloadBundles(): Promise<{ success: boolean; message: string }> {
  return fetchJSON('/api/bundles/reload', { method: 'POST' });
}

// Replicants API
export interface Replicant {
  namespace: string;
  name: string;
  value: unknown;
  schema?: Record<string, unknown>;
  revision: number;
  updatedAt: string;
}

export interface ReplicantsResponse {
  replicants: Replicant[];
  total: number;
}

export async function getReplicants(): Promise<ReplicantsResponse> {
  return fetchJSON<ReplicantsResponse>('/api/replicants');
}

export async function getReplicant(namespace: string, name: string): Promise<Replicant> {
  return fetchJSON<Replicant>(`/api/replicants/${namespace}/${name}`);
}

export async function updateReplicant(
  namespace: string,
  name: string,
  value: unknown
): Promise<Replicant> {
  return fetchJSON<Replicant>(`/api/replicants/${namespace}/${name}`, {
    method: 'PUT',
    body: JSON.stringify({ value }),
  });
}

export async function deleteReplicant(namespace: string, name: string): Promise<void> {
  return fetchJSON(`/api/replicants/${namespace}/${name}`, {
    method: 'DELETE',
  });
}

// Users API
export interface User {
  id: string;
  username: string;
  email: string | null;
  roleId: string | null;
  createdAt: string;
  updatedAt: string;
  role?: {
    id: string;
    name: string;
    description: string | null;
  };
}

export interface UsersResponse {
  users: User[];
  total: number;
}

export async function getUsers(): Promise<UsersResponse> {
  return fetchJSON<UsersResponse>('/api/users');
}

export async function createUser(data: {
  username: string;
  password: string;
  email?: string;
  roleId?: string;
}): Promise<User> {
  return fetchJSON<User>('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateUser(id: string, data: Partial<User>): Promise<User> {
  return fetchJSON<User>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteUser(id: string): Promise<void> {
  return fetchJSON(`/api/users/${id}`, {
    method: 'DELETE',
  });
}

// Authentication API
export interface AuthResponse {
  user: User;
  accessToken: string;
}

export async function login(username: string, password: string): Promise<AuthResponse> {
  return fetchJSON<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function logout(): Promise<void> {
  return fetchJSON('/auth/logout', {
    method: 'POST',
  });
}

export async function getCurrentUser(): Promise<User> {
  return fetchJSON<User>('/auth/me');
}

export { ApiError };
