import { v4 as uuidv4 } from 'uuid';
import { BuildingData } from '../modules/BuildingModule';
import { SunlightParams } from '../core/ShadowSystem';

export interface SchemeData {
  id: string;
  name: string;
  createdAt: number;
  thumbnail: string;
  buildings: BuildingData[];
  sunlight: SunlightParams;
}

export interface SaveManagerCallbacks {
  onLoadScheme: (scheme: SchemeData) => void;
  onDeleteScheme: (id: string) => void;
  onRefreshCards?: () => void;
}

const STORAGE_KEY = 'city_planner_schemes_v1';

export class SaveManager {
  private container: HTMLElement;
  private callbacks: SaveManagerCallbacks;
  private schemes: SchemeData[] = [];
  private pendingDeleteTimers: Map<string, number> = new Map();

  constructor(container: HTMLElement, callbacks: SaveManagerCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.loadFromStorage();
    this.injectStyles();
    this.renderCards();
  }

  private injectStyles(): void {
    if (document.getElementById('sm-styles')) return;
    const style = document.createElement('style');
    style.id = 'sm-styles';
    style.textContent = `
      .sm-card {
        background: rgba(255, 255, 255, 0.06);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 12px;
        padding: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        gap: 12px;
        align-items: center;
        position: relative;
        overflow: hidden;
      }
      .sm-card:hover {
        background: rgba(255, 255, 255, 0.12);
        border-color: rgba(133, 193, 233, 0.4);
        transform: scale(1.02);
      }
      .sm-card.deleting {
        background: rgba(192, 57, 43, 0.25);
        border-color: rgba(192, 57, 43, 0.5);
        animation: sm-shake 0.4s ease infinite;
      }
      @keyframes sm-shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-2px); }
        75% { transform: translateX(2px); }
      }
      .sm-thumb {
        width: 80px;
        height: 80px;
        border-radius: 8px;
        background: #1A252F;
        object-fit: cover;
        flex-shrink: 0;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }
      .sm-card-info {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .sm-card-name {
        font-size: 13px;
        font-weight: 600;
        color: #fff;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .sm-card-time {
        font-size: 11px;
        color: rgba(255, 255, 255, 0.45);
      }
      .sm-card-meta {
        font-size: 10px;
        color: rgba(133, 193, 233, 0.7);
      }
      .sm-card-delete-hint {
        position: absolute;
        top: 6px;
        right: 8px;
        font-size: 10px;
        color: #E74C3C;
        font-weight: 600;
        background: rgba(192, 57, 43, 0.2);
        padding: 2px 6px;
        border-radius: 4px;
      }
      .sm-empty {
        text-align: center;
        color: rgba(255, 255, 255, 0.4);
        padding: 40px 0;
        font-size: 13px;
        line-height: 1.6;
      }
    `;
    document.head.appendChild(style);
  }

  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        this.schemes = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to load schemes from localStorage', e);
      this.schemes = [];
    }
  }

  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.schemes));
    } catch (e) {
      console.warn('Failed to save schemes to localStorage', e);
    }
  }

  public saveScheme(
    thumbnail: string,
    buildings: BuildingData[],
    sunlight: SunlightParams,
    customName?: string
  ): SchemeData {
    const scheme: SchemeData = {
      id: uuidv4(),
      name:
        customName ||
        `方案 ${this.schemes.length + 1} - ${this.formatDateTime(Date.now(), true)}`,
      createdAt: Date.now(),
      thumbnail,
      buildings: JSON.parse(JSON.stringify(buildings)),
      sunlight: { ...sunlight }
    };
    this.schemes.unshift(scheme);
    this.saveToStorage();
    this.renderCards();
    return scheme;
  }

  public deleteScheme(id: string): boolean {
    const idx = this.schemes.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.schemes.splice(idx, 1);
    this.saveToStorage();
    this.renderCards();
    this.callbacks.onDeleteScheme(id);
    return true;
  }

  public getScheme(id: string): SchemeData | null {
    return this.schemes.find((s) => s.id === id) ?? null;
  }

  public getAllSchemes(): SchemeData[] {
    return [...this.schemes];
  }

  public clearAll(): void {
    this.schemes = [];
    this.saveToStorage();
    this.renderCards();
  }

  public renderCards(): void {
    this.container.innerHTML = '';

    if (this.schemes.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'sm-empty';
      empty.innerHTML = '💾 暂无保存的方案<br/><span style="font-size:11px">点击底部「保存方案」按钮创建</span>';
      this.container.appendChild(empty);
      return;
    }

    this.schemes.forEach((scheme) => {
      const card = document.createElement('div');
      card.className = 'sm-card';
      card.dataset.id = scheme.id;

      const img = document.createElement('img');
      img.className = 'sm-thumb';
      img.src = scheme.thumbnail;
      img.alt = scheme.name;
      card.appendChild(img);

      const info = document.createElement('div');
      info.className = 'sm-card-info';

      const name = document.createElement('div');
      name.className = 'sm-card-name';
      name.textContent = scheme.name;
      info.appendChild(name);

      const time = document.createElement('div');
      time.className = 'sm-card-time';
      time.textContent = this.formatDateTime(scheme.createdAt);
      info.appendChild(time);

      const meta = document.createElement('div');
      meta.className = 'sm-card-meta';
      meta.textContent = `${scheme.buildings.length} 个体块 · 方位 ${scheme.sunlight.azimuth}°·高度 ${scheme.sunlight.altitude}°`;
      info.appendChild(meta);

      card.appendChild(info);

      card.addEventListener('click', () => {
        if (card.classList.contains('deleting')) return;
        this.callbacks.onLoadScheme(scheme);
      });

      let pressTimer: number | null = null;
      const startPress = (e: Event) => {
        e.preventDefault();
        pressTimer = window.setTimeout(() => {
          this.initiateDelete(scheme.id, card);
          pressTimer = null;
        }, 600);
      };
      const cancelPress = () => {
        if (pressTimer !== null) {
          clearTimeout(pressTimer);
          pressTimer = null;
        }
      };
      card.addEventListener('mousedown', startPress);
      card.addEventListener('mouseup', cancelPress);
      card.addEventListener('mouseleave', cancelPress);
      card.addEventListener('touchstart', startPress, { passive: false });
      card.addEventListener('touchend', cancelPress);
      card.addEventListener('touchcancel', cancelPress);

      this.container.appendChild(card);
    });
  }

  private initiateDelete(id: string, card: HTMLElement): void {
    const existingTimer = this.pendingDeleteTimers.get(id);
    if (existingTimer !== undefined) {
      clearTimeout(existingTimer);
    }

    card.classList.add('deleting');
    let hint = card.querySelector('.sm-card-delete-hint') as HTMLElement;
    if (!hint) {
      hint = document.createElement('div');
      hint.className = 'sm-card-delete-hint';
      hint.textContent = '松开删除';
      card.appendChild(hint);
    }

    const confirmDelete = () => {
      this.pendingDeleteTimers.delete(id);
      this.deleteScheme(id);
    };

    const timer = window.setTimeout(confirmDelete, 1500);
    this.pendingDeleteTimers.set(id, timer);

    const cancel = () => {
      if (this.pendingDeleteTimers.has(id)) {
        clearTimeout(this.pendingDeleteTimers.get(id)!);
        this.pendingDeleteTimers.delete(id);
      }
      card.classList.remove('deleting');
      if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
      card.removeEventListener('mouseup', cancel);
      card.removeEventListener('mouseleave', cancel);
      card.removeEventListener('click', cancelClick);
    };
    const cancelClick = (e: Event) => {
      e.stopPropagation();
      cancel();
    };

    card.addEventListener('mouseup', cancel);
    card.addEventListener('mouseleave', cancel);
    card.addEventListener('click', cancelClick);
  }

  private formatDateTime(ts: number, short: boolean = false): string {
    const d = new Date(ts);
    const pad = (n: number) => n.toString().padStart(2, '0');
    if (short) {
      return `${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  }

  public dispose(): void {
    this.pendingDeleteTimers.forEach((t) => clearTimeout(t));
    this.pendingDeleteTimers.clear();
    const style = document.getElementById('sm-styles');
    if (style) style.remove();
  }
}
