import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Route } from '../types';
import { getRoutes } from '../services/api';
import RouteCard from '../components/RouteCard';
import { Search, Filter, MapPin } from 'lucide-react';

export default function ExplorePage() {
  const [searchParams] = useSearchParams();
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('latest');

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        setLoading(true);
        const data = await getRoutes();
        setRoutes(data);
      } catch (err) {
        console.error('Failed to fetch routes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, []);

  const filteredRoutes = routes
    .filter(route => {
      if (searchQuery && !route.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !route.description.toLowerCase().includes(searchQuery.toLowerCase())) {
        return false;
      }
      if (difficultyFilter !== 'all' && route.difficulty !== difficultyFilter) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.averageRating - a.averageRating || b.reviewCount - a.reviewCount;
        case 'distance-asc':
          return a.distance - b.distance;
        case 'distance-desc':
          return b.distance - a.distance;
        case 'latest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  return (
    <div className="min-h-screen bg-[#f0f4f8] pt-20">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2d3748] mb-2">探索路线</h1>
          <p className="text-[#4a5568]">发现附近精彩的户外路线，开启你的冒险之旅</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索路线名称或描述..."
                className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#48bb78]/50 focus:border-[#48bb78] transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-gray-500" />
                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#48bb78]/50 focus:border-[#48bb78] transition-all bg-white"
                >
                  <option value="all">全部难度</option>
                  <option value="easy">简单</option>
                  <option value="medium">中等</option>
                  <option value="hard">困难</option>
                </select>
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#48bb78]/50 focus:border-[#48bb78] transition-all bg-white"
              >
                <option value="latest">最新发布</option>
                <option value="popular">最受欢迎</option>
                <option value="distance-asc">距离从短到长</option>
                <option value="distance-desc">距离从长到短</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-[#4a5568]">
            <MapPin className="w-5 h-5" />
            <span>共找到 <strong className="text-[#276749]">{filteredRoutes.length}</strong> 条路线</span>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array(9).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse shadow-md">
                <div className="h-[150px] bg-gray-200 rounded-t-2xl" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                  <div className="pt-3 border-t border-gray-100">
                    <div className="h-8 bg-gray-100 rounded-lg" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredRoutes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRoutes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-[#2d3748] mb-2">没有找到相关路线</h3>
            <p className="text-[#718096]">试试调整搜索条件或筛选器</p>
          </div>
        )}
      </div>
    </div>
  );
}
