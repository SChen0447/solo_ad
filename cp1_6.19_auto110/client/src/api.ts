import { Trainer, TimeSlot, Booking, TrainingRecord, Stats, User } from './types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `请求失败: ${response.status}`);
  }

  return response.json();
}

export const api = {
  getTrainers: (): Promise<Trainer[]> => request<Trainer[]>('/trainers'),

  getTrainerById: (id: string): Promise<Trainer> => request<Trainer>(`/trainers/${id}`),

  getTimeslots: (startDate: string, endDate: string, trainerId?: string): Promise<TimeSlot[]> => {
    const params = new URLSearchParams({ startDate, endDate });
    if (trainerId) params.append('trainerId', trainerId);
    return request<TimeSlot[]>(`/timeslots?${params.toString()}`);
  },

  getBookings: (memberId?: string, trainerId?: string, status?: Booking['status']): Promise<Booking[]> => {
    const params = new URLSearchParams();
    if (memberId) params.append('memberId', memberId);
    if (trainerId) params.append('trainerId', trainerId);
    if (status) params.append('status', status);
    return request<Booking[]>(`/bookings?${params.toString()}`);
  },

  createBooking: (data: {
    timeSlotId: string;
    memberId: string;
    memberName: string;
    courseType: string;
    notes?: string;
  }): Promise<Booking> =>
    request<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  cancelBooking: (bookingId: string): Promise<{ message: string }> =>
    request<{ message: string }>(`/bookings/${bookingId}/cancel`, {
      method: 'PUT',
    }),

  completeBooking: (bookingId: string): Promise<{ message: string; record: TrainingRecord }> =>
    request<{ message: string; record: TrainingRecord }>(`/bookings/${bookingId}/complete`, {
      method: 'PUT',
    }),

  getTrainingRecords: (memberId?: string, status?: TrainingRecord['status']): Promise<TrainingRecord[]> => {
    const params = new URLSearchParams();
    if (memberId) params.append('memberId', memberId);
    if (status) params.append('status', status);
    return request<TrainingRecord[]>(`/training-records?${params.toString()}`);
  },

  rateTraining: (recordId: string, rating: number, feedback?: string): Promise<{ message: string; record: TrainingRecord }> =>
    request<{ message: string; record: TrainingRecord }>(`/training-records/${recordId}/rate`, {
      method: 'PUT',
      body: JSON.stringify({ rating, feedback }),
    }),

  getStats: (): Promise<Stats> => request<Stats>('/stats'),

  getUsers: (): Promise<User[]> => request<User[]>('/users'),

  setTrainerSchedule: (
    trainerId: string,
    weekStart: string,
    slots: { dayOfWeek: number; startTime: string; endTime: string }[]
  ): Promise<{ trainerId: string; weekStart: string; slots: typeof slots }> =>
    request(`/trainers/${trainerId}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ weekStart, slots }),
    }),

  copyLastWeekSchedule: (trainerId: string, currentWeekStart: string): Promise<{ trainerId: string; weekStart: string; slots: { dayOfWeek: number; startTime: string; endTime: string }[] }> =>
    request(`/trainers/${trainerId}/schedule/copy`, {
      method: 'POST',
      body: JSON.stringify({ currentWeekStart }),
    }),
};
