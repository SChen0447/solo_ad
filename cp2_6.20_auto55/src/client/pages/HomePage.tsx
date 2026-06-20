import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, type Activity, type RankingItem } from '../api';
import { useAuth, AUTH_LEVEL_COLORS } from '../App';

const STATUS_COLORS: Record<string, string> = {
  recruiting: '#22C55E',
  upcoming: '#EAB308',
  ended: '#EF4444',
};

const STATUS_TEXT: Record<string, string> = {
  recruiting: '招募中',
  upcoming: '即将开始',
  ended: '已结束',
};

function ActivityCard({ activity, index }: { activity: Activity; index: number }) {
  const navigate = useNavigate();
  const color = STATUS_COLORS[activity.status];
  const pct = Math.min(100, (activity.registeredCount / activity.maxParticipants) * 100);

  return (
    <div
      onClick={() => navigate(`/activity/${activity.id}`)}
      style={{
        width: 300,
        borderRadius: 10,
        background: '#FFFFFF',
        padding: 0,
        overflow: 'hidden',
        position: 'relative',
        cursor: 'pointer',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(245, 158, 11, 0.06)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        animation: `fadeUp 0.3s ease-out ${index * 0.05}s both`,
      }}
      onMouseEnter={e => {
        e.currentTarget.style.transform = 'translateY(-5px)';
        e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.08), 0 16px 40px rgba(245, 158, 11, 0.15)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.04), 0 8px 24px rgba(245, 158, 11, 0.06)';
      }}
    >
      <div style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
        background: color,
      }} />
      <div style={{ padding: '18px 20px 20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
          <span style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            color,
            background: `${color}15`,
          }}>{STATUS_TEXT[activity.status]}</span>
          <span style={{ fontSize: 13, color: '#78716C', fontWeight: 500 }}>
            {activity.duration}小时
          </span>
        </div>
        <h3 style={{
          margin: '0 0 10px 0',
          fontSize: 16,
          fontWeight: 700,
          color: '#292524',
          lineHeight: 1.4,
          minHeight: 44,
        }}>{activity.name}</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#78716C', fontSize: 13 }}>
          <span>📍</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{activity.location}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14, color: '#78716C', fontSize: 13 }}>
          <span>🗓️</span>
          <span>{activity.dateTime}</span>
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#78716C', marginBottom: 6 }}>
            <span>报名人数</span>
            <span style={{ fontWeight: 600, color: pct >= 100 ? '#EF4444' : '#44403C' }}>
              {activity.registeredCount} / {activity.maxParticipants}
            </span>
          </div>
          <div style={{
            height: 6,
            background: '#F5F5F4',
            borderRadius: 3,
            overflow: 'hidden',
          }}>
            <div style={{
              height: '100%',
              width: `${pct}%`,
              background: pct >= 100 ? '#EF4444' : color,
              borderRadius: 3,
              transition: 'width 0.4s ease',
            }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TopRanking({ items }: { items: RankingItem[] }) {
  return (
    <div style={{
      display: 'flex',
      gap: 12,
      justifyContent: 'center',
      padding: '20px 0',
      alignItems: 'flex-end',
    }}>
      {[1, 0, 2].map(pos => {
        const item = items[pos];
        if (!item) return <div key={pos} style={{ width: 100 }} />;
        const medals = ['🥇', '🥈', '🥉'];
        const heights = [120, 80, 60];
        const colors = ['#FCD34D', '#D1D5DB', '#FCD9B6'];
        const order = [1, 0, 2];
        const idx = order[pos];
        return (
          <Link to={item ? `/profile` : '#'} key={pos} style={{ textDecoration: 'none', color: 'inherit' }}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}>
              <div style={{
                fontSize: 40,
                animation: 'trophyIn 0.5s ease-out both',
                animationDelay: `${pos * 0.1}s`,
              }}>{medals[idx]}</div>
              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: `3px solid ${AUTH_LEVEL_COLORS[item.authLevel] || '#F59E0B'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 26,
                background: '#FFF',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}>{item.avatar}</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#292524' }}>{item.nickname}</div>
                <div style={{ fontSize: 12, color: '#78716C', marginTop: 2 }}>{item.totalHours}小时</div>
              </div>
              <div style={{
                width: 96,
                height: heights[idx],
                background: `linear-gradient(180deg, ${colors[idx]}, ${colors[idx]}99)`,
                borderRadius: '12px 12px 0 0',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'center',
                paddingTop: 10,
                fontWeight: 800,
                fontSize: 24,
                color: '#78350F',
                opacity: 0.8,
              }}>{idx + 1}</div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}

export default function HomePage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'recruiting' | 'upcoming' | 'ended'>('all');
  const { user } = useAuth();

  useEffect(() => {
    Promise.all([api.getActivities(), api.getRanking()])
      .then(([acts, ranks]) => {
        setActivities(acts);
        setRanking(ranks);
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? activities : activities.filter(a => a.status === filter);
  const stats = {
    total: activities.length,
    recruiting: activities.filter(a => a.status === 'recruiting').length,
    volunteers: ranking.length,
    hours: ranking.reduce((s, r) => s + r.totalHours, 0),
  };

  return (
    <div>
      <section style={{
        background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #FCD34D 100%)',
        borderRadius: 20,
        padding: '40px 40px 36px',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute',
          right: -40,
          top: -40,
          fontSize: 200,
          opacity: 0.1,
          userSelect: 'none',
        }}>❤️</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            margin: 0,
            color: '#7C2D12',
            fontSize: 30,
            fontWeight: 800,
            marginBottom: 8,
          }}>欢迎来到志愿者社区 🤝</h1>
          <p style={{
            margin: 0,
            color: '#92400E',
            fontSize: 15,
            opacity: 0.9,
            maxWidth: 560,
            lineHeight: 1.7,
          }}>
            {user ? `你好，${user.nickname}！一起用爱心温暖社区吧。` : '加入我们的志愿者大家庭，让社区因你更美好。'}
          </p>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            marginTop: 24,
          }} className="hero-stats">
            {[
              { label: '活动总数', value: stats.total, icon: '📋' },
              { label: '招募中', value: stats.recruiting, icon: '🎯' },
              { label: '志愿者', value: stats.volunteers, icon: '👥' },
              { label: '累计服务', value: `${stats.hours}h`, icon: '⏱️' },
            ].map((s, i) => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.3)',
                backdropFilter: 'blur(8px)',
                borderRadius: 12,
                padding: '14px 16px',
                animation: `fadeUp 0.3s ease-out ${0.1 + i * 0.05}s both`,
              }}>
                <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#7C2D12' }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#92400E', opacity: 0.85 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{
        background: '#FFFFFF',
        borderRadius: 16,
        padding: '16px 24px 24px',
        marginBottom: 28,
        boxShadow: '0 2px 12px rgba(245, 158, 11, 0.06)',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 4,
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#292524' }}>
            🏆 服务明星榜 TOP3
          </h2>
          <Link to="/ranking" style={{
            color: '#F59E0B',
            textDecoration: 'none',
            fontSize: 13,
            fontWeight: 600,
          }}>查看完整排行 →</Link>
        </div>
        <TopRanking items={ranking} />
      </section>

      <section>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 18,
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#292524' }}>
            📋 所有活动
          </h2>
          <div style={{
            display: 'flex',
            gap: 6,
            background: '#FFF',
            padding: 4,
            borderRadius: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}>
            {[
              { key: 'all', label: '全部' },
              { key: 'recruiting', label: '招募中' },
              { key: 'upcoming', label: '即将开始' },
              { key: 'ended', label: '已结束' },
            ].map(f => (
              <button key={f.key}
                onClick={() => setFilter(f.key as typeof filter)}
                style={{
                  padding: '7px 14px',
                  borderRadius: 8,
                  border: 'none',
                  background: filter === f.key ? 'linear-gradient(135deg, #F59E0B, #D97706)' : 'transparent',
                  color: filter === f.key ? '#FFF' : '#57534E',
                  fontWeight: filter === f.key ? 600 : 500,
                  fontSize: 13,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>{f.label}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#A8A29E' }}>加载中...</div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 60,
            background: '#FFF',
            borderRadius: 16,
            color: '#A8A29E',
          }}>暂无活动</div>
        ) : (
          <div className="cards-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 20,
            justifyContent: 'start',
          }}>
            {filtered.map((act, i) => (
              <ActivityCard key={act.id} activity={act} index={i} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
