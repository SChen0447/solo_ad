import type {
  WeaponType,
  WeaponQuality,
  MaterialType,
  PriceHistoryResponse,
  MaterialStock
} from '../types';

const API_BASE = '/api';

export const MarketService = {
  async fetchPriceHistory(type: WeaponType): Promise<PriceHistoryResponse> {
    const res = await fetch(`${API_BASE}/price-history?type=${type}`);
    if (!res.ok) throw new Error('Failed to fetch price history');
    return res.json();
  },

  async sellWeapon(type: WeaponType, quality: WeaponQuality): Promise<{
    success: boolean;
    price: number;
    record: { id: string; price: number; timestamp: number; quality: WeaponQuality };
  }> {
    const res = await fetch(`${API_BASE}/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'sell', type, quality })
    });
    if (!res.ok) throw new Error('Failed to execute trade');
    return res.json();
  },

  async buyMaterial(material: MaterialType, quantity: number = 1): Promise<{
    success: boolean;
    material: MaterialType;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    remainingStock: number;
  }> {
    const res = await fetch(`${API_BASE}/trade`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'buy_material', material, quantity })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to buy material');
    }
    return res.json();
  },

  async fetchMaterials(): Promise<Record<MaterialType, MaterialStock>> {
    const res = await fetch(`${API_BASE}/materials`);
    if (!res.ok) throw new Error('Failed to fetch materials');
    return res.json();
  }
};
