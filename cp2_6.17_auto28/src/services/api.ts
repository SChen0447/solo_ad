import type { Package, CreatePackageRequest, CreatePackageResponse, ClaimRequest, ClaimResponse } from '../types';

const API_BASE_URL = '/api';

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || `HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const api = {
  getPackages: async (): Promise<Package[]> => {
    const response = await fetch(`${API_BASE_URL}/packages`);
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
};
