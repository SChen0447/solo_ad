export interface TraceStage {
  stage_name: string;
  date: string;
  location: string;
  operator: string;
  status: 'completed' | 'pending';
  remarks: string;
  images: string[];
}

export interface ProductTrace {
  trace_code: string;
  product_name: string;
  product_type: string;
  producer_name: string;
  stages: TraceStage[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export type CertStatus = 'pending' | 'approved' | 'rejected';

export interface Certification {
  id: number;
  producer_id: number;
  company_name: string;
  registration_number: string;
  contact_person: string;
  phone: string;
  origin_description: string;
  qualification_files: string[];
  status: CertStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer: string | null;
  certificate_number: string | null;
  reject_reason: string | null;
}

export interface ApplyFormData {
  company_name: string;
  registration_number: string;
  contact_person: string;
  phone: string;
  origin_description: string;
  qualification_files: File[];
}
