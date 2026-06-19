import { useState, useEffect } from 'react';
import { BookOpen, Heart, Star, TrendingUp, ChefHat } from 'lucide-react';
import type { UserInfo } from '@/data/recipeData';
import { fetchUserInfo } from '@/data/recipeData';

interface UserCenterProps {
  userId: string;
  onRecipeClick: (id: string) => void;
}

export default function UserCenter({ userId, onRecipeClick }: UserCenterProps) {
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [visibleRecs, setVisibleRecs] = useState(0);

  useEffect(() => {
    loadUser();
  }, [userId]);

  const loadUser = async () => {
    setLoading(true);
    try {
      const data = await fetchUserInfo(userId);
      setUserInfo(data);
      setVisibleRecs(0);
      const recCount = Math.min(data.recommendations.length, 6);
      data.recommendations.forEach((_, i) => {
        if (i < recCount) {
          setTimeout(() => setVisibleRecs(v => v + 1), (i + 1) * 100);
        }
      });
    } catch {}
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-burnt border-t-transparent rounded-full animate-spin" />
          <span className="text-warm-gray text-sm">加载中...</span>
        </div>
      </div>
    );
  }

  if (!userInfo) return null;

  const maxTrend = Math.max(...userInfo.trendData.map(d => d.count), 1);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-4 mb-8">
        <img
          src={userInfo.avatar}
          alt={userInfo.name}
          className="w-16 h-16 rounded-full object-cover ring-3 ring-burnt/20 shadow-md"
        />
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal">{userInfo.name}</h1>
          <p className="text-sm text-warm-gray">烹饪爱好者 · 菜谱分享达人</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-md p-5 flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center">
            <BookOpen size={24} className="text-burnt" />
          </div>
          <div>
            <div className="text-2xl font-bold text-charcoal">{userInfo.stats.publishedCount}</div>
            <div className="text-xs text-warm-gray">发布菜谱</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center">
            <Heart size={24} className="text-red-500" />
          </div>
          <div>
            <div className="text-2xl font-bold text-charcoal">{userInfo.stats.totalLikes}</div>
            <div className="text-xs text-warm-gray">总获赞数</div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-5 flex items-center gap-4 card-hover">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
            <Star size={24} className="fill-amber-400 text-amber-400" />
          </div>
          <div>
            <div className="text-2xl font-bold text-charcoal">{userInfo.stats.averageRating}</div>
            <div className="text-xs text-warm-gray">平均评分</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-burnt" />
          <h2 className="font-display text-lg font-semibold text-charcoal">近30天新增菜谱趋势</h2>
        </div>

        <div className="flex items-end gap-[3px] h-32 sm:h-40">
          {userInfo.trendData.map((day, i) => (
            <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group">
              <div
                className="w-full rounded-t-sm transition-all duration-300 hover:opacity-80 relative"
                style={{
                  height: day.count > 0 ? `${(day.count / maxTrend) * 100}%` : '2px',
                  background: day.count > 0
                    ? 'linear-gradient(to top, #D2691E, #E8945A)'
                    : '#E8DFD0',
                  minHeight: day.count > 0 ? '4px' : '2px',
                }}
              />
              {i % 5 === 0 && (
                <span className="text-[9px] text-warm-gray mt-1 hidden sm:block">
                  {day.date.slice(5)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center gap-2 mb-5">
          <ChefHat size={20} className="text-burnt" />
          <h2 className="font-display text-lg font-semibold text-charcoal">为你推荐</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {userInfo.recommendations.slice(0, 6).map((rec, i) => (
            <div
              key={rec.id}
              onClick={() => onRecipeClick(rec.id)}
              className={`group bg-cream/50 rounded-xl overflow-hidden cursor-pointer card-hover border border-warm-border/50 ${
                i < visibleRecs ? 'animate-float-up' : 'opacity-0'
              }`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="relative overflow-hidden">
                <img
                  src={rec.image}
                  alt={rec.title}
                  loading="lazy"
                  className="w-full h-32 object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>
              <div className="p-3">
                <h3 className="font-display text-sm font-semibold text-charcoal mb-1.5 truncate">{rec.title}</h3>
                <div className="flex items-center gap-2">
                  <img src={rec.authorAvatar} alt={rec.author} className="w-5 h-5 rounded-full object-cover" />
                  <span className="text-xs text-warm-gray truncate">{rec.author}</span>
                  <div className="flex items-center gap-0.5 ml-auto">
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                    <span className="text-xs text-warm-gray">{rec.rating}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {userInfo.recommendations.length === 0 && (
          <p className="text-center text-warm-gray text-sm py-8">暂无推荐，多去评分和收藏菜谱吧！</p>
        )}
      </div>
    </div>
  );
}
