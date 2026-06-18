export type BookStatus = 'in-stock' | 'low-stock' | 'out-of-stock';

export interface Book {
  id: string;
  title: string;
  author: string;
  price: number;
  isbn: string;
  publisher: string;
  publishYear: number;
  description: string;
  contents: string[];
  coverImage: string;
  stock: number;
  status: BookStatus;
}

export type BookingStatus = 'pending' | 'picked-up' | 'cancelled';

export type TimeSlot = 'morning' | 'afternoon';

export interface Booking {
  id: string;
  bookId: string;
  bookingCode: string;
  customerName: string;
  phone: string;
  pickupDate: string;
  timeSlot: TimeSlot;
  status: BookingStatus;
  createdAt: string;
}

export interface TimeSlotAvailability {
  date: string;
  timeSlot: TimeSlot;
  total: number;
  remaining: number;
}

export interface DailyStatistics {
  date: string;
  totalBookings: number;
  morningCount: number;
  afternoonCount: number;
  completedCount: number;
  cancelledCount: number;
  completionRate: number;
  cancellationRate: number;
}

export interface BookingFormData {
  customerName: string;
  phone: string;
  pickupDate: string;
  timeSlot: TimeSlot;
}

export type SortOption = 'price-asc' | 'price-desc' | 'year-asc' | 'year-desc';
