import React from 'react';
import type { Course } from '../types';
import CourseCard from '../components/CourseCard';

interface CourseListProps {
  courses: Course[];
}

const CourseList: React.FC<CourseListProps> = ({ courses }) => {
  return (
    <div className="page-transition-enter">
      <h1 className="page-title">探索手工艺课程</h1>
      
      {courses.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🎨</div>
          <p>暂无课程，敬请期待</p>
        </div>
      ) : (
        <div className="course-grid">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseList;
