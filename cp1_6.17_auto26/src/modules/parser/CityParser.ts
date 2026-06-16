import { findCityByName, CityInfo } from '../data/cityDatabase';

export interface CityNode {
  id: string;
  name: string;
  nameEn?: string;
  lat: number;
  lng: number;
  days: number;
  attractions?: string[];
  order: number;
}

export interface ParseResult {
  cities: CityNode[];
  rawText: string;
  warnings: string[];
}

export function generateId(): string {
  return `city_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function parseDaysFromContext(text: string, cityIndex: number, cityName: string): number {
  const beforeText = text.slice(0, cityIndex);
  const afterText = text.slice(cityIndex + cityName.length);
  
  const patterns: RegExp[] = [
    /(\d+)\s*天/,
    /(\d+)\s*days?/i,
    /(\d+)\s*日/,
    /停留\s*(\d+)/,
    /stay\s*(\d+)/i,
    /for\s*(\d+)\s*days?/i,
  ];
  
  for (const pattern of patterns) {
    const afterMatch = afterText.match(pattern);
    if (afterMatch) {
      const days = parseInt(afterMatch[1], 10);
      if (days >= 1 && days <= 365) return days;
    }
    const beforeMatch = beforeText.match(pattern);
    if (beforeMatch) {
      const days = parseInt(beforeMatch[1], 10);
      if (days >= 1 && days <= 365) return days;
    }
  }
  
  return 1;
}

function extractCityCandidates(text: string): Array<{ name: string; index: number; rawName: string }> {
  const candidates: Array<{ name: string; index: number; rawName: string }> = [];
  
  const separators = /[，,。；;、\s\n\r\t→->到去飞前往fromto]{1,}/i;
  const tokens = text.split(separators);
  let currentIndex = 0;
  
  for (const token of tokens) {
    const trimmed = token.trim();
    if (!trimmed || trimmed.length < 1 || trimmed.length > 50) {
      currentIndex = text.indexOf(token, currentIndex) + token.length;
      continue;
    }
    
    const isChinese = /[\u4e00-\u9fa5]/.test(trimmed);
    const isEnglish = /^[a-zA-Z\s'-]+$/.test(trimmed);
    
    if (isChinese && trimmed.length >= 2 && trimmed.length <= 6) {
      const idx = text.indexOf(trimmed, currentIndex);
      if (idx !== -1) {
        candidates.push({ name: trimmed, index: idx, rawName: trimmed });
      }
    } else if (isEnglish && trimmed.length >= 3 && trimmed.length <= 30) {
      const idx = text.search(new RegExp(`\\b${trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i'));
      if (idx !== -1) {
        candidates.push({ name: trimmed, index: idx >= 0 ? idx : currentIndex, rawName: trimmed });
      }
    }
    
    const nextIdx = text.indexOf(token, currentIndex);
    if (nextIdx !== -1) {
      currentIndex = nextIdx + token.length;
    }
  }
  
  return candidates.sort((a, b) => a.index - b.index);
}

export async function parseRouteText(text: string): Promise<ParseResult> {
  const warnings: string[] = [];
  const cityNodes: CityNode[] = [];
  
  if (!text || !text.trim()) {
    return {
      cities: [],
      rawText: text,
      warnings: ['请输入旅行路线文本'],
    };
  }
  
  const candidates = extractCityCandidates(text);
  const usedIndices = new Set<number>();
  
  for (const candidate of candidates) {
    if (usedIndices.has(candidate.index)) continue;
    
    const cityInfo: CityInfo | null = findCityByName(candidate.name);
    
    if (!cityInfo) {
      warnings.push(`未识别的城市："${candidate.name}"`);
      continue;
    }
    
    const isNearDuplicate = cityNodes.some(node => 
      Math.abs(node.lat - cityInfo.lat) < 0.01 && Math.abs(node.lng - cityInfo.lng) < 0.01
    );
    
    if (isNearDuplicate) {
      continue;
    }
    
    const days = parseDaysFromContext(text, candidate.index, candidate.rawName);
    
    const node: CityNode = {
      id: generateId(),
      name: cityInfo.zh || candidate.name,
      nameEn: cityInfo.en,
      lat: cityInfo.lat,
      lng: cityInfo.lng,
      days: days,
      attractions: cityInfo.attractions,
      order: cityNodes.length,
    };
    
    cityNodes.push(node);
    usedIndices.add(candidate.index);
  }
  
  if (cityNodes.length === 0) {
    warnings.push('未能从文本中识别出有效的城市，请尝试使用标准城市名称（支持中文或英文）');
  } else if (cityNodes.length === 1) {
    warnings.push('仅识别出一个城市，建议至少输入2个城市以生成路线');
  }
  
  return {
    cities: cityNodes,
    rawText: text,
    warnings: warnings,
  };
}

export function createEmptyNode(order: number): CityNode {
  return {
    id: generateId(),
    name: '',
    lat: 0,
    lng: 0,
    days: 1,
    order: order,
  };
}
