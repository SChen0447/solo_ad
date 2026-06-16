export interface InvoiceItem {
  name: string;
  spec: string;
  quantity: number;
  unit_price: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  total_amount_tax: number;
  total_amount_no_tax: number;
  tax_amount: number;
  buyer_name: string;
  seller_name: string;
  items: InvoiceItem[];
  thumbnail?: string;
  original_image?: string;
  file_name?: string;
  created_at: number;
}

export interface OCRResponse {
  success: boolean;
  data: Omit<Invoice, 'id' | 'created_at'>;
}

export interface SearchFilters {
  keyword: string;
  dateFrom: string;
  dateTo: string;
  amountMin: string;
  amountMax: string;
}
