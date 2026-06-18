import React, { memo, useState, useCallback } from 'react';
import { Course } from '../types';

interface CourseCardProps {
  course: Course;
  isBooked: boolean;
  onBook: (courseId: string) => void;
  onDelete?: (courseId: string) => void;
  isAdmin?: boolean;
}

const CourseCard: React.FC<CourseCardProps> = memo(({ course, isBooked, onBook, onDelete, isAdmin = false }) => {
  const [flash, setFlash] = useState(false);

  const handleBook = useCallback(() => {
    if (!isBooked && course.bookedCount < course.capacity) {
      setFlash(true);
      setTimeout(() => setFlash(false), 200);
      onBook(course.id);
    }
  }, [course.id, course.bookedCount, course.capacity, isBooked, onBook]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(course.id);
    }
  }, [course.id, onDelete]);

  const isFull = course.bookedCount >= course.capacity;

  return (
    <div className={`course-card ${flash ? 'flash' : ''}`}>
      <div className={`course-type-bar ${course.type}`}></div>
      <div style={{ marginLeft: '10px' }}>
        <div className="course-name">{course.name}</div>
        <div className="course-instructor">教练：{course.instructor}</div>
        <div className="course-time">{course.dateTime}</div>
        <div className="course-capacity">
          预约：{course.bookedCount}/{course.capacity}
        </div>
        <div className="course-actions">
          {isFull ? (
            <span className="full-badge">已满</span>
          ) : isBooked ? (
            <button className="btn btn-secondary" disabled>已预约</button>
          ) : (
            <button className="btn btn-primary" onClick={handleBook}>预约</button>
          )}
          {isAdmin && (
            <button className="btn btn-danger" onClick={handleDelete}>删除</button>
          )}
        </div>
      </div>
    </div>
  );
});

CourseCard.displayName = 'CourseCard';

export default CourseCard;
