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
