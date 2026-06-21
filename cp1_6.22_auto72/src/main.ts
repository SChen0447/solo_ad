import { EventStore } from './store';
import { RiverRenderer } from './renderer';
import { UIManager } from './ui';

class PixelRiverCalendar {
  private store: EventStore;
  private renderer: RiverRenderer;
  private ui: UIManager;
  private canvasContainer: HTMLElement;
  private canvas: HTMLCanvasElement;

  constructor() {
    this.store = new EventStore();
    this.canvasContainer = document.getElementById('canvasContainer')!;
    this.canvas = document.getElementById('riverCanvas') as HTMLCanvasElement;
    this.renderer = new RiverRenderer(this.canvas, this.store, this.canvasContainer);
    this.ui = new UIManager(this.store);

    this.init();
  }

  private async init(): Promise<void> {
    await this.store.init();

    this.renderer.setOnMonthChange((month) => {
      this.ui.updateMonthIndicator(month);
    });

    this.renderer.setOnCellClick((date) => {
      this.ui.showModal(date);
    });

    this.ui.setOnSave((date) => {
      this.renderer.refresh();
      this.renderer.pulseCell(date);
    });

    this.ui.setOnTodayClick(() => {
      const today = new Date();
      this.renderer.centerOnMonth(today);
    });

    this.store.subscribe(() => {
      this.renderer.refresh();
    });

    this.setupTooltipTracking();
    this.setupResize();

    const now = new Date();
    this.renderer.centerOnMonth(now);

    this.renderer.render();
  }

  private setupTooltipTracking(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const tooltipInfo = this.renderer.getTooltipInfo();
      if (tooltipInfo) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        this.ui.updateTooltip(tooltipInfo.date, tooltipInfo.eventCount, x, y);
      } else {
        this.ui.hideTooltip();
      }
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.ui.hideTooltip();
    });
  }

  private setupResize(): void {
    let resizeTimeout: number;

    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = window.setTimeout(() => {
        this.renderer.resize();
      }, 100);
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new PixelRiverCalendar();
});
