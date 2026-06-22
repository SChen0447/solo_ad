import type { GestureSequence } from './gestureGrid';
import type { AnalysisResult } from './analyzer';

export interface HistoryItem {
  id: string;
  sequence: GestureSequence;
  score: number;
  level: string;
  gridSize: 3 | 4;
  timestamp: number;
}

export interface UIElements {
  strengthBar: HTMLElement;
  scoreValue: HTMLElement;
  suggestionList: HTMLElement;
  historyList: HTMLElement;
  saveBtn: HTMLButtonElement;
  resetBtn: HTMLButtonElement;
  clearBtn: HTMLButtonElement;
  modeBtns: NodeListOf<HTMLButtonElement>;
  saveModal: HTMLElement;
  modalScore: HTMLElement;
}

export class UIManager {
  private elements: UIElements;
  private history: HistoryItem[] = [];
  private readonly MAX_HISTORY = 5;
  private onHistorySelect: ((item: HistoryItem) => void) | null = null;
  private onReset: (() => void) | null = null;
  private onSave: (() => void) | null = null;
  private onClearHistory: (() => void) | null = null;
  private onModeChange: ((mode: 3 | 4) => void) | null = null;

  constructor(elements: UIElements) {
    this.elements = elements;
    this.bindEvents();
  }

  private bindEvents(): void {
    this.elements.saveBtn.addEventListener('click', () => {
      if (this.onSave) this.onSave();
    });

    this.elements.resetBtn.addEventListener('click', () => {
      if (this.onReset) this.onReset();
    });

    this.elements.clearBtn.addEventListener('click', () => {
      if (this.onClearHistory) this.onClearHistory();
    });

    this.elements.modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = parseInt(btn.dataset.mode || '3', 10) as 3 | 4;
        this.updateActiveMode(mode);
        if (this.onModeChange) this.onModeChange(mode);
      });
    });

    this.elements.saveModal.addEventListener('click', (e) => {
      if (e.target === this.elements.saveModal) {
        this.hideSaveModal();
      }
    });
  }

  public updateStrength(result: AnalysisResult): void {
    const { score, level, suggestions } = result;

    this.elements.strengthBar.classList.remove('weak', 'medium', 'strong');
    this.elements.strengthBar.classList.add(level);
    this.elements.strengthBar.style.width = `${score}%`;

    this.elements.scoreValue.textContent = score.toString();

    this.updateSuggestions(suggestions);
  }

  private updateSuggestions(suggestions: string[]): void {
    this.elements.suggestionList.innerHTML = '';
    
    suggestions.forEach(suggestion => {
      const li = document.createElement('li');
      li.className = 'suggestion-item';
      li.textContent = suggestion;
      this.elements.suggestionList.appendChild(li);
    });
  }

  public resetStrengthDisplay(): void {
    this.elements.strengthBar.classList.remove('weak', 'medium', 'strong');
    this.elements.strengthBar.style.width = '0%';
    this.elements.scoreValue.textContent = '0';
    this.elements.suggestionList.innerHTML = '<li class="suggestion-item">请在左侧网格绘制手势密码</li>';
  }

  public saveGesture(sequence: GestureSequence, result: AnalysisResult, gridSize: 3 | 4): boolean {
    if (sequence.length < 2) return false;

    const item: HistoryItem = {
      id: Date.now().toString(),
      sequence: [...sequence],
      score: result.score,
      level: result.level,
      gridSize,
      timestamp: Date.now()
    };

    if (this.history.length >= this.MAX_HISTORY) {
      this.history.shift();
    }

    this.history.push(item);
    this.renderHistory();
    this.showSaveModal(result.score);

    return true;
  }

  private showSaveModal(score: number): void {
    this.elements.modalScore.textContent = `评分：${score} 分`;
    this.elements.saveModal.classList.add('active');

    setTimeout(() => {
      this.hideSaveModal();
    }, 2000);
  }

  private hideSaveModal(): void {
    this.elements.saveModal.classList.remove('active');
  }

  public clearHistory(): void {
    const items = this.elements.historyList.querySelectorAll('.history-item');
    
    items.forEach((item, index) => {
      setTimeout(() => {
        item.classList.add('fade-out');
      }, index * 80);
    });

    setTimeout(() => {
      this.history = [];
      this.renderHistory();
    }, 400 + items.length * 80);
  }

  private renderHistory(): void {
    if (this.history.length === 0) {
      this.elements.historyList.innerHTML = '<div class="empty-history">暂无保存的手势</div>';
      return;
    }

    this.elements.historyList.innerHTML = '';

    for (let i = this.history.length - 1; i >= 0; i--) {
      const item = this.history[i];
      const div = document.createElement('div');
      div.className = 'history-item';
      div.dataset.id = item.id;

      const time = new Date(item.timestamp);
      const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;

      div.innerHTML = `
        <div class="history-info">
          <div class="history-grid">${item.gridSize}×${item.gridSize} 网格 · ${item.sequence.length}个节点</div>
          <div class="history-time">${timeStr}</div>
        </div>
        <div class="history-score ${item.level}">${item.score}分</div>
      `;

      div.addEventListener('click', () => {
        if (this.onHistorySelect) {
          this.onHistorySelect(item);
        }
      });

      this.elements.historyList.appendChild(div);
    }
  }

  public updateActiveMode(mode: 3 | 4): void {
    this.elements.modeBtns.forEach(btn => {
      const btnMode = parseInt(btn.dataset.mode || '3', 10) as 3 | 4;
      btn.classList.toggle('active', btnMode === mode);
    });
  }

  public setOnHistorySelect(callback: (item: HistoryItem) => void): void {
    this.onHistorySelect = callback;
  }

  public setOnReset(callback: () => void): void {
    this.onReset = callback;
  }

  public setOnSave(callback: () => void): void {
    this.onSave = callback;
  }

  public setOnClearHistory(callback: () => void): void {
    this.onClearHistory = callback;
  }

  public setOnModeChange(callback: (mode: 3 | 4) => void): void {
    this.onModeChange = callback;
  }

  public getHistory(): HistoryItem[] {
    return [...this.history];
  }

  public destroy(): void {
    this.hideSaveModal();
  }
}
