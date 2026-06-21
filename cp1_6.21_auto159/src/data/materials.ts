import type { MaterialConfig, AreaConfig, AreaId, AreaMaterialMap } from '../types';

export const MATERIALS: MaterialConfig[] = [
  { id: 'default-white', name: '默认哑光白', category: 'default', color: '#f5f5f5', roughness: 0.8, metalness: 0.0 },
  
  { id: 'wood-oak', name: '橡木', category: 'wood', color: '#c19a6b', roughness: 0.6, metalness: 0.05 },
  { id: 'wood-walnut', name: '胡桃木', category: 'wood', color: '#5d4329', roughness: 0.55, metalness: 0.05 },
  { id: 'wood-maple', name: '枫木', category: 'wood', color: '#e8dcc8', roughness: 0.5, metalness: 0.03 },
  { id: 'wood-cherry', name: '樱桃木', category: 'wood', color: '#a0522d', roughness: 0.55, metalness: 0.04 },
  
  { id: 'stone-marble', name: '大理石', category: 'stone', color: '#e8e4de', roughness: 0.2, metalness: 0.05 },
  { id: 'stone-granite', name: '花岗岩', category: 'stone', color: '#808080', roughness: 0.4, metalness: 0.1 },
  { id: 'stone-slate', name: '板岩', category: 'stone', color: '#4a4a4a', roughness: 0.5, metalness: 0.05 },
  { id: 'stone-travertine', name: '洞石', category: 'stone', color: '#d4c5a9', roughness: 0.6, metalness: 0.02 },
  
  { id: 'fabric-linen', name: '亚麻布', category: 'fabric', color: '#c9b896', roughness: 0.9, metalness: 0.0 },
  { id: 'fabric-velvet', name: '丝绒', category: 'fabric', color: '#4a3728', roughness: 0.85, metalness: 0.0 },
  { id: 'fabric-cotton', name: '棉布', category: 'fabric', color: '#e8e0d0', roughness: 0.95, metalness: 0.0 },
  { id: 'fabric-wool', name: '羊毛', category: 'fabric', color: '#6b5b4f', roughness: 0.88, metalness: 0.0 },
  
  { id: 'metal-brushed-steel', name: '拉丝钢', category: 'metal', color: '#b8b8b8', roughness: 0.3, metalness: 0.9 },
  { id: 'metal-polished-gold', name: '抛光金', category: 'metal', color: '#ffd700', roughness: 0.1, metalness: 1.0 },
  { id: 'metal-copper', name: '紫铜', category: 'metal', color: '#b87333', roughness: 0.25, metalness: 0.95 },
  { id: 'metal-black-iron', name: '黑铁', category: 'metal', color: '#3d3d3d', roughness: 0.5, metalness: 0.8 },
  
  { id: 'glass-clear', name: '透明玻璃', category: 'glass', color: '#e0f0ff', roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.3 },
  { id: 'glass-frosted', name: '磨砂玻璃', category: 'glass', color: '#e8e8e8', roughness: 0.4, metalness: 0.0, transparent: true, opacity: 0.6 },
  { id: 'glass-tinted-blue', name: '蓝色玻璃', category: 'glass', color: '#4a90d9', roughness: 0.1, metalness: 0.0, transparent: true, opacity: 0.5 },
  { id: 'glass-mirror', name: '镜面玻璃', category: 'glass', color: '#c0c0c0', roughness: 0.05, metalness: 1.0 },
];

export const AREAS: AreaConfig[] = [
  { id: 'floor', name: '地板', defaultMaterialId: 'wood-oak' },
  { id: 'wall', name: '墙面', defaultMaterialId: 'default-white' },
  { id: 'sofa', name: '沙发', defaultMaterialId: 'fabric-linen' },
  { id: 'curtain', name: '窗帘', defaultMaterialId: 'fabric-cotton' },
  { id: 'table', name: '茶几', defaultMaterialId: 'stone-marble' },
];

export const DEFAULT_MATERIAL_MAP: AreaMaterialMap = {
  floor: 'wood-oak',
  wall: 'default-white',
  sofa: 'fabric-linen',
  curtain: 'fabric-cotton',
  table: 'stone-marble',
};

export function getMaterialById(id: string): MaterialConfig | undefined {
  return MATERIALS.find(m => m.id === id);
}

export function getMaterialsByCategory(category: string): MaterialConfig[] {
  return MATERIALS.filter(m => m.category === category);
}

export function getAreaById(id: AreaId): AreaConfig | undefined {
  return AREAS.find(a => a.id === id);
}
