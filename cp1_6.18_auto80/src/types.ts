export type ContractStatus = 'pending' | 'signed' | 'expired' | 'updated';

export type TemplateType =
  | 'labor_service'
  | 'confidentiality'
  | 'project_entrust'
  | 'cooperation'
  | 'labor_dispatch';

export interface ContractFields {
  partyA: string;
  partyB: string;
  projectContent: string;
  amount: number;
  startDate: string;
  endDate?: string;
}

export interface ContractSnapshot {
  templateType: TemplateType;
  fields: ContractFields;
  renderedHtml: string;
}

export interface VersionRecord {
  id: string;
  contractId: string;
  versionNumber: number;
  status: ContractStatus;
  signerA?: string;
  signerB?: string;
  signatureA?: string;
  signatureB?: string;
  signedAt?: string;
  snapshot: ContractSnapshot;
  createdAt: string;
}

export interface Contract {
  id: string;
  title: string;
  templateType: TemplateType;
  fields: ContractFields;
  status: ContractStatus;
  currentVersion: number;
  createdAt: string;
  updatedAt: string;
}

export interface TemplateDefinition {
  id: TemplateType;
  name: string;
  description: string;
  icon: string;
  render: (fields: ContractFields) => string;
}
