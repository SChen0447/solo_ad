import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchUserEnrollments, getTypeColor } from '../api';
import type { Enrollment, Badge } from '../api';

export default function UserProfile() {
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [badges, setBadges] = useState<Badge[]>([]);
  const [completedCount, setCompletedCount] = useState(0);
  const [totalEnrolled, setTotalEnrolled] = useState(0);
  const [hoveredBadge, setHoveredBadge] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await fetchUserEnrollments();
      setEnrollments(data.enrollments);
      setBadges(data.badges);
      setCompletedCount(data.completedCount);
      setTotalEnrolled(data.totalEnrolled);
    } catch (err) {
      console.error('加载用户数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="fade-in">
      <div
        className="card"
        style={{
          padding: '32px',
          marginBottom: '24px',
          background: 'linear-gradient(135deg, #FFF8EC 0%, #FFFFFF 60%, #FFF3E0 100%)'
        }}
      >
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', alignItems: 'center' }}>
          <div
            style={{
              width: '96px',
              height: '96px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #D2691E, #FF8C00)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '42px',
              boxShadow: '0 6px 20px rgba(210,105,30,0.3)',
              flexShrink: 0
            }}
          >
            🧑‍🎨
          </div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#3E2723', marginBottom: '6px' }}>
              手工爱好者
            </h2>
            <p style={{ color: '#6D4C41', marginBottom: '14px' }}>
              在手工艺的世界里不断探索和创造 ✨
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
              {[
                { label: '已报名课程', value: totalEnrolled, icon: '📚', color: '#D2691E' },
                { label: '已完成课程', value: completedCount, icon: '✅', color: '#6B8E23' },
                { label: '获得徽章', value: badges.length, icon: '🏅', color: '#FF8C00' }
              ].map((stat, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '24px' }}>{stat.icon}</span>
                  <div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
                    <div style={{ fontSize: '12px', color: '#8D6E63' }}>{stat.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div
        className="card"
        style={{
          padding: '28px',
          marginBottom: '24px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#5D4037' }}>
            🏅 我的成就徽章
          </h3>
          <div style={{ fontSize: '12px', color: '#8D6E63' }}>
            完成更多课程解锁更多徽章
          </div>
        </div>

        {badges.length > 0 ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px' }}>
            {badges.map(badge => (
              <div
                key={badge.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  cursor: 'pointer',
                  position: 'relative'
                }}
                onMouseEnter={() => setHoveredBadge(badge.id)}
                onMouseLeave={() => setHoveredBadge(null)}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: `linear-gradient(135deg, ${badge.color}, ${badge.color}CC)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '36px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
                    transition: 'all 0.2s ease',
                    transform: hoveredBadge === badge.id ? 'scale(1.08)' : 'scale(1)',
                    border: '3px solid white',
                    outline: `2px solid ${badge.color}40`
                  }}
                >
                  {badge.id === 'novice' ? '🌱' : '🎖️'}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#5D4037', textAlign: 'center' }}>
                  {badge.name}
                </div>
                {hoveredBadge === badge.id && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 'calc(100% + 8px)',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      padding: '10px 14px',
                      background: '#3E2723',
                      color: 'white',
                      fontSize: '12px',
                      borderRadius: '8px',
                      whiteSpace: 'nowrap',
                      zIndex: 10,
                      boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                      animation: 'fadeIn 0.2s ease'
                    }}
                  >
                    {badge.description}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        border: '6px solid transparent',
                        borderBottomColor: '#3E2723'
                      }}
                    />
                  </div>
                )}
              </div>
            ))}

            {[3, 5].filter(threshold => !badges.some(b => {
              if (threshold === 3) return b.id === 'novice';
              if (threshold === 5) return b.id === 'skilled';
              return false;
            })).map(threshold => (
              <div
                key={`locked-${threshold}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px',
                  opacity: 0.5
                }}
              >
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: '#EFEBE0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    border: '2px dashed #BCAAA4'
                  }}
                >
                  🔒
                </div>
                <div style={{ fontSize: '12px', color: '#8D6E63', textAlign: 'center', maxWidth: '100px' }}>
                  完成{threshold}门课程解锁
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ padding: '24px', textAlign: 'center', color: '#8D6E63' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎖️</div>
            <div style={{ fontSize: '15px', marginBottom: '8px', color: '#5D4037', fontWeight: 600 }}>
              还没有获得徽章
            </div>
            <div style={{ fontSize: '13px' }}>
              完成 3 门课程即可获得「新手手工艺人」徽章，加油！
            </div>
          </div>
        )}
      </div>

      <div
        className="card"
        style={{
          padding: '28px'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#5D4037' }}>
            📚 我的学习历程
          </h3>
          <span style={{ fontSize: '13px', color: '#8D6E63' }}>
            共 {enrollments.length} 门课程
          </span>
        </div>

        {enrollments.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {enrollments.map((enrollment, idx) => {
              const course = enrollment.course;
              if (!course) return null;
              const typeColor = getTypeColor(course.type);

              return (
                <div
                  key={enrollment.id}
                  onClick={() => navigate(`/course/${course.id}`)}
                  style={{
                    padding: '20px',
                    borderRadius: '12px',
                    background: 'rgba(245,240,225,0.4)',
                    borderLeft: `4px solid ${typeColor}`,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    animation: `fadeIn 0.4s ease ${idx * 0.05}s both`,
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '16px',
                    alignItems: 'center'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.background = 'rgba(245,240,225,0.7)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(139,69,19,0.1)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.background = 'rgba(245,240,225,0.4)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '12px',
                      background: `linear-gradient(135deg, ${typeColor}20, ${typeColor}40)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '28px',
                      flexShrink: 0
                    }}
                  >
                    {course.type === '陶艺' ? '🏺' :
                     course.type === '编织' ? '🧶' :
                     course.type === '木工' ? '🪵' :
                     course.type === '刺绣' ? '🪡' :
                     course.type === '皮具' ? '👜' : '🧁'}
                  </div>

                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 600,
                          color: 'white',
                          background: typeColor
                        }}
                      >
                        {course.type}
                      </span>
                      {enrollment.courseEnded ? (
                        <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(158,158,158,0.15)', color: '#616161' }}>
                          已结束
                        </span>
                      ) : (
                        <span style={{ fontSize: '12px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(76,175,80,0.12)', color: '#2E7D32' }}>
                          进行中
                        </span>
                      )}
                    </div>
                    <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#3E2723', marginBottom: '6px' }}>
                      {course.title}
                    </h4>
                    <div style={{ fontSize: '13px', color: '#6D4C41', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                      <span>📅 {course.date}</span>
                      <span>🕐 {course.time}</span>
                      <span>📍 {course.location}</span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    {enrollment.hasFeedback && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          background: 'rgba(76,175,80,0.12)',
                          borderRadius: '20px',
                          color: '#2E7D32',
                          fontSize: '13px',
                          fontWeight: 600
                        }}
                        title="已提交反馈"
                      >
                        <span style={{ fontSize: '16px' }}>✅</span>
                        已评价
                      </div>
                    )}
                    {enrollment.courseEnded && !enrollment.hasFeedback && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 12px',
                          background: 'rgba(255,152,0,0.12)',
                          borderRadius: '20px',
                          color: '#E65100',
                          fontSize: '13px',
                          fontWeight: 600
                        }}
                      >
                        <span style={{ fontSize: '16px' }}>✍️</span>
                        待评价
                      </div>
                    )}
                    <div
                      style={{
                        fontSize: '20px',
                        color: '#BCAAA4',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      →
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: '40px 24px', textAlign: 'center', color: '#8D6E63' }}>
            <div style={{ fontSize: '64px', marginBottom: '16px' }}>📖</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#5D4037', marginBottom: '8px' }}>
              还没有报名任何课程
            </div>
            <div style={{ fontSize: '14px', marginBottom: '20px' }}>
              现在就去探索有趣的手工艺课程吧！
            </div>
            <Link to="/" className="btn btn-primary">
              🎨 浏览课程
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
