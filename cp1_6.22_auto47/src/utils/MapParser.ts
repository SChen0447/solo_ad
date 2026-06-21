import {
  Building,
  CityData,
  GlobalParams,
  LandClass,
  LAND_CLASS_COLORS,
  WindowLight,
} from '../types/city';

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateWindowLights(seed: string): WindowLight[] {
  const rand = seededRandom(hashString(seed));
  const count = Math.floor(rand() * 9);
  const lights: WindowLight[] = [];
  for (let i = 0; i < count; i++) {
    lights.push({
      face: Math.floor(rand() * 4),
      u: rand() * 0.85 + 0.075,
      v: rand() * 0.85 + 0.075,
      size: 0.15,
    });
  }
  return lights;
}

function rgbToHex(r: number, g: number, b: number): string {
  const hex = (n: number) => n.toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`.toUpperCase();
}

function colorToLandClass(r: number, g: number, b: number): LandClass {
  if (r < 30 && g < 30 && b < 30) {
    return LandClass.ROAD;
  }
  if (r > g && r > b) {
    return LandClass.COMMERCIAL;
  }
  if (b > r && b > g) {
    return LandClass.RESIDENTIAL;
  }
  if (g > r && g > b) {
    return LandClass.INDUSTRIAL;
  }
  const maxRb = Math.max(r, b);
  if (r > 80 && r < 200 && g < 120 && b > 80 && b < 200 && Math.abs(r - b) < 80) {
    return LandClass.GREENBELT;
  }
  if (g >= maxRb) {
    return LandClass.INDUSTRIAL;
  }
  if (b >= r) {
    return LandClass.RESIDENTIAL;
  }
  return LandClass.COMMERCIAL;
}

export async function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    img.src = url;
  });
}

function getImageData(img: HTMLImageElement, size: number): ImageData {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, 0, 0, size, size);
  return ctx.getImageData(0, 0, size, size);
}

export interface ParseResult {
  cityData: CityData;
  size: number;
}

export async function parseMaps(
  heightFile: File,
  classFile: File,
  globalParams: GlobalParams
): Promise<ParseResult> {
  const [heightImg, classImg] = await Promise.all([
    loadImage(heightFile),
    loadImage(classFile),
  ]);

  const size = Math.max(
    128,
    Math.min(256, Math.pow(2, Math.round(Math.log2(heightImg.width))))
  );

  const heightData = getImageData(heightImg, size);
  const classData = getImageData(classImg, size);

  const heightMap: number[][] = [];
  const classMap: LandClass[][] = [];
  const buildings: Building[] = [];
  const rand = seededRandom(hashString('city' + size));

  for (let z = 0; z < size; z++) {
    heightMap[z] = [];
    classMap[z] = [];
    for (let x = 0; x < size; x++) {
      const idx = (z * size + x) * 4;
      const gray = heightData.data[idx];
      heightMap[z][x] = (gray / 255) * 100;

      const r = classData.data[idx];
      const g = classData.data[idx + 1];
      const b = classData.data[idx + 2];
      const landClass = colorToLandClass(r, g, b);
      classMap[z][x] = landClass;

      if (landClass !== LandClass.ROAD && heightMap[z][x] > 1) {
        if (rand() <= globalParams.density) {
          const id = `b_${x}_${z}`;
          buildings.push({
            id,
            gridX: x,
            gridZ: z,
            height: heightMap[z][x],
            landClass,
            color: LAND_CLASS_COLORS[landClass],
            originalColor: LAND_CLASS_COLORS[landClass],
            highlightTime: 0,
            windowLights: generateWindowLights(id),
          });
        }
      }
    }
  }

  return {
    cityData: {
      width: size,
      height: size,
      heightMap,
      classMap,
      buildings,
    },
    size,
  };
}

export function regenerateBuildings(
  cityData: CityData,
  globalParams: GlobalParams
): Building[] {
  const buildings: Building[] = [];
  const rand = seededRandom(hashString('city' + cityData.width + globalParams.density));

  for (let z = 0; z < cityData.height; z++) {
    for (let x = 0; x < cityData.width; x++) {
      const landClass = cityData.classMap[z][x];
      const height = cityData.heightMap[z][x];
      if (landClass !== LandClass.ROAD && height > 1) {
        if (rand() <= globalParams.density) {
          const id = `b_${x}_${z}`;
          buildings.push({
            id,
            gridX: x,
            gridZ: z,
            height,
            landClass,
            color: LAND_CLASS_COLORS[landClass],
            originalColor: LAND_CLASS_COLORS[landClass],
            highlightTime: 0,
            windowLights: generateWindowLights(id),
          });
        }
      }
    }
  }
  return buildings;
}
