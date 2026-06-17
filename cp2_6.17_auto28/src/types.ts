export type PackageStatus = 'pending' | 'picked' | 'overdue';

export interface Package {
  id: string;
  recipientName: string;
  phone: string;
  courierCompany: string;
  remark: string;
  pickupCode: string;
  status: PackageStatus;
  createdAt: number;
  pickedAt: number | null;
  lastNotifiedAt: number | null;
}

export interface GetPackagesQuery {
  page?: number;
  limit?: number;
  status?: PackageStatus;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface GetPackagesResponse {
  data: Package[];
  pagination: PaginationInfo;
}

export interface CreatePackageRequest {
  recipientName: string;
  phone: string;
  courierCompany: string;
  remark?: string;
}

export interface CreatePackageResponse {
  id: string;
  pickupCode: string;
  status: PackageStatus;
  createdAt: number;
}

export interface ClaimRequest {
  pickupCode: string;
}

export interface ClaimResponse {
  success: boolean;
  message: string;
  package: Package;
}

export interface NotifyResponse {
  success: boolean;
  message: string;
  lastNotifiedAt: number;
}
