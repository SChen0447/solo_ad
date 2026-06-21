import { Link } from 'react-router-dom';
import StarRating from './StarRating';
import { Route } from '../types';
import { MapPin, Clock } from 'lucide-react';

interface RouteCardProps {
  route: Route;
}

export default function RouteCard({ route }: RouteCardProps) {
  const difficultyLabels: Record<string, { text: string; color: string }> = {
    easy: { text: '简单', color: 'bg-green-100 text-green-700' },
    medium: { text: '中等', color: 'bg-yellow-100 text-yellow-700' },
    hard: { text: '困难', color: 'bg-red-100 text-red-700' }
  };

  const difficulty = difficultyLabels[route.difficulty] || difficultyLabels.medium;

  const centerLng = route.points?.length > 0
    ? route.points.reduce((sum, p) => sum + p.lng, 0) / route.points.length
    : 116.4074;
  const centerLat = route.points?.length > 0
    ? route.points.reduce((sum, p) => sum + p.lat, 0) / route.points.length
    : 39.9042;

  const mapImageUrl = `https://api.mapbox.com/styles/v1/mapbox/outdoors-v12/static/` +
    `${centerLng.toFixed(4)},${centerLat.toFixed(4)},11,0,0/400x150` +
    `?access_token=pk.eyJ1IjoiZGVtby11c2VyIiwiYSI6ImNrcmR0b3d2ejFweGYycHBkZXNtMXZ4NnMifQ.demo-token`;

  return (
    <Link
      to={`/route/${route.id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex flex-col"
    >
      <div className="h-[150px] bg-gradient-to-br from-[#48bb78]/20 to-[#63b3ed]/20 relative overflow-hidden">
        <img
          src={mapImageUrl}
          alt={route.name}
          className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute top-3 right-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${difficulty.color}`}>
            {difficulty.text}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white text-sm font-medium">
          <MapPin className="w-4 h-4" />
          <span>{route.distance.toFixed(1)} 公里</span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <h3 className="text-base font-bold text-[#2d3748] mb-2 line-clamp-1 group-hover:text-[#276749] transition-colors">
          {route.name}
        </h3>
        
        <p className="text-sm text-[#4a5568] mb-3 line-clamp-2 flex-1">
          {route.description}
        </p>

        <div className="flex items-center justify-between mt-auto pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1">
            <StarRating rating={route.averageRating} size="sm" />
            <span className="text-sm text-[#4a5568] ml-1">
              {route.averageRating.toFixed(1)}
            </span>
            <span className="text-xs text-gray-400">({route.reviewCount})</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#718096]">
            <Clock className="w-3.5 h-3.5" />
            <span>{route.duration}</span>
          </div>
        </div>

        <button
          className="mt-4 w-full py-2.5 bg-gradient-to-r from-[#3182ce] to-[#2b6cb0] text-white rounded-lg font-medium text-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
        >
          查看详情
        </button>
      </div>
    </Link>
  );
}
