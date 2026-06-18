import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { generateBookingCode } from '@/utils/bookingCode';
import { formatDate, isPickupSoon } from '@/utils/dateUtils';
import type {
  Booking,
  BookingStatus,
  TimeSlot,
  BookingFormData,
  TimeSlotAvailability,
  DailyStatistics,
} from '@/types';

const MAX_BOOKINGS_PER_SLOT = 5;

interface BookingStore {
  bookings: Booking[];
  submitBooking: (bookId: string, formData: BookingFormData) => Booking | null;
  updateBookingStatus: (bookingId: string, status: BookingStatus) => void;
  getBookingById: (id: string) => Booking | undefined;
  getBookingsByDate: (date: string) => Booking[];
  getTimeSlotAvailability: (date: string, timeSlot: TimeSlot) => TimeSlotAvailability;
  getUpcomingBookings: () => Booking[];
  getBookingsForReminder: () => Booking[];
  getDailyStatistics: (date: string) => DailyStatistics;
  getStatisticsForLast7Days: () => DailyStatistics[];
}

const generateSampleBookings = (): Booking[] => {
  const sampleData: Array<{
    daysFromNow: number;
    timeSlot: TimeSlot;
    status: BookingStatus;
    bookIndex: number;
    name: string;
    phone: string;
  }> = [
    { daysFromNow: 0, timeSlot: 'morning', status: 'pending', bookIndex: 0, name: '张三', phone: '13800138001' },
    { daysFromNow: 0, timeSlot: 'morning', status: 'pending', bookIndex: 1, name: '李四', phone: '13800138002' },
    { daysFromNow: 0, timeSlot: 'afternoon', status: 'pending', bookIndex: 2, name: '王五', phone: '13800138003' },
    { daysFromNow: 1, timeSlot: 'morning', status: 'pending', bookIndex: 3, name: '赵六', phone: '13800138004' },
    { daysFromNow: 1, timeSlot: 'morning', status: 'pending', bookIndex: 4, name: '钱七', phone: '13800138005' },
    { daysFromNow: 1, timeSlot: 'afternoon', status: 'picked-up', bookIndex: 5, name: '孙八', phone: '13800138006' },
    { daysFromNow: 2, timeSlot: 'morning', status: 'cancelled', bookIndex: 6, name: '周九', phone: '13800138007' },
    { daysFromNow: 2, timeSlot: 'afternoon', status: 'pending', bookIndex: 7, name: '吴十', phone: '13800138008' },
  ];

  const today = new Date();
  return sampleData.map((data) => {
    const pickupDate = new Date(today);
    pickupDate.setDate(today.getDate() + data.daysFromNow);
    const createdAt = new Date(today);
    createdAt.setDate(today.getDate() - Math.floor(Math.random() * 3));

    return {
      id: uuidv4(),
      bookId: `sample-book-${data.bookIndex}`,
      bookingCode: generateBookingCode(),
      customerName: data.name,
      phone: data.phone,
      pickupDate: formatDate(pickupDate),
      timeSlot: data.timeSlot,
      status: data.status,
      createdAt: createdAt.toISOString(),
    };
  });
};

export const useBookingStore = create<BookingStore>((set, get) => ({
  bookings: generateSampleBookings(),

  submitBooking: (bookId: string, formData: BookingFormData): Booking | null => {
    const { bookings } = get();
    const { pickupDate, timeSlot } = formData;

    const slotAvailability = get().getTimeSlotAvailability(pickupDate, timeSlot);
    if (slotAvailability.remaining <= 0) {
      return null;
    }

    const newBooking: Booking = {
      id: uuidv4(),
      bookId,
      bookingCode: generateBookingCode(),
      customerName: formData.customerName,
      phone: formData.phone,
      pickupDate: formData.pickupDate,
      timeSlot: formData.timeSlot,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    set((state) => ({
      bookings: [...state.bookings, newBooking],
    }));

    return newBooking;
  },

  updateBookingStatus: (bookingId: string, status: BookingStatus) => {
    set((state) => ({
      bookings: state.bookings.map((booking) =>
        booking.id === bookingId ? { ...booking, status } : booking
      ),
    }));
  },

  getBookingById: (id: string) => {
    const { bookings } = get();
    return bookings.find((booking) => booking.id === id);
  },

  getBookingsByDate: (date: string) => {
    const { bookings } = get();
    return bookings.filter((booking) => booking.pickupDate === date);
  },

  getTimeSlotAvailability: (date: string, timeSlot: TimeSlot): TimeSlotAvailability => {
    const { bookings } = get();
    const slotBookings = bookings.filter(
      (booking) =>
        booking.pickupDate === date &&
        booking.timeSlot === timeSlot &&
        booking.status !== 'cancelled'
    );
    const booked = slotBookings.length;
    return {
      date,
      timeSlot,
      total: MAX_BOOKINGS_PER_SLOT,
      remaining: Math.max(0, MAX_BOOKINGS_PER_SLOT - booked),
    };
  },

  getUpcomingBookings: () => {
    const { bookings } = get();
    const today = formatDate(new Date());
    return bookings
      .filter((booking) => booking.pickupDate >= today && booking.status === 'pending')
      .sort((a, b) => {
        if (a.pickupDate !== b.pickupDate) {
          return a.pickupDate.localeCompare(b.pickupDate);
        }
        return a.timeSlot === 'morning' ? -1 : 1;
      });
  },

  getBookingsForReminder: () => {
    const { bookings } = get();
    return bookings.filter(
      (booking) =>
        booking.status === 'pending' &&
        isPickupSoon(booking.pickupDate, booking.timeSlot, 30)
    );
  },

  getDailyStatistics: (date: string): DailyStatistics => {
    const { bookings } = get();
    const dayBookings = bookings.filter((booking) => booking.pickupDate === date);
    
    const totalBookings = dayBookings.length;
    const morningCount = dayBookings.filter((b) => b.timeSlot === 'morning').length;
    const afternoonCount = dayBookings.filter((b) => b.timeSlot === 'afternoon').length;
    const completedCount = dayBookings.filter((b) => b.status === 'picked-up').length;
    const cancelledCount = dayBookings.filter((b) => b.status === 'cancelled').length;

    const completionRate = totalBookings > 0 ? (completedCount / totalBookings) * 100 : 0;
    const cancellationRate = totalBookings > 0 ? (cancelledCount / totalBookings) * 100 : 0;

    return {
      date,
      totalBookings,
      morningCount,
      afternoonCount,
      completedCount,
      cancelledCount,
      completionRate: Math.round(completionRate * 10) / 10,
      cancellationRate: Math.round(cancellationRate * 10) / 10,
    };
  },

  getStatisticsForLast7Days: (): DailyStatistics[] => {
    const statistics: DailyStatistics[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      statistics.push(get().getDailyStatistics(formatDate(date)));
    }
    
    return statistics;
  },
}));
