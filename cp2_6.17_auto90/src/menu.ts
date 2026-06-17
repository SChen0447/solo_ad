import { Difficulty } from './types';

interface MenuCallbacks {
  onStartSingle: (difficulty: Difficulty) => void;
  onStartDual: () => void;
  onReturnToMenu: () => void;
  onExit: () => void;
}

export class MenuSystem {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private callbacks: MenuCallbacks | null = null;
  
  private menuOverlay: HTMLElement | null = null;
  private modalOverlay: HTMLElement | null = null;
  private gameOverPanel: HTMLElement | null = null;

  constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
    this.container = container;
    this.canvas = canvas;
  }

  setCallbacks(callbacks: MenuCallbacks): void {
    this.callbacks = callbacks;
  }

  showMainMenu(): void {
    this.hideAll();
    this.createMenuOverlay();
    if (this.menuOverlay) {
      this.menuOverlay.classList.remove('hidden');
    }
  }

  hideMainMenu(): void {
    if (this.menuOverlay) {
      this.menuOverlay.classList.add('hidden');
    }
  }

  showDifficultySelect(): void {
    this.createModalOverlay();
    if (this.modalOverlay) {
      this.modalOverlay.classList.remove('hidden');
    }
  }

  hideDifficultySelect(): void {
    if (this.modalOverlay) {
      this.modalOverlay.classList.add('hidden');
    }
  }

  showGameOver(winner: string, score1: number, score2: number): void {
    this.createGameOverPanel(winner, score1, score2);
    if (this.gameOverPanel) {
      this.gameOverPanel.classList.remove('hidden');
    }
  }

  hideGameOver(): void {
    if (this.gameOverPanel) {
      this.gameOverPanel.classList.add('hidden');
    }
  }

  hideAll(): void {
    this.hideMainMenu();
    this.hideDifficultySelect();
    this.hideGameOver();
  }

  private createMenuOverlay(): void {
    if (this.menuOverlay) return;

    const overlay = document.createElement('div');
    overlay.className = 'menu-overlay';
    overlay.id = 'menuOverlay';

    const title = document.createElement('div');
    title.className = 'menu-title';
    title.textContent = '星域对决';

    const buttons = document.createElement('div');
    buttons.className = 'menu-buttons';

    const singleBtn = this.createButton('单人模式', () => {
      this.callbacks?.onStartSingle('easy');
    });

    const dualBtn = this.createButton('双人模式', () => {
      this.callbacks?.onStartDual();
    });

    const exitBtn = this.createButton('退出', () => {
      this.callbacks?.onExit();
    });

    buttons.appendChild(singleBtn);
    buttons.appendChild(dualBtn);
    buttons.appendChild(exitBtn);

    overlay.appendChild(title);
    overlay.appendChild(buttons);

    document.body.appendChild(overlay);
    this.menuOverlay = overlay;
  }

  private createModalOverlay(): void {
    if (this.modalOverlay) return;

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay hidden';
    overlay.id = 'modalOverlay';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const title = document.createElement('div');
    title.className = 'modal-title';
    title.textContent = '选择难度';

    const buttons = document.createElement('div');
    buttons.className = 'modal-buttons';

    const easyBtn = this.createButton('简单', () => {
      this.hideDifficultySelect();
      this.hideMainMenu();
      this.callbacks?.onStartSingle('easy');
    });

    const hardBtn = this.createButton('困难', () => {
      this.hideDifficultySelect();
      this.hideMainMenu();
      this.callbacks?.onStartSingle('hard');
    });

    buttons.appendChild(easyBtn);
    buttons.appendChild(hardBtn);

    modal.appendChild(title);
    modal.appendChild(buttons);
    overlay.appendChild(modal);

    document.body.appendChild(overlay);
    this.modalOverlay = overlay;
  }

  private createGameOverPanel(winner: string, score1: number, score2: number): void {
    if (this.gameOverPanel) {
      const title = this.gameOverPanel.querySelector('.game-over-title');
      const score = this.gameOverPanel.querySelector('.game-over-score');
      if (title) title.textContent = `${winner} 获胜!`;
      if (score) score.textContent = `${score1} : ${score2}`;
      return;
    }

    const panel = document.createElement('div');
    panel.className = 'game-over-panel hidden';
    panel.id = 'gameOverPanel';

    const title = document.createElement('div');
    title.className = 'game-over-title';
    title.textContent = `${winner} 获胜!`;

    const score = document.createElement('div');
    score.className = 'game-over-score';
    score.textContent = `${score1} : ${score2}`;

    const returnBtn = this.createButton('返回菜单', () => {
      this.hideGameOver();
      this.callbacks?.onReturnToMenu();
    });

    panel.appendChild(title);
    panel.appendChild(score);
    panel.appendChild(returnBtn);

    document.body.appendChild(panel);
    this.gameOverPanel = panel;
  }

  private createButton(text: string, onClick: () => void): HTMLElement {
    const btn = document.createElement('button');
    btn.className = 'menu-btn';
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }

  destroy(): void {
    if (this.menuOverlay) {
      this.menuOverlay.remove();
      this.menuOverlay = null;
    }
    if (this.modalOverlay) {
      this.modalOverlay.remove();
      this.modalOverlay = null;
    }
    if (this.gameOverPanel) {
      this.gameOverPanel.remove();
      this.gameOverPanel = null;
    }
  }
}
