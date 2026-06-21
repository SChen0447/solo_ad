import { BodyModel } from './bodyModel';
import { StatChart } from './statChart';
import type { BodyPart, Exercise, TrainingCard } from './trainingStore';
import {
  BODY_PARTS,
  EXERCISES,
  addCard,
  calculateVolume,
  createCard,
  getCardsByDate,
  getVolumeColor,
  getWeekStats,
  removeCard,
  reorderCards,
  updateCard
} from './trainingStore';

class FitnessApp {
  private bodyModel: BodyModel;
  private statChart: StatChart;
  private currentDate: string;
  private cardsContainer: HTMLElement;
  private actionPanel: HTMLElement;
  private actionGrid: HTMLElement;
  private panelTitle: HTMLElement;
  private _currentBodyPart: BodyPart | null = null;
  private draggedCard: HTMLElement | null = null;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private _dragStartPos: { x: number; y: number } = { x: 0, y: 0 };
  private isDragging: boolean = false;
  private cardElements: HTMLElement[] = [];

  constructor() {
    this.currentDate = new Date().toISOString().split('T')[0];

    const modelContainer = document.getElementById('model-container')!;
    const cardsContainer = document.getElementById('cards-container')!;
    const actionPanel = document.getElementById('action-panel')!;
    const actionGrid = document.getElementById('action-grid')!;
    const panelTitle = document.getElementById('panel-title')!;
    const closePanel = document.getElementById('close-panel')!;
    const chartCanvas = document.getElementById('stat-chart') as HTMLCanvasElement;
    const dayMarkers = document.getElementById('day-markers')!;
    const tooltip = document.getElementById('tooltip')!;
    const currentDateEl = document.getElementById('current-date')!;

    this.cardsContainer = cardsContainer;
    this.actionPanel = actionPanel;
    this.actionGrid = actionGrid;
    this.panelTitle = panelTitle;

    this.bodyModel = new BodyModel(modelContainer);
    this.statChart = new StatChart(chartCanvas, dayMarkers, tooltip, this.currentDate);

    this.updateDateDisplay(currentDateEl);
    this.setupEventListeners(closePanel);
    this.renderCards();
    this.updateChart();
  }

  private updateDateDisplay(el: HTMLElement): void {
    const date = new Date(this.currentDate);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long'
    };
    el.textContent = date.toLocaleDateString('zh-CN', options);
  }

  private setupEventListeners(closePanel: HTMLElement): void {
    this.bodyModel.onClick((event) => {
      this._currentBodyPart = event.bodyPart;
      this.bodyModel.highlightPart(event.bodyPart);
      this.showActionPanel(event.bodyPart, event.screenX, event.screenY);
    });

    closePanel.addEventListener('click', () => {
      this.hideActionPanel();
      this.bodyModel.deactivateAll();
      this._currentBodyPart = null;
    });

    this.actionPanel.addEventListener('click', (e) => {
      if (e.target === this.actionPanel) {
        this.hideActionPanel();
        this.bodyModel.deactivateAll();
        this._currentBodyPart = null;
      }
    });

    this.statChart.setOnDayClick((date) => {
      this.currentDate = date;
      const currentDateEl = document.getElementById('current-date')!;
      this.updateDateDisplay(currentDateEl);
      this.renderCards();
      this.updateChart();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideActionPanel();
        this.bodyModel.deactivateAll();
        this._currentBodyPart = null;
      }
    });
  }

  private showActionPanel(bodyPart: BodyPart, screenX: number, screenY: number): void {
    const partInfo = BODY_PARTS[bodyPart];
    this.panelTitle.textContent = `选择${partInfo.name}训练动作`;
    this.panelTitle.style.color = partInfo.color;

    this.actionGrid.innerHTML = '';
    const exercises = EXERCISES[bodyPart];

    exercises.forEach((exercise) => {
      const actionItem = this.createActionItem(exercise);
      this.actionGrid.appendChild(actionItem);
    });

    this.actionPanel.classList.remove('hidden');

    const panelRect = this.actionPanel.getBoundingClientRect();
    let left = screenX - panelRect.width / 2;
    let top = screenY + 20;

    if (left < 20) left = 20;
    if (left + panelRect.width > window.innerWidth - 20) {
      left = window.innerWidth - panelRect.width - 20;
    }
    if (top + panelRect.height > window.innerHeight - 20) {
      top = screenY - panelRect.height - 20;
    }

    this.actionPanel.style.left = left + 'px';
    this.actionPanel.style.top = top + 'px';
  }

  private createActionItem(exercise: Exercise): HTMLElement {
    const item = document.createElement('div');
    item.className = 'action-item';
    item.innerHTML = `
      <div class="action-icon">${exercise.icon}</div>
      <div class="action-name">${exercise.name}</div>
    `;

    item.addEventListener('click', () => {
      const card = createCard(exercise, this.currentDate);
      addCard(card);
      this.hideActionPanel();
      this.bodyModel.deactivateAll();
      this._currentBodyPart = null;
      void this._currentBodyPart;
      void this._dragStartPos;
      this.renderCards();
      this.updateChart();
    });

    return item;
  }

  private hideActionPanel(): void {
    this.actionPanel.classList.add('hidden');
  }

  private renderCards(): void {
    const cards = getCardsByDate(this.currentDate);
    this.cardsContainer.innerHTML = '';
    this.cardElements = [];

    if (cards.length === 0) {
      const emptyState = document.createElement('div');
      emptyState.className = 'empty-state';
      emptyState.innerHTML = `
        <div style="font-size: 48px; margin-bottom: 16px;">🏋️</div>
        <div style="color: rgba(255, 255, 255, 0.6);">点击左侧3D模型选择训练部位</div>
      `;
      this.cardsContainer.appendChild(emptyState);
      return;
    }

    cards.forEach((card) => {
      const cardEl = this.createCardElement(card);
      this.cardsContainer.appendChild(cardEl);
      this.cardElements.push(cardEl);
    });
  }

  private createCardElement(card: TrainingCard): HTMLElement {
    const volume = calculateVolume(card);
    const bgColor = getVolumeColor(volume);
    const partInfo = BODY_PARTS[card.bodyPart];

    const cardEl = document.createElement('div');
    cardEl.className = 'training-card';
    cardEl.dataset.cardId = card.id;
    cardEl.style.background = `linear-gradient(135deg, ${bgColor}40, ${partInfo.color}20)`;
    cardEl.style.borderLeft = `4px solid ${partInfo.color}`;

    cardEl.innerHTML = `
      <div class="card-header">
        <div class="card-title">
          <span class="card-icon">${EXERCISES[card.bodyPart].find(e => e.id === card.exerciseId)?.icon || '💪'}</span>
          <span class="card-name">${card.exerciseName}</span>
          <span class="card-part" style="color: ${partInfo.color};">${partInfo.name}</span>
        </div>
        <button class="delete-btn" data-action="delete" title="删除">×</button>
      </div>
      <div class="card-body">
        <div class="control-group">
          <label>组数</label>
          <div class="control-buttons">
            <button class="ctrl-btn" data-action="sets-dec">-</button>
            <span class="ctrl-value">${card.sets}</span>
            <button class="ctrl-btn" data-action="sets-inc">+</button>
          </div>
        </div>
        <div class="control-group">
          <label>次数</label>
          <div class="control-buttons">
            <button class="ctrl-btn" data-action="reps-dec">-</button>
            <span class="ctrl-value">${card.reps}</span>
            <button class="ctrl-btn" data-action="reps-inc">+</button>
          </div>
        </div>
        <div class="control-group">
          <label>重量(kg)</label>
          <div class="control-buttons">
            <button class="ctrl-btn" data-action="weight-dec">-</button>
            <span class="ctrl-value">${card.weight}</span>
            <button class="ctrl-btn" data-action="weight-inc">+</button>
          </div>
        </div>
      </div>
      <div class="card-footer">
        <span class="volume-label">总容量</span>
        <span class="volume-value">${volume.toLocaleString()} kg</span>
      </div>
      <div class="drag-handle" data-action="drag">⋮⋮</div>
    `;

    cardEl.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const action = target.dataset.action;
      if (!action) return;

      e.stopPropagation();

      switch (action) {
        case 'delete':
          removeCard(card.id);
          this.renderCards();
          this.updateChart();
          break;
        case 'sets-inc':
          if (card.sets < 5) {
            updateCard(card.id, { sets: card.sets + 1 });
            this.updateCardDisplay(cardEl, card.id);
          }
          break;
        case 'sets-dec':
          if (card.sets > 1) {
            updateCard(card.id, { sets: card.sets - 1 });
            this.updateCardDisplay(cardEl, card.id);
          }
          break;
        case 'reps-inc':
          if (card.reps < 20) {
            updateCard(card.id, { reps: card.reps + 1 });
            this.updateCardDisplay(cardEl, card.id);
          }
          break;
        case 'reps-dec':
          if (card.reps > 1) {
            updateCard(card.id, { reps: card.reps - 1 });
            this.updateCardDisplay(cardEl, card.id);
          }
          break;
        case 'weight-inc':
          if (card.weight < 200) {
            updateCard(card.id, { weight: card.weight + 2.5 });
            this.updateCardDisplay(cardEl, card.id);
          }
          break;
        case 'weight-dec':
          if (card.weight > 0) {
            updateCard(card.id, { weight: Math.max(0, card.weight - 2.5) });
            this.updateCardDisplay(cardEl, card.id);
          }
          break;
      }
    });

    const dragHandle = cardEl.querySelector('[data-action="drag"]') as HTMLElement;
    dragHandle.addEventListener('mousedown', (e) => {
      this.startDrag(e, cardEl, card);
    });

    return cardEl;
  }

  private updateCardDisplay(cardEl: HTMLElement, cardId: string): void {
    const cards = getCardsByDate(this.currentDate);
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    const volume = calculateVolume(card);
    const bgColor = getVolumeColor(volume);
    const partInfo = BODY_PARTS[card.bodyPart];

    cardEl.style.background = `linear-gradient(135deg, ${bgColor}40, ${partInfo.color}20)`;

    const values = cardEl.querySelectorAll('.ctrl-value');
    values[0].textContent = card.sets.toString();
    values[1].textContent = card.reps.toString();
    values[2].textContent = card.weight.toString();

    const volumeValue = cardEl.querySelector('.volume-value');
    if (volumeValue) {
      volumeValue.textContent = volume.toLocaleString() + ' kg';
    }

    this.updateChart();
  }

  private startDrag(e: MouseEvent, cardEl: HTMLElement, _card: TrainingCard): void {
    e.preventDefault();
    e.stopPropagation();

    this.isDragging = true;
    this.draggedCard = cardEl;
    this._dragStartPos = { x: e.clientX, y: e.clientY };

    const rect = cardEl.getBoundingClientRect();
    this.dragOffset = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    const clone = cardEl.cloneNode(true) as HTMLElement;
    clone.id = 'drag-clone';
    clone.style.position = 'fixed';
    clone.style.left = rect.left + 'px';
    clone.style.top = rect.top + 'px';
    clone.style.width = rect.width + 'px';
    clone.style.zIndex = '10000';
    clone.style.opacity = '0.7';
    clone.style.pointerEvents = 'none';
    clone.style.transform = 'rotate(2deg)';
    clone.style.boxShadow = '0 20px 40px rgba(0, 0, 0, 0.4)';
    document.body.appendChild(clone);

    cardEl.style.opacity = '0.3';

    document.addEventListener('mousemove', this.onDragMove.bind(this));
    document.addEventListener('mouseup', this.onDragEnd.bind(this));
  }

  private onDragMove(e: MouseEvent): void {
    if (!this.draggedCard || !this.isDragging) return;

    const clone = document.getElementById('drag-clone');
    if (clone) {
      clone.style.left = (e.clientX - this.dragOffset.x) + 'px';
      clone.style.top = (e.clientY - this.dragOffset.y) + 'px';
    }

    const dragRect = clone?.getBoundingClientRect();
    if (!dragRect) return;

    this.cardElements.forEach((cardEl, index) => {
      if (cardEl === this.draggedCard) return;

      const rect = cardEl.getBoundingClientRect();
      const cardCenterY = rect.top + rect.height / 2;

      if (dragRect.top < cardCenterY && dragRect.bottom > cardCenterY) {
        const currentIndex = this.cardElements.indexOf(this.draggedCard!);
        if (index < currentIndex) {
          this.cardsContainer.insertBefore(this.draggedCard!, cardEl);
        } else {
          this.cardsContainer.insertBefore(this.draggedCard!, cardEl.nextSibling);
        }

        const newIndex = Array.from(this.cardsContainer.children).indexOf(this.draggedCard!);
        this.cardElements.splice(currentIndex, 1);
        this.cardElements.splice(newIndex, 0, this.draggedCard!);

        cardEl.style.transition = 'transform 0.2s ease';
        cardEl.style.transform = 'translateY(0)';
      }
    });
  }

  private onDragEnd(): void {
    if (!this.isDragging) return;

    const clone = document.getElementById('drag-clone');
    if (clone) {
      clone.remove();
    }

    if (this.draggedCard) {
      this.draggedCard.style.opacity = '1';
      this.draggedCard.style.transition = 'all 0.3s ease';
    }

    const cardIds = this.cardElements
      .filter(el => el.dataset.cardId)
      .map(el => el.dataset.cardId!);

    reorderCards(cardIds, this.currentDate);

    document.removeEventListener('mousemove', this.onDragMove.bind(this));
    document.removeEventListener('mouseup', this.onDragEnd.bind(this));

    this.isDragging = false;
    this.draggedCard = null;
  }

  private updateChart(): void {
    const weekStats = getWeekStats();
    this.statChart.updateData(weekStats, this.currentDate);
    this.statChart.draw();
    this.statChart.renderDayMarkers();
  }

  public dispose(): void {
    this.bodyModel.dispose();
    this.statChart.dispose();
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new FitnessApp();
});
