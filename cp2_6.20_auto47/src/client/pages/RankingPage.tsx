import { useEffect, useState } from 'react';
import { userApi } from '../api';
import { RankingUser, BADGE_CONFIGS, getAuthLevelGradient } from '../types';

const TROPHY_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const TROPHY_ICONS = ['🥇', '🥈', '🥉'];

export default function RankingPage() {
  const [rankings, setRankings] = useState<RankingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleItems, setVisibleItems] = useState<number[]>([]);

  useEffect(() => {
    loadRankings();
  }, []);

  const loadRankings = async () => {
    try {
      const res = await userApi.getRanking();
      if (res.success && res.data) {
        setRankings(res.data);
        res.data.forEach((_, idx) => {
          setTimeout(() => {
            setVisibleItems(prev => [...prev, idx]);
          }, idx * 100);
        });
      }
    } catch (e) {
      console.error('Failed to load rankings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">服务排行榜</h1>
        <p className="text-gray-500 text-sm">致敬每一位默默奉献的志愿者</p>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-[10px] h-16 shadow-sm" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {rankings.map((user, index) => {
            const isVisible = visibleItems.includes(index);
            const isTop3 = index < 3;

            return (
              <div
                key={user.id}
                className="bg-white rounded-[10px] shadow-sm p-4 flex items-center gap-4 animate-fade-up"
                style={{
                  animationDelay: `${index * 0.05}s`,
                }}
              >
                <div className="w-10 text-center shrink-0">
                  {isTop3 ? (
                    <span
                      className="inline-block animate-trophy-scale-in"
                      style={{
                        fontSize: '40px',
                        lineHeight: 1,
                        animationDelay: `${index * 0.1 + 0.2}s`,
                        animationFillMode: 'both',
                      }}
                    >
                      {TROPHY_ICONS[index]}
                    </span>
                  ) : (
                    <span className="text-lg font-bold text-gray-300">{index + 1}</span>
                  )}
                </div>

                <img
                  src={user.avatar}
                  alt={user.nickname}
                  className="w-10 h-10 rounded-full object-cover shrink-0"
                  style={{
                    border: `2px solid ${getAuthLevelGradient(user.authLevel)}`,
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-800 truncate">{user.nickname}</span>
                    {user.badges.length > 0 && (
                      <div className="flex gap-0.5">
                        {user.badges.slice(-2).map((hours) => {
                          const badge = BADGE_CONFIGS.find(b => b.hours === hours);
                          return badge ? (
                            <span key={hours} className="text-xs" title={badge.name}>{badge.icon}</span>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min((user.totalHours / (rankings[0]?.totalHours || 1)) * 100, 100)}%`,
                          background: isTop3
                            ? `linear-gradient(90deg, ${TROPHY_COLORS[index]}, ${TROPHY_COLORS[index]}88)`
                            : 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-lg font-bold text-amber-600">{user.totalHours}</span>
                  <span className="text-xs text-gray-400 ml-1">小时</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && rankings.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">暂无排名数据</p>
        </div>
      )}
    </div>
  );
}
