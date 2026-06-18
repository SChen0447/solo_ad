export interface PopupRule {
  id: string;
  title: string;
  subtitle: string;
  productLink: string;
  bgColor: string;
  triggerType: 'dwell' | 'scroll';
  triggerValue: number;
  maxDailyShows: number;
  createdAt: number;
}

export type PopupRuleCreate = Omit<PopupRule, 'id' | 'createdAt'>;

export interface ImpressionEvent {
  id: string;
  ruleId: string;
  sessionId: string;
  timestamp: number;
  type: 'impression';
}

export interface ClickEvent {
  id: string;
  ruleId: string;
  sessionId: string;
  timestamp: number;
  type: 'click';
}

export type TrackingEvent = ImpressionEvent | ClickEvent;

export interface DailyStats {
  date: string;
  totalImpressions: number;
  totalClicks: number;
  clickRate: number;
  byRule: {
    ruleId: string;
    ruleTitle: string;
    impressions: number;
    clicks: number;
  }[];
}
