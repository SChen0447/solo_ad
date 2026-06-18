export interface Party {
  email: string;
  signedAt: string | null;
  signatureData: string | null;
}

export type ProtocolStatus = 'pending' | 'signed' | 'completed';

export interface Protocol {
  id: string;
  title: string;
  content: string;
  parties: Party[];
  status: ProtocolStatus;
  createdAt: string;
}

export interface CreateProtocolRequest {
  title: string;
  content: string;
  parties: string[];
}

export interface SignProtocolRequest {
  email: string;
  signatureData: string;
  signedAt: string;
}

export type FilterStatus = 'all' | ProtocolStatus;
