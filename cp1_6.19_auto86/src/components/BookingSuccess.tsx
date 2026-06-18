import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, Clock, BookOpen, Calendar, User, Phone, Hash, ArrowRight } from 'lucide-react';
import { useBookingStore } from '@/stores/bookingStore';
import { useBookStore } from '@/stores/bookStore';
import { useCountdown } from '@/hooks/useCountdown';
import { formatDateDisplay, getTimeSlotLabel, getStatusText } from '@/utils/dateUtils';

export default function BookingSuccess() {
  const { id } = useParams<{ id: string }>();
  const { getBookingById } = useBookingStore();
  const { getBookById } = useBookStore();

  const booking = getBookingById(id || '');
  const book = booking ? getBookById(booking.bookId) : undefined;

  const countdown = booking
    ? useCountdown(booking.pickupDate, booking.timeSlot)
    : { hours: 0, isExpired: false, formatted: '0 分钟' };

  if (!booking) {
    return (
      <div className="min-h-screen pt-20 pb-12 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">❓</div>
          <p className="text-gray-500 text-lg">预约记录不存在</p>
          <Link to="/" className="btn-primary inline-block mt-4">
            返回首页
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12">
      <div className="max-w-2xl mx-auto px-4 container-transition">
        <div className="bg-white rounded-2xl