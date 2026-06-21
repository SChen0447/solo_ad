import type { Work, MaterialPack, MaterialRecommendation } from '../../shared/types';

const API_BASE = '';

export async function fetchWorks(): Promise<Work[]> {
  const res = await fetch(`${API_BASE}/api/works`);
  if (!res.ok) throw new Error('获取作品列表失败');
  return res.json();
}

export async function fetchWorkById(id: string): Promise<Work> {
  const res = await fetch(`${API_BASE}/api/works/${id}`);
  if (!res.ok) throw new Error('获取作品详情失败');
  return res.json();
}

export async function fetchMaterials(): Promise<MaterialPack[]> {
  const res = await fetch(`${API_BASE}/api/materials`);
  if (!res.ok) throw new Error('获取材料包列表失败');
  return res.json();
}

export async function fetchMaterialById(id: string): Promise<MaterialPack> {
  const res = await fetch(`${API_BASE}/api/materials/${id}`);
  if (!res.ok) throw new Error('获取材料包详情失败');
  return res.json();
}

export async function createOrder(payload: {
  materialPackId: string;
  quantity: number;
  customerName: string;
  customerPhone: string;
}) {
  const res = await fetch(`${API_BASE}/api/orders`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('创建订单失败');
  return res.json();
}

export async function fetchOrders() {
  const res = await fetch(`${API_BASE}/api/orders`);
  if (!res.ok) throw new Error('获取订单列表失败');
  return res.json();
}
