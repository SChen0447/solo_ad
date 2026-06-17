import { SynthesisRules } from './synthesis-rules';
import { LifecycleManager } from './lifecycle-manager';
import { GameEngine } from './game-engine';

const API_BASE = 'http://localhost:5000';

class GameApp {
  private rules: SynthesisRules;
  private lifecycle: LifecycleManager;
  private engine: GameEngine | null = null;

  private canvas: HTMLCanvasElement;
  private elementPanel: HTMLElement;
  private messageEl: HTMLElement;
  private modeIndicator: HTMLElement;
  private knowledgeLevelEl: HTMLElement;
  private unlockedCountEl: HTMLElement;
  private totalRecipesEl: HTMLElement;
  private elementCountsEl: HTMLElement;

  private isDraggingFromPanel: boolean = false;
  private dragElementId: string | null = null;

  constructor() {
    this.rules = new SynthesisRules();
    this.lifecycle = new LifecycleManager(this.rules, {
      onResourceChanged: () => this.updateUI(),
      onKnowledgeLevelUp: (level) => this.onKnowledgeLevelUp(level)
    });

    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.elementPanel = document.getElementById('element-panel') as HTMLElement;
    this.messageEl = document.getElementById('synthesis-message') as HTMLElement;
    this.modeIndicator = document.getElementById('mode-indicator') as HTMLElement;
    this.knowledgeLevelEl = document.getElementById('knowledge-level') as HTMLElement;
    this.unlockedCountEl = document.getElementById('unlocked-count') as HTMLElement;
    this.totalRecipesEl = document.getElementById('total-recipes') as HTMLElement;
    this.elementCountsEl = document.getElementById('element-counts') as HTMLElement;

    this.lifecycle.setMessageElement(this.messageEl);
  }

  async init(): Promise<void> {
    try {
      await this.rules.loadFromAPI(API_BASE);
    } catch (e) {
      console.warn('Using fallback synthesis data');
    }

    const config = this.rules.getWorkshopConfig();
    this.lifecycle.init(config.initialElementCount);

    try {
      await this.lifecycle.loadProgressFromAPI(API_BASE);
    } catch (e) {
      console.warn('Using default progress');
    }

    this.engine = new GameEngine(this.canvas, this.rules, this.lifecycle);
    this.engine.init();

    this.setupInputHandlers();
    this.createElementPanel();
    this.updateUI();
    this.autoSave();
  }

  private setupInputHandlers(): void {
    if (!this.engine) return;

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.engine!.handleMouseMove(e.clientX - rect.left, e.clientY - rect.top);

      if (this.isDraggingFromPanel && this.dragElementId) {
        this.engine!.updateDragPosition(e.clientX - rect.left, e.clientY - rect.top);
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      if (e.button === 0 && this.isDraggingFromPanel && this.dragElementId && this.engine) {
        const rect = this.canvas.getBoundingClientRect();
        const coord = this.engine.pixelToHex(e.clientX - rect.left, e.clientY - rect.top);
        const placed = this.engine.endDrag(coord);
        if (placed) {
          this.saveProgress();
        }
        this.isDraggingFromPanel = false;
        this.dragElementId = null;
        this.canvas.style.cursor = 'default';
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    this.canvas.addEventListener('click', (e) => {
      if (this.isDraggingFromPanel) return;

      const rect = this.canvas.getBoundingClientRect();
      const coord = this.engine!.pixelToHex(e.clientX - rect.left, e.clientY - rect.top);
      if (coord) {
        this.engine!.handleCellClick(coord, 0);
      }
    });

    this.canvas.addEventListener('auxclick', (e) => {
      if (e.button === 2) {
        const rect = this.canvas.getBoundingClientRect();
        const coord = this.engine!.pixelToHex(e.clientX - rect.left, e.clientY - rect.top);
        if (coord) {
          this.engine!.handleCellClick(coord, 2);
        }
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        const isActive = this.engine!.toggleSynthesisMode();
        if (isActive) {
          this.modeIndicator.classList.add('active');
        } else {
          this.modeIndicator.classList.remove('active');
        }
      }
    });
  }

  private createElementPanel(): void {
    const baseElements = this.rules.getBaseElementIds();
    this.elementPanel.innerHTML = '';

    for (const elementId of baseElements) {
      const info = this.rules.getElementInfo(elementId);
      if (!info) continue;

      const btn = document.createElement('div');
      btn.className = 'element-btn';
      btn.dataset.elementId = elementId;
      btn.title = info.name;

      const gradient = `radial-gradient(circle at 30% 30%, ${info.color2}, ${info.color1})`;
      btn.style.background = gradient;
      btn.style.boxShadow = `0 0 10px ${info.color1}80, inset 0 0 5px rgba(255,255,255,0.3)`;

      const glow = document.createElement('div');
      glow.className = 'glow';
      glow.style.background = info.color1;
      btn.appendChild(glow);

      const countBadge = document.createElement('div');
      countBadge.className = 'element-count';
      countBadge.textContent = String(this.lifecycle.getElementCount(elementId));
      btn.appendChild(countBadge);

      btn.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        if (this.lifecycle.getElementCount(elementId) <= 0) return;

        e.preventDefault();
        this.startPanelDrag(elementId, e.clientX, e.clientY);
      });

      this.elementPanel.appendChild(btn);
    }
  }

  private startPanelDrag(elementId: string, clientX: number, clientY: number): void {
    if (!this.engine) return;

    this.isDraggingFromPanel = true;
    this.dragElementId = elementId;

    const rect = this.canvas.getBoundingClientRect();
    this.engine.startDrag(elementId, clientX - rect.left, clientY - rect.top);
    this.canvas.style.cursor = 'grabbing';
  }

  private updateUI(): void {
    this.knowledgeLevelEl.textContent = String(this.lifecycle.getKnowledgeLevel());
    this.unlockedCountEl.textContent = String(this.lifecycle.getUnlockedRecipeCount());
    this.totalRecipesEl.textContent = String(this.rules.getTotalRecipeCount());

    const baseElements = this.rules.getBaseElementIds();
    let countsHtml = '';
    for (const id of baseElements) {
      const info = this.rules.getElementInfo(id);
      if (!info) continue;
      const count = this.lifecycle.getElementCount(id);
      countsHtml += `<div style="display: flex; justify-content: space-between; margin: 2px 0;">
        <span style="color: ${info.color1};">● ${info.name}</span>
        <span>${count}</span>
      </div>`;
    }
    this.elementCountsEl.innerHTML = countsHtml;

    const btns = this.elementPanel.querySelectorAll('.element-btn');
    btns.forEach(btn => {
      const htmlBtn = btn as HTMLElement;
      const id = htmlBtn.dataset.elementId;
      if (!id) return;
      const countBadge = htmlBtn.querySelector('.element-count');
      if (countBadge) {
        countBadge.textContent = String(this.lifecycle.getElementCount(id));
      }
      if (this.lifecycle.getElementCount(id) <= 0) {
        htmlBtn.style.opacity = '0.4';
        htmlBtn.style.cursor = 'not-allowed';
      } else {
        htmlBtn.style.opacity = '1';
        htmlBtn.style.cursor = 'grab';
      }
    });
  }

  private onKnowledgeLevelUp(level: number): void {
    console.log(`Knowledge level up to ${level}!`);
  }

  private autoSave(): void {
    setInterval(() => {
      this.saveProgress();
    }, 30000);
  }

  private saveProgress(): void {
    this.lifecycle.saveProgressToAPI(API_BASE).catch(() => {});
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  const app = new GameApp();
  await app.init();
});
