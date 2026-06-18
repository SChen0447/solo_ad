import { InputParser, type GameAction } from './InputParser';
import { EntityManager } from './EntityManager';
import { AISystem } from './AISystem';
import { GameEngine, type GameState, type Notification } from './GameEngine';
import { Renderer } from './Renderer';

class GameApp {
  private inputParser: InputParser;
  private entityManager: EntityManager;
  private aiSystem: AISystem;
  private engine: GameEngine;
  private renderer: Renderer;
  private canvas: HTMLCanvasElement;
  private commandInput: HTMLInputElement;
  private submitBtn: HTMLButtonElement;
  private waveDisplay: HTMLElement;
  private goldDisplay: HTMLElement;
  private livesDisplay: HTMLElement;
  private enemiesDisplay: HTMLElement;
  private notificationArea: HTMLElement;

  constructor() {
    this.inputParser = new InputParser();
    this.entityManager = new EntityManager();
    this.aiSystem = new AISystem(this.entityManager);
    this.engine = new GameEngine(this.entityManager, this.aiSystem);

    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvas;

    this.renderer = new Renderer(canvas, this.engine);

    const commandInput = document.getElementById('command-input') as HTMLInputElement;
    const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
    const waveDisplay = document.getElementById('wave-display') as HTMLElement;
    const goldDisplay = document.getElementById('gold-display') as HTMLElement;
    const livesDisplay = document.getElementById('lives-display') as HTMLElement;
    const enemiesDisplay = document.getElementById('enemies-display') as HTMLElement;
    const notificationArea = document.getElementById('notification-area') as HTMLElement;

    if (!commandInput || !submitBtn || !waveDisplay || !goldDisplay || !livesDisplay || !enemiesDisplay || !notificationArea) {
      throw new Error('UI elements not found');
    }

    this.commandInput = commandInput;
    this.submitBtn = submitBtn;
    this.waveDisplay = waveDisplay;
    this.goldDisplay = goldDisplay;
    this.livesDisplay = livesDisplay;
    this.enemiesDisplay = enemiesDisplay;
    this.notificationArea = notificationArea;

    this.init();
  }

  private init(): void {
    this.setupCanvasSize();
    this.setupEventListeners();
    this.setupCallbacks();

    this.engine.start();

    this.commandInput.focus();

    setTimeout(() => {
      this.engine.addNotification('Welcome! Type "help" for commands.', 'info');
      this.engine.addNotification('Try: deploy arrow 5 5', 'info');
    }, 300);
  }

  private setupCanvasSize(): void {
    const container = this.canvas.parentElement;
    if (container) {
      const width = container.clientWidth;
      const height = window.innerHeight * 0.7;
      this.canvas.width = width;
      this.canvas.height = height;
      this.engine.setCanvasSize(width, height);
      this.renderer.resize(width, height);
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => {
      this.setupCanvasSize();
    });

    this.submitBtn.addEventListener('click', () => {
      this.executeCommand();
    });

    this.commandInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        this.executeCommand();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this.handleHistoryUp();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.handleHistoryDown();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        this.handleAutocomplete();
      }
    });

    this.commandInput.addEventListener('input', () => {
      this.inputParser.setCurrentTemp(this.commandInput.value);
    });

    this.canvas.addEventListener('click', () => {
      this.commandInput.focus();
    });
  }

  private setupCallbacks(): void {
    this.engine.setOnStateChange((state: GameState) => {
      this.updateUI(state);
    });

    this.engine.setOnRender(() => {
      this.renderer.render();
      this.updateEnemiesCount();
    });

    this.engine.setOnNotification((notification: Notification) => {
      this.showNotification(notification);
    });
  }

  private executeCommand(): void {
    const input = this.commandInput.value.trim();
    if (!input) return;

    this.inputParser.addToHistory(input);
    this.commandInput.value = '';
    this.inputParser.setCurrentTemp('');

    try {
      const action: GameAction = this.inputParser.parse(input);
      this.engine.executeAction(action);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.engine.addNotification(message, 'error');
    }
  }

  private handleHistoryUp(): void {
    const prev = this.inputParser.getHistoryPrevious();
    if (prev !== null) {
      this.commandInput.value = prev;
      this.setCursorToEnd();
    }
  }

  private handleHistoryDown(): void {
    const next = this.inputParser.getHistoryNext();
    if (next !== null) {
      this.commandInput.value = next;
      this.setCursorToEnd();
    } else {
      this.commandInput.value = '';
    }
  }

  private handleAutocomplete(): void {
    const input = this.commandInput.value;
    const completed = this.inputParser.autocomplete(input);
    if (completed !== input) {
      this.commandInput.value = completed;
      this.inputParser.setCurrentTemp(completed);
      this.setCursorToEnd();
    }
  }

  private setCursorToEnd(): void {
    requestAnimationFrame(() => {
      this.commandInput.setSelectionRange(
        this.commandInput.value.length,
        this.commandInput.value.length
      );
    });
  }

  private updateUI(state: GameState): void {
    this.waveDisplay.textContent = state.wave.toString();
    this.goldDisplay.textContent = state.gold.toString();
    this.livesDisplay.textContent = state.lives.toString();
  }

  private updateEnemiesCount(): void {
    const count = this.entityManager.enemies.size;
    this.enemiesDisplay.textContent = count.toString();
  }

  private showNotification(notification: Notification): void {
    const el = document.createElement('div');
    el.className = `notification ${notification.type}`;
    el.textContent = notification.message;
    el.style.whiteSpace = 'pre-line';
    this.notificationArea.appendChild(el);

    setTimeout(() => {
      if (el.parentElement) {
        el.parentElement.removeChild(el);
      }
    }, 2000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    new GameApp();
  } catch (error) {
    console.error('Failed to initialize game:', error);
  }
});
