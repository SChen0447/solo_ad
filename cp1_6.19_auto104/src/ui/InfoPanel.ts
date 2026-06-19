import { eventBus } from '../engine/EventBus';
import { RELICS, getRelicById } from '../config/relics';
import type { Relic, Annotation, ViewMode } from '../types';

export class InfoPanel {
  private container: HTMLElement;
  private currentRelic: Relic | undefined;
  private currentAnnotation: Annotation | undefined;
  private detailCard: HTMLElement | null = null;
  private isVisible: boolean = false;

  constructor() {
    const element = document.getElementById('info-panel');
    if (!element) {
      throw new Error('Info panel container not found');
    }
    this.container = element;
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('RELIC_SELECTED', ({ relicId }) => {
      const relic = getRelicById(relicId);
      if (relic) {
        this.currentRelic = relic;
        this.render();
        this.show();
      }
    });

    eventBus.on('VIEW_MODE_CHANGED', ({ mode }) => {
      if (mode === 'free') {
        this.hide();
      } else if (this.currentRelic) {
        this.show();
      }
    });

    eventBus.on('ANNOTATION_CLICKED', ({ annotationId }) => {
      if (!this.currentRelic) return;
      const annotation = this.currentRelic.annotations.find(
        a => a.id === annotationId
      );
      if (annotation) {
        this.showDetailCard(annotation);
      }
    });
  }

  private render(): void {
    if (!this.currentRelic) return;

    const relic = this.currentRelic;
    
    this.container.innerHTML = `
      <div class="info-title">${relic.name}</div>
      <div class="info-dynasty">${relic.dynasty}</div>
      
      <div class="info-section">
        <div class="info-label">出土地</div>
        <div class="info-value">${relic.origin}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">尺寸</div>
        <div class="info-dimensions">
          <div class="dimension-item">
            <div class="dimension-value">${relic.dimensions.length}</div>
            <div class="dimension-unit">长 (cm)</div>
          </div>
          <div class="dimension-item">
            <div class="dimension-value">${relic.dimensions.width}</div>
            <div class="dimension-unit">宽 (cm)</div>
          </div>
          <div class="dimension-item">
            <div class="dimension-value">${relic.dimensions.height}</div>
            <div class="dimension-unit">高 (cm)</div>
          </div>
        </div>
      </div>
      
      <div class="info-section">
        <div class="info-label">简介</div>
        <div class="info-value">${relic.description}</div>
      </div>
      
      <div class="info-section">
        <div class="info-label">标注点 (${relic.annotations.length})</div>
        <div class="annotation-list">
          ${relic.annotations.map(annotation => `
            <div class="annotation-item" data-annotation-id="${annotation.id}">
              <div class="annotation-title">${annotation.title}</div>
              <div class="annotation-content">${annotation.content.substring(0, 50)}...</div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    this.container.querySelectorAll('.annotation-item').forEach(item => {
      item.addEventListener('click', () => {
        const annotationId = item.getAttribute('data-annotation-id');
        if (annotationId) {
          eventBus.emit('ANNOTATION_CLICKED', { annotationId });
        }
      });
    });

    this.container.animate(
      [
        { transform: 'translateY(-50%) translateX(100%)', opacity: 0 },
        { transform: 'translateY(-50%) translateX(0)', opacity: 1 }
      ],
      {
        duration: 400,
        easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
        fill: 'forwards'
      }
    );
  }

  private showDetailCard(annotation: Annotation): void {
    this.currentAnnotation = annotation;

    if (this.detailCard) {
      this.detailCard.remove();
    }

    this.detailCard = document.createElement('div');
    this.detailCard.className = 'detail-card';
    this.detailCard.innerHTML = `
      <button class="detail-close" aria-label="关闭">×</button>
      <div class="detail-title">${annotation.title}</div>
      <div class="detail-content">${annotation.content}</div>
    `;

    const x = window.innerWidth / 2 - 120;
    const y = window.innerHeight / 2 - 80;
    this.detailCard.style.left = `${x}px`;
    this.detailCard.style.top = `${y}px`;

    const uiContainer = document.getElementById('ui-container');
    if (uiContainer) {
      uiContainer.appendChild(this.detailCard);
    }

    requestAnimationFrame(() => {
      if (this.detailCard) {
        this.detailCard.classList.add('visible');
      }
    });

    const closeBtn = this.detailCard.querySelector('.detail-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.hideDetailCard();
      });
    }

    this.detailCard.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    document.addEventListener('click', this.handleOutsideClick.bind(this));
  }

  private handleOutsideClick(e: MouseEvent): void {
    if (!this.detailCard) return;
    
    const target = e.target as HTMLElement;
    if (!this.detailCard.contains(target) && 
        !target.classList.contains('annotation-item') &&
        !target.closest('.annotation-item')) {
      this.hideDetailCard();
    }
  }

  private hideDetailCard(): void {
    if (this.detailCard) {
      this.detailCard.classList.remove('visible');
      setTimeout(() => {
        if (this.detailCard) {
          this.detailCard.remove();
          this.detailCard = null;
        }
      }, 300);
    }
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
  }

  public show(): void {
    this.isVisible = true;
    this.container.classList.add('visible');
  }

  public hide(): void {
    this.isVisible = false;
    this.container.classList.remove('visible');
    this.hideDetailCard();
  }

  public setViewMode(mode: ViewMode): void {
    if (mode === 'free') {
      this.hide();
    } else if (this.currentRelic) {
      this.show();
    }
  }

  public dispose(): void {
    this.hide();
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
    if (this.detailCard) {
      this.detailCard.remove();
    }
  }
}
