import { ProjectData } from './types';

export class UIDisplay {
  private loadingScreen: HTMLElement;
  private detailCard: HTMLElement;
  private cardTitle: HTMLElement;
  private cardDescription: HTMLElement;
  private cardThumbnail: HTMLImageElement;
  private cardButton: HTMLAnchorElement;
  private fpsValue: HTMLElement;
  private fpsBars: HTMLElement[];
  
  private isCardVisible: boolean = false;
  private fpsHistory: number[] = [];
  private maxFpsHistory: number = 10;
  
  public onCardClose: (() => void) | null = null;

  constructor() {
    this.loadingScreen = document.getElementById('loading-screen')!;
    this.detailCard = document.getElementById('detail-card')!;
    this.cardTitle = document.getElementById('card-title')!;
    this.cardDescription = document.getElementById('card-description')!;
    this.cardThumbnail = document.getElementById('card-thumbnail') as HTMLImageElement;
    this.cardButton = document.getElementById('card-button') as HTMLAnchorElement;
    this.fpsValue = document.querySelector('.fps-value')!;
    this.fpsBars = Array.from(document.querySelectorAll('.fps-bar'));

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    this.detailCard.addEventListener('click', (e) => {
      if (e.target === this.detailCard) {
        this.hideCard();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && this.isCardVisible) {
        this.hideCard();
      }
    });
  }

  public showLoading(): void {
    this.loadingScreen.classList.remove('hidden');
  }

  public hideLoading(): void {
    this.loadingScreen.classList.add('hidden');
    setTimeout(() => {
      this.loadingScreen.style.display = 'none';
    }, 500);
  }

  public showCard(projectData: ProjectData): void {
    if (this.isCardVisible) return;

    this.cardTitle.textContent = projectData.title;
    this.cardDescription.textContent = projectData.description;
    this.cardThumbnail.src = projectData.thumbnailUrl;
    this.cardButton.href = projectData.projectUrl;

    this.detailCard.classList.remove('hidden');
    this.isCardVisible = true;

    document.exitPointerLock?.();
  }

  public hideCard(): void {
    if (!this.isCardVisible) return;

    this.detailCard.classList.add('hidden');
    this.isCardVisible = false;

    if (this.onCardClose) {
      this.onCardClose();
    }
  }

  public updateFPS(fps: number): void {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.maxFpsHistory) {
      this.fpsHistory.shift();
    }

    const roundedFps = Math.round(fps);
    this.fpsValue.textContent = `${roundedFps} FPS`;

    this.fpsValue.classList.remove('good', 'warning', 'danger');
    if (fps > 55) {
      this.fpsValue.classList.add('good');
    } else if (fps >= 30) {
      this.fpsValue.classList.add('warning');
    } else {
      this.fpsValue.classList.add('danger');
    }

    const maxFps = 75;
    for (let i = 0; i < this.fpsBars.length; i++) {
      const bar = this.fpsBars[i];
      const historyIndex = this.fpsHistory.length - this.fpsBars.length + i;
      
      if (historyIndex < 0) {
        bar.style.height = '0%';
        continue;
      }

      const fpsValue = this.fpsHistory[historyIndex];
      const heightPercent = Math.min(100, (fpsValue / maxFps) * 100);
      bar.style.height = `${heightPercent}%`;

      bar.classList.remove('warning', 'danger');
      if (fpsValue <= 30) {
        bar.classList.add('danger');
      } else if (fpsValue <= 55) {
        bar.classList.add('warning');
      }
    }
  }

  public getIsCardVisible(): boolean {
    return this.isCardVisible;
  }
}
