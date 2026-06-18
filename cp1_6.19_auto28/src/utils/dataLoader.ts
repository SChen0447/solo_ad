import type { Particle, FieldInfo, FieldType } from '@/types';

export function parseJSONData(data: any[]): {
  fields: FieldInfo[];
  numericFields: FieldInfo[];
} {
  if (!data || data.length === 0) {
    return { fields: [], numericFields: [] };
  }

  const sample = data[0];
  const keys = Object.keys(sample);
  const fields: FieldInfo[] = [];

  keys.forEach(key => {
    const values = data.map(d => d[key]);
    const type = inferFieldType(values, key);
    
    const field: FieldInfo = { name: key, type };

    if (type === 'numeric') {
      const nums = values.filter(v => typeof v === 'number' && !isNaN(v)) as number[];
      if (nums.length > 0) {
        field.min = Math.min(...nums);
        field.max = Math.max(...nums);
      }
    } else if (type === 'categorical') {
      const uniqueVals = Array.from(new Set(values.filter(v => v !== null && v !== undefined).map(String)));
      field.categories = uniqueVals;
    }

    fields.push(field);
  });

  const numericFields = fields.filter(f => f.type === 'numeric');

  return { fields, numericFields };
}

function inferFieldType(values: any[], key: string): FieldType {
  const validVals = values.filter(v => v !== null && v !== undefined && v !== '');
  
  if (validVals.length === 0) return 'string';

  const numericCount = validVals.filter(v => typeof v === 'number' || !isNaN(Number(v))).length;
  const numericRatio = numericCount / validVals.length;

  if (numericRatio >= 0.8) return 'numeric';

  const uniqueCount = new Set(validVals.map(String)).size;
  const uniqueRatio = uniqueCount / validVals.length;

  if (uniqueRatio <= 0.15 || uniqueCount <= 15) return 'categorical';

  return 'string';
}

export function createInitialParticles(data: any[], fields: FieldInfo[]): Particle[] {
  return data.map((row, idx) => {
    const distFromCenter = Math.random();
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 0.1;

    return {
      id: `particle-${idx}-${Math.random().toString(36).slice(2, 8)}`,
      index: idx,
      rawData: row,
      targetPosition: [0, 0, 0],
      targetColor: '#7cb3ff',
      targetSize: 1.0,
      targetVisible: true,
      currentPosition: [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      ],
      currentColor: '#7cb3ff',
      currentSize: 1.0,
      currentAlpha: 0,
      startPosition: [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      ],
      entryProgress: 0,
      entryDelay: Math.min(distFromCenter * 0.6, 0.6),
      isSelected: false,
      highlightPulse: 0
    };
  });
}

export function generateSampleData(count: number): any[] {
  const categories = ['星系A', '星系B', '星系C', '星系D', '星系E'];
  const types = ['恒星', '行星', '星云', '脉冲星', '黑洞', '彗星'];

  return Array.from({ length: count }, (_, i) => {
    const baseX = gaussianRandom(0, 1);
    const baseY = gaussianRandom(0, 1);
    const baseZ = gaussianRandom(0, 1);
    const mass = Math.exp(gaussianRandom(2, 1.2));
    const temperature = 2000 + Math.random() * 28000;
    const luminosity = Math.exp(gaussianRandom(1, 1.5));
    const age = Math.random() * 13.8;
    const distance = Math.sqrt(baseX * baseX + baseY * baseY + baseZ * baseZ) * 100;

    return {
      id: `OBJ-${String(i + 1).padStart(5, '0')}`,
      name: `天体 ${i + 1}`,
      category: categories[Math.floor(Math.random() * categories.length)],
      type: types[Math.floor(Math.random() * types.length)],
      positionX: baseX,
      positionY: baseY,
      positionZ: baseZ,
      mass: Number(mass.toFixed(3)),
      temperature: Math.round(temperature),
      luminosity: Number(luminosity.toFixed(3)),
      age: Number(age.toFixed(2)),
      distance_lightyear: Number(distance.toFixed(2)),
      brightness: Math.random() * 100,
      velocity: Math.random() * 500,
      metallicity: Number((Math.random() * 3 - 1.5).toFixed(3))
    };
  });
}

function gaussianRandom(mean: number, std: number): number {
  const u1 = Math.random() || 1e-9;
  const u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mean + z * std;
}

export function calculateFieldStep(min: number, max: number): number {
  const range = max - min;
  if (range === 0) return 1;
  const magnitude = Math.pow(10, Math.floor(Math.log10(range)));
  const normalized = range / magnitude;
  
  if (normalized <= 1) return magnitude / 100;
  if (normalized <= 2) return magnitude / 50;
  if (normalized <= 5) return magnitude / 20;
  return magnitude / 10;
}

export function formatNumber(value: number, decimals: number = 2): string {
  if (Math.abs(value) >= 1e6) return value.toExponential(decimals);
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(1);
  return value.toFixed(decimals);
}
