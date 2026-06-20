import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Users, Star } from 'lucide-react';
import type { Course } from '../types';
import { DIFFICULTY_LABELS } from '../types';

interface CourseCardProps {
  course: Course;
}

const CourseCard: React.FC<CourseCardProps> = React.memo(({ course }) => {
  const navigate = useNavigate();
  
  const remainingSpots = course.maxCapacity - course.currentEnrollment;
  const remainingPercent = (remainingSpots / course.maxCapacity) * 100;
  
  const handleClick = () => {
    navigate(`/course/${course.id}`);
  };
  
  return (
    <div
      className="course-card"
      style={{ '--card-color': course.color } as React.CSSProperties}
      onClick={handleClick}
    >
      <h3 className="course-card-title">{course.title}</h3>
      
      <div className="course-card-info">
        <Calendar size={16} />
        <span>{course.dateTime}</span>
      </div>
      
      <div className="course-card-info">
        <Users size={16} />
        <span>剩余 {remainingSpots} / {course.maxCapacity} 名额</span>
      </div>
      
      <div className="progress-container">
        <div
          className={`progress-bar ${remainingPercent < 20 ? 'warning' : ''}`}
          style={{ width: `${(course.currentEnrollment / course.maxCapacity) * 100}%` }}
        />
      </div>
      
      <div className="course-card-footer">
        <span className={`difficulty-badge difficulty-${course.difficulty}`}>
          {DIFFICULTY_LABELS[course.difficulty]}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#8B4513' }}>
          <Star size={16} fill="#FFD700" stroke="#FFD700" />
          <span style={{ fontWeight: 600 }}>{course.averageRating}</span>
          <span style={{ color: '#999', fontSize: '0.8rem' }}>({course.feedbackCount})</span>
        </div>
      </div>
    </div>
  );
});

CourseCard.displayName = 'CourseCard';

export default CourseCard;
