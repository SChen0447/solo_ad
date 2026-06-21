import { useState, useEffect } from 'react';
import CourseCard from '../components/CourseCard';
import { api } from '../services/api';
import type { Course } from '../types';

const CourseList = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const data = await api.getCourses();
        setCourses(data);
      } catch (error) {
        console.error('Failed to fetch courses:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCourses();
  }, []);

  return (
    <div style={pageStyle}>
      <div style="container">
        <div style={headerStyle}>
          <h1 style={pageTitleStyle}>探索课程</h1>
          <p style={pageSubtitleStyle}>发现优质技能课程，开启你的学习之旅</p>
        </div>

        {loading ? (
          <div style={loadingStyle}>
            <div style={spinnerStyle} />
            <p style={loadingTextStyle}>加载中...</p>
          </div>
        ) : (
          <div style={gridStyle}>
            {courses.map(course => (
              <CourseCard key={course.id} course={course} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const pageStyle: React.CSSProperties = {
  paddingTop: '80px',
  paddingBottom: '60px',
  minHeight: '100vh'
};

const headerStyle: React.CSSProperties = {
  marginBottom: '32px',
  textAlign: 'center'
};

const pageTitleStyle: React.CSSProperties = {
  fontSize: '32px',
  fontWeight: '700',
  color: '#1F2937',
  marginBottom: '8px'
};

const pageSubtitleStyle: React.CSSProperties = {
  fontSize: '16px',
  color: '#6B7280'
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 280px)',
  gap: '24px',
  justifyContent: 'center'
};

const loadingStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '80px 0',
  gap: '16px'
};

const spinnerStyle: React.CSSProperties = {
  width: '40px',
  height: '40px',
  border: '3px solid #E5E7EB',
  borderTopColor: '#7C3AED',
  borderRadius: '50%',
  animation: 'spin 1s linear infinite'
};

const loadingTextStyle: React.CSSProperties = {
  fontSize: '14px',
  color: '#6B7280'
};

const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
  
  @media (max-width: 1200px) {
    div[style*="gridStyle"] {
      grid-template-columns: repeat(3, 280px) !important;
    }
  }
  
  @media (max-width: 900px) {
    div[style*="gridStyle"] {
      grid-template-columns: repeat(2, 280px) !important;
    }
  }
  
  @media (max-width: 640px) {
    div[style*="gridStyle"] {
      grid-template-columns: 1fr !important;
      max-width: '320px';
      margin: '0 auto';
    }
  }
`;
document.head.appendChild(styleSheet);

export default CourseList;
