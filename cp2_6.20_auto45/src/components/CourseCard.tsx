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
  const isAlmostFull = course.remaining > 0 && course.remaining < 5;
  const isAvailable = course.remaining >= 5;

  let statusConfig;
  if (isFull) {
    statusConfig = {
      dot: '#E53935',
      bg: 'rgba(229,57,53,0.1)',
      text: '#C62828',
      label: '已满员',
      pulse: false
    };
  } else if (isAlmostFull) {
    statusConfig = {
      dot: '#FF8C00',
      bg: 'rgba(255,140,0,0.12)',
      text: '#E65100',
      label: '即将满员',
      pulse: true
    };
  } else {
    statusConfig = {
      dot: '#6B8E23',
      bg: 'rgba(107,142,35,0.1)',
      text: '#558B2F',
      label: '名额充足',
      pulse: false
    };
  }

  const difficultyMap: Record<string, { level: number; label: string }> = {
    '入门': { level: 1, label: '入门' },
    '初级': { level: 2, label: '初级' },
    '中级': { level: 3, label: '中级' },
    '高级': { level: 4, label: '高级' }
  };
  const diffInfo = difficultyMap[course.difficulty] || { level: 2, label: course.difficulty };
  const maxHammers = 4;

  const stars = course.avgRating > 0 ? (
    <span style={{ color: '#FFB300', fontSize: '13px' }}>
      {'★'.repeat(Math.round(course.avgRating))}
      <span style={{ color: '#E0E0E0' }}>{'★'.repeat(5 - Math.round(course.avgRating))}</span>
    </span>
  ) : (
    <span style={{ color: '#BDBDBD', fontSize: '12px' }}>暂无评分</span>
  );

  const progressColor = isFull
    ? '#E53935'
    : isAlmostFull
    ? 'linear-gradient(90deg, #FF8C00, #FF6F00)'
    : 'linear-gradient(90deg, #8BC34A, #6B8E23)';
  const progressBg = isFull
    ? 'rgba(229,57,53,0.06)'
    : isAlmostFull
    ? 'rgba(255,152,0,0.06)'
    : 'rgba(107,142,35,0.06)';

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
        gap: '14px',
        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '0 2px 12px rgba(139,69,19,0.08)',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-6px) scale(1.01)';
        e.currentTarget.style.boxShadow = '0 12px 28px rgba(139,69,19,0.18), 0 4px 10px rgba(139,69,19,0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)';
        e.currentTarget.style.boxShadow = '0 2px 12px rgba(139,69,19,0.08)';
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
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

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: '20px',
            background: statusConfig.bg,
            position: 'relative'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: statusConfig.dot,
              boxShadow: statusConfig.pulse ? `0 0 0 3px ${statusConfig.dot}20` : 'none',
              animation: statusConfig.pulse ? 'statusPulse 1.5s ease-in-out infinite' : 'none',
              flexShrink: 0
            }}
          />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: statusConfig.text,
              whiteSpace: 'nowrap'
            }}
          >
            {statusConfig.label}
          </span>
        </div>
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
          background: progressBg
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: isFull ? '#C62828' : isAlmostFull ? '#E65100' : '#6B8E23'
            }}
          >
            {isFull ? '名额已满' : `剩余 ${course.remaining} 名`}
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
              background: progressColor,
              transition: 'width 0.3s ease'
            }}
          />
        </div>
      </div>

      <div
        style={{
          padding: '10px 12px',
          borderRadius: '8px',
          background: 'rgba(139,69,19,0.04)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <span style={{ fontSize: '12px', color: '#8D6E63', fontWeight: 500 }}>
          难度等级
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#5D4037', marginRight: '4px' }}>
            {diffInfo.label}
          </span>
          <div style={{ display: 'flex', gap: '2px' }}>
            {Array.from({ length: maxHammers }).map((_, idx) => (
              <span
                key={idx}
                style={{
                  fontSize: '14px',
                  opacity: idx < diffInfo.level ? 1 : 0.25,
                  filter: idx < diffInfo.level ? 'none' : 'grayscale(0.8)',
                  transform: idx < diffInfo.level ? 'none' : 'scale(0.9)',
                  transition: 'all 0.2s ease'
                }}
              >
                🔨
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '4px', borderTop: '1px solid rgba(139,69,19,0.06)' }}>
        <div>{stars}</div>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#D2691E' }}>
          ¥{course.price}
        </div>
      </div>

      <style>{`
        @keyframes statusPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,140,0,0.4); }
          50% { box-shadow: 0 0 0 4px rgba(255,140,0,0); }
        }
      `}</style>
    </div>
  );
}
