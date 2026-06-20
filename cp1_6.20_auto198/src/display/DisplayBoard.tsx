import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagicItem } from '@/types';

interface DisplayBoardProps {
  items: MagicItem[];
  onItemDragStart: (item: MagicItem) => void;
  onItemDragEnd: () => void;
  onItemClick?: (item: MagicItem) => void;
  selectedItemId?: string | null;
}

const shapeIcons: Record<string, string> = {
  staff: '🪄',
  sword: '⚔️',
  shield: '🛡️',
  potion: '🧪',
  ring: '💍',
  amulet: '📿',
  crystal: '💎',
  book: '📖',
};

export const DisplayBoard: React.FC<DisplayBoardProps> = ({
  items,
  onItemDragStart,
  onItemDragEnd,
  onItemClick,
  selectedItemId,
}) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, item: MagicItem) => {
    e.dataTransfer.setData('itemId', item.id);
    e.dataTransfer.effectAllowed = 'move';
    onItemDragStart(item);
  };

  return (
    <div className="display-board">
      <h3 className="panel-title">物品栏</h3>
      <div className="inventory-grid">
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              className={`item-slot ${selectedItemId === item.id ? 'selected' : ''}`}
              draggable
              onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent<HTMLDivElement>, item)}
              onDragEnd={onItemDragEnd}
              onClick={() => onItemClick?.(item)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              style={{
                boxShadow: `0 0 10px ${item.color}40`,
                borderColor: item.color,
              }}
              title={`${item.name} (Lv.${item.level})\n战力: ${item.power}`}
            >
              <div className="item-icon" style={{ color: item.color }}>
                {shapeIcons[item.shape.type] || '✨'}
              </div>
              <div className="item-info">
                <span className="item-name">{item.name}</span>
                <span className="item-level">Lv.{item.level}</span>
              </div>
              <div className="item-power">
                ⚡ {item.power}
              </div>
              {item.level > 1 && (
                <div className="item-glow" style={{ background: item.color }} />
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        
        {items.length === 0 && (
          <div className="empty-inventory">
            <span className="empty-icon">📦</span>
            <span>暂无物品</span>
            <span className="empty-hint">铸造一些吧！</span>
          </div>
        )}
      </div>
      
      <div className="inventory-count">
        共 {items.length} 件物品
      </div>
    </div>
  );
};
