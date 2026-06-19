import { eventBus } from '../engine/EventBus';
import { RELICS } from '../config/relics';
import type { ViewMode, AppState } from '../types';

export class UILayer {
  private relicListContainer: HTMLElement;
  private viewModeControls: HTMLElement;
  private loadingOverlay: HTMLElement;
  private guideOverlay: HTMLElement;
  private loadingProgress: HTMLElement;
  private loadingText: HTMLElement;
  private currentRelicId: string = RELICS[0].id;
  private currentViewMode: ViewMode = 'free';
  private guideHideTimeout: number | null = null;
  private hasUserInteracted: boolean = false;

  constructor() {
    const relicListEl = document.getElementById('relic-list');
    const viewModeEl = document.getElementById('view-mode-controls');
    const loadingEl = document.getElementById('loading-overlay');
    const guideEl = document.getElementById('guide-overlay');
    const progressEl = document.getElementById('loading-progress');
    const textEl = document.getElementById('loading-text');

    if (!relicListEl || !viewModeEl || !loadingEl || !guideEl || !progressEl || !textEl) {
      throw new Error('UI elements not found');
    }

    this.relicListContainer = relicListEl;
    this.viewModeControls = viewModeEl;
    this.loadingOverlay = loadingEl;
    this.guideOverlay = guideEl;
    this.loadingProgress = progressEl;
    this.loadingText = textEl;

    this.renderRelicList();
    this.setupEventListeners();
  }

  private renderRelicList(): void {