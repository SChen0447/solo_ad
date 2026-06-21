import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Flame, Clock, MapPin } from 'lucide-react';
import { Route } from '../types';
import { getRoutes } from '../services/api';
import RouteCard from '../components/RouteCard';
import { Link } from 'react-router-dom';

export default function HomePage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [featuredRoutes, setFeaturedRoutes] = useState<Route[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [activeTab, setActiveTab] = useState<'latest' | 'popular'>('latest');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRoutes = async () => {
      try {
        const data = await getRoutes();
        setRoutes(data);
        
        const shuffled = [...data].sort(() => Math.random() - 0.5);
        setFeaturedRoutes(shuffled.slice(0, 5));
      } catch (err) {
        console.error('Failed to fetch routes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRoutes();
  }, []);

  useEffect(() => {
    if (featuredRoutes.length === 0) return;

    const timer = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentSlide((prev) => (prev + 1) % featuredRoutes.length);
        setIsTransitioning(false);
      }, 300);
    }, 4000);

    return () => clearInterval(timer);
  }, [featuredRoutes.length]);

  const goToSlide = (index: number) => {
    if (index === currentSlide || isTransitioning) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentSlide(index);
      setIsTransitioning(false);
    }, 300);
  };

  const prevSlide = () => {
    const newIndex = currentSlide === 0 ? featuredRoutes.length - 1 : currentSlide - 1;
    goToSlide(newIndex);
  };

  const nextSlide = () => {
    const newIndex = (currentSlide + 1) % featuredRoutes.length;
    goToSlide(newIndex);
  };

  const latestRoutes = [...routes].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  ).slice(0, 6);

  const popularRoutes = [...routes].sort(
    (a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount
  ).slice(0, 6);

  const displayRoutes = activeTab === 'latest' ? latestRoutes : popularRoutes;

  const currentFeatured = featuredRoutes[currentSlide];

  return (
    <div className="min-h-screen bg-[#f0f4f8]">
      <div className="relative h-[420px] overflow-hidden">
        {currentFeatured && (
          <div
            className={`absolute inset-0 transition-opacity duration-300 ${isTransitioning ? 'opacity-0' : 'opacity-100'}`}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-[#276749] via-[#276749]/80 to-transparent" />
            <div
              className="absolute inset-0 bg-cover bg-center"
              style={{
                backgroundImage: `linear-gradient(135deg, #276749 0%, #38a169 50%, #68d391 100%)`,
              }}
            />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.05\"%3E%3Cpath d=\"M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"
            />
          </div>
        )}

        <div className="relative z-10 max-w-[1200px] mx-auto px-6 h-full flex items-center">
          {currentFeatured && (
            <div
              className={`max-w-xl transition-all duration-500 ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}
            >
              <div className="inline-block px-3 py-1 bg-[#f6e05e] text-[#744210] text-sm font-medium rounded-full mb-4">
                🌟 精选推荐
              </div>
              <h1 className="text-4xl font-bold text-white mb-3">
                {currentFeatured.name}
              </h1>
              <p className="text-white/80 text-lg mb-6 line-clamp-2">
                {currentFeatured.description}
              </p>
              <div className="flex items-center gap-6 text-white/90 mb-8">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  <span>{currentFeatured.distance.toFixed(1)} 公里</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  <span>{currentFeatured.duration}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-[#f6e05e]" />
                  <span>{currentFeatured.averageRating.toFixed(1)} 分</span>
                </div>
              </div>
              <Link
                to={`/route/${currentFeatured.id}`}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-[#276749] font-semibold rounded-full hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
              >
                查看路线详情
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          )}
        </div>

        {featuredRoutes.length > 1 && (
          <>
            <button
              onClick={prevSlide}
              className="absolute left-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-6 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-white/20 backdrop-blur rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-all"
            >
              <ChevronRight className="w-6 h-6" />
            </button>

            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
              {featuredRoutes.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    index === currentSlide ? 'bg-white w-8' : 'bg-white/50 hover:bg-white/70'
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="max-w-[1200px] mx-auto px-6 py-12">
        <div className="flex items-center justify-between mb-8">
          <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm">
            <button
              onClick={() => setActiveTab('latest')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'latest'
                  ? 'bg-[#276749] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Clock className="w-4 h-4" />
              最新路线
            </button>
            <button
              onClick={() => setActiveTab('popular')}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all ${
                activeTab === 'popular'
                  ? 'bg-[#276749] text-white shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              <Flame className="w-4 h-4" />
              热门路线
            </button>
          </div>

          <Link
            to="/explore"
            className="text-[#276749] font-medium hover:text-[#38a169] transition-colors flex items-center gap-1"
          >
            查看全部
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-400 ${
            isTransitioning ? 'opacity-0' : 'opacity-100'
          }`}
        >
          {loading ? (
            Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl h-80 animate-pulse">
                <div className="h-[150px] bg-gray-200 rounded-t-2xl" />
                <div className="p-4 space-y-3">
                  <div className="h-5 bg-gray-200 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                  <div className="h-4 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            ))
          ) : (
            displayRoutes.map((route) => (
              <RouteCard key={route.id} route={route} />
            ))
          )}
        </div>
      </div>

      <div className="bg-gradient-to-r from-[#48bb78] to-[#38a169] py-16">
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            发现户外之美，分享你的足迹
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            加入我们的户外社区，记录你的徒步、骑行、跑步路线，
            与志同道合的伙伴一起探索自然的美好
          </p>
          <Link
            to="/create"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-[#276749] font-semibold rounded-full hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300"
          >
            立即发布你的第一条路线
          </Link>
        </div>
      </div>
    </div>
  );
}
