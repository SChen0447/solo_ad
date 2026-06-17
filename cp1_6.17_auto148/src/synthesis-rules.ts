export interface ElementInfo {
  id: string;
  name: string;
  color1: string;
  color2: string;
  isCompound: boolean;
}

export interface WorkshopConfig {
  gridRadius: number;
  hexSize: number;
  magicCirclePositions: HexCoord[];
  initialElementCount: number;
}

export interface HexCoord {
  q: number;
  r: number;
}

export interface MagicCircleRecipe {
  level: number;
  unlocks: string[];
}

export interface SynthesisData {
  baseElements: Record<string, { name: string; color1: string; color2: string }>;
  compounds: Record<string, { name: string; color1: string; color2: string }>;
  synthesisTable: Record<string, string>;
  magicCircleRecipes: Record<string, MagicCircleRecipe>;
  workshopConfig: WorkshopConfig;
}

export class SynthesisRules {
  private elements: Map<string, ElementInfo> = new Map();
  private synthesisTable: Map<string, string> = new Map();
  private magicCircleRecipes: Map<string, MagicCircleRecipe> = new Map();
  private workshopConfig: WorkshopConfig | null = null;

  constructor() {}

  async loadFromAPI(baseUrl: string = 'http://localhost:5000'): Promise<void> {
    try {
      const response = await fetch(`${baseUrl}/api/synthesis-table`);
      const data: SynthesisData = await response.json();
      this.setData(data);
    } catch (e) {
      console.warn('Failed to load from API, using fallback data');
      this.loadFallbackData();
    }
  }

  private loadFallbackData(): void {
    const fallbackData: SynthesisData = {
      baseElements: {
        fire: { name: '火', color1: '#FF4500', color2: '#FF8C00' },
        water: { name: '水', color1: '#1E90FF', color2: '#8A2BE2' },
        earth: { name: '土', color1: '#8B4513', color2: '#2E8B57' },
        wind: { name: '风', color1: '#00CED1', color2: '#F0F8FF' },
        light: { name: '光', color1: '#FFD700', color2: '#FFF8DC' },
        dark: { name: '暗', color1: '#4B0082', color2: '#191970' }
      },
      compounds: {
        mud: { name: '泥', color1: '#8B7355', color2: '#5C4033' },
        lightning: { name: '雷电', color1: '#FFFF00', color2: '#00FFFF' },
        chaos: { name: '混沌', color1: '#8B008B', color2: '#FF1493' },
        lava: { name: '熔岩', color1: '#FF4500', color2: '#FFD700' },
        mist: { name: '迷雾', color1: '#E0FFFF', color2: '#B0C4DE' },
        steam: { name: '蒸汽', color1: '#F5F5F5', color2: '#DCDCDC' },
        solar_flare: { name: '日焰', color1: '#FF6347', color2: '#FFD700' },
        abyss: { name: '深渊', color1: '#000080', color2: '#2F0040' },
        life: { name: '生命', color1: '#00FF00', color2: '#32CD32' },
        obsidian: { name: '黑曜石', color1: '#2F2F2F', color2: '#696969' },
        creation: { name: '创世', color1: '#FFFFFF', color2: '#FFD700' }
      },
      synthesisTable: {
        'earth+water': 'mud',
        'water+earth': 'mud',
        'fire+wind': 'lightning',
        'wind+fire': 'lightning',
        'light+dark': 'chaos',
        'dark+light': 'chaos',
        'fire+earth': 'lava',
        'earth+fire': 'lava',
        'water+wind': 'mist',
        'wind+water': 'mist',
        'fire+water': 'steam',
        'water+fire': 'steam',
        'light+fire': 'solar_flare',
        'fire+light': 'solar_flare',
        'dark+water': 'abyss',
        'water+dark': 'abyss',
        'mud+lightning': 'life',
        'lightning+mud': 'life',
        'lava+water': 'obsidian',
        'water+lava': 'obsidian',
        'chaos+light': 'creation',
        'light+chaos': 'creation'
      },
      magicCircleRecipes: {
        chaos: { level: 2, unlocks: ['mud+lightning', 'lava+water'] },
        life: { level: 3, unlocks: ['chaos+light'] },
        creation: { level: 4, unlocks: [] }
      },
      workshopConfig: {
        gridRadius: 3,
        hexSize: 50,
        magicCirclePositions: [
          { q: 0, r: 0 },
          { q: 2, r: -1 },
          { q: -2, r: 1 }
        ],
        initialElementCount: 5
      }
    };
    this.setData(fallbackData);
  }

  private setData(data: SynthesisData): void {
    this.elements.clear();
    for (const [id, info] of Object.entries(data.baseElements)) {
      this.elements.set(id, { ...info, id, isCompound: false });
    }
    for (const [id, info] of Object.entries(data.compounds)) {
      this.elements.set(id, { ...info, id, isCompound: true });
    }

    this.synthesisTable.clear();
    for (const [key, result] of Object.entries(data.synthesisTable)) {
      this.synthesisTable.set(key, result);
    }

    this.magicCircleRecipes.clear();
    for (const [key, recipe] of Object.entries(data.magicCircleRecipes)) {
      this.magicCircleRecipes.set(key, recipe);
    }

    this.workshopConfig = {
      gridRadius: data.workshopConfig.gridRadius,
      hexSize: data.workshopConfig.hexSize,
      magicCirclePositions: data.workshopConfig.magicCirclePositions.map(p => ({ ...p })),
      initialElementCount: data.workshopConfig.initialElementCount
    };
  }

  checkSynthesis(elementId1: string, elementId2: string): string | null {
    const key = `${elementId1}+${elementId2}`;
    return this.synthesisTable.get(key) || null;
  }

  getElementInfo(id: string): ElementInfo | undefined {
    return this.elements.get(id);
  }

  getBaseElementIds(): string[] {
    const base: string[] = [];
    for (const [id, info] of this.elements) {
      if (!info.isCompound) {
        base.push(id);
      }
    }
    return base;
  }

  getCompoundIds(): string[] {
    const compounds: string[] = [];
    for (const [id, info] of this.elements) {
      if (info.isCompound) {
        compounds.push(id);
      }
    }
    return compounds;
  }

  getWorkshopConfig(): WorkshopConfig {
    if (!this.workshopConfig) {
      throw new Error('Workshop config not loaded');
    }
    return this.workshopConfig;
  }

  getMagicCircleRecipe(compoundId: string): MagicCircleRecipe | undefined {
    return this.magicCircleRecipes.get(compoundId);
  }

  getTotalRecipeCount(): number {
    const uniqueRecipes = new Set<string>();
    for (const key of this.synthesisTable.keys()) {
      const parts = key.split('+');
      const sorted = parts.sort().join('+');
      uniqueRecipes.add(sorted);
    }
    return uniqueRecipes.size;
  }

  areElementsAdjacent(a: HexCoord, b: HexCoord): boolean {
    const dq = a.q - b.q;
    const dr = a.r - b.r;
    return Math.abs(dq) <= 1 && Math.abs(dr) <= 1 && Math.abs(dq + dr) <= 1 && !(dq === 0 && dr === 0);
  }
}
