export interface Commodity {
  id: string;
  name: string;
  basePrice: number;
  minPrice: number;
  maxPrice: number;
  color: number;
  iconShape: 'triangle' | 'square' | 'circle' | 'diamond' | 'star';
  sinOffset: number;
  sinAmplitude: number;
  sinFrequency: number;
}

export interface KlineCandle {
  open: number;
  close: number;
  high: number;
  low: number;
}

export interface CommodityPriceState {
  commodityId: string;
  currentPrice: number;
  previousPrice: number;
  trend: 'up' | 'down' | 'flat';
  history: KlineCandle[];
  currentCandle: KlineCandle | null;
}

export const COMMODITIES: Commodity[] = [
  {
    id: 'apple',
    name: '苹果',
    basePrice: 10,
    minPrice: 5,
    maxPrice: 30,
    color: 0xff4444,
    iconShape: 'triangle',
    sinOffset: 0,
    sinAmplitude: 1.5,
    sinFrequency: 0.003,
  },
  {
    id: 'wheat',
    name: '小麦',
    basePrice: 8,
    minPrice: 4,
    maxPrice: 25,
    color: 0xf5deb3,
    iconShape: 'square',
    sinOffset: Math.PI / 3,
    sinAmplitude: 1.2,
    sinFrequency: 0.0025,
  },
  {
    id: 'iron',
    name: '铁锭',
    basePrice: 25,
    minPrice: 15,
    maxPrice: 60,
    color: 0x888888,
    iconShape: 'circle',
    sinOffset: Math.PI / 2,
    sinAmplitude: 3,
    sinFrequency: 0.002,
  },
  {
    id: 'silk',
    name: '丝绸',
    basePrice: 50,
    minPrice: 30,
    maxPrice: 120,
    color: 0xd8bfd8,
    iconShape: 'diamond',
    sinOffset: Math.PI,
    sinAmplitude: 5,
    sinFrequency: 0.0018,
  },
  {
    id: 'spice',
    name: '香料',
    basePrice: 80,
    minPrice: 50,
    maxPrice: 200,
    color: 0xff8c00,
    iconShape: 'star',
    sinOffset: (4 * Math.PI) / 3,
    sinAmplitude: 8,
    sinFrequency: 0.0015,
  },
];

export function calculateSinePrice(commodity: Commodity, timeMs: number): number {
  const base = commodity.basePrice;
  const amp = commodity.sinAmplitude;
  const freq = commodity.sinFrequency;
  const offset = commodity.sinOffset;
  const sine = Math.sin(timeMs * freq + offset);
  return base + sine * amp;
}

export function clampPrice(commodity: Commodity, price: number): number {
  return Math.max(commodity.minPrice, Math.min(commodity.maxPrice, price));
}

export function applyBuyImpact(price: number): number {
  const impact = 1 + (0.05 + Math.random() * 0.05);
  return price * impact;
}

export function applySellImpact(price: number): number {
  const impact = 1 - (0.05 + Math.random() * 0.05);
  return price * impact;
}

export function getCommodityById(id: string): Commodity | undefined {
  return COMMODITIES.find((c) => c.id === id);
}
