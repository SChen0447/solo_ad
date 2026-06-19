import { v4 as uuidv4 } from 'uuid';
import historyData from '../data/HistoryData.json';

export interface HistoryEvent {
  id: string;
  name: string;
  year: number;
  civilization: string;
  category: string;
  description: string;
  image: string;
}

export interface TimelineNode {
  id: string;
  event: HistoryEvent;
  position: number;
  color: string;
}

export interface TimelineTick {
  year: number;
  position: number;
  isMajor: boolean;
  label: string;
}

export interface TimelineData {
  nodes: TimelineNode[];
  ticks: TimelineTick[];
  startYear: number;
  endYear: number;
  totalRange: number;
}

export const CIVILIZATION_COLORS: Record<string, string> = {
  '埃及': '#FFD700',
  '希腊': '#9B59B6',
  '罗马': '#E74C3C',
  '中国': '#E74C3C',
  '伊斯兰': '#2ECC71',
  '欧洲': '#3498DB'
};

export const START_YEAR = -3000;
export const END_YEAR = 2000;
export const MAJOR_TICK_INTERVAL = 500;
export const MINOR_TICK_INTERVAL = 100;

export class TimelineEngine {
  private events: HistoryEvent[] = [];
  private startYear: number;
  private endYear: number;
  private majorTickInterval: number;
  private minorTickInterval: number;

  constructor(
    startYear: number = START_YEAR,
    endYear: number = END_YEAR,
    majorTickInterval: number = MAJOR_TICK_INTERVAL,
    minorTickInterval: number = MINOR_TICK_INTERVAL
  ) {
    this.startYear = startYear;
    this.endYear = endYear;
    this.majorTickInterval = majorTickInterval;
    this.minorTickInterval = minorTickInterval;
    this.loadData();
  }

  private loadData(): void {
    this.events = (historyData as HistoryEvent[]).map(event => ({
      ...event,
      id: event.id || uuidv4()
    }));
  }

  public getAllEvents(): HistoryEvent[] {
    return [...this.events];
  }

  public getCivilizationColor(civilization: string): string {
    return CIVILIZATION_COLORS[civilization] || '#888888';
  }

  public yearToPosition(year: number): number {
    const totalRange = this.endYear - this.startYear;
    const relativePosition = (year - this.startYear) / totalRange;
    return Math.max(0, Math.min(1, relativePosition));
  }

  public positionToYear(position: number): number {
    const totalRange = this.endYear - this.startYear;
    return this.startYear + position * totalRange;
  }

  private generateTicks(): TimelineTick[] {
    const ticks: TimelineTick[] = [];
    const totalRange = this.endYear - this.startYear;

    for (let year = this.startYear; year <= this.endYear; year += this.minorTickInterval) {
      const isMajor = year % this.majorTickInterval === 0;
      const position = (year - this.startYear) / totalRange;

      let label = '';
      if (isMajor) {
        if (year < 0) {
          label = `公元前${Math.abs(year)}年`;
        } else if (year === 0) {
          label = '公元元年';
        } else {
          label = `公元${year}年`;
        }
      }

      ticks.push({
        year,
        position,
        isMajor,
        label
      });
    }

    return ticks;
  }

  private generateNodes(filteredEvents?: HistoryEvent[]): TimelineNode[] {
    const eventsToUse = filteredEvents || this.events;
    return eventsToUse
      .filter(event => event.year >= this.startYear && event.year <= this.endYear)
      .map(event => ({
        id: event.id,
        event,
        position: this.yearToPosition(event.year),
        color: this.getCivilizationColor(event.civilization)
      }))
      .sort((a, b) => a.event.year - b.event.year);
  }

  public generateTimelineData(filteredEvents?: HistoryEvent[]): TimelineData {
    const ticks = this.generateTicks();
    const nodes = this.generateNodes(filteredEvents);

    return {
      nodes,
      ticks,
      startYear: this.startYear,
      endYear: this.endYear,
      totalRange: this.endYear - this.startYear
    };
  }

  public searchEvents(keyword: string): HistoryEvent[] {
    if (!keyword.trim()) {
      return this.getAllEvents();
    }

    const lowerKeyword = keyword.toLowerCase().trim();
    return this.events.filter(event =>
      event.name.toLowerCase().includes(lowerKeyword) ||
      event.description.toLowerCase().includes(lowerKeyword) ||
      event.civilization.toLowerCase().includes(lowerKeyword) ||
      event.category.toLowerCase().includes(lowerKeyword) ||
      String(event.year).includes(lowerKeyword)
    );
  }

  public getEventById(id: string): HistoryEvent | undefined {
    return this.events.find(event => event.id === id);
  }

  public setYearRange(startYear: number, endYear: number): void {
    this.startYear = startYear;
    this.endYear = endYear;
  }
}

export const formatYear = (year: number): string => {
  if (year < 0) {
    return `公元前${Math.abs(year)}年`;
  } else if (year === 0) {
    return '公元元年';
  } else {
    return `公元${year}年`;
  }
};
