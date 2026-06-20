import { useMemo } from 'react';
import type { CombatEvent } from '../../types';

interface StatsSummaryProps {
  events: CombatEvent[];
}

const StatsSummary = ({ events }: StatsSummaryProps) => {
  const stats = useMemo(() => {
    const totalDamage = events.reduce((sum, e) => sum + e.damage, 0);
    const totalKills = events.filter((e) => e.is_kill).length;
    const totalHeal = events.reduce((sum, e) => sum + e.heal, 0);
    const monsterCount = new Set(events.map((e) => e.monster_name)).size;
    const avgDamage = events.length > 0 ? Math.round(totalDamage / events.length) : 0;

    const damageByMonster: Record<string, number> = {};
    events.forEach((e) => {
      damageByMonster[e.monster_name] = (damageByMonster[e.monster_name] || 0) + e.damage;
    });
    const topMonster = Object.entries(damageByMonster).sort((a, b) => b[1] - a[1])[0];

    return {
      totalDamage,
      totalKills,
      totalHeal,
      monsterCount,
      avgDamage,
      topMonster: topMonster?.[0] || '-',
    };
  }, [events]);

  const statItems = [
    { label: '总伤害量', value: stats.totalDamage.toLocaleString(), icon: '⚔️', color: '#ff6b6b' },
    { label: '击杀数', value: stats.totalKills, icon: '💀', color: '#ffa502' },
    { label: '治疗量', value: stats.totalHeal.toLocaleString(), icon: '💚', color: '#2ed573' },
    { label: '怪物种类', value: stats.monsterCount, icon: '👹', color: '#1e90ff' },
    { label: '平均伤害', value: stats.avgDamage.toLocaleString(), icon: '📊', color: '#a29bfe' },
    { label: '最高伤害怪物', value: stats.topMonster, icon: '🏆', color: '#ff4757' },
  ];

  return (
    <div className="stats-summary">
      <h3 className="stats-title">数据概览</h3>
      <div className="stats-grid">
        {statItems.map((item) => (
          <div key={item.label} className="stat-item">
            <div className="stat-icon" style={{ backgroundColor: `${item.color}20`, color: item.color }}>
              {item.icon}
            </div>
            <div className="stat-info">
              <p className="stat-value">{item.value}</p>
              <p className="stat-label">{item.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatsSummary;
