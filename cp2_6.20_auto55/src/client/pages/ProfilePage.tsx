import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api, type Activity, type Volunteer } from '../api';
import { useAuth, AUTH_LEVEL_COLORS } from '../App';

const BADGE_INFO: Record<number, { icon: string; name: string; desc: string; color: string }> = {
  10: { icon: '🌱', name: '初心徽章', desc: '累计10小时', color: '#22C55E' },
  50: { icon: '🌟', name: '热心徽章', desc: '累计50小时', color: '#3B82F6' },
  100: { icon: '👑', name: '卓越徽章', desc: '累计100小时', color: '#8B5CF6' },
};

function ProgressRing({ hours, maxHours = 200, size = 140 }: { hours: number; maxHours?: number; size?: number }) {
  const [animPct, setAnimPct] = useState(0);
  const thickness = 6;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, (hours / maxHours) * 100);

  useEffect(() => {
    const t = setTimeout(() => setAnimPct(pct), 50);
    return () => clearTimeout(t);
  }, [pct]);

  const offset = circumference - (animPct / 100) * circumference;
  const displayPct = Math.round(animPct);

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="#FEF3C7"
        strokeWidth={thickness}
        fill="transparent"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#grad)"
        strokeWidth={thickness}
        fill="transparent"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.5s ease-out' }}
      />
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#8B5CF6" />
        </linearGradient>
      </defs>
      <g transform={`rotate(90, ${size / 2}, ${size / 2})`}>
        <text
          x="50%"
          y="46%"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: 24, fontWeight: 800, fill: '#292524' }}
        >{hours}</text>
        <text
          x="50%"
          y="62%"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: 11, fill: '#78716C', fontWeight: 500 }}
        >累计小时</text>
        <text
          x="50%"
          y="80%"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{ fontSize: 10, fill: '#A8A29E' }}
        >{displayPct}%</text>
      </g>
    </svg>
  );
}

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<'registered' | 'history'>('registered');
  const [slideDir, setSlideDir] = useState(0);
  const [registeredActs, setRegisteredActs] = useState<Activity[]>([]);
  const [servedActs, setServedActs] = useState(user?.servedActivities || []);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    api.getActivities().then(acts => {
      const reg = acts.filter(a => user.registeredActivities.includes(a.id));
      setRegisteredActs(reg);
      setServedActs(user.servedActivities);
    }).finally(() => setLoading(false));
  }, [user, navigate]);

  const switchTab = (newTab: typeof tab) => {
    if (newTab === tab) return;
    setSlideDir(newTab === 'history' ? 1 : -1);
    setTab(newTab);
  };

  if (!user) return null;
  const borderColor = AUTH_LEVEL_COLORS[user.authLevel] || '#F59E0B';

  return (
    <div>
      <div className="profile-grid" style={{
        display: 'grid',
        gridTemplateColumns: '340px 1fr',
        gap: 24,
      }}>
        <div style={{
          background: '#FFF',
          borderRadius: 16,
          padding: 28,
          boxShadow: '0 2px 12px rgba(245, 158, 11, 0.06)',
          animation: 'fadeUp 0.3s ease-out both',
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <div style={{ position: 'relative', marginBottom: 14 }}>
              <ProgressRing hours={user.totalHours} />
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) translateY(-4px)',
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#FFF',
                border: `2px solid ${borderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 30,
                boxShadow: `0 0 0 4px ${borderColor}15`,
              }}>{user.avatar}</div>
            </div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#292524' }}>{user.nickname}</h2>
            <div style={{ fontSize: 13, color: '#78716C', marginTop: 4 }}>{user.email}</div>
            <div style={{
              marginTop: 10,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 12px',
              borderRadius: 20,
              background: `${borderColor}15`,
              color: borderColor,
              fontSize: 12,
              fontWeight: 600,
            }}>
              <span>Lv.{user.authLevel}</span>
              <span>认证志愿者</span>
            </div>
          </div>

          <div style={{ height: 1, background: '#F5F5F4', margin: '16px 0' }} />

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#57534E', marginBottom: 10 }}>💡 获得的徽章</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {[10, 50, 100].map(h => {
                const got = user.badges.includes(h);
                const info = BADGE_INFO[h];
                return (
                  <div key={h} style={{
                    width: 64,
                    padding: 10,
                    borderRadius: 12,
                    background: got ? `${info.color}12` : '#FAFAF9',
                    textAlign: 'center',
                    opacity: got ? 1 : 0.4,
                    filter: got ? 'none' : 'grayscale(0.6)',
                  }}>
                    <div style={{ fontSize: 26 }}>{info.icon}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: '#44403C', marginTop: 4 }}>{info.name}</div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#57534E', marginBottom: 8 }}>🎯 技能标签</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {user.skills.length === 0 ? (
                <span style={{ fontSize: 12, color: '#A8A29E' }}>暂无</span>
              ) : user.skills.map(s => (
                <span key={s} style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  background: '#DBEAFE',
                  color: '#1D4ED8',
                  fontWeight: 500,
                }}>{s}</span>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#57534E', marginBottom: 8 }}>⏰ 可服务时段</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {user.availableSlots.length === 0 ? (
                <span style={{ fontSize: 12, color: '#A8A29E' }}>暂无</span>
              ) : user.availableSlots.map(s => (
                <span key={s} style={{
                  padding: '4px 10px',
                  borderRadius: 20,
                  fontSize: 12,
                  background: '#FEF3C7',
                  color: '#92400E',
                  fontWeight: 500,
                }}>{s}</span>
              ))}
            </div>
          </div>
        </div>

        <div style={{
          background: '#FFF',
          borderRadius: 16,
          boxShadow: '0 2px 12px rgba(245, 158, 11, 0.06)',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #F5F5F4',
            padding: '0 8px',
          }}>
            {[
              { key: 'registered', label: '📝 已报名活动', count: registeredActs.length },
              { key: 'history', label: '📜 服务历史', count: servedActs.length },
            ].map(t => (
              <button key={t.key}
                onClick={() => switchTab(t.key as typeof tab)}
                style={{
                  padding: '16px 20px',
                  border: 'none',
                  background: 'transparent',
                  fontSize: 14,
                  fontWeight: tab === t.key ? 700 : 500,
                  color: tab === t.key ? '#F59E0B' : '#78716C',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'color 0.15s',
                }}>
                {t.label}
                <span style={{
                  marginLeft: 6,
                  padding: '1px 8px',
                  borderRadius: 10,
                  fontSize: 11,
                  background: tab === t.key ? '#FEF3C7' : '#F5F5F4',
                  color: tab === t.key ? '#92400E' : '#78716C',
                  fontWeight: 600,
                }}>{t.count}</span>
                <span style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: tab === t.key ? 'linear-gradient(90deg, #F59E0B, #8B5CF6)' : 'transparent',
                  borderRadius: '2px 2px 0 0',
                  transition: 'background 0.2s',
                }} />
              </button>
            ))}
          </div>

          <div ref={containerRef} style={{
            position: 'relative',
            overflow: 'hidden',
            minHeight: 300,
          }}>
            <div style={{
              padding: 20,
              animation: `tabSlide 0.25s ease-out both`,
            }} key={tab}>
              {tab === 'registered' ? (
                loading ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#A8A29E' }}>加载中...</div>
                ) : registeredActs.length === 0 ? (
                  <EmptyState icon="📋" title="还没有报名活动" desc="去活动广场发现感兴趣的活动吧" to="/" btn="浏览活动" />
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {registeredActs.map((act, i) => (
                      <div key={act.id}
                        onClick={() => navigate(`/activity/${act.id}`)}
                        style={{
                          padding: 16,
                          borderRadius: 12,
                          border: '1px solid #F5F5F4',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          animation: `fadeUp 0.3s ease-out ${i * 0.05}s both`,
                          background: '#FFF',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.borderColor = '#FCD34D';
                          e.currentTarget.style.background = '#FFFBEB';
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.borderColor = '#F5F5F4';
                          e.currentTarget.style.background = '#FFF';
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 600,
                              background: act.status === 'ended' ? '#FEE2E2' : act.status === 'upcoming' ? '#FEF3C7' : '#DCFCE7',
                              color: act.status === 'ended' ? '#B91C1C' : act.status === 'upcoming' ? '#92400E' : '#15803D',
                              marginBottom: 8,
                            }}>
                              {act.status === 'recruiting' ? '招募中' : act.status === 'upcoming' ? '即将开始' : '已结束'}
                            </div>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: 15, fontWeight: 700, color: '#292524' }}>{act.name}</h4>
                            <div style={{ fontSize: 13, color: '#78716C', display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                              <span>📍 {act.location}</span>
                              <span>🗓️ {act.dateTime}</span>
                              <span>⏱️ {act.duration}小时</span>
                            </div>
                          </div>
                          <span style={{ color: '#A8A29E', fontSize: 18 }}>→</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : loading ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#A8A29E' }}>加载中...</div>
              ) : servedActs.length === 0 ? (
                <EmptyState icon="📜" title="还没有服务记录" desc="完成签到后，服务记录会出现在这里" />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[...servedActs].reverse().map((s, i) => (
                    <div key={s.activityId + i} style={{
                      padding: 16,
                      borderRadius: 12,
                      border: '1px solid #F5F5F4',
                      background: '#FFF',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      animation: `fadeUp 0.3s ease-out ${i * 0.05}s both`,
                    }}>
                      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                        <div style={{
                          width: 42,
                          height: 42,
                          borderRadius: 12,
                          background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 20,
                        }}>✅</div>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#292524' }}>{s.activityName}</div>
                          <div style={{ fontSize: 12, color: '#78716C', marginTop: 3 }}>📅 {s.date}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 20, fontWeight: 800, color: '#F59E0B' }}>+{s.hours}</div>
                        <div style={{ fontSize: 11, color: '#78716C' }}>小时</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes tabSlide {
          from { opacity: 0; transform: translateX(${slideDir * 20}px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}

function EmptyState({ icon, title, desc, to, btn }: { icon: string; title: string; desc: string; to?: string; btn?: string }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '50px 20px',
    }}>
      <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.6 }}>{icon}</div>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#57534E', marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: '#A8A29E', marginBottom: 20 }}>{desc}</div>
      {to && (
        <Link to={to} style={{
          display: 'inline-block',
          padding: '9px 20px',
          background: 'linear-gradient(135deg, #F59E0B, #D97706)',
          color: '#FFF',
          borderRadius: 8,
          textDecoration: 'none',
          fontSize: 13,
          fontWeight: 600,
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
        }}>{btn}</Link>
      )}
    </div>
  );
}
