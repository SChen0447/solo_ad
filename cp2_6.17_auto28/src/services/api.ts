import type {
  CreatePackageRequest,
  CreatePackageResponse,
  ClaimRequest,
  ClaimResponse,
  GetPackagesQuery,
  GetPackagesResponse,
  NotifyResponse
} from '../types';

const API_BASE_URL = '/api';

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

const buildQueryString = (params: Record<string, any>): string => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
};

export const api = {
  getPackages: async (query?: GetPackagesQuery): Promise<GetPackagesResponse> => {
    const queryString = buildQueryString(query || {});
    const response = await fetch(`${API_BASE_URL}/packages${queryString}`);
    return handleResponse(response);
  },

  createPackage: async (data: CreatePackageRequest): Promise<CreatePackageResponse> => {
    const response = await fetch(`${API_BASE_URL}/packages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  claimPackage: async (data: ClaimRequest): Promise<ClaimResponse> => {
    const response = await fetch(`${API_BASE_URL}/claim`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    return handleResponse(response);
  },

  notifyOwner: async (packageId: string): Promise<NotifyResponse> => {
    const response = await fetch(`${API_BASE_URL}/packages/${packageId}/notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return handleResponse(response);
  },
};
