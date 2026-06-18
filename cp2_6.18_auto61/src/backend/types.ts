export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'delivered';

export interface Item {
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface RequestItem {
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
  total: number;
}

export interface UpdateStatusPayload {
  status: RequestStatus;
}
