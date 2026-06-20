export interface Paragraph {
  index: number;
  original: string;
  translation: string;
  review_status: 'pending' | 'reviewed' | 'disputed';
}

export interface Comment {
  id: string;
  paragraph_index: number;
  content: string;
  user_name: string;
  user_id: string;
  avatar_color: string;
  created_at: string;
}

export interface OnlineUser {
  user_id: string;
  user_name: string;
  avatar_color: string;
  joined_at: string;
}

export interface UploadResponse {
  doc_id: string;
  filename: string;
  paragraph_count: number;
  source_lang: string;
  target_lang: string;
}

export interface TranslationResponse {
  doc_id: string;
  page: number;
  page_size: number;
  total: number;
  paragraphs: Paragraph[];
}

export interface TranslateResponse {
  doc_id: string;
  status: string;
  paragraph_count: number;
}
