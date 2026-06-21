import React from 'react';
import { useNavigate } from 'react-router-dom';
import './CourseCard.css';

export interface CourseCardProps {
  id: string;
  title: string;
  coverImage: string;
  instructorName: string;
  progress: number;
}

const getProgressColor = (progress: number): string => {
  if (progress <= 33) return '#EF4444';
  if (progress <= 66) return '#F59E0B';
  return '#10B981';
};

const CourseCard: React.FC<CourseCardProps> = ({ id, title, coverImage, instructorName, progress }) => {
  const navigate = useNavigate();
  const color = getProgressColor(progress);
  const circumference = 2 * Math.PI * 16;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div
      className="course-card"
      onClick={() => navigate(`/course/${id}`)}
      style={{ cursor: 'pointer' }}
    >
      <div className="course-card-cover">
        <img src={coverImage} alt={title} />
      </div>
      <div className="course-card-info">
        <div className="course-card-title" title={title}>{title}</div>
        <div className="course-card-instructor">
          <span className="instructor-dot" />
          <span>{instructorName}</span>
        </div>
        <div className="course-card-bottom">
          <span className="progress-label">课程进度</span>
          <div className="progress-ring-wrapper">
            <svg className="progress-ring" width="36" height="36">
              <circle
                className="progress-ring-bg"
                strokeWidth="4"
                fill="transparent"
                r="16"
                cx="18"
                cy="18"
              />
              <circle
                className="progress-ring-bar"
                strokeWidth="4"
                fill="transparent"
                r="16"
                cx="18"
                cy="18"
                stroke={color}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
              />
              <text
                className="progress-ring-text"
                x="18"
                y="18"
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="11"
                fontWeight="600"
                fill={color}
              >
                {progress}%
              </text>
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseCard;
