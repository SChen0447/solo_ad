import { ExhibitData } from './ExhibitData';

export interface UIOverlayCallbacks {
  onResetView: () => void;
  onToggleFullscreen: () => void;
  onClosePanel: () => void;
  onTogglePlay: () => void;
}

export class UIOverlay {
  private infoPanel: HTMLElement;
  private closeBtn: HTMLElement;
  private resetBtn: HTMLElement;
  private fullscreenBtn: HTMLElement;
  private playBtn: HTMLElement;
  private playIcon: HTMLElement;
  private playText: HTMLElement;
  private dragHandle: HTMLElement;
  
  private instrumentNameEl: HTMLElement;
  private instrumentEraEl: HTMLElement;
  private instrumentOriginEl: HTMLElement;
  private instrumentDescEl: HTMLElement;
  private statusBarFill: HTMLElement;
  
  private callbacks: UIOverlayCallbacks;
  private isPanelVisible = false;
  private isPlaying = false;
  private isMobile = false;
  
  private panelDragStartY = 0;
  private panelStartTop = 0;
  private isDraggingPanel = false;
  
  private animationFrameId: number | null = null;
  private playStartTime = 0;
  private playDuration = 3000;

  constructor(callbacks: UIOverlayCallbacks) {
    this.callbacks = callbacks;
    
    this.infoPanel = document.getElementById('info-panel')!;
    this.closeBtn = document.getElementById('close-panel-btn')!;
    this.resetBtn = document.getElementById('reset-view-btn')!;
    this.fullscreenBtn = document.getElementById('fullscreen-btn')!;
    this.playBtn = document.getElementById('play-btn')!;
    this.playIcon = this.playBtn.querySelector('.play-icon')!;
    this.playText = this.playBtn.querySelector('.play-text')!;
    this.dragHandle = document.getElementById('drag-handle')!;
    
    this.instrumentNameEl = document.getElementById('instrument-name')!;
    this.instrumentEraEl = document.getElementById('instrument-era')!;
    this.instrumentOriginEl = document.getElementById('instrument-origin')!;
    this.instrumentDescEl = document.getElementById('instrument-desc')!;
    this.statusBarFill = document.querySelector('.status-bar-fill')!;
    
    this.checkMobile();
    this.bindEvents();
    window.addEventListener('resize', () => this.checkMobile());
  }
  
  private checkMobile(): void {
    this.isMobile = window.innerWidth < 768;
    if (this.isMobile) {
      this.dragHandle.style.display = 'block';
    } else {
      this.dragHandle.style.display = 'none';
    }
  }
  
  private bindEvents(): void {
    this.resetBtn.addEventListener('click', () => {
      this.animateButton(this.resetBtn);
      this.callbacks.onResetView();
    });
    
    this.fullscreenBtn.addEventListener('click', () => {
      this.animateButton(this.fullscreenBtn);
      this.callbacks.onToggleFullscreen();
    });
    
    this.closeBtn.addEventListener('click', () => {
      this.callbacks.onClosePanel();
    });
    
    this.playBtn.addEventListener('click', () => {
      this.animateButton(this.playBtn);
      this.callbacks.onTogglePlay();
    });
    
    if (this.isMobile) {
      this.dragHandle.addEventListener('touchstart', (e) => this.handleDragStart(e), { passive: false });
      this.dragHandle.addEventListener('mousedown', (e) => this.handleDragStart(e));
      
      document.addEventListener('touchmove', (e) => this.handleDragMove(e), { passive: false });
      document.addEventListener('mousemove', (e) => this.handleDragMove(e));
      
      document.addEventListener('touchend', () => this.handleDragEnd());
      document.addEventListener('mouseup', () => this.handleDragEnd());
    }
  }
  
  private handleDragStart(e: TouchEvent | MouseEvent): void {
    if (!this.isPanelVisible) return;
    
    this.isDraggingPanel = true;
    
    if (e instanceof TouchEvent) {
      this.panelDragStartY = e.touches[0].clientY;
    } else {
      this.panelDragStartY = e.clientY;
    }
    
    const rect = this.infoPanel.getBoundingClientRect();
    this.panelStartTop = rect.top;
    
    e.preventDefault();
  }
  
  private handleDragMove(e: TouchEvent | MouseEvent): void {
    if (!this.isDraggingPanel || !this.isMobile) return;
    
    let clientY: number;
    if (e instanceof TouchEvent) {
      clientY = e.touches[0].clientY;
    } else {
      clientY = e.clientY;
    }
    
    const deltaY = clientY - this.panelDragStartY;
    const newTop = Math.max(0, this.panelStartTop + deltaY);
    
    this.infoPanel.style.top = newTop + 'px';
    this.infoPanel.style.transform = 'none';
    
    e.preventDefault();
  }
  
  private handleDragEnd(): void {
    this.isDraggingPanel = false;
  }
  
  private animateButton(btn: HTMLElement): void {
    btn.style.transform = 'scale(0.95)';
    setTimeout(() => {
      btn.style.transform = '';
    }, 100);
  }
  
  public showPanel(data: ExhibitData): void {
    this.instrumentNameEl.textContent = data.name;
    this.instrumentEraEl.textContent = data.era;
    this.instrumentOriginEl.textContent = data.origin;
    this.instrumentDescEl.textContent = data.description;
    
    this.infoPanel.classList.remove('hidden');
    this.isPanelVisible = true;
    
    if (this.isMobile) {
      this.infoPanel.style.top = 'auto';
      this.infoPanel.style.bottom = '0';
      this.infoPanel.style.transform = 'translateY(0)';
    }
    
    requestAnimationFrame(() => {
      this.infoPanel.style.opacity = '1';
      this.infoPanel.style.transform = this.isMobile ? 'translateY(0)' : 'translateX(0)';
    });
  }
  
  public hidePanel(): void {
    this.isPanelVisible = false;
    this.infoPanel.style.opacity = '0';
    
    if (this.isMobile) {
      this.infoPanel.style.transform = 'translateY(100%)';
    } else {
      this.infoPanel.style.transform = 'translateX(100%)';
    }
    
    setTimeout(() => {
      if (!this.isPanelVisible) {
        this.infoPanel.classList.add('hidden');
      }
    }, 300);
  }
  
  public setPlaying(isPlaying: boolean, durationMs: number = 3000): void {
    this.isPlaying = isPlaying;
    
    if (isPlaying) {
      this.playIcon.textContent = '⏸';
      this.playText.textContent = '暂停播放';
      this.playStartTime = performance.now();
      this.playDuration = durationMs;
      this.animateProgressBar();
    } else {
      this.playIcon.textContent = '▶';
      this.playText.textContent = '播放音色';
      if (this.animationFrameId) {
        cancelAnimationFrame(this.animationFrameId);
        this.animationFrameId = null;
      }
      this.statusBarFill.style.width = '0%';
    }
  }
  
  private animateProgressBar(): void {
    const update = () => {
      if (!this.isPlaying) return;
      
      const elapsed = performance.now() - this.playStartTime;
      const progress = Math.min(elapsed / this.playDuration, 1);
      this.statusBarFill.style.width = (progress * 100) + '%';
      
      if (progress < 1) {
        this.animationFrameId = requestAnimationFrame(update);
      }
    };
    
    this.animationFrameId = requestAnimationFrame(update);
  }
  
  public getPanelVisible(): boolean {
    return this.isPanelVisible;
  }
  
  public setFullscreenActive(isFullscreen: boolean): void {
    this.fullscreenBtn.textContent = isFullscreen ? '退出全屏' : '全屏';
  }
}
