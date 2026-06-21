import React from 'react';
import { Bell } from 'lucide-react';
import { Plot, SOIL_COLORS, SOIL_NAMES } from '@/types';

interface PlotCardProps {
  plot: Plot;
  onClick: () => void;
}

const PlotCard: React.FC<PlotCardProps> = ({ plot, onClick }) => {
  const soilColor = SOIL_COLORS[plot.soilType] || '#F5F5DC';
  const isDarkSoil = plot.soilType === 'loam' || plot.soilType === 'clay';
  const textColor = isDarkSoil ? 'text-white' : 'text-gray-800';
  const subTextColor = isDarkSoil ? 'text-gray-200' : 'text-gray-600';

  return (
    <div
      onClick={onClick}
      className="card-hover rounded-xl overflow-hidden shadow-lg cursor-pointer relative"
      style={{ backgroundColor: soilColor }}
    >
      {plot.needsRotationSoon && (
        <div className="absolute top-3 right-3 z-10">
          <Bell
            className="bell-animation w-6 h-6 text-orange-500"
            fill="#FF9800"
          />
        </div>
      )}

      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className={`text-lg font-bold ${textColor}`}>{plot.name}</h3>
            <p className={`text-sm ${subTextColor}`}>
              {plot.area} ㎡ · {plot.orientation} · {SOIL_NAMES[plot.soilType]}
            </p>
          </div>
        </div>

        <div
          className="bg-white/90 rounded-lg p-4 mt-4"
          style={{ backdropFilter: 'blur(4px)' }}
        >
          {plot.currentCrop ? (
            <>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">当前种植</span>
                <span className="font-semibold text-gray-800">{plot.currentCrop}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-green-400 to-green-600 h-2.5 rounded-full progress-animate"
                  style={{ width: `${plot.progress || 0}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>生长进度 {plot.progress || 0}%</span>
                {plot.daysToHarvest !== null && plot.daysToHarvest !== undefined && (
                  <span className={plot.daysToHarvest <= 7 ? 'text-orange-500 font-medium' : ''}>
                    {plot.daysToHarvest > 0 ? `还有 ${plot.daysToHarvest} 天收获` : '已到收获期'}
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="text-center py-3">
              <p className="text-gray-500 text-sm">暂无种植记录</p>
              <p className="text-green-600 text-xs mt-1">点击添加新作物</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlotCard;
