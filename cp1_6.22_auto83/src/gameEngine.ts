export interface Item {
  id: string;
  name: string;
  color: string;
  secondaryColor: string;
  tier: number;
  icon: string;
  isBasic: boolean;
}

export interface Recipe {
  id: string;
  input1: string;
  input2: string;
  output: string;
}

export interface CauldronSlot {
  itemId: string | null;
  fromInventory: boolean;
  inventoryIndex: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'bubble' | 'smoke' | 'success' | 'ambient';
}

export interface AnimationState {
  successFlash: number;
  shakeTime: number;
  combineTime: number;
  newCardTime: number;
  newCardItemId: string | null;
  arrowAnimTime: number;
}

export interface DragState {
  isDragging: boolean;
  itemId: string | null;
  source: 'grid' | 'inventory' | 'recipe' | null;
  sourceIndex: number;
  mouseX: number;
  mouseY: number;
}

export interface ChainArrow {
  fromItemId: string;
  toRecipeId: string;
  toRecipeIndex: number;
}

export interface UIElements {
  gridRect: { x: number; y: number; cellSize: number; cols: number; rows: number };
  cauldronRect: { x: number; y: number; radius: number };
  cauldronSlots: { x: number; y: number; size: number }[];
  inventoryRect: { x: number; y: number; cellSize: number; cols: number; rows: number };
  inventoryScroll: number;
  codexRect: { x: number; y: number; width: number; height: number };
  codexCardSize: { width: number; height: number };
  codexCols: number;
  codexScroll: number;
  saveBtnRect: { x: number; y: number; width: number; height: number };
  resetBtnRect: { x: number; y: number; width: number; height: number };
  resetDialogRect: { x: number; y: number; width: number; height: number } | null;
  resetConfirmRect: { x: number; y: number; width: number; height: number } | null;
  resetCancelRect: { x: number; y: number; width: number; height: number } | null;
  toastRect: { x: number; y: number; width: number; height: number } | null;
  toastText: string;
  toastTime: number;
  chainArrows: ChainArrow[];
}

const BASIC_MATERIALS: Item[] = [
  { id: 'water', name: '水', color: '#4da6ff', secondaryColor: '#1a6bc4', tier: 0, icon: 'water', isBasic: true },
  { id: 'fire', name: '火', color: '#ff5500', secondaryColor: '#cc3300', tier: 0, icon: 'fire', isBasic: true },
  { id: 'earth', name: '土', color: '#8b5a2b', secondaryColor: '#5c3a1a', tier: 0, icon: 'earth', isBasic: true },
  { id: 'air', name: '气', color: '#e0e8f0', secondaryColor: '#a0b0c0', tier: 0, icon: 'air', isBasic: true },
];

const COMPOUND_ITEMS: Item[] = [
  { id: 'lava', name: '熔岩', color: '#ff4400', secondaryColor: '#cc2200', tier: 1, icon: 'lava', isBasic: false },
  { id: 'mist', name: '雾', color: '#b0c4de', secondaryColor: '#708090', tier: 1, icon: 'mist', isBasic: false },
  { id: 'mud', name: '泥', color: '#6b4423', secondaryColor: '#4a2f17', tier: 1, icon: 'mud', isBasic: false },
  { id: 'dust', name: '尘', color: '#d2b48c', secondaryColor: '#a0896c', tier: 1, icon: 'dust', isBasic: false },
  { id: 'steam', name: '蒸汽', color: '#f0f8ff', secondaryColor: '#b0c4de', tier: 1, icon: 'steam', isBasic: false },
  { id: 'energy', name: '能量', color: '#ffff00', secondaryColor: '#cc9900', tier: 1, icon: 'energy', isBasic: false },
  { id: 'obsidian', name: '黑曜石', color: '#1a1a2e', secondaryColor: '#0a0a15', tier: 2, icon: 'obsidian', isBasic: false },
  { id: 'cloud', name: '云', color: '#ffffff', secondaryColor: '#d0d0d0', tier: 2, icon: 'cloud', isBasic: false },
  { id: 'clay', name: '黏土', color: '#c08060', secondaryColor: '#8b5a3c', tier: 2, icon: 'clay', isBasic: false },
  { id: 'sand', name: '沙', color: '#f4d03f', secondaryColor: '#c9a227', tier: 2, icon: 'sand', isBasic: false },
  { id: 'lightning', name: '闪电', color: '#e0ffff', secondaryColor: '#00bfff', tier: 2, icon: 'lightning', isBasic: false },
  { id: 'metal', name: '金属', color: '#c0c0c0', secondaryColor: '#808080', tier: 2, icon: 'metal', isBasic: false },
  { id: 'life', name: '生命', color: '#32cd32', secondaryColor: '#228b22', tier: 2, icon: 'life', isBasic: false },
  { id: 'rain', name: '雨', color: '#6495ed', secondaryColor: '#4169e1', tier: 3, icon: 'rain', isBasic: false },
  { id: 'storm', name: '风暴', color: '#483d8b', secondaryColor: '#2f2a6b', tier: 3, icon: 'storm', isBasic: false },
  { id: 'glass', name: '玻璃', color: '#add8e6', secondaryColor: '#87ceeb', tier: 3, icon: 'glass', isBasic: false },
  { id: 'brick', name: '砖块', color: '#b22222', secondaryColor: '#8b0000', tier: 3, icon: 'brick', isBasic: false },
  { id: 'sword', name: '剑', color: '#e8e8e8', secondaryColor: '#a0a0a0', tier: 3, icon: 'sword', isBasic: false },
  { id: 'tree', name: '树', color: '#228b22', secondaryColor: '#006400', tier: 3, icon: 'tree', isBasic: false },
  { id: 'ice', name: '冰', color: '#b0e0e6', secondaryColor: '#87ceeb', tier: 2, icon: 'ice', isBasic: false },
  { id: 'snow', name: '雪', color: '#fffafa', secondaryColor: '#e8e8e8', tier: 3, icon: 'snow', isBasic: false },
  { id: 'volcano', name: '火山', color: '#8b0000', secondaryColor: '#4a0000', tier: 4, icon: 'volcano', isBasic: false },
  { id: 'rainbow', name: '彩虹', color: '#ff69b4', secondaryColor: '#9370db', tier: 4, icon: 'rainbow', isBasic: false },
  { id: 'crystal', name: '水晶', color: '#e0ffff', secondaryColor: '#afeeee', tier: 4, icon: 'crystal', isBasic: false },
  { id: 'golem', name: '魔像', color: '#808080', secondaryColor: '#505050', tier: 4, icon: 'golem', isBasic: false },
  { id: 'phoenix', name: '凤凰', color: '#ff6347', secondaryColor: '#dc143c', tier: 5, icon: 'phoenix', isBasic: false },
  { id: 'unicorn', name: '独角兽', color: '#fff0f5', secondaryColor: '#dda0dd', tier: 5, icon: 'unicorn', isBasic: false },
  { id: 'dragon', name: '龙', color: '#2e8b57', secondaryColor: '#006400', tier: 5, icon: 'dragon', isBasic: false },
  { id: 'philosopher', name: '贤者之石', color: '#ff0000', secondaryColor: '#8b0000', tier: 6, icon: 'philosopher', isBasic: false },
  { id: 'time', name: '时间', color: '#9400d3', secondaryColor: '#4b0082', tier: 5, icon: 'time', isBasic: false },
];

export const ITEM_DATABASE: Record<string, Item> = {};
[...BASIC_MATERIALS, ...COMPOUND_ITEMS].forEach(item => {
  ITEM_DATABASE[item.id] = item;
});

export const RECIPES: Recipe[] = [
  { id: 'r1', input1: 'earth', input2: 'fire', output: 'lava' },
  { id: 'r2', input1: 'water', input2: 'air', output: 'mist' },
  { id: 'r3', input1: 'water', input2: 'earth', output: 'mud' },
  { id: 'r4', input1: 'earth', input2: 'air', output: 'dust' },
  { id: 'r5', input1: 'water', input2: 'fire', output: 'steam' },
  { id: 'r6', input1: 'fire', input2: 'air', output: 'energy' },
  { id: 'r7', input1: 'lava', input2: 'water', output: 'obsidian' },
  { id: 'r8', input1: 'mist', input2: 'mist', output: 'cloud' },
  { id: 'r9', input1: 'mud', input2: 'fire', output: 'clay' },
  { id: 'r10', input1: 'dust', input2: 'fire', output: 'sand' },
  { id: 'r11', input1: 'energy', input2: 'cloud', output: 'lightning' },
  { id: 'r12', input1: 'earth', input2: 'energy', output: 'metal' },
  { id: 'r13', input1: 'mud', input2: 'energy', output: 'life' },
  { id: 'r14', input1: 'cloud', input2: 'water', output: 'rain' },
  { id: 'r15', input1: 'rain', input2: 'lightning', output: 'storm' },
  { id: 'r16', input1: 'sand', input2: 'fire', output: 'glass' },
  { id: 'r17', input1: 'clay', input2: 'fire', output: 'brick' },
  { id: 'r18', input1: 'metal', input2: 'fire', output: 'sword' },
  { id: 'r19', input1: 'life', input2: 'earth', output: 'tree' },
  { id: 'r20', input1: 'water', input2: 'mist', output: 'ice' },
  { id: 'r21', input1: 'ice', input2: 'cloud', output: 'snow' },
  { id: 'r22', input1: 'lava', input2: 'earth', output: 'volcano' },
  { id: 'r23', input1: 'rain', input2: 'sun', output: 'rainbow' },
  { id: 'r24', input1: 'glass', input2: 'energy', output: 'crystal' },
  { id: 'r25', input1: 'clay', input2: 'life', output: 'golem' },
  { id: 'r26', input1: 'fire', input2: 'life', output: 'phoenix' },
  { id: 'r27', input1: 'life', input2: 'rainbow', output: 'unicorn' },
  { id: 'r28', input1: 'fire', input2: 'volcano', output: 'dragon' },
  { id: 'r29', input1: 'crystal', input2: 'phoenix', output: 'philosopher' },
  { id: 'r30', input1: 'sand', input2: 'water', output: 'glass' },
  { id: 'r31', input1: 'ice', input2: 'energy', output: 'time' },
  { id: 'r32', input1: 'lightning', input2: 'metal', output: 'time' },
  { id: 'r33', input1: 'cloud', input2: 'energy', output: 'lightning' },
  { id: 'r34', input1: 'steam', input2: 'air', output: 'cloud' },
  { id: 'r35', input1: 'dust', input2: 'water', output: 'mud' },
  { id: 'r36', input1: 'tree', input2: 'fire', output: 'energy' },
  { id: 'r37', input1: 'snow', input2: 'fire', output: 'water' },
  { id: 'r38', input1: 'energy', input2: 'energy', output: 'lightning' },
];

const MAX_INVENTORY = 48;
const STORAGE_KEY = 'alchemy_workshop_save_v1';

export class GameEngine {
  inventory: (string | null)[] = [];
  discoveredRecipes: Set<string> = new Set();
  cauldronSlots: [CauldronSlot, CauldronSlot] = [
    { itemId: null, fromInventory: false, inventoryIndex: -1 },
    { itemId: null, fromInventory: false, inventoryIndex: -1 },
  ];
  particles: Particle[] = [];
  dragState: DragState = {
    isDragging: false,
    itemId: null,
    source: null,
    sourceIndex: -1,
    mouseX: 0,
    mouseY: 0,
  };
  animationState: AnimationState = {
    successFlash: 0,
    shakeTime: 0,
    combineTime: 0,
    newCardTime: 0,
    newCardItemId: null,
    arrowAnimTime: 0,
  };
  ui: UIElements = {
    gridRect: { x: 0, y: 0, cellSize: 60, cols: 6, rows: 6 },
    cauldronRect: { x: 0, y: 0, radius: 80 },
    cauldronSlots: [
      { x: 0, y: 0, size: 40 },
      { x: 0, y: 0, size: 40 },
    ],
    inventoryRect: { x: 0, y: 0, cellSize: 50, cols: 24, rows: 2 },
    inventoryScroll: 0,
    codexRect: { x: 0, y: 0, width: 0, height: 0 },
    codexCardSize: { width: 120, height: 150 },
    codexCols: 2,
    codexScroll: 0,
    saveBtnRect: { x: 0, y: 0, width: 80, height: 32 },
    resetBtnRect: { x: 0, y: 0, width: 80, height: 32 },
    resetDialogRect: null,
    resetConfirmRect: null,
    resetCancelRect: null,
    toastRect: null,
    toastText: '',
    toastTime: 0,
    chainArrows: [],
  };
  combineCount: number = 0;
  showResetDialog: boolean = false;
  hoveredButton: 'save' | 'reset' | 'confirm' | 'cancel' | null = null;
  hoveredCodexIndex: number = -1;
  hoveredChainArrowIndex: number = -1;
  isResponsive: boolean = false;
  newlyDiscoveredItemId: string | null = null;

  constructor() {
    this.inventory = new Array(MAX_INVENTORY).fill(null);
    this.loadFromStorage();
  }

  saveToStorage(): void {
    const data = {
      inventory: this.inventory,
      discoveredRecipes: Array.from(this.discoveredRecipes),
      combineCount: this.combineCount,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    this.showToast('进度已保存！');
  }

  loadFromStorage(): boolean {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (Array.isArray(data.inventory)) {
        this.inventory = data.inventory.slice(0, MAX_INVENTORY);
        while (this.inventory.length < MAX_INVENTORY) this.inventory.push(null);
      }
      if (Array.isArray(data.discoveredRecipes)) {
        this.discoveredRecipes = new Set(data.discoveredRecipes);
      }
      if (typeof data.combineCount === 'number') {
        this.combineCount = data.combineCount;
      }
      return true;
    } catch {
      return false;
    }
  }

  resetAllProgress(): void {
    this.inventory = new Array(MAX_INVENTORY).fill(null);
    this.discoveredRecipes.clear();
    this.combineCount = 0;
    this.cauldronSlots[0] = { itemId: null, fromInventory: false, inventoryIndex: -1 };
    this.cauldronSlots[1] = { itemId: null, fromInventory: false, inventoryIndex: -1 };
    this.particles = [];
    localStorage.removeItem(STORAGE_KEY);
    this.showResetDialog = false;
    this.showToast('所有进度已重置！');
    this.updateChainArrows();
  }

  getBasicGridItem(index: number): string | null {
    const basics = ['water', 'fire', 'earth', 'air'];
    if (index < 0 || index >= 36) return null;
    return basics[index % 4];
  }

  getBasicGridCount(): number {
    return 36;
  }

  addToInventory(itemId: string): boolean {
    const idx = this.inventory.findIndex(s => s === null);
    if (idx === -1) {
      this.showToast('背包已满，请消耗或丢弃物品');
      return false;
    }
    this.inventory[idx] = itemId;
    return true;
  }

  removeFromInventory(index: number): string | null {
    if (index < 0 || index >= MAX_INVENTORY) return null;
    const item = this.inventory[index];
    this.inventory[index] = null;
    return item;
  }

  addToCauldron(itemId: string, slot: 0 | 1, fromInventory: boolean = false, inventoryIndex: number = -1): boolean {
    if (this.animationState.combineTime > 0) return false;
    if (fromInventory && inventoryIndex >= 0) {
      this.removeFromInventory(inventoryIndex);
    }
    const target = this.cauldronSlots[slot];
    if (target.itemId !== null && target.fromInventory && target.inventoryIndex >= 0) {
      this.addToInventory(target.itemId);
    }
    this.cauldronSlots[slot] = { itemId, fromInventory, inventoryIndex };
    return true;
  }

  clearCauldronSlot(slot: 0 | 1): void {
    const s = this.cauldronSlots[slot];
    if (s.itemId !== null && s.fromInventory && s.inventoryIndex >= 0) {
      this.addToInventory(s.itemId);
    }
    this.cauldronSlots[slot] = { itemId: null, fromInventory: false, inventoryIndex: -1 };
  }

  clearCauldronToInventory(): void {
    for (let i = 0; i < 2; i++) {
      const s = this.cauldronSlots[i];
      if (s.itemId !== null) {
        this.addToInventory(s.itemId);
        this.cauldronSlots[i] = { itemId: null, fromInventory: false, inventoryIndex: -1 };
      }
    }
  }

  findRecipe(id1: string, id2: string): Recipe | null {
    for (const r of RECIPES) {
      if ((r.input1 === id1 && r.input2 === id2) || (r.input1 === id2 && r.input2 === id1)) {
        return r;
      }
    }
    return null;
  }

  combineItems(): string | null {
    const s1 = this.cauldronSlots[0];
    const s2 = this.cauldronSlots[1];
    if (s1.itemId === null || s2.itemId === null) return null;

    const recipe = this.findRecipe(s1.itemId, s2.itemId);
    this.combineCount++;

    if (recipe) {
      const isNew = !this.discoveredRecipes.has(recipe.id);
      this.discoveredRecipes.add(recipe.id);
      this.animationState.combineTime = 0.8;
      this.animationState.successFlash = 0.15;
      this.cauldronSlots[0] = { itemId: null, fromInventory: false, inventoryIndex: -1 };
      this.cauldronSlots[1] = { itemId: null, fromInventory: false, inventoryIndex: -1 };
      this.addToInventory(recipe.output);
      if (isNew) {
        this.animationState.newCardTime = 1.2;
        this.animationState.newCardItemId = recipe.output;
        this.newlyDiscoveredItemId = recipe.output;
      }
      this.updateChainArrows();
      return recipe.output;
    } else {
      this.animationState.shakeTime = 0.3;
      this.animationState.combineTime = 0.3;
      return null;
    }
  }

  spawnAmbientParticles(count: number, cx: number, cy: number, radius: number): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * (radius * 0.7);
      this.particles.push({
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r * 0.6,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -Math.random() * 0.5 - 0.2,
        life: 3 + Math.random() * 2,
        maxLife: 5,
        color: `rgba(255,${180 + Math.random() * 60},${80 + Math.random() * 60},0.5)`,
        size: 2 + Math.random() * 1.5,
        type: 'ambient',
      });
    }
  }

  spawnSuccessParticles(cx: number, cy: number): void {
    for (let i = 0; i < 40; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const colors = ['#ffd700', '#ff8c00', '#ff4500', '#ffff00'];
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3,
        type: 'success',
      });
    }
  }

  spawnSmokeParticles(cx: number, cy: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.8;
      const speed = 0.5 + Math.random() * 1.5;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 40,
        y: cy - 20,
        vx: Math.cos(angle) * speed * 0.3,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        color: `rgba(120,120,120,${0.4 + Math.random() * 0.3})`,
        size: 4 + Math.random() * 4,
        type: 'smoke',
      });
    }
  }

  updateParticles(dt: number): void {
    const max = 100;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx;
      p.y += p.vy;
      if (p.type === 'success') {
        p.vy += 0.1;
      } else if (p.type === 'smoke') {
        p.vy -= 0.01;
      } else if (p.type === 'ambient') {
        p.vx += (Math.random() - 0.5) * 0.05;
      }
    }
    if (this.particles.length > max) {
      this.particles.splice(0, this.particles.length - max);
    }
  }

  updateAnimation(dt: number): void {
    if (this.animationState.successFlash > 0) {
      this.animationState.successFlash = Math.max(0, this.animationState.successFlash - dt);
    }
    if (this.animationState.shakeTime > 0) {
      this.animationState.shakeTime = Math.max(0, this.animationState.shakeTime - dt);
    }
    if (this.animationState.combineTime > 0) {
      this.animationState.combineTime = Math.max(0, this.animationState.combineTime - dt);
    }
    if (this.animationState.newCardTime > 0) {
      this.animationState.newCardTime = Math.max(0, this.animationState.newCardTime - dt);
      if (this.animationState.newCardTime === 0) {
        this.animationState.newCardItemId = null;
        this.newlyDiscoveredItemId = null;
      }
    }
    this.animationState.arrowAnimTime += dt;
    if (this.ui.toastTime > 0) {
      this.ui.toastTime = Math.max(0, this.ui.toastTime - dt);
      if (this.ui.toastTime === 0) {
        this.ui.toastRect = null;
        this.ui.toastText = '';
      }
    }
  }

  updateChainArrows(): void {
    const arrows: ChainArrow[] = [];
    const invSet = new Set<string>();
    this.inventory.forEach(id => { if (id) invSet.add(id); });
    this.cauldronSlots.forEach(s => { if (s.itemId) invSet.add(s.itemId); });

    for (const itemId of invSet) {
      for (let i = 0; i < RECIPES.length; i++) {
        const r = RECIPES[i];
        if (this.discoveredRecipes.has(r.id)) continue;
        if (r.input1 !== itemId && r.input2 !== itemId) continue;
        const other = r.input1 === itemId ? r.input2 : r.input1;
        if (invSet.has(other)) {
          arrows.push({ fromItemId: itemId, toRecipeId: r.id, toRecipeIndex: i });
          if (arrows.length >= 6) break;
        }
      }
      if (arrows.length >= 6) break;
    }
    this.ui.chainArrows = arrows;
  }

  showToast(text: string): void {
    this.ui.toastText = text;
    this.ui.toastTime = 2.5;
  }

  getDiscoveredRecipes(): Recipe[] {
    return RECIPES.filter(r => this.discoveredRecipes.has(r.id));
  }

  getUndiscoveredRecipes(): Recipe[] {
    return RECIPES.filter(r => !this.discoveredRecipes.has(r.id));
  }

  autoFillFromChain(arrowIndex: number): void {
    const arrow = this.ui.chainArrows[arrowIndex];
    if (!arrow) return;
    const recipe = RECIPES.find(r => r.id === arrow.toRecipeId);
    if (!recipe) return;
    this.clearCauldronToInventory();
    this.addToCauldron(arrow.fromItemId, 0);
    const other = recipe.input1 === arrow.fromItemId ? recipe.input2 : recipe.input1;
    this.addToCauldron(other, 1);
  }

  getInventoryUsedCount(): number {
    return this.inventory.filter(s => s !== null).length;
  }
}
