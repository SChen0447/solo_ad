import type { TimelineController } from '../animation/TimelineController.js';
import type { SceneManager } from '../renderer/SceneManager.js';

export class HUD {
  private periodEl: HTMLElement;
  private timeAgoEl: HTMLElement;
  private container: HTMLElement;
  private viewBtnContainer: HTMLElement;

  constructor(timelineController: TimelineController, sceneManager: SceneManager) {
    this.container = document.createElement('div');
    this.container.id = 'hud-container';
    this.container.innerHTML = `
      <div class="hud-period" id="hud-period">二叠纪末</div>
      <div class="hud-time" id="hud-time">距今2.50亿年</div>
    `;
    document.body.appendChild(this.container);

    this.viewBtnContainer = document.createElement('div');
    this.viewBtnContainer.id = 'view-buttons';
    this.viewBtnContainer.innerHTML = `
      <button class="view-btn" data-view="front">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="8.01"/>
        </svg>
        正面
      </button>
      <button class="view-btn" data-view="side">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M8 12l4-4 4 4"/>
        </svg>
        侧面
      </button>
      <button class="view-btn" data-view="top">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 2v10l5 5"/>
        </svg>
        俯视
      </button>
    `;
    document.body.appendChild(this.viewBtnContainer);

    this.periodEl = document.getElementById('hud-period')!;
    this.timeAgoEl = document.getElementById('hud-time')!;

    timelineController.onTimeUpdate(() => {
      this.updateDisplay(timelineController);
    });

    this.viewBtnContainer.querySelectorAll('.view-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const view = (btn as HTMLElement).dataset.view as 'front' | 'side' | 'top';
        sceneManager.setPresetView(view);
      });
    });

    this.updateDisplay(timelineController);
    this.applyStyles();
  }

  private updateDisplay(timelineController: TimelineController): void {
    const period = timelineController.getCurrentPeriod();
    this.periodEl.textContent = period.nameCN;
    this.timeAgoEl.textContent = period.timeAgo;
  }

  private applyStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      #hud-container {
        position: fixed;
        bottom: 110px;
        right: 30px;
        z-index: 90;
        text-align: right;
        pointer-events: none;
      }
      
      .hud-period {
        font-size: 36px;
        font-weight: 700;
        color: #e0e6ff;
        text-shadow: 
          0 0 20px rgba(106,143,255,0.6),
          0 0 40px rgba(106,143,255,0.3),
          0 0 80px rgba(106,143,255,0.1);
        letter-spacing: 4px;
        font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
        margin-bottom: 4px;
      }
      
      .hud-time {
        font-size: 16px;
        color: rgba(224,230,255,0.7);
        text-shadow: 0 0 10px rgba(106,143,255,0.4);
        letter-spacing: 2px;
        font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      }
      
      #view-buttons {
        position: fixed;
        top: 30px;
        left: 30px;
        display: flex;
        gap: 8px;
        z-index: 90;
      }
      
      .view-btn {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border: 1px solid rgba(224,230,255,0.15);
        border-radius: 10px;
        background: linear-gradient(135deg, rgba(28,42,74,0.8), rgba(10,15,30,0.85));
        backdrop-filter: blur(8px);
        color: #e0e6ff;
        font-size: 13px;
        cursor: pointer;
        transition: transform 0.1s ease, background 0.2s ease, border-color 0.2s ease;
        font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      }
      
      .view-btn:hover {
        background: linear-gradient(135deg, rgba(106,143,255,0.25), rgba(74,111,217,0.2));
        border-color: rgba(106,143,255,0.4);
        transform: scale(1.04);
      }
      
      .view-btn:active {
        transform: scale(0.96);
      }
      
      .view-btn svg {
        opacity: 0.7;
      }
    `;
    document.head.appendChild(style);
  }
}
