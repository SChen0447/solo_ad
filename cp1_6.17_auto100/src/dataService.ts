import axios from 'axios';

export interface Period {
  id: string;
  name: string;
  color: string;
  startYear: number;
  endYear: number;
}

export interface Event {
  id: string;
  periodId: string;
  year: number;
  title: string;
  description: string;
  imageUrl: string;
  lat: number;
  lng: number;
}

export interface TimelineData {
  periods: Period[];
  events: Event[];
}

let cachedData: TimelineData | null = null;

export const dataService = {
  async getTimelineData(): Promise<TimelineData> {
    if (cachedData) {
      return cachedData;
    }
    
    try {
      const response = await axios.get<TimelineData>('/data/timelineData.json');
      cachedData = response.data;
      return cachedData;
    } catch (error) {
      console.error('Failed to load timeline data:', error);
      throw error;
    }
  },

  async getPeriods(): Promise<Period[]> {
    const data = await this.getTimelineData();
    return data.periods;
  },

  async getEventsByPeriodId(periodId: string): Promise<Event[]> {
    const data = await this.getTimelineData();
    return data.events.filter(event => event.periodId === periodId);
  },

  async getEventById(eventId: string): Promise<Event | undefined> {
    const data = await this.getTimelineData();
    return data.events.find(event => event.id === eventId);
  },

  async getPeriodById(periodId: string): Promise<Period | undefined> {
    const data = await this.getTimelineData();
    return data.periods.find(period => period.id === periodId);
  },

  clearCache(): void {
    cachedData = null;
  }
};
