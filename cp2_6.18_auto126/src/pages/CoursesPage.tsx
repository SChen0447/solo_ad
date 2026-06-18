import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../App';
import CourseCard from '../components/CourseCard';

const CoursesPage: React.FC = () => {
  const { courses, bookings, refreshCourses, bookCourse } = useApp();
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  useEffect(() => {
    refreshCourses();
  }, [refreshCourses]);

  const bookedCourseIds = useMemo(() => {
    return new Set(bookings.map(b => b.courseId));
  }, [bookings]);

  const today = new Date();
  const weekEnd = new Date(today);
  weekEnd.setDate(today.getDate() + 7);

  const thisWeekCourses = useMemo(() => {
    return courses.filter(course => {
      const courseDate = new Date(course.dateTime.split(' ')[0]);
      return courseDate >= today && courseDate <= weekEnd;
    }).sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }, [courses, today, weekEnd]);

  const totalPages = Math.ceil(thisWeekCourses.length / itemsPerPage);
  const showPagination = thisWeekCourses.length > 20;

  const paginatedCourses = useMemo(() => {
    if (!showPagination) return thisWeekCourses;
    const start = (currentPage - 1) * itemsPerPage;
    return thisWeekCourses.slice(start, start + itemsPerPage);
  }, [thisWeekCourses, currentPage, showPagination, itemsPerPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div>
      <h2 className="section-title">本周课程</h2>
      {thisWeekCourses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📅</div>
          <div className="empty-state-text">暂无本周课程</div>
        </div>
      ) : (
        <>
          <div className="courses-grid">
            {paginatedCourses.map(course => (
              <CourseCard
                key={course.id}
                course={course}
                isBooked={bookedCourseIds.has(course.id)}
                onBook={bookCourse}
              />
            ))}
          </div>
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

export default CoursesPage;
