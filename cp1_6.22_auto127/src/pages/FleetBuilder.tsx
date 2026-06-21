import { useGameStore } from '@/store/gameStore';
import { saveFleet, canAddShip, getShipTemplate, getShipCount } from '@/modules/fleetManager';
import { SHIP_TEMPLATES, MAX_FLEET_SIZE } from '../../../shared/types';
import type { ShipType } from '../../../shared/types';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Plus, Minus, Rocket, Shield, Zap, Target, Swords } from 'lucide-react';

const SHIP_ICONS: Record<ShipType, React.ReactNode> = {
  scout: <Zap className="w-8 h-8 text-cyan-400" />,
  frigate: <Shield className="w-8 h-8 text-blue-400" />,
  flagship: <Rocket className="w-8 h-8 text-orange-400" />,
};

const STAT_CONFIG = [
  { key: 'attack' as const, label: '攻击', icon: <Swords className="w-3 h-3" />, color: '#f97316' },
  { key: 'defense' as const, label: '防御', icon: <Shield className="w-3 h-3" />, color: '#3b82f6' },
  { key: 'speed' as const, label: '速度', icon: <Zap className="w-3 h-3" />, color: '#22c55e' },
  { key: 'range' as const, label: '射程', icon: <Target className="w-3 h-3" />, color: '#a855f7' },
];

function StatBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="h-1.5 rounded-full bg-slate-700 w-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(value / max) * 100}%`, backgroundColor: color }} />
    </div>
  );
}

export default function FleetBuilder() {
  const { fleetShips, addShip, removeShip, fleetPower, setFleetId, setMatchStatus, setWaitStartTime } = useGameStore();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);

  const handleAddShip = (type: ShipType) => {
    if (canAddShip(fleetShips)) addShip(type);
  };

  const handleStartMatch = async () => {
    if (fleetShips.length === 0) return;
    setSaving(true);
    try {
      const fleet = await saveFleet(fleetShips);
      setFleetId(fleet.fleetId);
      setWaitStartTime(Date.now());
      setMatchStatus('searching');
      navigate('/match');
    } catch {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-white flex flex-col">
      <header className="p-6 border-b border-slate-700/50">
        <h1 className="text-3xl font-bold tracking-wider" style={{ fontFamily: 'Orbitron, sans-serif' }}>
          FLEET COMMAND
        </h1>
        <p className="text-slate-400 mt-1 text-sm">组建你的太空舰队，准备迎战</p>
      </header>

      <div className="flex-1 p-6 flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <h2 className="text-lg font-semibold mb-4 text-slate-300">可用战舰</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {SHIP_TEMPLATES.map((template) => {
              const count = getShipCount(fleetShips, template.type);
              return (
                <div
                  key={template.type}
                  className="group relative w-[220px] h-[280px] rounded-2xl bg-[#1e293b] border-2 border-transparent hover:border-[#3b82f6] transition-all duration-300 hover:shadow-[0_0_20px_rgba(59,130,246,0.3)] flex flex-col items-center justify-center gap-3 cursor-pointer mx-auto"
                  onClick={() => handleAddShip(template.type)}
                >
                  <div className="transform group-hover:scale-110 transition-transform duration-300">
                    {SHIP_ICONS[template.type]}
                  </div>
                  <h3 className="font-bold text-lg">{template.name}</h3>
                  <div className="w-full px-5 space-y-2">
                    {STAT_CONFIG.map((stat) => (
                      <div key={stat.key} className="flex items-center gap-2">
                        <span className="text-slate-400 w-8 flex items-center gap-0.5 text-xs">
                          {stat.icon}
                        </span>
                        <div className="flex-1">
                          <StatBar value={template[stat.key]} max={100} color={stat.color} />
                        </div>
                        <span className="text-xs text-slate-400 w-8 text-right">{template[stat.key]}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">HP: {template.hp} | 冷却: {template.maxCooldown}s</div>
                  {count > 0 && (
                    <div className="absolute top-3 right-3 bg-[#3b82f6] text-white text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                      {count}
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 rounded-2xl">
                    <Plus className="w-8 h-8 text-[#3b82f6]" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:w-80 flex flex-col">
          <h2 className="text-lg font-semibold mb-4 text-slate-300">
            当前编队 ({fleetShips.length}/{MAX_FLEET_SIZE})
          </h2>
          <div className="flex-1 bg-[#1e293b]/50 rounded-xl p-4 space-y-2 min-h-[200px]">
            {fleetShips.length === 0 ? (
              <div className="text-slate-500 text-center py-8">点击战舰卡片添加到编队</div>
            ) : (
              fleetShips.map((type, i) => {
                const t = getShipTemplate(type);
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 bg-slate-800/60 rounded-lg px-3 py-2 group hover:bg-slate-700/60 transition-colors"
                  >
                    <div className="flex-shrink-0">{SHIP_ICONS[type]}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="text-xs text-slate-400">
                        ATK {t.attack} | DEF {t.defense} | SPD {t.speed}
                      </div>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeShip(i); }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 p-1"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-4 p-4 bg-[#1e293b]/50 rounded-xl text-center">
            <div className="text-slate-400 text-sm mb-1">战力评分</div>
            <div
              className="text-4xl font-bold text-[#3b82f6]"
              style={{ fontFamily: 'Orbitron, sans-serif' }}
            >
              {fleetPower}
            </div>
          </div>

          <button
            onClick={handleStartMatch}
            disabled={fleetShips.length === 0 || saving}
            className="mt-4 w-full py-3 rounded-xl font-bold text-lg transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed bg-gradient-to-r from-[#3b82f6] to-[#f97316] hover:shadow-[0_0_30px_rgba(59,130,246,0.4)] active:scale-95"
          >
            {saving ? '部署中...' : '开始匹配'}
          </button>
        </div>
      </div>
    </div>
  );
}
