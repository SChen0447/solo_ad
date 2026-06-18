import type { Order, Product, SortItem, AppNotification, TodayStats, TrendItem, TopProduct, CategoryDistribution } from './types';

const BASE = '/api';

export async function fetchOrders(status?: string, keyword?: string): Promise<Order[]> {
  const params = new URLSearchParams();
  if (status) params.set('status', status);
  if (keyword) params.set('keyword', keyword);
  const res = await fetch(`${BASE}/orders?${params}`);
  return res.json();
}

export async function fetchTodayStats(): Promise<TodayStats> {
  const res = await fetch(`${BASE}/orders/stats/today`);
  return res.json();
}

export async function updateOrderStatus(id: string, status: Order['status']): Promise<Order> {
  const res = await fetch(`${BASE}/orders/${id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  return res.json();
}

export async function fetchProducts(category?: string): Promise<Product[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  const res = await fetch(`${BASE}/products?${params}`);
  return res.json();
}

export async function createProduct(product: Omit<Product, 'id'>): Promise<Product> {
  const res = await fetch(`${BASE}/products`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  return res.json();
}

export async function updateProduct(id: string, product: Partial<Product>): Promise<Product> {
  const res = await fetch(`${BASE}/products/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(product),
  });
  return res.json();
}

export async function deleteProduct(id: string): Promise<void> {
  await fetch(`${BASE}/products/${id}`, { method: 'DELETE' });
}

export async function fetchSortList(): Promise<SortItem[]> {
  const res = await fetch(`${BASE}/sort/list`);
  return res.json();
}

export async function updateSortCheck(productId: string, userName: string, checked: boolean): Promise<void> {
  await fetch(`${BASE}/sort/check`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, userName, checked }),
  });
}

export async function completeSort(): Promise<void> {
  await fetch(`${BASE}/sort/complete`, { method: 'POST' });
}

export async function fetchTrend(): Promise<TrendItem[]> {
  const res = await fetch(`${BASE}/stats/trend`);
  return res.json();
}

export async function fetchTopProducts(): Promise<TopProduct[]> {
  const res = await fetch(`${BASE}/stats/top-products`);
  return res.json();
}

export async function fetchCategoryDistribution(): Promise<CategoryDistribution[]> {
  const res = await fetch(`${BASE}/stats/category-distribution`);
  return res.json();
}

export async function fetchNotifications(): Promise<AppNotification[]> {
  const res = await fetch(`${BASE}/notifications`);
  return res.json();
}

export async function markNotificationRead(id: string): Promise<void> {
  await fetch(`${BASE}/notifications/${id}/read`, { method: 'PUT' });
}

export async function fetchUnreadCount(): Promise<number> {
  const res = await fetch(`${BASE}/notifications/unread-count`);
  const data = await res.json();
  return data.count;
}
