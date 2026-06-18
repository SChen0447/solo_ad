import React from 'react';
import { useBattleStore } from '../store/useBattleStore';

export const TurnHeader: React.FC = () => {
  const { turn, phase, characters } = useBattleStore();

  const teamAStats = {
    totalHp: characters.filter(c => c.team === 'A').reduce((sum, c) => sum + c.maxHp, 0),
    currentHp: characters.filter(c => c.team === 'A').reduce((sum, c) => sum + c.currentHp, 0),
    alive: characters.filter(c => c.team === 'A' && c.isAlive).length,
    total: characters.filter(c => c.team === 'A').length,
  };

  const teamBStats = {
    totalHp: characters.filter(c => c.team === 'B').reduce((sum, c) => sum + c.maxHp, 0),
    currentHp: characters.filter(c => c.team === 'B').reduce((sum, c) => sum + c.currentHp, 0),
    alive: characters.filter(c => c.team === 'B' && c.isAlive).length,
    total: characters.filter(c => c.team === 'B').length,
  };

  const teamAHpPercent = teamAStats.totalHp > 0 ? (teamAStats.currentHp / teamAStats.totalHp) * 100 : 0;
  const teamBHpPercent = teamBStats.totalHp > 0 ? (teamBStats.currentHp / teamBStats.totalHp) * 100 : 0;

  const phaseNames: Record<string, string> = {
    deploy: '部署阶段',
    planning: '规划阶段',
    executing: '执行阶段',
    result: '战斗结束',
  };

  return (
    <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="text-blue-400 font-bold text-sm">队伍A</div>
            <div className="w-32 h-4 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-500"
                style={{ width: `${teamAHpPercent}%` }}
              />
            </div>
            <div className="text-xs text-gray-400 w-20">
              {teamAStats.currentHp}/{teamAStats.totalHp}
            </div>
            <div className="text-xs px-2 py-0.5 bg-blue-900/50 rounded text-blue-400">
              {teamAStats.alive}/{teamAStats.total} 存活
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#e94560] to-[#f5a623] flex items-center justify-center animate-pulse-slow">
              <div className="w-14 h-14 rounded-full bg-[#1a1a2e] flex items-center justify-center flex-col">
                <span className="text-xs text-gray-400">回合</span>
                <span className="text-xl font-bold text-[#f5a623]">{turn}</span>
              </div>
            </div>
            <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs px-3 py-0.5 bg-gray-800 rounded-full text-[#f5a623] border border-[#f5a623]/50">
                {phaseNames[phase]}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 justify-end">
            <div className="text-xs px-2 py-0.5 bg-red-900/50 rounded text-red-400">
              {teamBStats.alive}/{teamBStats.total} 存活
            </div>
            <div className="text-xs text-gray-400 w-20 text-right">
              {teamBStats.currentHp}/{teamBStats.totalHp}
            </div>
            <div className="w-32 h-4 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-500"
                style={{ width: `${teamBHpPercent}%` }}
              />
            </div>
            <div className="text-red-400 font-bold text-sm">队伍B</div>
          </div>
        </div>
      </div>
      
      {phase === 'result' && (
        <div className="mt-6 text-center">
          <div className="text-2xl font-bold text-[#f5a623] animate-bounce">
            {teamAStats.alive > 0 ? '🏆 队伍A 获胜！' : '🏆 队伍B 获胜！'}
          </div>
        </div>
      )}
    </div>
  );
};
