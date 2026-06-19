import {
  ELEMENTS,
  RECIPES,
  BASIC_ELEMENT_IDS,
  getTotalElementCount,
  getElementById,
  type Element,
  type Recipe
} from './ElementData';

export interface FusionSlot {
  elementId: string | null;
}

export interface FusionResult {
  success: boolean;
  outputElementId?: string;
  inputElementIds: [string, string];
  isNewUnlock: boolean;
}

export interface GameState {
  unlockedElements: Set<string>;
  favoriteElements: Set<string>;
  slots: [FusionSlot, FusionSlot];
  stats: {
    totalFusions: number;
    successfulFusions: number;
  };
}

export interface RecipeNode {
  elementId: string;
  parents: string[];
  depth: number;
}

type StateChangeListener = (state: GameState) => void;
type FusionListener = (result: FusionResult) => void;

export class GameEngine {
  private state: GameState;
  private stateListeners: Set<StateChangeListener> = new Set();
  private fusionListeners: Set<FusionListener> = new Set();
  private recipeMap: Map<string, Recipe> = new Map();

  constructor() {
    this.state = this.createInitialState();
    this.buildRecipeMap();
  }

  private createInitialState(): GameState {
    const unlocked = new Set<string>(BASIC_ELEMENT_IDS);
    return {
      unlockedElements: unlocked,
      favoriteElements: new Set(),
      slots: [{ elementId: null }, { elementId: null }],
      stats: {
        totalFusions: 0,
        successfulFusions: 0
      }
    };
  }

  private buildRecipeMap(): void {
    for (const recipe of RECIPES) {
      const key1 = `${recipe.inputs[0]}+${recipe.inputs[1]}`;
      const key2 = `${recipe.inputs[1]}+${recipe.inputs[0]}`;
      this.recipeMap.set(key1, recipe);
      this.recipeMap.set(key2, recipe);
    }
  }

  getState(): GameState {
    return {
      ...this.state,
      unlockedElements: new Set(this.state.unlockedElements),
      favoriteElements: new Set(this.state.favoriteElements),
      slots: [
        { elementId: this.state.slots[0].elementId },
        { elementId: this.state.slots[1].elementId }
      ]
    };
  }

  addStateListener(listener: StateChangeListener): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  addFusionListener(listener: FusionListener): () => void {
    this.fusionListeners.add(listener);
    return () => this.fusionListeners.delete(listener);
  }

  private notifyStateChange(): void {
    const state = this.getState();
    for (const listener of this.stateListeners) {
      listener(state);
    }
  }

  private notifyFusion(result: FusionResult): void {
    for (const listener of this.fusionListeners) {
      listener(result);
    }
  }

  placeElementInSlot(slotIndex: 0 | 1, elementId: string): boolean {
    if (!this.state.unlockedElements.has(elementId)) {
      return false;
    }
    this.state.slots[slotIndex].elementId = elementId;
    this.notifyStateChange();
    return true;
  }

  clearSlot(slotIndex: 0 | 1): void {
    this.state.slots[slotIndex].elementId = null;
    this.notifyStateChange();
  }

  clearAllSlots(): void {
    this.state.slots[0].elementId = null;
    this.state.slots[1].elementId = null;
    this.notifyStateChange();
  }

  tryFusion(): FusionResult | null {
    const slot0 = this.state.slots[0].elementId;
    const slot1 = this.state.slots[1].elementId;

    if (!slot0 || !slot1) {
      return null;
    }

    const startTime = performance.now();
    this.state.stats.totalFusions++;

    const key = `${slot0}+${slot1}`;
    const recipe = this.recipeMap.get(key);

    if (!recipe) {
      const result: FusionResult = {
        success: false,
        inputElementIds: [slot0, slot1],
        isNewUnlock: false
      };
      this.notifyStateChange();
      this.notifyFusion(result);
      return result;
    }

    const outputElementId = recipe.output;
    const isNew = !this.state.unlockedElements.has(outputElementId);

    if (isNew) {
      this.state.unlockedElements.add(outputElementId);
    }

    this.state.stats.successfulFusions++;

    const result: FusionResult = {
      success: true,
      outputElementId,
      inputElementIds: [slot0, slot1],
      isNewUnlock: isNew
    };

    this.state.slots[0].elementId = null;
    this.state.slots[1].elementId = null;

    const elapsed = performance.now() - startTime;
    if (elapsed > 50) {
      console.warn(`Fusion check took ${elapsed}ms, exceeds 50ms target`);
    }

    this.notifyStateChange();
    this.notifyFusion(result);
    return result;
  }

  toggleFavorite(elementId: string): boolean {
    if (!this.state.unlockedElements.has(elementId)) {
      return false;
    }
    if (this.state.favoriteElements.has(elementId)) {
      this.state.favoriteElements.delete(elementId);
    } else {
      this.state.favoriteElements.add(elementId);
    }
    this.notifyStateChange();
    return true;
  }

  isFavorite(elementId: string): boolean {
    return this.state.favoriteElements.has(elementId);
  }

  isUnlocked(elementId: string): boolean {
    return this.state.unlockedElements.has(elementId);
  }

  getUnlockedCount(): number {
    return this.state.unlockedElements.size;
  }

  getTotalCount(): number {
    return getTotalElementCount();
  }

  getUnlockedElementsList(): Element[] {
    const favorites: Element[] = [];
    const others: Element[] = [];

    for (const id of this.state.unlockedElements) {
      const element = getElementById(id);
      if (element) {
        if (this.state.favoriteElements.has(id)) {
          favorites.push(element);
        } else {
          others.push(element);
        }
      }
    }

    favorites.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
    others.sort((a, b) => {
      if (a.isBasic !== b.isBasic) return a.isBasic ? -1 : 1;
      return a.name.localeCompare(b.name, 'zh');
    });

    return [...favorites, ...others];
  }

  getRecipeTree(): RecipeNode[] {
    const nodes: RecipeNode[] = [];
    const visited = new Set<string>();
    const depthMap = new Map<string, number>();

    for (const id of BASIC_ELEMENT_IDS) {
      depthMap.set(id, 0);
    }

    const queue: string[] = [...BASIC_ELEMENT_IDS];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      const depth = depthMap.get(current) ?? 0;
      const parents: string[] = [];

      for (const recipe of RECIPES) {
        if (recipe.output === current) {
          for (const input of recipe.inputs) {
            if (!parents.includes(input)) {
              parents.push(input);
            }
          }
        }
      }

      if (this.state.unlockedElements.has(current)) {
        nodes.push({ elementId: current, parents, depth });
      }

      for (const recipe of RECIPES) {
        if (recipe.inputs.includes(current)) {
          const childDepth = depth + 1;
          const existingDepth = depthMap.get(recipe.output);
          if (existingDepth === undefined || existingDepth > childDepth) {
            depthMap.set(recipe.output, childDepth);
          }
          if (!visited.has(recipe.output) && !queue.includes(recipe.output)) {
            queue.push(recipe.output);
          }
        }
      }
    }

    for (const id of Object.keys(ELEMENTS)) {
      if (!visited.has(id) && this.state.unlockedElements.has(id)) {
        const parents: string[] = [];
        for (const recipe of RECIPES) {
          if (recipe.output === id) {
            for (const input of recipe.inputs) {
              if (!parents.includes(input)) {
                parents.push(input);
              }
            }
          }
        }
        nodes.push({ elementId: id, parents, depth: depthMap.get(id) ?? 99 });
      }
    }

    nodes.sort((a, b) => {
      if (a.depth !== b.depth) return a.depth - b.depth;
      return a.elementId.localeCompare(b.elementId);
    });

    return nodes;
  }

  getRecipePath(elementId: string): string | null {
    if (!this.state.unlockedElements.has(elementId)) {
      return null;
    }

    for (const recipe of RECIPES) {
      if (recipe.output === elementId) {
        const e1 = getElementById(recipe.inputs[0]);
        const e2 = getElementById(recipe.inputs[1]);
        const out = getElementById(elementId);
        if (e1 && e2 && out) {
          return `${e1.name} + ${e2.name} → ${out.name}`;
        }
      }
    }

    return null;
  }

  getAllElements(): Element[] {
    return Object.values(ELEMENTS);
  }

  resetGame(): void {
    this.state = this.createInitialState();
    this.notifyStateChange();
  }
}

export const gameEngine = new GameEngine();
