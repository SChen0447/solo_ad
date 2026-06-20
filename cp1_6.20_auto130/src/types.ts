export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  price: number;
  stock: number;
  coverUrl: string;
}

export interface OrderItem {
  bookId: string;
  title: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  totalPrice: number;
  status: '待处理' | '已确认' | '已完成';
  createdAt: string;
}

export interface CartItem {
  bookId: string;
  title: string;
  price: number;
  quantity: number;
  coverUrl: string;
}
