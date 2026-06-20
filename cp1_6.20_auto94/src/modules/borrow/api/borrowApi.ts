import api from '@/api/http';
import type { Reservation } from '@/types';

export interface CreateReservationData {
  bookId: string;
  bookTitle: string;
  userId: string;
  userName: string;
  reserveDate: string;
}

export interface CalendarDayData {
  date: string;
  available: boolean;
  reservations?: number;
}

export const borrowApi = {
  async createReservation(data: CreateReservationData): Promise<Reservation> {
    const response = await api.post<Reservation>('/reservations', data);
    return response.data;
  },

  async getReservationsByBook(bookId: string): Promise<Reservation[]> {
    const response = await api.get<Reservation[]>(`/reservations/book/${bookId}`);
    return response.data;
  },

  async getReservationsByUser(userId: string): Promise<Reservation[]> {
    const response = await api.get<Reservation[]>(`/reservations/user/${userId}`);
    return response.data;
  },

  async getCalendarData(bookId: string, startDate: string, endDate: string): Promise<CalendarDayData[]> {
    const response = await api.get<CalendarDayData[]>('/reservations/calendar', {
      params: { bookId, startDate, endDate }
    });
    return response.data;
  },

  async cancelReservation(id: string): Promise<Reservation> {
    const response = await api.patch<Reservation>(`/reservations/${id}/cancel`);
    return response.data;
  },

  async confirmReturn(id: string): Promise<Reservation> {
    const response = await api.patch<Reservation>(`/reservations/${id}/return`);
    return response.data;
  },

  async getBorrowHistory(bookId: string): Promise<(Reservation & { userName: string })[]> {
    const response = await api.get(`/reservations/history/${bookId}`);
    return response.data;
  }
};
