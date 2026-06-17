import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { ScrollText, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import type { LogEntry, CombatUnit } from '../../types';
import { useGameStore } from '../../store/useGameStore';
import { playClickSound } from '../../utils/audio';

interface BattleLogProps {
  characters: CombatUnit[];
  monsters: CombatUnit[];
}

interface LogEntryItemProps {
  log: LogEntry;
  isNew?: boolean;
}

const LogEntryItem: React.FC<LogEntryItemProps> = ({ log, isNew }) => {
  const [showDamage, setShowDamage] = useState(isNew || false);
  const [showFlash, setShowFlash] = useState(false);
  const [showMissFloat, setShowMissFloat] = useState(false);

  useEffect(() => {
    if (isNew) {
      setShowDamage(true);
      const timer = setTimeout(() => setShowDamage(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

  useEffect(() => {
    if (isNew && log.isHit && log.isCrit) {
      setShowFlash(true);
      const timer = setTimeout(() => setShowFlash(false), 500);
      return () => clearTimeout(timer);
    }
  }, [isNew, log.isHit, log.isCrit]);

  useEffect(() => {
    if (isNew && !log.isHit) {
      setShowMissFloat(true);
      const timer = setTimeout(() => setShowMissFloat(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isNew, log.isHit]);

  const getActorColor = (actorId: string) => {
    const store = useGameStore.getState();
    const isChar = store.characters.some((c) => c.id === actorId);
    return isChar ? 'text-blue-400' : 'text-orange-400';
  };

  const getTargetColor = (targetId: string) => {
    const store = useGameStore.getState();
    const isChar = store.characters.some((c) => c.id === targetId);
    return isChar ? 'text-blue-400' : 'text-orange-400';
  };

  return (
    <div
      className={`relative p-3 rounded-lg bg-secondary/40 border border-white/5
        hover:bg-secondary/80 hover:scale-[1.02] hover:border-accent/30
        hover:shadow-lg hover:shadow-accent/5
        origin-left
        ${isNew ? 'animate-slide-up' : ''}
        ${log.isHit && log.isCrit ? 'border-orange-500/20' : ''}
        ${!log.isHit ? 'border-red-500/20' : ''}`}
      style={{ transition: 'all 0.2s ease' }}
    >
      {showFlash && log.isHit && log.isCrit && (
        <div
          className="absolute top-0 right-0 w-24 h-full rounded-r-lg pointer-events-none overflow-hidden"
          style={{ zIndex: 1 }}
        >
          <div
            className="absolute top-0 right-0 w-full h-full"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 30%, rgba(251,146,60,0.6) 60%, rgba(255,255,255,0.2) 100%)',
              animation: 'critFlash 0.5s ease-out forwards',
            }}
          />
          <div
            className="absolute top-1 right-2 w-16 h-16"
            style={{
              background:
                'radial-gradient(circle, rgba(255,255,255,0.8) 0%, rgba(251,146,60,0.6) 30%, transparent 70%)',
              animation: 'critGlow 0.5s ease-out forwards',
            }}
          />
        </div>
      )}

      {showMissFloat && !log.isHit && (
        <div
          className="relative w-full h-full"
          style={{ zIndex: 2, position: 'absolute', inset: 0, pointerEvents: 'none' }}
        >
          <span
            className="text-2xl font-black text-red-500"
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textShadow: '0 0 10px rgba(239,68,68,0.8), 0 0 20px rgba(239,68,68,0.4)',
              animation: 'missFloatUp 0.4s ease-out forwards',
            }}
          >
            Miss!
          </span>
        </div>
      )}

      <div className="relative flex flex-wrap items-center gap-1 text-sm" style={{ zIndex: 3 }}>
        <span className={`font-medium ${getActorColor(log.actorId)}`}>
          {log.actorName}
        </span>
        <span className="text-gray-500">使用</span>
        <span className="text-accent font-medium">{log.skillName}</span>
        <span className="text-gray-500">攻击</span>
        <span className={`font-medium ${getTargetColor(log.targetId)}`}>
          {log.targetName}
        </span>

        {!log.isHit ? (
          <span className="ml-2 text-red-400 font-bold">
            Miss!
          </span>
        ) : (
          <div className="relative ml-2">
            <span className="text-gray-400">造成</span>
            <span
              className={`ml-1 font-mono font-bold
                ${log.isCrit ? 'text-orange-400' : 'text-white'}`}
              style={{
                transform: log.isCrit ? 'scale(1.5)' : 'scale(1)',
                transformOrigin: 'left center',
                transition: 'transform 0.2s ease-out',
                display: 'inline-block',
              }}
            >
              {log.damage}
            </span>
            <span className="text-gray-400">点伤害</span>
            {log.isCrit && (
              <span className="ml-1 text-xs text-orange-400 font-bold">暴击!</span>
            )}

            {showDamage && (
              <div
                className={`absolute -top-8 left-4 font-bold pointer-events-none
                  ${log.isCrit ? 'animate-crit-pop text-orange-400 text-xl' : 'animate-damage-pop text-white'}`}
              >
                {log.isCrit ? `-${log.damage}!` : `-${log.damage}`}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes critFlash {
          0% {
            opacity: 0;
            transform: translateX(30px) scaleX(0.3);
            filter: brightness(1);
          }
          10% {
            opacity: 1;
            filter: brightness(2);
            transform: translateX(10px) scaleX(1);
          }
          30% {
            opacity: 0.9;
            filter: brightness(1.7);
            transform: translateX(0) scaleX(1);
          }
          60% {
            opacity: 0.5;
            filter: brightness(1.3);
            transform: translateX(-5px) scaleX(0.9);
          }
          100% {
            opacity: 0;
            filter: brightness(1);
            transform: translateX(-20px) scaleX(0.6);
          }
        }
        @keyframes critGlow {
          0% {
            opacity: 0;
            transform: scale(0.3);
            filter: brightness(1);
          }
          20% {
            opacity: 1;
            transform: scale(1.0);
            filter: brightness(2.5);
          }
          50% {
            opacity: 0.9;
            transform: scale(1.3);
            filter: brightness(1.8);
          }
          100% {
            opacity: 0;
            transform: scale(1.6);
            filter: brightness(1);
          }
        }
        @keyframes missFloatUp {
          0% {
            opacity: 1;
            transform: translate(-50%, -50%) translateY(0) scale(1) rotate(-3deg);
          }
          40% {
            opacity: 1;
            transform: translate(-50%, -50%) translateY(-12px) scale(1.2) rotate(2deg);
          }
          75% {
            opacity: 0.7;
            transform: translate(-50%, -50%) translateY(-22px) scale(1.15) rotate(3deg);
          }
          100% {
            opacity: 0;
            transform: translate(-50%, -50%) translateY(-35px) scale(1.0) rotate(5deg);
          }
        }
      `}</style>
    </div>
  );
};

export const BattleLog: React.FC<BattleLogProps> = ({ characters, monsters }) => {
  const { battleLogs, logFilter, totalRounds, setLogFilter, setJumpToRound } = useGameStore();
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const latestRoundRef = useRef<number>(0);
  const userScrolledRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoResumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSimulatingRef = useRef<boolean>(false);

  const { isSimulating, winner } = useGameStore();

  useEffect(() => {
    isSimulatingRef.current = isSimulating;
  }, [isSimulating]);

  const allUnits = useMemo(() => [...characters, ...monsters], [characters, monsters]);

  const logsByRound = useMemo(() => {
    const groups: Record<number, LogEntry[]> = {};
    battleLogs.forEach((log) => {
      if (!groups[log.round]) {
        groups[log.round] = [];
      }
      groups[log.round].push(log);
    });
    return groups;
  }, [battleLogs]);

  const filteredLogsByRound = useMemo(() => {
    if (logFilter === 'all') return logsByRound;

    const filtered: Record<number, LogEntry[]> = {};
    Object.entries(logsByRound).forEach(([round, logs]) => {
      const filteredLogs = logs.filter((log) => {
        if (logFilter === 'characters') {
          return characters.some((c) => c.id === log.actorId);
        }
        if (logFilter === 'monsters') {
          return monsters.some((m) => m.id === log.actorId);
        }
        if (logFilter.startsWith('unit:')) {
          const unitId = logFilter.replace('unit:', '');
          return log.actorId === unitId || log.targetId === unitId;
        }
        return true;
      });
      if (filteredLogs.length > 0) {
        filtered[parseInt(round, 10)] = filteredLogs;
      }
    });
    return filtered;
  }, [logsByRound, logFilter, characters, monsters]);

  const rounds = useMemo(
    () => Object.keys(filteredLogsByRound).map(Number).sort((a, b) => a - b),
    [filteredLogsByRound]
  );

  const handleScroll = useCallback(() => {
    if (!logContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = logContainerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    const isAtBottom = distanceFromBottom < 50;

    if (!isAtBottom) {
      userScrolledRef.current = true;

      if (autoResumeTimeoutRef.current) {
        clearTimeout(autoResumeTimeoutRef.current);
      }
      autoResumeTimeoutRef.current = setTimeout(() => {
        userScrolledRef.current = false;
      }, 3000);
    } else {
      userScrolledRef.current = false;
      if (autoResumeTimeoutRef.current) {
        clearTimeout(autoResumeTimeoutRef.current);
        autoResumeTimeoutRef.current = null;
      }
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      if (isAtBottom) {
        userScrolledRef.current = false;
      }
    }, 500);
  }, []);

  useEffect(() => {
    const container = logContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true });
    }
    return () => {
      if (container) {
        container.removeEventListener('scroll', handleScroll);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (autoResumeTimeoutRef.current) {
        clearTimeout(autoResumeTimeoutRef.current);
      }
    };
  }, [handleScroll]);

  useEffect(() => {
    if (winner || !isSimulating) {
      userScrolledRef.current = false;
    }
  }, [winner, isSimulating]);

  useEffect(() => {
    if (battleLogs.length > 0 && logContainerRef.current) {
      const lastLog = battleLogs[battleLogs.length - 1];
      if (lastLog.round !== latestRoundRef.current) {
        latestRoundRef.current = lastLog.round;
        setExpandedRounds((prev) => new Set([...prev, lastLog.round]));

        if (!userScrolledRef.current) {
          requestAnimationFrame(() => {
            if (logContainerRef.current && !userScrolledRef.current) {
              logContainerRef.current.scrollTo({
                top: logContainerRef.current.scrollHeight,
                behavior: 'smooth',
              });
            }
          });
        }
      }
    }
  }, [battleLogs]);

  const toggleRound = useCallback(
    (round: number) => {
      playClickSound();
      setExpandedRounds((prev) => {
        const next = new Set(prev);
        if (next.has(round)) {
          next.delete(round);
        } else {
          next.add(round);
        }
        return next;
      });
    },
    []
  );

  const handleJumpToRound = useCallback(
    (round: number) => {
      playClickSound();
      setSelectedRound(round);
      setJumpToRound(round);
      setExpandedRounds((prev) => new Set([...prev, round]));

      userScrolledRef.current = false;

      requestAnimationFrame(() => {
        const roundElement = document.getElementById(`round-${round}`);
        if (roundElement && logContainerRef.current) {
          roundElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
          });
        }
      });

      setTimeout(() => {
        setSelectedRound(null);
        setJumpToRound(null);
      }, 2000);
    },
    [setJumpToRound]
  );

  const newLogIds = useMemo(() => {
    if (battleLogs.length <= 10) {
      return new Set(battleLogs.map((l) => l.id));
    }
    return new Set(battleLogs.slice(-10).map((l) => l.id));
  }, [battleLogs]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ScrollText className="text-accent" size={20} />
            战斗日志
          </h2>
          <span className="text-xs text-gray-500 font-mono">
            {battleLogs.length} 条记录
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
            <select
              value={logFilter}
              onChange={(e) => {
                playClickSound();
                setLogFilter(e.target.value);
              }}
              className="w-full pl-8 pr-8 py-2 text-sm rounded-lg bg-secondary/50
                border border-white/10 text-white appearance-none
                focus:outline-none focus:border-accent/50
                transition-colors duration-300 cursor-pointer"
            >
              <option value="all">全部行动</option>
              <option value="characters">仅角色行动</option>
              <option value="monsters">仅怪物行动</option>
              {allUnits.map((u) => (
                <option key={u.id} value={`unit:${u.id}`}>
                  {u.icon} {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {totalRounds > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            <span className="text-xs text-gray-500 mr-1 self-center">跳转:</span>
            {Array.from({ length: Math.min(totalRounds, 20) }, (_, i) => i + 1).map((r) => (
              <button
                key={r}
                onClick={() => handleJumpToRound(r)}
                className={`w-7 h-7 text-xs rounded-md font-mono
                  transition-all duration-200
                  ${selectedRound === r
                    ? 'bg-accent text-white'
                    : 'bg-secondary/50 text-gray-400 hover:bg-accent/30 hover:text-white'
                  }`}
              >
                {r}
              </button>
            ))}
            {totalRounds > 20 && (
              <span className="text-xs text-gray-500 self-center">...共{totalRounds}回合</span>
            )}
          </div>
        )}
      </div>

      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-3"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#e94560 #16213e' }}
      >
        {rounds.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-3 opacity-30">📜</div>
            <p className="text-gray-500 text-sm">战斗日志将在此显示</p>
            <p className="text-gray-600 text-xs mt-1">点击"开始模拟"开始战斗</p>
          </div>
        ) : (
          rounds.map((round) => {
            const isExpanded = expandedRounds.has(round);
            const roundLogs = filteredLogsByRound[round] || [];
            const isHighlighted = selectedRound === round;

            return (
              <div
                key={round}
                id={`round-${round}`}
                className={`rounded-lg border transition-all duration-300
                  ${isHighlighted
                    ? 'border-accent bg-accent/5 ring-1 ring-accent/30'
                    : 'border-white/5 bg-transparent'
                  }`}
              >
                <button
                  onClick={() => toggleRound(round)}
                  className="w-full flex items-center justify-between p-3
                    hover:bg-white/5 rounded-lg
                    transition-colors duration-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-accent/20 text-accent
                      text-xs font-bold flex items-center justify-center font-mono">
                      {round}
                    </span>
                    <span className="text-sm font-medium text-white">
                      回合 {round}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({roundLogs.length} 次行动)
                    </span>
                  </div>
                  {isExpanded ? (
                    <ChevronUp size={16} className="text-gray-400" />
                  ) : (
                    <ChevronDown size={16} className="text-gray-400" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 space-y-2">
                    {roundLogs.map((log) => (
                      <LogEntryItem
                        key={log.id}
                        log={log}
                        isNew={newLogIds.has(log.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
