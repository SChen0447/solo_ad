export interface RequestItem {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseRequest {
  id: string;
  title: string;
  items: RequestItem[];
  applicant: string;
  status: 'pending' | 'approved' | 'rejected' | 'delivered';
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequestDto {
  title: string;
  items: RequestItem[];
  applicant: string;
  total: number;
}

export interface UpdateStatusDto {
  status: 'approved' | 'rejected' | 'delivered';
}
