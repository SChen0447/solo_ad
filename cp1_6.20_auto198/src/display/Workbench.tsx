import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MagicItem } from '@/types';

interface WorkbenchProps {
  items: MagicItem[];
  onUpgrade: (item1Id: string, item2Id: string) => Promise<MagicItem | null>;
  isUpgrading: boolean;
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

export const Workbench: React.FC<WorkbenchProps> = ({
  items,
  onUpgrade,
  isUpgrading,
}) => {
  const [slot1Item, setSlot1Item] = useState<MagicItem | null>(null);
  const [slot2Item, setSlot2Item] = useState<MagicItem | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const itemId = e.dataTransfer.getData('itemId');
    if (!itemId) return;

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    if (!slot1Item) {
      setSlot1Item(item);
    } else if (!slot2Item && slot1Item.id !== item.id) {
      setSlot2Item(item);
    }
  };

  const handleUpgrade = async () => {
    if (!slot1Item || !slot2Item || isUpgrading) return;
    
    const result = await onUpgrade(slot1Item.id, slot2Item.id);
    if (result) {
      setSlot1Item(null);
      setSlot2Item(null);
    }
  };

  const handleClearSlot = (slot: 1 | 2) => {
    if (isUpgrading) return;
    if (slot === 1) {
      setSlot1Item(null);
    } else {
      setSlot2Item(null);
    }
  };

  const canUpgrade = slot1Item && slot2Item && !isUpgrading;

  const renderSlot = (item: MagicItem | null, slot: 1 | 2) => {
    if (item) {
      return (
        <motion.div
          className={`workbench-slot filled ${isUpgrading ? 'upgrading' : ''}`}
          onClick={() => handleClearSlot(slot)}
          style={{ borderColor: item.color }}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
          title="点击移除"
        >
          <div className="slot-icon" style={{ color: item.color }}>
            {shapeIcons[item.shape.type] || '✨'}
          </div>
          <div className="slot-name">{item.name}</div>
          <div className="slot-power">⚡ {item.power}</div>
          {item.level > 1 && (
            <div className="slot-glow" style={{ background: item.color }} />
          )}
        </motion.div>
      );
    }

    return (
      <div className="workbench-slot empty">
        <span className="slot-placeholder">+</span>
        <span className="slot-hint">拖入物品</span>
      </div>
    );
  };

  return (
    <div
      className={`workbench-container ${isDragOver ? 'drag-over' : ''} ${slot1Item || slot2Item ? 'has-items' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="workbench-title">
        <span>🔧 融合工作台</span>
      </div>
      
      <div className="workbench-surface">
        <div className="workbench-slots">
          {renderSlot(slot1Item, 1)}
          
          <div className="fusion-symbol">
            <AnimatePresence mode="wait">
              {isUpgrading ? (
                <motion.div
                  key="spinner"
                  className="fusion-spinner"
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  ⚛️
                </motion.div>
              ) : (
                <motion.div
                  key="plus"
                  className="fusion-plus"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                >
                  +
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {renderSlot(slot2Item, 2)}
        </div>

        {canUpgrade && (
          <motion.button
            className="fusion-button"
            onClick={handleUpgrade}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            disabled={isUpgrading}
          >
            ⚡ 融合升级
          </motion.button>
        )}
      </div>

      {slot1Item && slot2Item && (
        <div className="workbench-hint">
          融合后将获得更强力的物品！
        </div>
      )}
    </div>
  );
};
