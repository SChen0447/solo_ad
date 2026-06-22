import { GestureGrid } from './gestureGrid';
import { GestureAnalyzer, type AnalysisResult } from './analyzer';
import { UIManager, type HistoryItem } from './ui';
import type { GestureSequence } from './gestureGrid';

class App {
  private gestureGrid: GestureGrid;
  private analyzer: GestureAnalyzer;
  private uiManager: UIManager;
  private currentResult: AnalysisResult | null = null;
  private currentSequence: GestureSequence = [];

  constructor() {
    const canvas = document.getElementById('gestureCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');

    this.gestureGrid = new GestureGrid(canvas, 3);
    this.analyzer = new GestureAnalyzer(3);
    
    const uiElements = {
      strengthBar: document.getElementById('strengthBar') as HTMLElement,
      scoreValue: document.getElementById('scoreValue') as HTMLElement,
      suggestionList: document.getElementById('suggestionList') as HTMLElement,
      historyList: document.getElementById('historyList') as HTMLElement,
      saveBtn: document.getElementById('saveBtn') as HTMLButtonElement,
      resetBtn: document.getElementById('resetBtn') as HTMLButtonElement,
      clearBtn: document.getElementById('clearBtn') as HTMLButtonElement,
      modeBtns: document.querySelectorAll('.mode-btn') as NodeListOf<HTMLButtonElement>,
      saveModal: document.getElementById('saveModal') as HTMLElement,
      modalScore: document.getElementById('modalScore') as HTMLElement
    };

    this.uiManager = new UIManager(uiElements);
    this.bindAppEvents();
  }

  private bindAppEvents(): void {
    this.gestureGrid.setOnGestureComplete((sequence) => {
      this.handleGestureComplete(sequence);
    });

    this.uiManager.setOnModeChange((mode) => {
      this.handleModeChange(mode);
    });

    this.uiManager.setOnReset(() => {
      this.handleReset();
    });

    this.uiManager.setOnSave(() => {
      this.handleSave();
    });

    this.uiManager.setOnClearHistory(() => {
      this.handleClearHistory();
    });

    this.uiManager.setOnHistorySelect((item) => {
      this.handleHistorySelect(item);
    });
  }

  private handleGestureComplete(sequence: GestureSequence): void {
    this.currentSequence = sequence;
    this.currentResult = this.analyzer.analyze(sequence);
    this.uiManager.updateStrength(this.currentResult);
  }

  private handleModeChange(mode: 3 | 4): void {
    this.gestureGrid.setGridSize(mode);
    this.analyzer.setGridSize(mode);
    this.uiManager.resetStrengthDisplay();
    this.currentResult = null;
    this.currentSequence = [];
  }

  private handleReset(): void {
    this.gestureGrid.reset();
    this.uiManager.resetStrengthDisplay();
    this.currentResult = null;
    this.currentSequence = [];
  }

  private handleSave(): void {
    if (!this.currentResult || this.currentSequence.length < 2) {
      return;
    }

    const gridSize = this.gestureGrid.getGridSize();
    this.uiManager.saveGesture(this.currentSequence, this.currentResult, gridSize);
  }

  private handleClearHistory(): void {
    this.uiManager.clearHistory();
  }

  private handleHistorySelect(item: HistoryItem): void {
    this.gestureGrid.replay(item.sequence, item.gridSize);
    
    this.analyzer.setGridSize(item.gridSize);
    const result = this.analyzer.analyze(item.sequence);
    this.currentResult = result;
    this.currentSequence = item.sequence;
    this.uiManager.updateStrength(result);
    this.uiManager.updateActiveMode(item.gridSize);
  }

  public destroy(): void {
    this.gestureGrid.destroy();
    this.uiManager.destroy();
  }
}

let app: App | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new App();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.destroy();
  }
});

export { App };
