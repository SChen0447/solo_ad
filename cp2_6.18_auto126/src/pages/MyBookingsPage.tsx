import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../App';
import BookingCard from '../components/BookingCard';

const MyBookingsPage: React.FC = () => {
  const { bookings, refreshBookings, cancelBooking } = useApp();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    refreshBookings();
  }, [refreshBookings]);

  const sortedBookings = useMemo(() => {
    return [...bookings]
      .filter(b => b.course)
      .sort((a, b) => {
        if (!a.course || !b.course) return 0;
        return new Date(a.course.dateTime).getTime() - new Date(b.course.dateTime).getTime();
      });
  }, [bookings]);

  const totalPages = Math.ceil(sortedBookings.length / itemsPerPage);
  const showPagination = sortedBookings.length > 20;

  const paginatedBookings = useMemo(() => {
    if (!showPagination) return sortedBookings;
    const start = (currentPage - 1) * itemsPerPage;
    return sortedBookings.slice(start, start + itemsPerPage);
  }, [sortedBookings, currentPage, showPagination, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div>
      <h2 className="section-title">我的预约</h2>
      {sortedBookings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📭</div>
          <div className="empty-state-text">您还没有预约任何课程</div>
        </div>
      ) : (
        <>
          {paginatedBookings.map(booking => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onCancel={cancelBooking}
            />
          ))}
          {showPagination && totalPages > 1 && (
            <div className="pagination">
              <button
                className="page-btn"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                上一页
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`page-btn ${currentPage === page ? 'active' : ''}`}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="page-btn"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                下一页
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyBookingsPage;
