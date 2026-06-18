import React, { useState } from 'react';
import { useBattleStore } from '../store/useBattleStore';
import type { ActionQueueItem, Character } from '../types';

interface QueueItemProps {
  action: ActionQueueItem;
  character: Character;
  isExecuting: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: () => void;
  onClick: () => void;
}

const QueueItem: React.FC<QueueItemProps> = ({
  action,
  character,
  isExecuting,
  onDragStart,
  onDragOver,
  onDrop,
  onClick,
}) => {
  const [isDragging, setIsDragging] = useState(false);

  const skill = character.skills.find(s => s.id === action.skillId);

  return (
    <div
      draggable
      onDragStart={(e) => {
        setIsDragging(true);
        e.dataTransfer.effectAllowed = 'move';
        onDragStart();
      }}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={onDragOver}
      onDrop={(e) => {
        e.preventDefault();
        onDrop();
      }}
      onClick={onClick}
      className={`
        relative flex items-center gap-2 p-2 rounded-lg cursor-pointer
        transition-all duration-200 border-2
        ${isDragging ? 'opacity-50 scale-95' : ''}
        ${isExecuting 
          ? 'border-[#f5a623] bg-[#f5a623]/20 scale-110 shadow-lg shadow-[#f5a623]/30' 
          : 'border-gray-600 bg-gray-800/80 hover:border-gray-500'
        }
      `}
    >
      <div className={`
        absolute -left-2 -top-2 w-5 h-5 rounded-full text-xs font-bold
        flex items-center justify-center bg-[#e94560] text-white
      `}>
        {action.order + 1}
      </div>
      
      <div className={`
        w-10 h-10 rounded-lg flex items-center justify-center text-xl
        ${character.team === 'A' ? 'bg-blue-900/80 border border-blue-500' : 'bg-red-900/80 border border-red-500'}
      `}>
        {character.avatar}
      </div>
      
      <div className="min-w-0">
        <div className="text-sm font-semibold text-white truncate max-w-[100px]">
          {character.name}
        </div>
        <div className="text-xs text-gray-400 truncate max-w-[100px]">
          {skill?.name}
        </div>
      </div>
      
      {isExecuting && (
        <div className="absolute -right-1 -top-1">
          <div className="w-3 h-3 bg-[#f5a623] rounded-full animate-ping" />
          <div className="absolute inset-0 w-3 h-3 bg-[#f5a623] rounded-full" />
        </div>
      )}
    </div>
  );
};

export const ActionQueue: React.FC = () => {
  const {
    actionQueue,
    characters,
    phase,
    executingActionIndex,
    isExecuting,
    reorderAction,
    removeAction,
    startExecuteTurn,
    resetBattle,
  } = useBattleStore();

  const [draggedActionId, setDraggedActionId] = useState<string | null>(null);

  const getCharacter = (charId: string) => characters.find(c => c.id === charId);

  const handleDragStart = (actionId: string) => {
    setDraggedActionId(actionId);
  };

  const handleDrop = (targetOrder: number) => {
    if (draggedActionId && phase === 'planning') {
      reorderAction({ actionId: draggedActionId, newOrder: targetOrder });
    }
    setDraggedActionId(null);
  };

  const canExecute = phase === 'planning' && actionQueue.length > 0;
  const canReset = phase === 'result';

  return (
    <div className="bg-[#16213e] rounded-xl p-4 border border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[#f5a623]">⚡ 行动队列</h3>
        <div className="flex gap-2">
          {phase === 'planning' && actionQueue.length > 0 && (
            <span className="text-xs text-gray-400">
              拖拽调整顺序 | 点击移除
            </span>
          )}
          
          {canReset && (
            <button
              onClick={resetBattle}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              🔄 重新开始
            </button>
          )}
          
          <button
            onClick={startExecuteTurn}
            disabled={!canExecute}
            className={`
              px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200
              ${canExecute
                ? 'bg-gradient-to-r from-[#e94560] to-[#f5a623] text-white hover:scale-105 hover:shadow-lg hover:shadow-[#e94560]/30'
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {isExecuting ? '⏳ 执行中...' : '▶️ 执行回合'}
          </button>
        </div>
      </div>
      
      <div className="min-h-[80px] bg-gray-900/50 rounded-lg p-3">
        {actionQueue.length === 0 ? (
          <div className="flex items-center justify-center h-16 text-gray-500 text-sm">
            {phase === 'planning' 
              ? '选择角色技能加入行动队列' 
              : phase === 'executing'
              ? '正在执行回合...'
              : phase === 'result'
              ? '战斗已结束'
              : '请先部署角色'}
          </div>
        ) : (
          <div className="flex gap-3 items-center overflow-x-auto pb-2">
            {actionQueue
              .sort((a, b) => a.order - b.order)
              .map((action) => {
                const char = getCharacter(action.characterId);
                if (!char) return null;
                
                return (
                  <QueueItem
                    key={action.id}
                    action={action}
                    character={char}
                    isExecuting={phase === 'executing' && action.order === executingActionIndex}
                    onDragStart={() => handleDragStart(action.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(action.order)}
                    onClick={() => {
                      if (phase === 'planning') {
                        removeAction(action.id);
                      }
                    }}
                  />
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
};
