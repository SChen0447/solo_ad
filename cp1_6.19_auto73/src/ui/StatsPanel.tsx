import { useGameStore } from '../store/gameStore';

export default function StatsPanel() {
  const playerStats = useGameStore((s) => s.playerStats);
  const baseStats = useGameStore((s) => s.baseStats);

  const stats = [
    { key: 'attack' as const, label: '攻击力', icon: '⚔️' },
    { key: 'defense' as const, label: '防御力', icon: '🛡️' },
    { key: 'speed' as const, label: '移动速度', icon: '💨' },
  ];

  const getProgressColor = (value: number, base: number): string => {
    const ratio = Math.min((value - base) / (base * 0.5), 1);
    const r = Math.round(231 + (46 - 231) * ratio);
    const g = Math.round(76 + (204 - 76) * ratio);
    const b = Math.round(60 + (113 - 60) * ratio);
    return `rgb(${r}, ${g}, ${b})`;
  };

  const getProgressPercent = (value: number, base: number): number => {
    const min = base;
    const max = base * 1.5;
    return Math.min(Math.max(((value - min) / (max - min)) * 100, 0), 100);
  };

  return (
    <div className="stats-panel">
      <h3 className="stats-title">角色属性</h3>
      {stats.map((stat) => {
        const value = playerStats[stat.key];
        const base = baseStats[stat.key];
        const percent = getProgressPercent(value, base);
        const color = getProgressColor(value, base);
        return (
          <div key={stat.key} className="stat-item">
            <div className="stat-label">
              <span className="stat-icon">{stat.icon}</span>
              <span>{stat.label}</span>
              <span className="stat-value">{value}</span>
            </div>
            <div className="stat-bar-container">
              <div
                className="stat-bar"
                style={{
                  width: `${percent}%`,
                  backgroundColor: color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
