import { useState, useEffect } from 'react';
import { api, type RankingItem } from '../api';
import { AUTH_LEVEL_COLORS } from '../App';

const BADGE_ICONS: Record<number, string> = { 10: '🌱', 50: '🌟', 100: '👑' };
const TROPHY_ICONS = ['🥇', '🥈', '🥉'];
const TROPHY_COLORS = ['#F59E0B', '#9CA3AF', '#B45309'];
const TROPHY_BG = ['#FEF3C7', '#F3F4F6', '#FEF3C7'];

export default function RankingPage() {
  const [ranking, setRanking] = useState<RankingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getRanking()
      .then(setRanking)
      .finally(() => setLoading(false));
  }, []);

  const totalHours = ranking.reduce((s, r) => s + r.totalHours, 0);
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{
        background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 50%, #8B5CF6 100%)',
        borderRadius: 20,
        padding: '32px 36px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -20, top: -10, fontSize: 160, opacity: 0.1 }}>🏆</div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{ margin: 0, color: '#FFF', fontSize: 26, fontWeight: 800, marginBottom: 6 }}>🏆 服务排行榜</h1>
          <p style={{ margin: 0, color: '#FFFBEB', fontSize: 14, opacity: 0.9 }}>
            共 {ranking.length} 位志愿者 · 累计服务 {totalHours} 小时
          </p>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#A8A29E' }}>加载中...</div>
      ) : ranking.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 80, color: '#A8A29E', background: '#FFF', borderRadius: 16 }}>
          暂无志愿者数据
        </div>
      ) : (
        <>
          {top3.length > 0 && (
            <div style={{
              background: '#FFF',
              borderRadius: 16,
              padding: '28px 20px',
              marginBottom: 20,
              boxShadow: '0 2px 12px rgba(245, 158, 11, 0.06)',
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: 28,
                alignItems: 'flex-end',
                padding: '10px 0 20px',
              }}>
                {[1, 0, 2].map(pos => {
                  const item = top3[pos];
                  if (!item) return <div key={pos} style={{ width: 120 }} />;
                  const order = [1, 0, 2];
                  const rankIdx = order[pos];
                  const heights = [72, 108, 56];
                  return (
                    <div key={item.id} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 10,
                      width: 120,
                      animation: `fadeUp 0.3s ease-out ${pos * 0.1}s both`,
                    }}>
                      <div style={{
                        fontSize: 40,
                        animation: 'trophyIn 0.5s ease-out both',
                        animationDelay: `${pos * 0.08 + 0.1}s`,
                      }}>{TROPHY_ICONS[rankIdx]}</div>
                      <div style={{
                        width: 68,
                        height: 68,
                        borderRadius: '50%',
                        border: `3px solid ${AUTH_LEVEL_COLORS[item.authLevel] || '#F59E0B'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 30,
                        background: '#FFFBEB',
                        boxShadow: '0 6px 16px rgba(0,0,0,0.08)',
                      }}>{item.avatar}</div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontWeight: 700, fontSize: 15, color: '#292524' }}>{item.nickname}</div>
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 2,
                          marginTop: 4,
                          padding: '2px 8px',
                          borderRadius: 8,
                          background: TROPHY_BG[rankIdx],
                          color: TROPHY_COLORS[rankIdx],
                          fontSize: 13,
                          fontWeight: 700,
                        }}>⏱ {item.totalHours}h</div>
                      </div>
                      <div style={{
                        width: '100%',
                        height: heights[rankIdx],
                        background: `linear-gradient(180deg, ${rankIdx === 1 ? '#FCD34D' : rankIdx === 0 ? '#D1D5DB' : '#FBBF24'}, ${rankIdx === 1 ? '#F59E0B' : rankIdx === 0 ? '#9CA3AF' : '#D97706'})`,
                        borderRadius: '14px 14px 0 0',
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        paddingTop: 14,
                        fontWeight: 800,
                        fontSize: 28,
                        color: '#FFF',
                        textShadow: '0 2px 4px rgba(0,0,0,0.2)',
                      }}>{rankIdx + 1}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{
            background: '#FFF',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 2px 12px rgba(245, 158, 11, 0.06)',
          }}>
            <div style={{
              padding: '14px 24px',
              background: '#FAFAF9',
              borderBottom: '1px solid #F5F5F4',
              display: 'grid',
              gridTemplateColumns: '56px 1fr 120px 100px',
              alignItems: 'center',
              fontSize: 12,
              fontWeight: 600,
              color: '#78716C',
            }}>
              <div>排名</div>
              <div>志愿者</div>
              <div style={{ textAlign: 'center' }}>服务时长</div>
              <div style={{ textAlign: 'right' }}>徽章</div>
            </div>

            {rest.length === 0 && top3.length === ranking.length ? (
              <div style={{ padding: 30, textAlign: 'center', color: '#A8A29E', fontSize: 13 }}>
                — 暂无更多排名 —
              </div>
            ) : (
              rest.map((item, i) => (
                <div key={item.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '56px 1fr 120px 100px',
                  alignItems: 'center',
                  padding: '14px 24px',
                  borderBottom: i < rest.length - 1 ? '1px solid #FAFAF9' : 'none',
                  transition: 'background 0.15s',
                  animation: `fadeUp 0.3s ease-out ${i * 0.03 + 0.2}s both`,
                  cursor: 'pointer',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#FFFBEB')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: i < 7 ? '#FEF3C7' : '#F5F5F4',
                    color: i < 7 ? '#B45309' : '#78716C',
                    fontWeight: 700,
                    fontSize: 14,
                  }}>{item.rank}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      border: `2px solid ${AUTH_LEVEL_COLORS[item.authLevel] || '#F59E0B'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      background: '#FFF',
                    }}>{item.avatar}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#292524' }}>{item.nickname}</div>
                      {item.skills.length > 0 && (
                        <div style={{
                          marginTop: 2,
                          fontSize: 11,
                          color: '#78716C',
                          display: 'flex',
                          gap: 4,
                          flexWrap: 'wrap',
                          maxWidth: 240,
                          overflow: 'hidden',
                        }}>
                          {item.skills.slice(0, 3).map(s => (
                            <span key={s} style={{
                              padding: '1px 6px',
                              borderRadius: 4,
                              background: '#EFF6FF',
                              color: '#1D4ED8',
                            }}>{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: '#F59E0B' }}>{item.totalHours}</div>
                    <div style={{ fontSize: 10, color: '#A8A29E' }}>小时</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 16 }}>
                    {item.badges.map(b => BADGE_ICONS[b] || '⭐').join('')}
                    {item.badges.length === 0 && <span style={{ opacity: 0.25 }}>—</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
