import React, { useEffect, useState } from 'react';
import CourseCard from '../components/CourseCard';
import { api, type CourseListItem } from '../services/api';
import './CourseListPage.css';

const CourseListPage: React.FC = () => {
  const [courses, setCourses] = useState<CourseListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.getCourses();
        setCourses(data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">探索课程</h1>
          <p className="page-subtitle">发现优质技能工作坊，开启你的学习之旅</p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <div className="stat-value">{courses.length}</div>
            <div className="stat-label">门课程</div>
          </div>
          <div className="stat-divider" />
          <div className="stat-item">
            <div className="stat-value">{courses.filter(c => c.progress > 0).length}</div>
            <div className="stat-label">进行中</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="skeleton-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton-cover" />
              <div className="skeleton-info">
                <div className="skeleton-line w80" />
                <div className="skeleton-line w60" />
                <div className="skeleton-line w50" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="course-grid">
          {courses.map(course => (
            <CourseCard
              key={course.id}
              id={course.id}
              title={course.title}
              coverImage={course.coverImage}
              instructorName={course.instructorName}
              progress={course.progress}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseListPage;
