export interface Item {
  name: string;
  quantity: number;
  unitPrice: number;
}

export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'delivered';

export interface PurchaseRequest {
  id: string;
  title: string;
  items: Item[];
  applicant: string;
  status: RequestStatus;
  total: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRequestPayload {
  title: string;
  items: Item[];
  applicant: string;
}

export interface UpdateStatusPayload {
  status: RequestStatus;
}
