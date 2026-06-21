import { Order, OrderStatus } from '../types';

export const fetchOrders = async (): Promise<Order[]> => {
  const response = await fetch('/api/orders');
  if (!response.ok) {
    throw new Error('获取订单列表失败');
  }
  return response.json();
};

export const fetchOrderById = async (id: string): Promise<Order> => {
  const response = await fetch(`/api/orders/${id}`);
  if (!response.ok) {
    throw new Error('获取订单详情失败');
  }
  return response.json();
};

export const updateOrderStatus = async (
  id: string,
  status: OrderStatus
): Promise<Order> => {
  const response = await fetch(`/api/orders/${id}/status`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error('更新订单状态失败');
  }
  return response.json();
};

export const cancelOrder = async (id: string): Promise<Order> => {
  const response = await fetch(`/api/orders/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('取消订单失败');
  }
  return response.json();
};
