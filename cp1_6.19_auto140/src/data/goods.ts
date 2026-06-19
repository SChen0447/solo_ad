import type { Goods } from '@/types/game';

export const GOODS_LIST: Goods[] = [
  { id: 'water', name: '纯净水', basePrice: 50, icon: '💧' },
  { id: 'food', name: '营养口粮', basePrice: 80, icon: '🍞' },
  { id: 'fuel', name: '反应堆燃料', basePrice: 120, icon: '⚡' },
  { id: 'metal', name: '精炼金属', basePrice: 200, icon: '🔩' },
  { id: 'electronics', name: '电子元件', basePrice: 350, icon: '📟' },
  { id: 'medicine', name: '医疗物资', basePrice: 500, icon: '💊' },
  { id: 'luxury', name: '奢侈品', basePrice: 800, icon: '💎' },
  { id: 'weapons', name: '武器装备', basePrice: 1000, icon: '🔫' },
  { id: 'alien_tech', name: '外星科技', basePrice: 2000, icon: '👽' },
  { id: 'rare_mineral', name: '稀有矿物', basePrice: 1500, icon: '💠' },
];

export const STATION_NAMES = [
  '新伊甸空间站', '猎户座前哨', '天狼星贸易站', '仙女座中继站',
  '北极星港', '织女星枢纽', '参宿四平台', '南河三殖民地',
  '心宿二基地', '角宿一市场', '大角星驿站', '五车二码头',
  '河鼓二港口', '天津四要塞', '北落师门中转站',
];

export function getGoodsById(id: string): Goods {
  return GOODS_LIST.find(g => g.id === id) ?? GOODS_LIST[0];
}
