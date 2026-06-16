import { CityNode } from './CityParser';
import { findCityByName } from '../data/cityDatabase';

export interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  cityId?: string;
  cityName?: string;
  message: string;
  suggestion?: string;
}

export interface ValidatedRoute {
  cities: CityNode[];
  issues: ValidationIssue[];
  isValid: boolean;
  totalDistanceKm: number;
}

export function calculateHaversineDistance(
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    !isNaN(lat) && !isNaN(lng) &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180
  );
}

export function validateCityNode(node: CityNode): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  if (!node.name || node.name.trim() === '') {
    issues.push({
      type: 'error',
      cityId: node.id,
      message: '城市名称不能为空',
      suggestion: '请输入有效的中文或英文城市名',
    });
    return issues;
  }
  
  if (!isValidCoordinate(node.lat, node.lng)) {
    const found = findCityByName(node.name);
    if (found) {
      issues.push({
        type: 'info',
        cityId: node.id,
        cityName: node.name,
        message: `已根据城市名 "${node.name}" 自动补全坐标`,
        suggestion: `纬度: ${found.lat}, 经度: ${found.lng}`,
      });
    } else {
      issues.push({
        type: 'error',
        cityId: node.id,
        cityName: node.name,
        message: `城市坐标无效，且 "${node.name}" 未在数据库中找到`,
        suggestion: '请检查城市名称或手动输入经纬度',
      });
    }
  }
  
  if (node.days == null || isNaN(node.days) || node.days < 0 || node.days > 365) {
    issues.push({
      type: 'warning',
      cityId: node.id,
      cityName: node.name,
      message: `停留天数 "${node.days}" 不合法`,
      suggestion: '已重置为默认值 1 天',
    });
  }
  
  return issues;
}

export function validateRoute(cities: CityNode[]): ValidatedRoute {
  const allIssues: ValidationIssue[] = [];
  const validatedCities: CityNode[] = [];
  let totalDistance = 0;
  
  for (let i = 0; i < cities.length; i++) {
    const city = { ...cities[i], order: i };
    const issues = validateCityNode(city);
    allIssues.push(...issues);
    
    if (!issues.some(iss => iss.type === 'error')) {
      if (city.days <= 0 || isNaN(city.days)) {
        city.days = 1;
      }
      if (!isValidCoordinate(city.lat, city.lng)) {
        const found = findCityByName(city.name);
        if (found) {
          city.lat = found.lat;
          city.lng = found.lng;
          if (!city.nameEn) city.nameEn = found.en;
          if (!city.attractions) city.attractions = found.attractions;
        }
      }
      city.order = i;
      validatedCities.push(city);
    }
  }
  
  if (validatedCities.length > 1) {
    for (let i = 0; i < validatedCities.length - 1; i++) {
      const from = validatedCities[i];
      const to = validatedCities[i + 1];
      const dist = calculateHaversineDistance(from.lat, from.lng, to.lat, to.lng);
      totalDistance += dist;
    }
  }
  
  if (validatedCities.length < 2) {
    allIssues.push({
      type: 'warning',
      message: validatedCities.length === 0
        ? '路线为空，无法生成可视化轨迹'
        : '路线仅包含一个城市，无法生成连线',
      suggestion: '请至少添加两个有效城市',
    });
  }
  
  const duplicateNames = new Map<string, number>();
  validatedCities.forEach(c => {
    duplicateNames.set(c.name, (duplicateNames.get(c.name) || 0) + 1);
  });
  duplicateNames.forEach((count, name) => {
    if (count > 1) {
      allIssues.push({
        type: 'info',
        cityName: name,
        message: `城市 "${name}" 在路线中出现了 ${count} 次`,
        suggestion: '如果是重复访问，这是正常的；否则考虑删除重复项',
      });
    }
  });
  
  return {
    cities: validatedCities,
    issues: allIssues,
    isValid: validatedCities.length >= 2 && !allIssues.some(i => i.type === 'error'),
    totalDistanceKm: totalDistance,
  };
}

export function sanitizeCityNode(node: CityNode): CityNode {
  const sanitized = { ...node };
  sanitized.name = (sanitized.name || '').trim();
  sanitized.nameEn = sanitized.nameEn ? sanitized.nameEn.trim() : undefined;
  sanitized.days = Math.max(1, Math.min(365, Math.round(sanitized.days || 1)));
  sanitized.lat = Number(sanitized.lat.toFixed(6));
  sanitized.lng = Number(sanitized.lng.toFixed(6));
  sanitized.attractions = sanitized.attractions?.map(a => a.trim()).filter(Boolean) || undefined;
  return sanitized;
}
