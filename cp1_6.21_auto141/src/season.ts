import * as THREE from 'three';

export type TreeSpecies = 'pine' | 'maple' | 'birch' | 'oak' | 'cherry';
export type CrownShape = 'conical' | 'spherical' | 'umbrella' | 'cylindrical' | 'irregular';

export interface SeasonColors {
  spring: THREE.Color;
  summer: THREE.Color;
  autumn: THREE.Color;
  winter: THREE.Color;
}

export interface TreeSpeciesConfig {
  name: string;
  nameCN: string;
  crownShape: CrownShape;
  trunkColor: THREE.Color;
  leafColors: SeasonColors;
  optimalTempMin: number;
  optimalTempMax: number;
  isEvergreen: boolean;
}

export const SPECIES_CONFIG: Record<TreeSpecies, TreeSpeciesConfig> = {
  pine: {
    name: 'Pine',
    nameCN: '松树',
    crownShape: 'conical',
    trunkColor: new THREE.Color(0x4a3728),
    leafColors: {
      spring: new THREE.Color(0x6b8e4e),
      summer: new THREE.Color(0x2d5a27),
      autumn: new THREE.Color(0x3d6b35),
      winter: new THREE.Color(0x4a5a40)
    },
    optimalTempMin: 10,
    optimalTempMax: 28,
    isEvergreen: true
  },
  maple: {
    name: 'Maple',
    nameCN: '枫树',
    crownShape: 'spherical',
    trunkColor: new THREE.Color(0x5c4033),
    leafColors: {
      spring: new THREE.Color(0xa8d5a0),
      summer: new THREE.Color(0x2e8b2e),
      autumn: new THREE.Color(0xd43d1f),
      winter: new THREE.Color(0x7a6b5d)
    },
    optimalTempMin: 12,
    optimalTempMax: 26,
    isEvergreen: false
  },
  birch: {
    name: 'Birch',
    nameCN: '白桦',
    crownShape: 'cylindrical',
    trunkColor: new THREE.Color(0xe8e8e8),
    leafColors: {
      spring: new THREE.Color(0xbde4a3),
      summer: new THREE.Color(0x6ab04c),
      autumn: new THREE.Color(0xf0d42a),
      winter: new THREE.Color(0x8a7a6a)
    },
    optimalTempMin: 8,
    optimalTempMax: 24,
    isEvergreen: false
  },
  oak: {
    name: 'Oak',
    nameCN: '橡树',
    crownShape: 'umbrella',
    trunkColor: new THREE.Color(0x5a4535),
    leafColors: {
      spring: new THREE.Color(0xa5c87c),
      summer: new THREE.Color(0x35682d),
      autumn: new THREE.Color(0xe67e22),
      winter: new THREE.Color(0x6b5a4a)
    },
    optimalTempMin: 10,
    optimalTempMax: 27,
    isEvergreen: false
  },
  cherry: {
    name: 'Cherry',
    nameCN: '樱花',
    crownShape: 'irregular',
    trunkColor: new THREE.Color(0x6b5344),
    leafColors: {
      spring: new THREE.Color(0xf8c8d8),
      summer: new THREE.Color(0x5a9e4a),
      autumn: new THREE.Color(0xff9f43),
      winter: new THREE.Color(0x7a6a5a)
    },
    optimalTempMin: 10,
    optimalTempMax: 25,
    isEvergreen: false
  }
};

export const MONTH_POEMS: Record<number, string> = {
  1: '寒冬腊月，万木沉寂',
  2: '瑞雪初霁，春息渐近',
  3: '三月，嫩芽破土',
  4: '清明时节，新绿满枝',
  5: '五月芳菲，繁花似锦',
  6: '仲夏时节，浓荫蔽日',
  7: '七月流火，生机盎然',
  8: '立秋将至，蝉鸣渐远',
  9: '九月金秋，层林尽染',
  10: '霜叶红于二月花',
  11: '落叶纷飞，秋意正浓',
  12: '岁末天寒，万物蛰伏'
};

export const MONTH_NAMES: Record<number, string> = {
  1: '一月 January',
  2: '二月 February',
  3: '三月 March',
  4: '四月 April',
  5: '五月 May',
  6: '六月 June',
  7: '七月 July',
  8: '八月 August',
  9: '九月 September',
  10: '十月 October',
  11: '十一月 November',
  12: '十二月 December'
};

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  const result = new THREE.Color();
  result.r = a.r + (b.r - a.r) * t;
  result.g = a.g + (b.g - a.g) * t;
  result.b = a.b + (b.b - a.b) * t;
  return result;
}

export function getSeasonProgress(month: number): { season: string; phase: number } {
  const m = ((month - 1) % 12) + 1;
  if (m >= 3 && m <= 5) {
    return { season: 'spring', phase: (m - 3) / 2 };
  } else if (m >= 6 && m <= 8) {
    return { season: 'summer', phase: (m - 6) / 2 };
  } else if (m >= 9 && m <= 11) {
    return { season: 'autumn', phase: (m - 9) / 2 };
  } else {
    const winterPhase = m <= 2 ? (m + 1) / 3 : (m - 11) / 2;
    return { season: 'winter', phase: winterPhase };
  }
}

export function getLeafColor(species: TreeSpecies, month: number): THREE.Color {
  const cfg = SPECIES_CONFIG[species];
  const colors = cfg.leafColors;
  const m = month;

  if (cfg.isEvergreen) {
    if (m >= 3 && m <= 5) {
      const t = (m - 3) / 2;
      return lerpColor(colors.winter, colors.spring, t);
    } else if (m >= 6 && m <= 8) {
      return colors.summer;
    } else if (m >= 9 && m <= 11) {
      const t = (m - 9) / 2;
      return lerpColor(colors.summer, colors.autumn, t);
    } else {
      const t = m <= 2 ? (m + 1) / 3 : (m - 11) / 2;
      return lerpColor(colors.autumn, colors.winter, Math.min(1, t));
    }
  } else {
    if (m >= 3 && m < 4) {
      const t = m - 3;
      return lerpColor(colors.winter, colors.spring, t);
    } else if (m >= 4 && m < 6) {
      const t = (m - 4) / 2;
      return lerpColor(colors.spring, colors.summer, t);
    } else if (m >= 6 && m < 9) {
      return colors.summer;
    } else if (m >= 9 && m < 11) {
      const t = (m - 9) / 2;
      return lerpColor(colors.summer, colors.autumn, t);
    } else if (m >= 11 || m < 3) {
      let t: number;
      if (m >= 11) {
        t = Math.min(1, (m - 11) / 1.5);
      } else {
        t = 1;
      }
      return lerpColor(colors.autumn, colors.winter, t);
    }
    return colors.winter;
  }
}

export function getLeafDensity(species: TreeSpecies, month: number): number {
  const cfg = SPECIES_CONFIG[species];
  const m = month;

  if (cfg.isEvergreen) {
    const base = 0.85;
    if (m >= 6 && m <= 8) return 0.98;
    if (m >= 3 && m <= 5) return 0.9 + (m - 3) * 0.03;
    if (m >= 9 && m <= 11) return 0.95 - (m - 9) * 0.03;
    return base - (m <= 2 ? (2 - m) * 0.05 : (m - 12) * 0.05);
  } else {
    if (m >= 3 && m < 4) return 0.05 + (m - 3) * 0.25;
    if (m >= 4 && m < 6) return 0.3 + (m - 4) * 0.35;
    if (m >= 6 && m < 9) return 0.95;
    if (m >= 9 && m < 11) return 0.95 - (m - 9) * 0.45;
    return 0.02;
  }
}

export function getCrownScale(species: TreeSpecies, month: number): number {
  const density = getLeafDensity(species, month);
  if (SPECIES_CONFIG[species].isEvergreen) {
    return 0.92 + density * 0.08;
  }
  return 0.55 + density * 0.45;
}

export function getSunPosition(month: number): { elevation: number; azimuth: number; intensity: number } {
  const m = month;
  const elevationBase = 30;
  const elevationAmp = 30;
  const normalizedMonth = ((m - 1) / 11) * Math.PI * 2 - Math.PI / 2;
  const elevation = elevationBase + elevationAmp * Math.sin(normalizedMonth);

  const azimuthBase = 180;
  const azimuthAmp = 35;
  const azimuth = azimuthBase + azimuthAmp * Math.sin(normalizedMonth + Math.PI);

  const intensityBase = 0.7;
  const intensityAmp = 0.5;
  const intensity = intensityBase + intensityAmp * Math.max(0, Math.sin(normalizedMonth));

  return { elevation, azimuth, intensity };
}

export function getAmbientIntensity(month: number): number {
  const m = month;
  if (m >= 6 && m <= 8) return 0.6;
  if (m >= 4 && m <= 9) return 0.5;
  if (m === 12 || m <= 2) return 0.3;
  return 0.4;
}

export function getFogParams(month: number): { color: THREE.Color; near: number; far: number } {
  const m = month;
  if (m === 12 || m <= 2) {
    return { color: new THREE.Color(0xa8b8c0), near: 20, far: 90 };
  } else if (m >= 3 && m <= 5) {
    return { color: new THREE.Color(0xb8d4c8), near: 25, far: 100 };
  } else if (m >= 6 && m <= 8) {
    return { color: new THREE.Color(0x8fb8a8), near: 30, far: 120 };
  } else {
    return { color: new THREE.Color(0xc4a88a), near: 22, far: 95 };
  }
}

export function getGrowthProgress(month: number): number {
  const m = Math.floor(month);
  if (m >= 3 && m <= 8) {
    return ((m - 2) / 6) * 100;
  } else if (m > 8) {
    return 100;
  }
  return Math.min(100, ((m + 10) / 18) * 100);
}

export function getCurrentTemperature(month: number): number {
  const m = month;
  const tempBase = 5;
  const tempAmp = 20;
  const normalizedMonth = ((m - 1) / 11) * Math.PI * 2 - Math.PI / 2;
  return tempBase + tempAmp * (0.5 + 0.5 * Math.sin(normalizedMonth));
}
