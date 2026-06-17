import { SynthesisRules, type HexCoord } from './synthesis-rules';

export interface PlayerProgress {
  knowledgeLevel: number;
  unlockedRecipes: string[];
  elements: Record<string, number>;
  discoveredCompounds: string[];
}

export interface LifecycleCallbacks {
  onResourceChanged?: () => void;
  onKnowledgeLevelUp?: (newLevel: number) => void;
  onRecipeUnlocked?: (recipeKey: string) => void;
}

export class LifecycleManager {
  private rules: SynthesisRules;
  private callbacks: LifecycleCallbacks;
  private progress: PlayerProgress;
  private audioContext: AudioContext | null = null;
  private messageEl: HTMLElement | null = null;
  private messageTimeout: number | null = null;

  constructor(rules: SynthesisRules, callbacks: LifecycleCallbacks = {}) {
    this.rules = rules;
    this.callbacks = callbacks;
    this.progress = {
      knowledgeLevel: 1,
      unlockedRecipes: [],
      elements: {},
      discoveredCompounds: []
    };
  }

  init(initialCount: number = 5): void {
    const baseElements = this.rules.getBaseElementIds();
    for (const id of baseElements) {
      this.progress.elements[id] = initialCount;
    }
  }

  loadProgress(progress: PlayerProgress): void {
    this.progress = { ...progress };
    if (this.callbacks.onResourceChanged) {
      this.callbacks.onResourceChanged();
    }
  }

  getProgress(): PlayerProgress {
    return { ...this.progress };
  }

  getElementCount(elementId: string): number {
    return this.progress.elements[elementId] || 0;
  }

  consumeElement(elementId: string): boolean {
    if ((this.progress.elements[elementId] || 0) <= 0) {
      return false;
    }
    this.progress.elements[elementId]--;
    if (this.callbacks.onResourceChanged) {
      this.callbacks.onResourceChanged();
    }
    return true;
  }

  addElement(elementId: string, count: number = 1): void {
    this.progress.elements[elementId] = (this.progress.elements[elementId] || 0) + count;
    if (this.callbacks.onResourceChanged) {
      this.callbacks.onResourceChanged();
    }
  }

  getKnowledgeLevel(): number {
    return this.progress.knowledgeLevel;
  }

  getUnlockedRecipeCount(): number {
    return this.progress.unlockedRecipes.length;
  }

  getDiscoveredCompoundCount(): number {
    return this.progress.discoveredCompounds.length;
  }

  isRecipeUnlocked(recipeKey: string): boolean {
    return this.progress.unlockedRecipes.includes(recipeKey);
  }

  isCompoundDiscovered(compoundId: string): boolean {
    return this.progress.discoveredCompounds.includes(compoundId);
  }

  onSynthesisSuccess(compoundId: string): void {
    if (!this.progress.discoveredCompounds.includes(compoundId)) {
      this.progress.discoveredCompounds.push(compoundId);
    }

    const info = this.rules.getElementInfo(compoundId);
    const name = info ? info.name : compoundId;
    this.showMessage(`合成成功：${name}`, 'success');
    this.playSuccessSound();
  }

  onSynthesisFailed(_cell1: HexCoord, _cell2: HexCoord): void {
    this.showMessage('合成失败：无效配方', 'error');
    this.playErrorSound();
  }

  onMagicCircleActivated(compoundId: string): void {
    const recipe = this.rules.getMagicCircleRecipe(compoundId);
    if (!recipe) return;

    if (recipe.level > this.progress.knowledgeLevel) {
      this.progress.knowledgeLevel = recipe.level;
      if (this.callbacks.onKnowledgeLevelUp) {
        this.callbacks.onKnowledgeLevelUp(recipe.level);
      }
    }

    for (const recipeKey of recipe.unlocks) {
      if (!this.progress.unlockedRecipes.includes(recipeKey)) {
        this.progress.unlockedRecipes.push(recipeKey);
        if (this.callbacks.onRecipeUnlocked) {
          this.callbacks.onRecipeUnlocked(recipeKey);
        }
      }
    }

    const info = this.rules.getElementInfo(compoundId);
    const name = info ? info.name : compoundId;
    this.showMessage(`魔法阵激活！${name}之力`, 'magic');
    this.playMagicSound();

    if (this.callbacks.onResourceChanged) {
      this.callbacks.onResourceChanged();
    }
  }

  setMessageElement(el: HTMLElement): void {
    this.messageEl = el;
  }

  private showMessage(text: string, type: 'success' | 'error' | 'magic'): void {
    if (!this.messageEl) return;

    if (this.messageTimeout) {
      clearTimeout(this.messageTimeout);
    }

    this.messageEl.textContent = text;
    this.messageEl.className = '';

    if (type === 'success') {
      this.messageEl.style.color = '#00FF00';
      this.messageEl.style.textShadow = '0 0 20px rgba(0, 255, 0, 0.8)';
    } else if (type === 'error') {
      this.messageEl.style.color = '#FF4444';
      this.messageEl.style.textShadow = '0 0 20px rgba(255, 68, 68, 0.8)';
    } else {
      this.messageEl.style.color = '#FFD700';
      this.messageEl.style.textShadow = '0 0 30px rgba(255, 215, 0, 0.9)';
    }

    requestAnimationFrame(() => {
      this.messageEl!.classList.add('show');
    });

    this.messageTimeout = window.setTimeout(() => {
      this.messageEl!.classList.remove('show');
      this.messageTimeout = null;
    }, 2000);
  }

  private ensureAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  playSuccessSound(): void {
    const ctx = this.ensureAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(523.25, ctx.currentTime);
    oscillator.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
    oscillator.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.4);
  }

  playErrorSound(): void {
    const ctx = this.ensureAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, ctx.currentTime);
    oscillator.frequency.setValueAtTime(150, ctx.currentTime + 0.1);

    gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.2);
  }

  playMagicSound(): void {
    const ctx = this.ensureAudioContext();

    for (let i = 0; i < 4; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440 * Math.pow(1.15, i), ctx.currentTime + i * 0.15);

      gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.15 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.15 + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.5);
    }
  }

  async saveProgressToAPI(baseUrl: string = 'http://localhost:5000'): Promise<void> {
    try {
      await fetch(`${baseUrl}/api/save-progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          knowledge_level: this.progress.knowledgeLevel,
          unlocked_recipes: this.progress.unlockedRecipes,
          elements: this.progress.elements,
          discovered_compounds: this.progress.discoveredCompounds
        })
      });
    } catch (e) {
      console.warn('Failed to save progress to API');
    }
  }

  async loadProgressFromAPI(baseUrl: string = 'http://localhost:5000'): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/api/load-progress`);
      const data = await response.json();

      this.progress = {
        knowledgeLevel: data.knowledge_level || 1,
        unlockedRecipes: data.unlocked_recipes || [],
        elements: data.elements || {},
        discoveredCompounds: data.discovered_compounds || []
      };

      if (this.callbacks.onResourceChanged) {
        this.callbacks.onResourceChanged();
      }
      return true;
    } catch (e) {
      console.warn('Failed to load progress from API');
      return false;
    }
  }
}
