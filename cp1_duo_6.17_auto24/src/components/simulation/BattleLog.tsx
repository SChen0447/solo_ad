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

  useEffect(() => {
    if (isNew) {
      setShowDamage(true);
      const timer = setTimeout(() => setShowDamage(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [isNew]);

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
        hover:bg-secondary/60 transition-all duration-300
        ${isNew ? 'animate-slide-up' : ''}`}
    >
      <div className="flex flex-wrap items-center gap-1 text-sm">
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
          <span className="ml-2 text-red-400 font-bold animate-miss-float inline-block">
            Miss!
          </span>
        ) : (
          <div className="relative ml-2">
            <span className="text-gray-400">造成</span>
            <span
              className={`ml-1 font-mono font-bold
                ${log.isCrit ? 'text-orange-400' : 'text-white'}`}
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
    </div>
  );
};

export const BattleLog: React.FC<BattleLogProps> = ({ characters, monsters }) => {
  const { battleLogs, logFilter, totalRounds, setLogFilter, setJumpToRound } = useGameStore();
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set());
  const [selectedRound, setSelectedRound] = useState<number | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const latestRoundRef = useRef<number>(0);

  const allUnits = useMemo(() => [...characters, ...monsters], [characters, monsters]);
  const unitNames = useMemo(() => {
    const names: Record<string, string> = {};
    allUnits.forEach((u) => {
      names[u.id] = u.name;
    });
    return names;
  }, [allUnits]);

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

  useEffect(() => {
    if (battleLogs.length > 0 && logContainerRef.current) {
      const lastLog = battleLogs[battleLogs.length - 1];
      if (lastLog.round !== latestRoundRef.current) {
        latestRoundRef.current = lastLog.round;
        setExpandedRounds((prev) => new Set([...prev, lastLog.round]));

        requestAnimationFrame(() => {
          if (logContainerRef.current) {
            logContainerRef.current.scrollTo({
              top: logContainerRef.current.scrollHeight,
              behavior: 'smooth',
            });
          }
        });
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
    },
    [setJump