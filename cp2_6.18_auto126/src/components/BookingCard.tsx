import React, { memo, useState, useCallback } from 'react';
import { Booking } from '../types';

interface BookingCardProps {
  booking: Booking;
  onCancel: (bookingId: string) => void;
}

const BookingCard: React.FC<BookingCardProps> = memo(({ booking, onCancel }) => {
  const [flash, setFlash] = useState(false);

  const handleCancel = useCallback(() => {
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    setTimeout(() => onCancel(booking.id), 200);
  }, [booking.id, onCancel]);

  if (!booking.course) {
    return null;
  }

  return (
    <div className={`booking-card ${flash ? 'flash' : ''}`}>
      <div className={`course-type-bar ${booking.course.type}`}></div>
      <div className="booking-info" style={{ marginLeft: '10px' }}>
        <div className="booking-course-name">{booking.course.name}</div>
        <div className="booking-details">
          教练：{booking.course.instructor} | 时间：{booking.course.dateTime}
        </div>
      </div>
      <button className="btn btn-danger" onClick={handleCancel}>
        取消预约
      </button>
    </div>
  );
});

BookingCard.displayName = 'BookingCard';

export default BookingCard;
