export interface SceneObject {
  id: string;
  type: 'tree' | 'bigTree' | 'firefly' | 'rock' | 'house' | 'mountain' |
        'river' | 'cloud' | 'pillar' | 'sphere' | 'cube' | 'cylinder' | 'cone';
  name: string;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  color: string;
  emissive?: string;
  emissiveIntensity?: number;
}

export interface SceneData {
  objects: SceneObject[];
  environment?: {
    fogColor?: string;
    fogDensity?: number;
    ambientIntensity?: number;
  };
}

interface WordMapping {
  keywords: string[];
  objectType: SceneObject['type'];
  count: number | [number, number];
  defaultColor: string;
  defaultScale: { x: number; y: number; z: number };
  emissive?: string;
  emissiveIntensity?: number;
  nameTemplate: string;
}

const GRID_SIZE = 8;
const MAX_OBJECTS = 30;

const mappings: WordMapping[] = [
  {
    keywords: ['森林', '树林', '林地', 'forest', 'woods', 'grove'],
    objectType: 'tree',
    count: [5, 10],
    defaultColor: '#2d5a27',
    defaultScale: { x: 1, y: 1.8, z: 1 },
    nameTemplate: '树木'
  },
  {
    keywords: ['大树', '古树', '巨树', 'big tree', 'ancient tree', 'giant tree'],
    objectType: 'bigTree',
    count: [1, 2],
    defaultColor: '#1a3d15',
    defaultScale: { x: 2.5, y: 4, z: 2.5 },
    nameTemplate: '古树'
  },
  {
    keywords: ['萤火虫', '萤火', '亮光点', 'firefly', 'fireflies', 'glow'],
    objectType: 'firefly',
    count: [8, 15],
    defaultColor: '#ffff00',
    defaultScale: { x: 0.1, y: 0.1, z: 0.1 },
    emissive: '#ffff00',
    emissiveIntensity: 2,
    nameTemplate: '萤火虫'
  },
  {
    keywords: ['石头', '岩石', '石块', 'rock', 'stone', 'boulder'],
    objectType: 'rock',
    count: [3, 6],
    defaultColor: '#6b6b6b',
    defaultScale: { x: 0.8, y: 0.6, z: 0.8 },
    nameTemplate: '岩石'
  },
  {
    keywords: ['房子', '房屋', '小屋', 'house', 'building', 'cabin'],
    objectType: 'house',
    count: [1, 2],
    defaultColor: '#8b4513',
    defaultScale: { x: 2, y: 2, z: 2 },
    nameTemplate: '房屋'
  },
  {
    keywords: ['山', '山脉', '山峰', 'mountain', 'hill', 'peak'],
    objectType: 'mountain',
    count: [1, 3],
    defaultColor: '#4a4a4a',
    defaultScale: { x: 3, y: 4, z: 3 },
    nameTemplate: '山峰'
  },
  {
    keywords: ['河', '河流', '小溪', 'river', 'stream', 'water'],
    objectType: 'river',
    count: [1, 1],
    defaultColor: '#1e90ff',
    defaultScale: { x: 6, y: 0.1, z: 1.5 },
    nameTemplate: '河流'
  },
  {
    keywords: ['云', '云朵', '云彩', 'cloud', 'clouds'],
    objectType: 'cloud',
    count: [2, 5],
    defaultColor: '#ffffff',
    defaultScale: { x: 2, y: 0.8, z: 1.5 },
    nameTemplate: '云朵'
  },
  {
    keywords: ['柱子', '石柱', 'pillar', 'column'],
    objectType: 'pillar',
    count: [2, 4],
    defaultColor: '#d4d4d4',
    defaultScale: { x: 0.5, y: 3, z: 0.5 },
    nameTemplate: '石柱'
  },
  {
    keywords: ['球', '球体', 'sphere', 'ball'],
    objectType: 'sphere',
    count: [3, 5],
    defaultColor: '#ff6b6b',
    defaultScale: { x: 0.5, y: 0.5, z: 0.5 },
    nameTemplate: '球体'
  },
  {
    keywords: ['方块', '立方体', 'cube', 'box', 'block'],
    objectType: 'cube',
    count: [3, 5],
    defaultColor: '#4ecdc4',
    defaultScale: { x: 0.8, y: 0.8, z: 0.8 },
    nameTemplate: '方块'
  },
  {
    keywords: ['圆柱', '圆柱体', 'cylinder'],
    objectType: 'cylinder',
    count: [2, 4],
    defaultColor: '#9b59b6',
    defaultScale: { x: 0.5, y: 1.5, z: 0.5 },
    nameTemplate: '圆柱'
  },
  {
    keywords: ['锥体', '金字塔', 'cone', 'pyramid'],
    objectType: 'cone',
    count: [2, 4],
    defaultColor: '#f39c12',
    defaultScale: { x: 0.8, y: 1.5, z: 0.8 },
    nameTemplate: '锥体'
  },
  {
    keywords: ['蓝色', 'blue'],
    objectType: 'sphere',
    count: [0, 0],
    defaultColor: '#0066ff',
    defaultScale: { x: 1, y: 1, z: 1 },
    nameTemplate: ''
  },
  {
    keywords: ['红色', 'red'],
    objectType: 'sphere',
    count: [0, 0],
    defaultColor: '#ff0000',
    defaultScale: { x: 1, y: 1, z: 1 },
    nameTemplate: ''
  },
  {
    keywords: ['绿色', 'green'],
    objectType: 'sphere',
    count: [0, 0],
    defaultColor: '#00ff00',
    defaultScale: { x: 1, y: 1, z: 1 },
    nameTemplate: ''
  },
  {
    keywords: ['发光', '闪亮', 'glowing', 'shiny', 'luminous'],
    objectType: 'sphere',
    count: [0, 0],
    defaultColor: '#00ffff',
    defaultScale: { x: 1, y: 1, z: 1 },
    emissive: '#00ffff',
    emissiveIntensity: 1.5,
    nameTemplate: ''
  },
  {
    keywords: ['迷雾', '雾', 'fog', 'mist'],
    objectType: 'sphere',
    count: [0, 0],
    defaultColor: '#888888',
    defaultScale: { x: 1, y: 1, z: 1 },
    nameTemplate: ''
  }
];

const colorKeywords: { [key: string]: string } = {
  '蓝色': '#0066ff', 'blue': '#0066ff',
  '红色': '#ff0000', 'red': '#ff0000',
  '绿色': '#00cc00', 'green': '#00cc00',
  '黄色': '#ffff00', 'yellow': '#ffff00',
  '紫色': '#9933ff', 'purple': '#9933ff',
  '橙色': '#ff9900', 'orange': '#ff9900',
  '粉色': '#ff66cc', 'pink': '#ff66cc',
  '白色': '#ffffff', 'white': '#ffffff',
  '黑色': '#1a1a1a', 'black': '#1a1a1a',
  '青色': '#00ffff', 'cyan': '#00ffff',
  '棕色': '#8b4513', 'brown': '#8b4513',
  '金色': '#ffd700', 'gold': '#ffd700',
  '银色': '#c0c0c0', 'silver': '#c0c0c0'
};

function generateId(): string {
  return `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getRandomCount(range: number | [number, number]): number {
  if (typeof range === 'number') return range;
  return Math.floor(Math.random() * (range[1] - range[0] + 1)) + range[0];
}

function getRandomPosition(existingPositions: { x: number; z: number }[], minDist: number = 1.2): { x: number; y: number; z: number } {
  const halfGrid = (GRID_SIZE - 2) / 2;
  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    const x = (Math.random() - 0.5) * 2 * halfGrid;
    const z = (Math.random() - 0.5) * 2 * halfGrid;

    let valid = true;
    for (const pos of existingPositions) {
      const dist = Math.sqrt((x - pos.x) ** 2 + (z - pos.z) ** 2);
      if (dist < minDist) {
        valid = false;
        break;
      }
    }

    if (valid) {
      return { x, y: 0, z };
    }
    attempts++;
  }

  return {
    x: (Math.random() - 0.5) * 2 * halfGrid,
    y: 0,
    z: (Math.random() - 0.5) * 2 * halfGrid
  };
}

function detectColor(text: string): string | null {
  for (const [keyword, color] of Object.entries(colorKeywords)) {
    if (text.toLowerCase().includes(keyword.toLowerCase())) {
      return color;
    }
  }
  return null;
}

function detectEmissive(text: string): { emissive: string; intensity: number } | null {
  const emissiveKeywords = ['发光', '闪亮', 'glowing', 'shiny', 'luminous', '荧光'];
  for (const kw of emissiveKeywords) {
    if (text.toLowerCase().includes(kw.toLowerCase())) {
      const color = detectColor(text) || '#00ffff';
      return { emissive: color, intensity: 1.5 };
    }
  }
  return null;
}

function detectCenter(text: string): boolean {
  const centerKeywords = ['中心', '中央', 'center', 'middle', 'centre'];
  for (const kw of centerKeywords) {
    if (text.toLowerCase().includes(kw.toLowerCase())) {
      return true;
    }
  }
  return false;
}

export function parseText(text: string): SceneData {
  const lowerText = text.toLowerCase();
  const objects: SceneObject[] = [];
  const usedPositions: { x: number; z: number }[] = [];
  let objectCounter: { [key: string]: number } = {};

  const matchedMappings: WordMapping[] = [];
  for (const mapping of mappings) {
    for (const keyword of mapping.keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        const isZeroCount = 
          (typeof mapping.count === 'number' && mapping.count === 0) ||
          (Array.isArray(mapping.count) && mapping.count[0] === 0 && mapping.count[1] === 0);
        
        if (!isZeroCount) {
          matchedMappings.push(mapping);
        }
        break;
      }
    }
  }

  if (matchedMappings.length === 0) {
    matchedMappings.push({
      keywords: ['默认'],
      objectType: 'cube',
      count: [3, 5],
      defaultColor: '#00d4aa',
      defaultScale: { x: 0.8, y: 0.8, z: 0.8 },
      nameTemplate: '物体'
    });
  }

  const textColor = detectColor(text);
  const textEmissive = detectEmissive(text);
  const hasCenter = detectCenter(text);

  let totalCount = 0;
  for (const mapping of matchedMappings) {
    const count = getRandomCount(mapping.count);
    totalCount += count;
  }

  if (totalCount > MAX_OBJECTS) {
    const scale = MAX_OBJECTS / totalCount;
    for (const mapping of matchedMappings) {
      if (typeof mapping.count === 'number') {
        mapping.count = Math.max(1, Math.floor(mapping.count * scale));
      } else {
        mapping.count = [
          Math.max(1, Math.floor(mapping.count[0] * scale)),
          Math.max(1, Math.floor(mapping.count[1] * scale))
        ];
      }
    }
  }

  let centerAssigned = false;

  for (const mapping of matchedMappings) {
    const count = getRandomCount(mapping.count);

    for (let i = 0; i < count; i++) {
      if (!objectCounter[mapping.nameTemplate]) {
        objectCounter[mapping.nameTemplate] = 0;
      }
      objectCounter[mapping.nameTemplate]++;

      let position: { x: number; y: number; z: number };

      if (hasCenter && !centerAssigned && (mapping.objectType === 'bigTree' || mapping.objectType === 'house')) {
        position = { x: 0, y: 0, z: 0 };
        centerAssigned = true;
      } else {
        position = getRandomPosition(usedPositions, mapping.objectType === 'bigTree' ? 3 : 1.2);
      }

      usedPositions.push({ x: position.x, z: position.z });

      let color = mapping.defaultColor;
      if (textColor) {
        color = textColor;
      }

      let emissive = mapping.emissive;
      let emissiveIntensity = mapping.emissiveIntensity;
      if (textEmissive) {
        emissive = textEmissive.emissive;
        emissiveIntensity = textEmissive.intensity;
      }

      const obj: SceneObject = {
        id: generateId(),
        type: mapping.objectType,
        name: `${mapping.nameTemplate}${objectCounter[mapping.nameTemplate] > 1 ? ' ' + objectCounter[mapping.nameTemplate] : ''}`,
        position,
        rotation: {
          x: 0,
          y: Math.random() * Math.PI * 2,
          z: 0
        },
        scale: { ...mapping.defaultScale },
        color,
        emissive,
        emissiveIntensity
      };

      objects.push(obj);
    }
  }

  const sceneData: SceneData = {
    objects
  };

  if (lowerText.includes('迷雾') || lowerText.includes('fog') || lowerText.includes('mist')) {
    sceneData.environment = {
      fogColor: '#444466',
      fogDensity: 0.02,
      ambientIntensity: 0.4
    };
  }

  return sceneData;
}
