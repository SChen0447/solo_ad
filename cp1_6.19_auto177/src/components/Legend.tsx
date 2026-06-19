import { useStore } from '../store/useStore';
import { temperatureRange, salinityRange } from '../data/oceanData';
import type { LayerType } from '../types';

function Legend() {
  const { activeLayer } = useStore();

  const getGradientColors = (layer: LayerType) => {
    if (layer === 'temperature') {
      return [
        { color: '#2d4dd9', value: temperatureRange.min },
        { color: '#33c9db', value: (temperatureRange.min + temperatureRange.max) / 2 },
        { color: '#ff6b35', value: temperatureRange.max },
      ];
    } else {
      return [
        { color: '#a7c7e7', value: salinityRange.min },
        { color: '#4a90d9', value: (salinityRange.min + salinityRange.max) / 2 },
        { color: '#1a365d', value: salinityRange.max },
      ];
    }
  };

  const colors = getGradientColors(activeLayer);
  const gradient = `linear-gradient(180deg, ${colors.map((c) => c.color).join(', ')})`;
  const unit = activeLayer === 'temperature' ? '℃' : '‰';
  const title = activeLayer === 'temperature' ? '海面温度' : '海水盐度';

  return (
    <div className="fixed left-4 md:left-6 bottom-4 md:bottom-6 z-30">
      <div className="glass-panel rounded-xl p-3 flex items-end gap-3">
        <div className="flex flex-col items-center">
          <span className="text-xs text-gray-400 mb-2 font-medium">
            {title}
          </span>
          <div
            className="w-3 h-32 rounded-full"
            style={{ background: gradient }}
          />
        </div>
        <div className="flex flex-col justify-between h-32 py-1">
          {colors
            .slice()
            .reverse()
            .map((item, index) => (
              <span
                key={index}
                className="text-xs text-gray-400 font-mono leading-none"
              >
                {item.value}
                {unit}
              </span>
            ))}
        </div>
      </div>
    </div>
  );
}

export default Legend;
