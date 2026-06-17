export type ObjectTag = 'glowing' | 'particle';

export interface SceneObject {
  id: string;
  type: string;
  geometry: 'box' | 'sphere' | 'cylinder' | 'cone' | 'group';
  position: { x: number; y: number; z: number };
  color: string;
  scale: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
  emissive?: string;
  emissiveIntensity?: number;
  count?: number;
  children?: SceneObject[];
  tags?: ObjectTag[];
}

export interface SceneData {
  objects: SceneObject[];
  fog?: { color: string; near: number; far: number };
  ambientLight?: { color: string; intensity: number };
}

interface KeywordRule {
  keywords: string[];
  factory: (ctx: ParseContext) => SceneObject[];
}

interface ParseContext {
  text: string;
  hasColor: (colors: string[]) => boolean;
  getColor: (defaultColor: string) => string;
}

const COLOR_MAP: Record<string, string> = {
  红色: '#ff4444', 红: '#ff4444',
  蓝色: '#4488ff', 蓝: '#4488ff',
  绿色: '#44ff88', 绿: '#44ff88',
  黄色: '#ffdd44', 黄: '#ffdd44',
  紫色: '#aa66ff', 紫: '#aa66ff',
  橙色: '#ff8844', 橙: '#ff8844',
  粉色: '#ff88bb', 粉: '#ff88bb',
  白色: '#ffffff', 白: '#ffffff',
  黑色: '#333333', 黑: '#333333',
  金色: '#ffcc33', 金: '#ffcc33',
  银色: '#cccccc', 银: '#cccccc',
  青色: '#00d4aa', 青: '#00d4aa',
  棕色: '#8b5a2b', 棕: '#8b5a2b',
  灰色: '#888888', 灰: '#888888',
};

function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

class TextParser {
  private rules: KeywordRule[] = [];

  constructor() {
    this.initRules();
  }

  private initRules(): void {
    this.rules.push({
      keywords: ['森林', '树林', '树丛'],
      factory: (ctx) => {
        const color = ctx.hasColor(['蓝色', '蓝']) ? '#2244aa' : '#2d6a4f';
        const count = ctx.text.includes('古老') ? 12 : 8;
        const trees: SceneObject[] = [];
        for (let i = 0; i < count; i++) {
          const angle = (i / count) * Math.PI * 2 + rand(-0.3, 0.3);
          const radius = rand(2, 3.5);
          trees.push(this.createTree(
            { x: Math.cos(angle) * radius, y: 0, z: Math.sin(angle) * radius },
            color,
            rand(0.8, 1.3)
          ));
        }
        return trees;
      },
    });

    this.rules.push({
      keywords: ['大树'],
      factory: (ctx) => {
        const isBlue = ctx.hasColor(['蓝色', '蓝']);
        const isGlowing = ctx.text.includes('发光') || ctx.text.includes('光芒');
        const color = isBlue ? '#00aaff' : '#2d6a4f';
        const tree = this.createTree({ x: 0, y: 0, z: 0 }, color, 2.2);
        if (isGlowing) {
          tree.emissive = isBlue ? '#00aaff' : '#44ff88';
          tree.emissiveIntensity = 0.6;
          tree.tags = ['glowing'];
          if (tree.children) {
            tree.children[0].emissive = tree.emissive;
            tree.children[0].emissiveIntensity = 0.5;
          }
        }
        return [tree];
      },
    });

    this.rules.push({
      keywords: ['树', '树木'],
      factory: (ctx) => {
        const color = ctx.hasColor(['蓝色', '蓝']) ? '#2244aa' : '#2d6a4f';
        return [this.createTree({ x: rand(-2, 2), y: 0, z: rand(-2, 2) }, color, rand(1, 1.8))];
      },
    });

    this.rules.push({
      keywords: ['萤火虫', '光点', '粒子'],
      factory: () => {
        const particles: SceneObject[] = [];
        const count = 15;
        for (let i = 0; i < count; i++) {
          particles.push({
            id: uid(),
            type: '萤火虫',
            geometry: 'sphere',
            position: {
              x: rand(-3, 3),
              y: rand(0.5, 2.5),
              z: rand(-3, 3),
            },
            color: '#aaff66',
            scale: { x: 0.08, y: 0.08, z: 0.08 },
            rotation: { x: 0, y: 0, z: 0 },
            emissive: '#aaff66',
            emissiveIntensity: 1.2,
            tags: ['glowing', 'particle'],
          });
        }
        return particles;
      },
    });

    this.rules.push({
      keywords: ['房子', '房屋', '小屋', '建筑'],
      factory: (ctx) => {
        const color = ctx.hasColor(['红色', '红']) ? '#cc4444' : '#d4a373';
        const roofColor = ctx.hasColor(['蓝色', '蓝']) ? '#4466aa' : '#8b3a3a';
        return [{
          id: uid(),
          type: '房屋',
          geometry: 'group',
          position: { x: rand(-2, 2), y: 0, z: rand(-2, 2) },
          color: color,
          scale: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: rand(0, Math.PI), z: 0 },
          children: [
            {
              id: uid(),
              type: '墙壁',
              geometry: 'box',
              position: { x: 0, y: 0.6, z: 0 },
              color: color,
              scale: { x: 1.2, y: 1.2, z: 1 },
              rotation: { x: 0, y: 0, z: 0 },
            },
            {
              id: uid(),
              type: '屋顶',
              geometry: 'cone',
              position: { x: 0, y: 1.7, z: 0 },
              color: roofColor,
              scale: { x: 1.5, y: 0.9, z: 1.3 },
              rotation: { x: 0, y: 0, z: 0 },
            },
          ],
        }];
      },
    });

    this.rules.push({
      keywords: ['山', '山峰', '山脉'],
      factory: (ctx) => {
        const color = ctx.hasColor(['白色', '白', '雪']) ? '#e8e8e8' : '#6b705c';
        const mountains: SceneObject[] = [];
        const count = 3;
        for (let i = 0; i < count; i++) {
          mountains.push({
            id: uid(),
            type: '山峰',
            geometry: 'cone',
            position: {
              x: -3 + i * 3,
              y: 0,
              z: rand(-2, 2),
            },
            color: color,
            scale: { x: rand(1, 1.8), y: rand(1.5, 2.5), z: rand(1, 1.8) },
            rotation: { x: 0, y: rand(0, Math.PI), z: 0 },
          });
        }
        return mountains;
      },
    });

    this.rules.push({
      keywords: ['石头', '岩石', '石块'],
      factory: () => {
        const rocks: SceneObject[] = [];
        const count = 5;
        for (let i = 0; i < count; i++) {
          rocks.push({
            id: uid(),
            type: '岩石',
            geometry: 'sphere',
            position: {
              x: rand(-3, 3),
              y: 0,
              z: rand(-3, 3),
            },
            color: '#777777',
            scale: { x: rand(0.2, 0.5), y: rand(0.15, 0.35), z: rand(0.2, 0.5) },
            rotation: { x: rand(0, Math.PI), y: rand(0, Math.PI), z: rand(0, Math.PI) },
          });
        }
        return rocks;
      },
    });

    this.rules.push({
      keywords: ['湖', '湖泊', '池塘', '水', '水面'],
      factory: (ctx) => {
        const color = ctx.hasColor(['蓝色', '蓝']) ? '#2266cc' : '#3a86ff';
        return [{
          id: uid(),
          type: '湖泊',
          geometry: 'cylinder',
          position: { x: rand(-1.5, 1.5), y: 0.02, z: rand(-1.5, 1.5) },
          color: color,
          scale: { x: rand(1.5, 2.5), y: 0.04, z: rand(1.5, 2.5) },
          rotation: { x: 0, y: 0, z: 0 },
          emissive: color,
          emissiveIntensity: 0.15,
        }];
      },
    });

    this.rules.push({
      keywords: ['花', '花朵', '花丛'],
      factory: () => {
        const colors = ['#ff6b9d', '#ffd93d', '#6bcb77', '#c780e8', '#ff8c42'];
        const flowers: SceneObject[] = [];
        const count = 10;
        for (let i = 0; i < count; i++) {
          flowers.push({
            id: uid(),
            type: '花朵',
            geometry: 'sphere',
            position: {
              x: rand(-3, 3),
              y: 0.1,
              z: rand(-3, 3),
            },
            color: colors[Math.floor(Math.random() * colors.length)],
            scale: { x: 0.12, y: 0.12, z: 0.12 },
            rotation: { x: 0, y: 0, z: 0 },
          });
        }
        return flowers;
      },
    });

    this.rules.push({
      keywords: ['太阳'],
      factory: () => [{
        id: uid(),
        type: '太阳',
        geometry: 'sphere',
        position: { x: 3, y: 3.5, z: -3 },
        color: '#ffdd44',
        scale: { x: 0.5, y: 0.5, z: 0.5 },
        rotation: { x: 0, y: 0, z: 0 },
        emissive: '#ffdd44',
        emissiveIntensity: 1.5,
      }],
    });

    this.rules.push({
      keywords: ['月亮'],
      factory: () => [{
        id: uid(),
        type: '月亮',
        geometry: 'sphere',
        position: { x: -3, y: 3.5, z: -3 },
        color: '#eeeeee',
        scale: { x: 0.35, y: 0.35, z: 0.35 },
        rotation: { x: 0, y: 0, z: 0 },
        emissive: '#cccccc',
        emissiveIntensity: 0.6,
      }],
    });

    this.rules.push({
      keywords: ['星星'],
      factory: () => {
        const stars: SceneObject[] = [];
        const count = 20;
        for (let i = 0; i < count; i++) {
          stars.push({
            id: uid(),
            type: '星星',
            geometry: 'sphere',
            position: {
              x: rand(-4, 4),
              y: rand(3, 4.5),
              z: rand(-4, -2),
            },
            color: '#ffffff',
            scale: { x: 0.04, y: 0.04, z: 0.04 },
            rotation: { x: 0, y: 0, z: 0 },
            emissive: '#ffffff',
            emissiveIntensity: 1.2,
          });
        }
        return stars;
      },
    });

    this.rules.push({
      keywords: ['城堡', '宫殿'],
      factory: (ctx) => {
        const color = ctx.hasColor(['金色', '金']) ? '#e6c229' : '#a0a0a0';
        return [{
          id: uid(),
          type: '城堡',
          geometry: 'group',
          position: { x: 0, y: 0, z: 0 },
          color: color,
          scale: { x: 1, y: 1, z: 1 },
          rotation: { x: 0, y: 0, z: 0 },
          children: [
            {
              id: uid(),
              type: '主楼',
              geometry: 'box',
              position: { x: 0, y: 0.9, z: 0 },
              color: color,
              scale: { x: 1.6, y: 1.8, z: 1.2 },
              rotation: { x: 0, y: 0, z: 0 },
            },
            {
              id: uid(),
              type: '左塔',
              geometry: 'cylinder',
              position: { x: -1.1, y: 1.2, z: 0 },
              color: color,
              scale: { x: 0.4, y: 2.4, z: 0.4 },
              rotation: { x: 0, y: 0, z: 0 },
            },
            {
              id: uid(),
              type: '右塔',
              geometry: 'cylinder',
              position: { x: 1.1, y: 1.2, z: 0 },
              color: color,
              scale: { x: 0.4, y: 2.4, z: 0.4 },
              rotation: { x: 0, y: 0, z: 0 },
            },
            {
              id: uid(),
              type: '左塔顶',
              geometry: 'cone',
              position: { x: -1.1, y: 2.7, z: 0 },
              color: '#8b3a3a',
              scale: { x: 0.6, y: 0.6, z: 0.6 },
              rotation: { x: 0, y: 0, z: 0 },
            },
            {
              id: uid(),
              type: '右塔顶',
              geometry: 'cone',
              position: { x: 1.1, y: 2.7, z: 0 },
              color: '#8b3a3a',
              scale: { x: 0.6, y: 0.6, z: 0.6 },
              rotation: { x: 0, y: 0, z: 0 },
            },
          ],
        }];
      },
    });
  }

  private createTree(
    position: { x: number; y: number; z: number },
    leafColor: string,
    scale: number
  ): SceneObject {
    return {
      id: uid(),
      type: '树木',
      geometry: 'group',
      position: position,
      color: leafColor,
      scale: { x: scale, y: scale, z: scale },
      rotation: { x: 0, y: rand(0, Math.PI * 2), z: 0 },
      children: [
        {
          id: uid(),
          type: '树干',
          geometry: 'cylinder',
          position: { x: 0, y: 0.5, z: 0 },
          color: '#8b5a2b',
          scale: { x: 0.15, y: 1, z: 0.15 },
          rotation: { x: 0, y: 0, z: 0 },
        },
        {
          id: uid(),
          type: '树冠',
          geometry: 'cone',
          position: { x: 0, y: 1.3, z: 0 },
          color: leafColor,
          scale: { x: 0.8, y: 1.2, z: 0.8 },
          rotation: { x: 0, y: 0, z: 0 },
        },
        {
          id: uid(),
          type: '树冠中层',
          geometry: 'cone',
          position: { x: 0, y: 1.7, z: 0 },
          color: leafColor,
          scale: { x: 0.6, y: 0.9, z: 0.6 },
          rotation: { x: 0, y: 0, z: 0 },
        },
        {
          id: uid(),
          type: '树冠顶层',
          geometry: 'cone',
          position: { x: 0, y: 2.0, z: 0 },
          color: leafColor,
          scale: { x: 0.4, y: 0.6, z: 0.4 },
          rotation: { x: 0, y: 0, z: 0 },
        },
      ],
    };
  }

  parseText(text: string): SceneData {
    const lowerText = text.toLowerCase();
    const ctx: ParseContext = {
      text: text,
      hasColor: (colors) => colors.some((c) => text.includes(c)),
      getColor: (defaultColor) => {
        for (const [name, hex] of Object.entries(COLOR_MAP)) {
          if (text.includes(name)) return hex;
        }
        return defaultColor;
      },
    };

    let allObjects: SceneObject[] = [];
    const matchedRules = new Set<number>();

    for (let i = 0; i < this.rules.length; i++) {
      const rule = this.rules[i];
      if (rule.keywords.some((kw) => lowerText.includes(kw))) {
        matchedRules.add(i);
        const objects = rule.factory(ctx);
        allObjects = allObjects.concat(objects);
      }
    }

    if (allObjects.length === 0) {
      allObjects.push(
        this.createTree({ x: -1.5, y: 0, z: 0 }, '#2d6a4f', 1.2),
        this.createTree({ x: 1.5, y: 0, z: 0 }, '#2d6a4f', 1.5),
        {
          id: uid(),
          type: '岩石',
          geometry: 'sphere',
          position: { x: 0, y: 0.1, z: 1 },
          color: '#888888',
          scale: { x: 0.5, y: 0.3, z: 0.5 },
          rotation: { x: 0, y: 0, z: 0 },
        }
      );
    }

    const MAX_OBJECTS = 30;
    if (allObjects.length > MAX_OBJECTS) {
      allObjects = allObjects.slice(0, MAX_OBJECTS);
    }

    const sceneData: SceneData = {
      objects: allObjects,
      ambientLight: { color: '#ffffff', intensity: 0.6 },
    };

    if (text.includes('迷雾') || text.includes('雾') || text.includes('朦胧')) {
      sceneData.fog = { color: '#1a1a2e', near: 2, far: 10 };
    }

    if (text.includes('夜晚') || text.includes('黑夜') || text.includes('深夜')) {
      sceneData.ambientLight = { color: '#4466aa', intensity: 0.3 };
      if (!sceneData.fog) {
        sceneData.fog = { color: '#0a0a1a', near: 3, far: 12 };
      }
    }

    return sceneData;
  }
}

const parser = new TextParser();
export function parseText(text: string): SceneData {
  return parser.parseText(text);
}
