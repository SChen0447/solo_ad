export type ProposalStatus = 'draft' | 'sent' | 'accepted' | 'rejected';

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  unitPrice: number;
  quantity: number;
  unit: string;
}

export interface Comment {
  id: string;
  author: string;
  content: string;
  rating: number;
  timestamp: number;
}

export interface ProposalVersion {
  id: string;
  title: string;
  description: string;
  services: ServiceItem[];
  totalAmount: number;
  clientName: string;
  clientEmail: string;
  companyName: string;
  companyEmail: string;
  companyAddress: string;
  companyPhone: string;
  createdAt: number;
}

export interface Proposal {
  id: string;
  title: string;
  description: string;
  services: ServiceItem[];
  totalAmount: number;
  status: ProposalStatus;
  clientName: string;
  clientEmail: string;
  companyName: string;
  companyEmail: string;
  companyAddress: string;
  companyPhone: string;
  lastUpdated: number;
  versions: ProposalVersion[];
  comments: Comment[];
}

export const statusLabels: Record<ProposalStatus, string> = {
  draft: '草稿',
  sent: '已发送',
  accepted: '已接受',
  rejected: '已拒绝'
};
