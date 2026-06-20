import { useNavigate } from 'react-router-dom';
import type { Course } from '../api';
import { getTypeColor } from '../api';

interface CourseCardProps {
  course: Course;
}

export default function CourseCard({ course }: CourseCardProps) {
  const navigate = useNavigate();
  const typeColor = getTypeColor(course.type);
  const isFull = course.remaining <= 0;
  const remainingRatio = course.remaining / course.capacity;
  const isLow = remainingRatio < 0.2 && !isFull;

  const stars = course.avgRating > 0 ? (
    <span style={{ color: '#FFB300', fontSize: '13px' }}>
      {'★'.repeat(Math.round(course.avgRating))}
      <span style={{ color: '#E0E0E0' }}>{'★'.repeat(5 - Math.round(course.avgRating))}</span>
    </span>
  ) : (
    <span style={{ color: '#BDBDBD', fontSize: '12px' }}>暂无评分</span>
  );

  return (
    <div
      className="course-card"
      onClick={() => navigate(`/course/${course.id}`)}
      style={{
        width: '300px',
        minWidth: '300px',
        borderRadius: '12px',
        background: `linear-gradient(135deg, #FAF6EC 0%, #FFFFFF 100%)`,
        borderLeft: `4px solid ${typeColor}`,
        padding: '20px',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 12px rgba(139,69,19,0.08)',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 8px 24px rgba(139,69,19,0.15)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(139,69,19,0.08)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'white',
            background: typeColor
          }}
        >
          {course.type}
        </span>
        <span
          style={{
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            background: 'rgba(107,142,35,0.1)',
            color: '#6B8E23'
          }}
        >
          {course.difficulty}
        </span>
      </div>

      <h3
        style={{
          fontSize: '17px',
          fontWeight: 700,
          color: '#3E2723',
          lineHeight: 1.4,
          minHeight: '48px'
        }}
      >
        {course.title}
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', color: '#5D4037' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📅</span>
          <span>{course.date}</span>
          <span style={{ opacity: 0.6 }}>|</span>
          <span>🕐 {course.time}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📍</span>
          <span>{course.location}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>👨‍🏫</span>
          <span>{course.instructor}</span>
        </div>
      </div>

      <div
        style={{
          padding: '10px 12px',
          borderRadius: '8px',
          background: isFull ? 'rgba(229,57,53,0.06)' : isLow ? 'rgba(255,152,0,0.06)' : 'rgba(107,142,35,0.06)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: isFull ? '#C62828' : isLow ? '#E65100' : '#6B8E23'
            }}
          >
            {isFull ? '名额已满' : isLow ? '名额紧张' : `剩余 ${course.remaining} 名`}
          </span>
          <span style={{ fontSize: '12px', color: '#8D6E63' }}>
            {course.enrolled}/{course.capacity}
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: '6px',
            borderRadius: '3px',
            background: '#EFEBE0',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              height: '100%',
              width: `${(course.enrolled / course.capacity) * 100}%`,
              borderRadius: '3px',
              background: isFull
                ? '#E53935'
                : isLow
                ? 'linear-gradient(90deg, #FF8C00, #FF6F00)'
                : 'linear-gradient(90deg, #8BC34A, #6B8E23)',
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
        <div>{stars}</div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#D2691E' }}>
          ¥{course.price}
        </div>
      </div>
    </div>
  );
}
