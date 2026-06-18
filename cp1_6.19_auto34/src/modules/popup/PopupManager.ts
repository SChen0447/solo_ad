import { create } from 'zustand';
import type { PopupRule } from '../../shared/types';
import { tracker } from '../tracker/Tracker';

const DISMISS_DURATION = 3 * 60 * 60 * 1000;

interface PopupState {
  rules: PopupRule[];
  activeRuleId: string | null;
  isVisible: boolean;
  dismissedRules: Record<string, number>;
  dailyShowCounts: Record<string, { date: string; count: number }>;
  impressionsTracked: Set<string>;

  setRules: (rules: PopupRule[]) => void;
  showPopup: (ruleId: string) => void;
  hidePopup: () => void;
  dismissRule: (ruleId: string) => void;
  markImpressionTracked: (ruleId: string) => void;
  canShowRule: (ruleId: string) => boolean;
  incrementDailyShow: (ruleId: string) => void;
}

const getTodayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

const loadDismissedFromStorage = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem('popup_dismissed');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
};

const loadDailyCountsFromStorage = (): Record<string, { date: string; count: number }> => {
  try {
    const raw = localStorage.getItem('popup_daily_counts');
    if (raw) return JSON.parse(raw);
  } catch {
    // ignore
  }
  return {};
};

export const usePopupStore = create<PopupState>((set, get) => ({
  rules: [],
  activeRuleId: null,
  isVisible: false,
  dismissedRules: loadDismissedFromStorage(),
  dailyShowCounts: loadDailyCountsFromStorage(),
  impressionsTracked: new Set(),

  setRules: (rules) => set({ rules }),

  showPopup: (ruleId) => {
    const state = get();
    if (!state.canShowRule(ruleId)) return;
    state.incrementDailyShow(ruleId);
    set({ activeRuleId: ruleId, isVisible: true });
  },

  hidePopup: () => set({ isVisible: false }),

  dismissRule: (ruleId) => {
    const dismissedRules = { ...get().dismissedRules, [ruleId]: Date.now() };
    localStorage.setItem('popup_dismissed', JSON.stringify(dismissedRules));
    set({ dismissedRules, isVisible: false });
  },

  markImpressionTracked: (ruleId) => {
    const set2 = new Set(get().impressionsTracked);
    set2.add(ruleId);
    set({ impressionsTracked: set2 });
  },

  canShowRule: (ruleId): boolean => {
    const state = get();
    const dismissedAt = state.dismissedRules[ruleId];
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_DURATION) {
      return false;
    }

    const daily = state.dailyShowCounts[ruleId];
    const rule = state.rules.find((r) => r.id === ruleId);
    if (!rule) return false;

    const today = getTodayStr();
    if (daily && daily.date === today && daily.count >= rule.maxDailyShows) {
      return false;
    }

    return true;
  },

  incrementDailyShow: (ruleId) => {
    const today = getTodayStr();
    const current = get().dailyShowCounts[ruleId];
    const count = current && current.date === today ? current.count + 1 : 1;
    const dailyShowCounts = {
      ...get().dailyShowCounts,
      [ruleId]: { date: today, count }
    };
    localStorage.setItem('popup_daily_counts', JSON.stringify(dailyShowCounts));
    set({ dailyShowCounts });
  }
}));

export class PopupManager {
  private initialized = false;
  private rules: PopupRule[] = [];
  private dwellTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  private scrollHandler: (() => void) | null = null;
  private triggeredRules: Set<string> = new Set();

  public async init(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      const res = await fetch('/api/rules');
      if (res.ok) {
        this.rules = await res.json();
        usePopupStore.getState().setRules(this.rules);
      }
    } catch {
      // ignore
    }

    this.setupTriggers();
  }

  private setupTriggers(): void {
    const now = Date.now();

    for (const rule of this.rules) {
      if (!usePopupStore.getState().canShowRule(rule.id)) continue;

      if (rule.triggerType === 'dwell') {
        this.dwellTimers[rule.id] = setTimeout(() => {
          this.tryShow(rule.id);
        }, rule.triggerValue * 1000);
      }
    }

    const hasScrollRules = this.rules.some((r) => r.triggerType === 'scroll');
    if (hasScrollRules) {
      this.scrollHandler = () => this.handleScroll();
      window.addEventListener('scroll', this.scrollHandler, { passive: true });
    }
  }

  private handleScroll(): void {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return;

    const scrollPercent = (scrollTop / docHeight) * 100;

    for (const rule of this.rules) {
      if (rule.triggerType !== 'scroll') continue;
      if (this.triggeredRules.has(rule.id)) continue;
      if (!usePopupStore.getState().canShowRule(rule.id)) continue;

      if (scrollPercent >= rule.triggerValue) {
        this.triggeredRules.add(rule.id);
        this.tryShow(rule.id);
      }
    }
  }

  private tryShow(ruleId: string): void {
    const state = usePopupStore.getState();
    if (state.isVisible) return;
    if (!state.canShowRule(ruleId)) return;

    state.showPopup(ruleId);

    setTimeout(() => {
      const s = usePopupStore.getState();
      if (s.isVisible && s.activeRuleId === ruleId && !s.impressionsTracked.has(ruleId)) {
        tracker.trackImpression(ruleId);
        s.markImpressionTracked(ruleId);
      }
    }, 300);
  }

  public getRules(): PopupRule[] {
    return this.rules;
  }

  public destroy(): void {
    for (const key in this.dwellTimers) {
      clearTimeout(this.dwellTimers[key]);
    }
    this.dwellTimers = {};

    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      this.scrollHandler = null;
    }
  }
}

export const popupManager = new PopupManager();
export default PopupManager;
