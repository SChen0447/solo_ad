import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import type { Course } from '../types';

interface CourseCardProps {
  course: Course;
}

const CourseCard = ({ course }: CourseCardProps) => {
  const progressColor = useMemo(() => {
    if (course.progress <= 33) return '#EF4444';
    if (course.progress <= 66) return '#F59E0B';
    return '#10B981';
  }, [course.progress]);

  const circumference = 2 * Math.PI * 16;
  const strokeDashoffset = circumference - (course.progress / 100) * circumference;

  return (
    <Link to={`/course/${course.id}`} style={cardStyle}>
      <div style={coverStyle}>
        <img src={course.coverImage} alt={course.title} style={coverImageStyle} />
      </div>
      <div style={infoStyle}>
        <h3 style={titleStyle}>{course.title}</h3>
        <div style={instructorStyle}>
          <img src={course.instructorAvatar} alt={course.instructor} style={avatarStyle} />
          <span style={instructorNameStyle}>{course.instructor}</span>
        </div>
        <div style={progressContainerStyle}>
          <div style={progressTextStyle}>
            <span style={progressLabelStyle}>完成进度</span>
            <span style={progressValueStyle}>{course.progress}%</span>
          </div>
          <svg width="36" height="36" style={progressRingStyle}>
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="4"
            />
            <circle
              cx="18"
              cy="18"
              r="16"
              fill="none"
              stroke={progressColor}
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform="rotate(-90 18 18)"
              style={{ transition: 'stroke-dashoffset 0.5s ease, stroke 0.3s ease' }}
            />
            <text
              x="18"
              y="22"
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill={progressColor}
            >
              {course.completedLessons}/{course.totalLessons}
            </text>
          </svg>
        </div>
      </div>
    </Link>
  );
};

const cardStyle: React.CSSProperties = {
  width: '280px',
  borderRadius: '12px',
  overflow: 'hidden',
  background: 'linear-gradient(180deg, #E8DEF8 0%, #FFFFFF 45%)',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  textDecoration: 'none',
  color: 'inherit',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column'
};

const coverStyle: React.CSSProperties = {
  height: '45%',
  overflow: 'hidden',
  position: 'relative'
};

const coverImageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover'
};

const infoStyle: React.CSSProperties = {
  padding: '16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  flex: 1
};

const titleStyle: React.CSSProperties = {
  fontSize: '16px',
  fontWeight: '600',
  color: '#1F2937',
  lineHeight: '1.4',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden'
};

const instructorStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
};

const avatarStyle: React.CSSProperties = {
  width: '24px',
  height: '24px',
  borderRadius: '50%',
  objectFit: 'cover'
};

const instructorNameStyle: React.CSSProperties = {
  fontSize: '13px',
  color: '#6B7280'
};

const progressContainerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginTop: 'auto'
};

const progressTextStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px'
};

const progressLabelStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#9CA3AF'
};

const progressValueStyle: React.CSSProperties = {
  fontSize: '14px',
  fontWeight: '600',
  color: '#1F2937'
};

const progressRingStyle: React.CSSProperties = {
  flexShrink: 0
};

export default CourseCard;

// Add hover effect via style injection
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  a[style*="280px"]:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1) !important;
  }
`;
document.head.appendChild(styleSheet);
