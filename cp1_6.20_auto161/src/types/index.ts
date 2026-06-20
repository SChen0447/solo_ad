export type InstrumentType = 'guitar' | 'violin' | 'saxophone' | 'keyboard';
export type AngleType = 'front' | 'back' | 'side' | 'top';
export type PartKey = 'headstock' | 'neck' | 'body' | 'bridge' | 'accessories';
export type Grade = 'S' | 'A' | 'B' | 'C' | 'D';
export type TransactionStatus = 'escrow' | 'inspection_period' | 'completed' | 'disputed' | 'cancelled';

export interface PartPhoto {
  part: PartKey;
  angle: AngleType;
  image?: string;
}

export interface PartDetail {
  name: string;
  angle: AngleType;
  angle_label: string;
  image: string;
  score: number;
  clarity: number;
  completeness: number;
  angle_standard: number;
  description: string;
}

export interface InspectionReport {
  id: string;
  instrument_id: string | null;
  instrument_type: InstrumentType;
  instrument_type_name: string;
  overall_score: number;
  grade: Grade;
  grade_color: string;
  generated_at: string;
  parts: Record<PartKey, PartDetail>;
  summary: string;
  used: boolean;
}

export interface Instrument {
  id: string;
  name: string;
  type: InstrumentType;
  type_name: string;
  brand: string;
  price: number;
  year: number;
  seller_id: string;
  seller_name: string;
  report_id: string;
  grade: Grade;
  grade_color: string;
  overall_score: number;
  thumbnail: string;
  description: string;
  created_at: string;
  status: string;
  location: string;
}

export interface Dispute {
  reason: string;
  description: string;
  evidence_images: string[];
  filed_at: string;
  status: string;
}

export interface Review {
  id: string;
  transaction_id: string;
  rating: number;
  comment: string;
  created_at: string;
  from?: string;
  to?: string;
}

export interface Transaction {
  id: string;
  instrument_id: string;
  instrument_name: string;
  instrument_thumbnail: string;
  price: number;
  seller_id: string;
  seller_name: string;
  buyer_id: string;
  buyer_name: string;
  status: TransactionStatus;
  created_at: string;
  inspection_deadline: string;
  confirmed_at?: string;
  completed_at?: string;
  dispute: Dispute | null;
  review_by_seller: Review | null;
  review_by_buyer: Review | null;
  pending_role?: 'buyer' | 'seller';
}

export interface UserProfile {
  id: string;
  nickname: string;
  avatar: string;
  reputation: number;
  total_ratings: number;
  recent_reviews?: Review[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

export interface ListResponse<T> {
  items: T[];
  total: number;
}

export interface InstrumentQuery {
  page?: number;
  per_page?: number;
  type?: InstrumentType;
  grade?: Grade;
  min_price?: number;
  max_price?: number;
  keyword?: string;
}

export interface SubmitInspectionPayload {
  instrument_type: InstrumentType;
  photos: PartPhoto[];
  images?: Record<PartKey, string>;
}

export interface MetaOption {
  value: string;
  label: string;
  icon?: string;
  color?: string;
  desc?: string;
}
