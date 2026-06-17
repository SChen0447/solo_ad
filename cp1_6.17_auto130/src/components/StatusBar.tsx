import { Resources, Totem, RESOURCE_ICONS, MAX_TOTEMS, ELEMENT_COLORS, FUSION_COLORS } from '../types';
import './StatusBar.css';

interface StatusBarProps {
  resources: Resources;
  totems: Totem[];
  onSaveClick: () => void;
  onMenuClick: () => void;
}

const StatusBar = ({ resources, totems, onSaveClick, onMenuClick }: StatusBarProps) => {
  const getTotemColor = (totem: Totem) => {
    if (totem.isRare && totem.color) {
      return totem.color;
    }
    const colors = (ELEMENT_COLORS as any)[totem.type] || (FUSION_COLORS as any)[totem.type];
    return colors ? colors[0] : '#888';
  };

  return (
    <div className="status-bar glass-card">
      <div className="player-avatar">
        <div className="avatar-ring">
          <div className="avatar-inner">
            <span className="avatar-icon">🔮</span>
          </div>
        </div>
      </div>

      <div className="resources">
        {Object.entries(resources).map(([type, count]) => (
          <div key={type} className="resource-item">
            <span className="resource-icon">{RESOURCE_ICONS[type as keyof typeof RESOURCE_ICONS]}</span>
            <span className="resource-count">{count}</span>
          </div>
        ))}
      </div>

      <div className="totem-slots">
        {Array.from({ length: MAX_TOTEMS }).map((_, index) => {
          const totem = totems[index];
          return (
            <div
              key={index}
              className={`totem-slot ${totem ? 'filled' : 'empty'}`}
              style={totem ? { background: getTotemColor(totem) } : {}}
            >
              {totem ? (
                <span className="slot-totem-icon">
                  {totem.isRare ? '✨' : getElementIcon(totem.type)}
                </span>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="status-actions">
        <button className="btn-secondary status-btn" onClick={onSaveClick}>
          💾 存档
        </button>
        <button className="btn-secondary status-btn" onClick={onMenuClick}>
          🏠 菜单
        </button>
      </div>
    </div>
  );
};

const getElementIcon = (type: string) => {
  const icons: Record<string, string> = {
    fire: '🔥',
    water: '💧',
    earth: '🌍',
    wind: '🌪️',
  };
  return icons[type] || '❓';
};

export default StatusBar;
