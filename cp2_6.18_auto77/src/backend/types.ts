export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'delivered';

export interface RequestItem {
  id: string;
  title: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  applicant: string;
  status: RequestStatus;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequestInput {
  title: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  applicant: string;
}

export interface UpdateStatusInput {
  status: RequestStatus;
}
