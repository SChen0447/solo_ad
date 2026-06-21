export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'completed';

export type OrderType = 'by_hour' | 'by_piece';

export type CommunicationMethod = 'phone' | 'wechat' | 'in_person' | 'email';

export interface StatusHistory {
  id: number;
  order_id: number;
  from_status: OrderStatus | null;
  to_status: OrderStatus;
  changed_at: string;
}

export interface Communication {
  id: number;
  order_id: number;
  communication_date: string;
  method: CommunicationMethod;
  content: string;
  created_at: string;
}

export interface OrderAttachment {
  id: number;
  order_id: number;
  file_path: string;
  file_name: string;
  created_at: string;
}

export interface Order {
  id: number;
  customer_name: string;
  customer_phone: string;
  work_name: string;
  order_type: OrderType;
  deadline: string | null;
  notes: string;
  status: OrderStatus;
  last_communication: string | null;
  created_at: string;
  updated_at: string;
  comm_count?: number;
  attach_count?: number;
  status_history: StatusHistory[];
  communications: Communication[];
  attachments: OrderAttachment[];
}

export interface CreateOrderData {
  customer_name: string;
  customer_phone?: string;
  work_name: string;
  order_type?: OrderType;
  deadline?: string | null;
  notes?: string;
  status?: OrderStatus;
}

export interface CreateCommunicationData {
  communication_date: string;
  method: CommunicationMethod;
  content: string;
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: '待沟通',
  in_progress: '制作中',
  ready: '待交付',
  completed: '已完成',
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  by_hour: '按工时收费',
  by_piece: '按件收费',
};

export const COMMUNICATION_METHOD_LABELS: Record<CommunicationMethod, string> = {
  phone: '电话',
  wechat: '微信',
  in_person: '当面',
  email: '邮件',
};
