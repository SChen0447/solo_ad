import { Link, useNavigate } from 'react-router-dom';
import { Search, MapPin, Plus, Home } from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/explore?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-[#276749] z-50 border-b-2 border-[#48bb78]/30">
      <div className="max-w-[1200px] mx-auto h-full px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-white font-bold text-xl hover:opacity-90 transition-opacity">
          <MapPin className="w-7 h-7" />
          <span>野径</span>
        </Link>

        <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索路线、地点..."
              className="w-full pl-12 pr-4 py-2.5 rounded-full bg-white/15 text-white placeholder-gray-300 focus:outline-none focus:bg-white/25 transition-all border border-white/20 focus:border-white/40"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="flex items-center gap-2 px-4 py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <Home className="w-5 h-5" />
            <span className="hidden sm:inline">首页</span>
          </Link>
          <Link
            to="/explore"
            className="flex items-center gap-2 px-4 py-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-all"
          >
            <MapPin className="w-5 h-5" />
            <span className="hidden sm:inline">探索</span>
          </Link>
          <Link
            to="/create"
            className="flex items-center gap-2 px-5 py-2 bg-[#48bb78] hover:bg-[#38a169] text-white rounded-full font-medium transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">发布路线</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}
