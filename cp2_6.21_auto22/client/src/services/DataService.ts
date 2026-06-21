import axios from 'axios';
import type { GreenEvent, Tree, Volunteer, AppNotification, Stats, GrowthRecord } from '../types';

const api = axios.create({
  baseURL: '/api',
});

export const DataService = {
  getEvents: (): Promise<GreenEvent[]> =>
    api.get('/events').then(res => res.data),

  createEvent: (event: Omit<GreenEvent, 'id' | 'participantIds'>): Promise<GreenEvent> =>
    api.post('/events', event).then(res => res.data),

  registerForEvent: (eventId: string, volunteerId: string): Promise<GreenEvent> =>
    api.post(`/events/${eventId}/register`, { volunteerId }).then(res => res.data),

  getTrees: (): Promise<Tree[]> =>
    api.get('/trees').then(res => res.data),

  claimTree: (treeId: string, volunteerId: string, volunteerName: string): Promise<Tree> =>
    api.post(`/trees/${treeId}/claim`, { volunteerId, volunteerName }).then(res => res.data),

  addGrowthRecord: (treeId: string, record: Omit<GrowthRecord, 'id'>): Promise<GrowthRecord> =>
    api.post(`/trees/${treeId}/records`, record).then(res => res.data),

  getVolunteers: (): Promise<Volunteer[]> =>
    api.get('/volunteers').then(res => res.data),

  getVolunteer: (id: string): Promise<Volunteer> =>
    api.get(`/volunteers/${id}`).then(res => res.data),

  getNotifications: (): Promise<AppNotification[]> =>
    api.get('/notifications').then(res => res.data),

  markNotificationRead: (id: string): Promise<AppNotification> =>
    api.post(`/notifications/${id}/read`).then(res => res.data),

  getStats: (): Promise<Stats> =>
    api.get('/stats').then(res => res.data),
};
