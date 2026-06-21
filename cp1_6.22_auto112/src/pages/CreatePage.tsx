import { useState } from 'react';
import { RoutePoint } from '../types';
import RouteMap from '../components/RouteMap';
import RouteForm from '../components/RouteForm';
import { MapPin, Info } from 'lucide-react';

export default function CreatePage() {
  const [points, setPoints] = useState<RoutePoint[]>([]);

  const handlePointsChange = (newPoints: RoutePoint[]) => {
    setPoints(newPoints);
  };

  const handleClearPoints = () => {
    setPoints([]);
  };

  return (
    <div className="min-h-screen bg-[#f0f4f8] pt-20">
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#2d3748] mb-2">发布新路线</h1>
          <p className="text-[#4a5568]">在地图上点击添加路径点，记录你的户外足迹</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-4 text-[#4a5568] text-sm">
                <Info className="w-4 h-4 text-[#63b3ed]" />
                <span>点击地图上的任意位置添加路径点，系统将按顺序连接</span>
              </div>
              
              <RouteMap
                points={points}
                interactive
                onPointsChange={handlePointsChange}
                height="500px"
                previewMode
              />

              {points.length > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-[#4a5568]">
                    <MapPin className="w-4 h-4 text-[#48bb78]" />
                    <span>已添加 <strong className="text-[#276749]">{points.length}</strong> 个路径点</span>
                  </div>
                  <button
                    onClick={handleClearPoints}
                    className="text-sm text-red-500 hover:text-red-600 transition-colors"
                  >
                    清除所有点
                  </button>
                </div>
              )}
            </div>

            <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-semibold text-[#2d3748] mb-4">操作提示</h3>
              <ul className="space-y-2 text-sm text-[#4a5568]">
                <li className="flex items-start gap-2">
                  <span className="text-[#48bb78] font-bold">•</span>
                  <span>在地图上点击添加路径点，点与点之间会自动连线</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#48bb78] font-bold">•</span>
                  <span>可以缩放和拖拽地图来浏览不同区域</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#48bb78] font-bold">•</span>
                  <span>至少需要 2 个点才能创建路线</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#48bb78] font-bold">•</span>
                  <span>系统会自动计算路线距离和海拔变化</span>
                </li>
              </ul>
            </div>
          </div>

          <div>
            <RouteForm
              points={points}
              onClearPoints={handleClearPoints}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
