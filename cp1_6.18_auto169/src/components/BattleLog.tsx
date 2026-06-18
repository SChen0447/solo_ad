import React, { useEffect, useRef } from 'react';
import { useBattleStore } from '../store/useBattleStore';
import type { BattleEvent } from '../types';

const getEventColor = (type: BattleEvent['type']): string => {
  switch (type) {
    case 'damage':
      return 'text-red-400';
    case 'heal':
      return 'text-green-400';
    case 'status':
      return 'text-purple-400';
    case 'combo':
      return 'text-[#f5a623] font-bold';
    case 'action':
      return 'text-blue-400';
    case 'system':
      return 'text-gray-400';
    default:
      return 'text-white';
  }
};

const getEventIcon = (type: BattleEvent['type']): string => {
  switch (type) {
    case 'damage':
      return '⚔️';
    case 'heal':
      return '💚';
    case 'status':
      return '✨';
    case 'combo':
      return '💥';
    case 'action':
      return '🎯';
    case 'system':
      return '📢';
    default:
      return '•';
  }
};

interface LogItemProps {
  event: BattleEvent;
  isNew: boolean;
}

const LogItem: React.FC<LogItemProps> = ({ event, isNew }) => {
  return (
    <div
      className={`
        text-sm py-1 px-2 rounded transition-all duration-300
        ${getEventColor(event.type)}
        ${isNew ? 'bg-white/5 animate-slide-in' : ''}
        hover:bg-white/10
      `}
    >
      <span className="mr-1">{getEventIcon(event.type)}</span>
      {event.message}
    </div>
  );
};

export const BattleLog: React.FC = () => {
  const { eventLog } = useBattleStore();
  const logEndRef = useRef<HTMLDivElement>(null);
  const [visibleLog, setVisibleLog] = React.useState<BattleEvent[]>([]);
  const lastEventId = eventLog[eventLog.length - 1]?.id;

  useEffect(() => {
    if (eventLog.length > 100) {
      setVisibleLog(eventLog.slice(-100));
    } else {
      setVisibleLog([...eventLog]);
    }
  }, [eventLog.length, lastEventId]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleLog.length]);

  return (
    <div className="bg-[#16213e] rounded-xl border border-gray-700 flex flex-col h-full">
      <div className="p-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="font-bold text-[#f5a623]">📜 战斗日志</h3>
        <span className="text-xs text-gray-500">
          {eventLog.length} 条记录
        </span>
      </div>
      
      <div className="flex-1 overflow-y-auto p-2 space-y-0.5 max-h-[300px]">
        {visibleLog.map((event, index) => (
          <LogItem
            key={event.id}
            event={event}
            isNew={index === visibleLog.length - 1}
          />
        ))}
        <div ref={logEndRef} />
      </div>
    </div>
  );
};
