import React, { useMemo, useCallback } from 'react';
import { Swords, RotateCcw, Play, AlertCircle } from 'lucide-react';
import type { CombatUnit } from '../../types';
import { useGameStore } from '../../store/useGameStore';
import { getHpColor } from '../../utils/color';
import { playClickSound } from '../../utils/audio';

interface BattleSimulatorProps {
  characters: CombatUnit[];
  monsters: CombatUnit[];
}

export const BattleSimulator: React.FC<BattleSimulatorProps> = ({ characters, monsters }) => {
  const {
    selectedCharacterIds,
    selectedMonsterIds,
    isSimulating,
    currentRound,
    winner,
    totalRounds,
    battleLogs,
    simulationError,
    startSimulation,
    resetSimulation,
  } = useGameStore();

  const selectedChars = useMemo(
    () => characters.filter((c) => selectedCharacterIds.includes(c.id)),
    [characters, selectedCharacterIds]
  );

  const selectedMons = useMemo(
    () => monsters.filter((m) => selectedMonsterIds.includes(m.id)),
    [monsters, selectedMonsterIds]
  );

  const unitCurrentHp = useMemo(() => {
    const hpMap: Record<string, { current: number; max: number }> = {};
    
    [...selectedChars, ...selectedMons].forEach((unit) => {
      hpMap[unit.id] = { current: unit.maxHp, max: unit.maxHp };
    });

    battleLogs.forEach((log) => {
      if (log.isHit && hpMap[log.targetId]) {
        hpMap[log.targetId].current = Math.max(0, hpMap[log.targetId].current - log.damage);
      }
    });

    return hpMap;
  }, [battleLogs, selectedChars, selectedMons]);

  const handleStart = useCallback(() => {
    playClickSound();
    startSimulation();
  }, [startSimulation]);

  const handleReset = useCallback(() => {
    playClickSound();
    resetSimulation();
  }, [resetSimulation]);

  const canStart = selectedChars.length > 0 && selectedMons.length > 0 && !isSimulating;

  const getWinnerText = () => {
    if (winner === 'characters') return '🎉 角色方胜利！';
    if (winner === 'monsters') return '💀 怪物方胜利！';
    if (winner === 'draw') return '🤝 平局';
    return '';
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
          <Swords className="text-accent" size={20} />
          战斗模拟
        </h2>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-sm font-medium text-blue-400 mb-2">
              角色队伍 ({selectedChars.length}/4)
            </h3>
            <div className="space-y-2">
              {selectedChars.length === 0 ? (
                <div className="text-xs text-gray-500 italic">请在左侧选择角色</div>
              ) : (
                selectedChars.map((unit) => {
                  const hp = unitCurrentHp[unit.id] || { current: unit.maxHp, max: unit.maxHp };
                  const hpPercent = (hp.current / hp.max) * 100;
                  const isAlive = hp.current > 0;
                  return (
                    <div
                      key={unit.id}
                      className={`p-2 rounded-lg bg-secondary/60 border border-blue-500/20
                        transition-all duration-300 ${!isAlive ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{unit.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-white truncate">
                              {unit.name}
                            </span>
                            <span className="text-xs font-mono text-gray-400">
                              {hp.current}/{hp.max}
                            </span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${hpPercent}%`,
                                backgroundColor: getHpColor(hp.current, hp.max),
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-medium text-orange-400 mb-2">
              怪物队伍 ({selectedMons.length}/4)
            </h3>
            <div className="space-y-2">
              {selectedMons.length === 0 ? (
                <div className="text-xs text-gray-500 italic">请在左侧选择怪物</div>
              ) : (
                selectedMons.map((unit) => {
                  const hp = unitCurrentHp[unit.id] || { current: unit.maxHp, max: unit.maxHp };
                  const hpPercent = (hp.current / hp.max) * 100;
                  const isAlive = hp.current > 0;
                  return (
                    <div
                      key={unit.id}
                      className={`p-2 rounded-lg bg-secondary/60 border border-orange-500/20
                        transition-all duration-300 ${!isAlive ? 'opacity-50' : ''}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{unit.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm font-medium text-white truncate">
                              {unit.name}
                            </span>
                            <span className="text-xs font-mono text-gray-400">
                              {hp.current}/{hp.max}
                            </span>
                          </div>
                          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{
                                width: `${hpPercent}%`,
                                backgroundColor: getHpColor(hp.current, hp.max),
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {(currentRound > 0 || winner) && (
          <div className="mb-4 p-3 rounded-lg bg-secondary/50 border border-white/10">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-400">当前回合</span>
                <div className="text-2xl font-bold text-accent font-mono">
                  {currentRound}
                  {totalRounds > 0 && <span className="text-sm text-gray-500">/{totalRounds}</span>}
                </div>
              </div>
              {winner && (
                <div className="text-xl font-bold animate-pulse">
                  {getWinnerText()}
                </div>
              )}
              {isSimulating && (
                <div className="flex items-center gap-2 text-accent">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="text-sm">模拟中...</span>
                </div>
              )}
            </div>
          </div>
        )}

        {simulationError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2">
            <AlertCircle className="text-red-400 flex-shrink-0" size={16} />
            <span className="text-sm text-red-400">{simulationError}</span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4
              rounded-lg font-medium text-white
              bg-gradient-to-r from-accent to-accent/80
              hover:from-accent-hover hover:to-accent
              disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed
              transition-all duration-300 transform hover:scale-[1.02]
              active:scale-[0.98]"
          >
            {isSimulating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                模拟中...
              </>
            ) : (
              <>
                <Play size={18} />
                开始模拟
              </>
            )}
          </button>

          {(currentRound > 0 || winner) && (
            <button
              onClick={handleReset}
              disabled={isSimulating}
              className="flex items-center justify-center gap-2 py-3 px-4
                rounded-lg font-medium text-white
                bg-secondary hover:bg-secondary/80
                disabled:opacity-50 disabled:cursor-not-allowed
                transition-all duration-300 border border-white/10"
            >
              <RotateCcw size={18} />
              重置
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full flex flex-col items-center justify-center p-8">
          {!isSimulating && !winner && currentRound === 0 && (
            <div className="text-center">
              <div className="text-6xl mb-4">⚔️</div>
              <h3 className="text-xl font-bold text-white mb-2">准备战斗</h3>
              <p className="text-gray-400 text-sm max-w-xs">
                选择双方队伍后点击"开始模拟"按钮，
                系统将自动进行回合制战斗推演
              </p>
            </div>
          )}

          {isSimulating && (
            <div className="text-center">
              <div className="relative">
                <div className="text-6xl animate-bounce">💥</div>
                <div className="absolute inset-0 bg-accent/20 blur-xl rounded-full animate-pulse" />
              </div>
              <p className="text-accent mt-4 font-medium">战斗进行中...</p>
            </div>
          )}

          {winner && (
            <div className="text-center animate-fade-in">
              <div className="text-6xl mb-4">
                {winner === 'characters' ? '🏆' : winner === 'monsters' ? '💀' : '🤝'}
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{getWinnerText()}</h3>
              <p className="text-gray-400 text-sm">
                战斗持续 {totalRounds} 回合
              </p>
              <p className="text-gray-500 text-xs mt-1">
                查看右侧战斗日志和分析报告了解详情
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
