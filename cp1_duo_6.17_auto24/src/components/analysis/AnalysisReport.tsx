import React, { useMemo, useCallback, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { BarChart3, PieChart as PieChartIcon, Download, Trophy } from 'lucide-react';
import type { BattleStats, CombatUnit } from '../../types';
import { useGameStore } from '../../store/useGameStore';
import { playClickSound } from '../../utils/audio';

interface AnalysisReportProps {
  stats: BattleStats | null;
  winner: 'characters' | 'monsters' | 'draw' | null;
  totalRounds: number;
  characters: CombatUnit[];
  monsters: CombatUnit[];
}

const CHAR_COLORS = ['#4f46e5', '#7c3aed', '#9333ea', '#a855f7'];
const MON_COLORS = ['#f97316', '#ea580c', '#dc2626', '#b91c1c'];

const customTooltipStyle = {
  backgroundColor: '#16213e',
  border: '1px solid rgba(233, 69, 96, 0.3)',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '12px',
  fontFamily: 'JetBrains Mono, monospace',
};

export const AnalysisReport: React.FC<AnalysisReportProps> = ({
  stats,
  winner,
  totalRounds,
  characters,
  monsters,
}) => {
  const { exportReport, selectedCharacterIds, selectedMonsterIds } = useGameStore();
  const [hoveredSector, setHoveredSector] = useState<string | null>(null);

  const damageData = useMemo(() => {
    if (!stats) return [];
    return [
      {
        name: '角色方',
        伤害: stats.totalDamageBySide.characters,
        fill: 'url(#charGradient)',
      },
      {
        name: '怪物方',
        伤害: stats.totalDamageBySide.monsters,
        fill: 'url(#monGradient)',
      },
    ];
  }, [stats]);

  const critDodgeData = useMemo(() => {
    if (!stats) return [];
    return [
      { name: '角色暴击', value: stats.critCount.characters, fill: CHAR_COLORS[0], type: '暴击' },
      { name: '怪物暴击', value: stats.critCount.monsters, fill: MON_COLORS[0], type: '暴击' },
      { name: '角色闪避', value: stats.dodgeCount.characters, fill: CHAR_COLORS[2], type: '闪避' },
      { name: '怪物闪避', value: stats.dodgeCount.monsters, fill: MON_COLORS[2], type: '闪避' },
    ];
  }, [stats]);

  const unitDamageData = useMemo(() => {
    if (!stats) return [];
    const data: { name: string; damage: number; fill: string; icon: string }[] = [];

    characters
      .filter((c) => selectedCharacterIds.includes(c.id))
      .forEach((c, i) => {
        data.push({
          name: c.name,
          damage: stats.damageByUnit[c.id] || 0,
          fill: CHAR_COLORS[i % CHAR_COLORS.length],
          icon: c.icon,
        });
      });

    monsters
      .filter((m) => selectedMonsterIds.includes(m.id))
      .forEach((m, i) => {
        data.push({
          name: m.name,
          damage: stats.damageByUnit[m.id] || 0,
          fill: MON_COLORS[i % MON_COLORS.length],
          icon: m.icon,
        });
      });

    return data;
  }, [stats, characters, monsters, selectedCharacterIds, selectedMonsterIds]);

  const handleExport = useCallback(() => {
    if (!stats) return;
    playClickSound();
    const reportData = exportReport();
    const blob = new Blob([reportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `battle-report-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [stats, exportReport]);

  if (!stats) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8">
        <div className="text-5xl mb-4 opacity-30">📊</div>
        <h3 className="text-lg font-bold text-gray-400 mb-2">数据分析报告</h3>
        <p className="text-sm text-gray-600 max-w-xs">
          完成战斗模拟后将在此展示详细的数据分析图表，
          包含总伤害输出、暴击/闪避统计和各单位贡献
        </p>
      </div>
    );
  }

  const totalDamage = stats.totalDamageBySide.characters + stats.totalDamageBySide.monsters;
  const charDamagePct = totalDamage > 0
    ? ((stats.totalDamageBySide.characters / totalDamage) * 100).toFixed(1)
    : '0.0';

  const winnerText = winner === 'characters'
    ? '🎉 角色方胜利'
    : winner === 'monsters'
    ? '💀 怪物方胜利'
    : '🤝 平局';
  const winnerColor = winner === 'characters'
    ? 'text-blue-400'
    : winner === 'monsters'
    ? 'text-orange-400'
    : 'text-gray-400';

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Trophy className="text-accent" size={20} />
            战斗分析报告
          </h2>
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg
              bg-secondary/50 text-accent hover:bg-accent hover:text-white
              transition-all duration-300 border border-accent/20"
          >
            <Download size={14} />
            导出JSON
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          <div className="p-2 rounded-lg bg-secondary/40 border border-white/5">
            <div className="text-xs text-gray-500">获胜方</div>
            <div className={`text-sm font-bold mt-0.5 ${winnerColor}`}>
              {winnerText}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-secondary/40 border border-white/5">
            <div className="text-xs text-gray-500">总回合</div>
            <div className="text-sm font-bold text-white font-mono mt-0.5">
              {totalRounds}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-secondary/40 border border-white/5">
            <div className="text-xs text-gray-500">总伤害</div>
            <div className="text-sm font-bold text-accent font-mono mt-0.5">
              {totalDamage.toLocaleString()}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-secondary/40 border border-white/5">
            <div className="text-xs text-gray-500">角色伤害占比</div>
            <div className="text-sm font-bold text-blue-400 font-mono mt-0.5">
              {charDamagePct}%
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <BarChart3 size={14} className="text-accent" />
            双方总伤害输出
          </h3>
          <div className="h-48 rounded-lg bg-secondary/30 p-3 border border-white/5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={damageData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="charGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" />
                    <stop offset="100%" stopColor="#9333ea" />
                  </linearGradient>
                  <linearGradient id="monGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#dc2626" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  formatter={(value: number) => [value.toLocaleString(), '伤害']}
                />
                <Bar dataKey="伤害" radius={[6, 6, 0, 0]} barSize={60}>
                  {damageData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
            <PieChartIcon size={14} className="text-accent" />
            暴击与闪避统计
          </h3>
          <div className="h-56 rounded-lg bg-secondary/30 p-3 border border-white/5 flex flex-col sm:flex-row">
            <div className="w-full sm:w-1/2 h-1/2 sm:h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={critDodgeData.filter((d) => d.type === '暴击')}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ value }) => `${value}`}
                    labelLine={false}
                    onMouseEnter={(_, index) => setHoveredSector(`crit-${index}`)}
                    onMouseLeave={() => setHoveredSector(null)}
                  >
                    {critDodgeData
                      .filter((d) => d.type === '暴击')
                      .map((entry, index) => (
                        <Cell
                          key={`crit-cell-${index}`}
                          fill={entry.fill}
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth={hoveredSector === `crit-${index}` ? 2 : 0}
                          style={{
                            transform: hoveredSector === `crit-${index}` ? 'scale(1.1)' : 'scale(1)',
                            transformOrigin: 'center',
                            transition: 'all 0.2s ease-out',
                          }}
                        />
                      ))}
                  </Pie>
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(value: number, name: string) => [`${value} 次`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center text-xs text-gray-500 -mt-2">暴击次数</div>
            </div>
            <div className="w-full sm:w-1/2 h-1/2 sm:h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={critDodgeData.filter((d) => d.type === '闪避')}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={55}
                    paddingAngle={2}
                    dataKey="value"
                    nameKey="name"
                    label={({ value }) => `${value}`}
                    labelLine={false}
                    onMouseEnter={(_, index) => setHoveredSector(`dodge-${index}`)}
                    onMouseLeave={() => setHoveredSector(null)}
                  >
                    {critDodgeData
                      .filter((d) => d.type === '闪避')
                      .map((entry, index) => (
                        <Cell
                          key={`dodge-cell-${index}`}
                          fill={entry.fill}
                          stroke="rgba(255,255,255,0.1)"
                          strokeWidth={hoveredSector === `dodge-${index}` ? 2 : 0}
                          style={{
                            transform: hoveredSector === `dodge-${index}` ? 'scale(1.1)' : 'scale(1)',
                            transformOrigin: 'center',
                            transition: 'all 0.2s ease-out',
                          }}
                        />
                      ))}
                  </Pie>
                  <Tooltip
                    contentStyle={customTooltipStyle}
                    formatter={(value: number, name: string) => [`${value} 次`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="text-center text-xs text-gray-500 -mt-2">闪避次数</div>
            </div>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
            {critDodgeData.map((d, i) => (
              <div key={i} className="flex items-center gap-1.5 text-xs">
                <div
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: d.fill }}
                />
                <span className="text-gray-400">{d.name}</span>
                <span className="text-white font-mono">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {unitDamageData.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-2">
              <BarChart3 size={14} className="text-accent" />
              各单位伤害贡献
            </h3>
            <div className="h-auto rounded-lg bg-secondary/30 p-3 border border-white/5">
              <div className="space-y-2">
                {unitDamageData
                  .sort((a, b) => b.damage - a.damage)
                  .map((unit, index) => {
                    const maxDamage = Math.max(...unitDamageData.map((u) => u.damage), 1);
                    const pct = (unit.damage / maxDamage) * 100;
                    const totalUnitDamage = unitDamageData.reduce((s, u) => s + u.damage, 0);
                    const sharePct = totalUnitDamage > 0
                      ? ((unit.damage / totalUnitDamage) * 100).toFixed(1)
                      : '0.0';
                    return (
                      <div
                        key={index}
                        className="group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{unit.icon}</span>
                            <span className="text-xs text-white font-medium">
                              {unit.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">{sharePct}%</span>
                            <span className="text-xs text-white font-mono">
                              {unit.damage.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500 ease-out
                              group-hover:brightness-110"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: unit.fill,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
