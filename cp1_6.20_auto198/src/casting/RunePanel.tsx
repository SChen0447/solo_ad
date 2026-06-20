import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RuneType } from '@/types';

interface RunePanelProps {
  selectedRunes: RuneType[];
  onRuneDragStart: (rune: RuneType) => void;
  onRuneClick: (rune: RuneType) => void;
  onRuneRemove: (index: number) => void;
}

const runeConfig = [
  { type: RuneType.FIRE, name: '火', color: '#FF4500', icon: '🔥' },
  { type: RuneType.WATER, name: '水', color: '#1E90FF', icon: '💧' },
  { type: RuneType.WIND, name: '风', color: '#00FA9A', icon: '🌪️' },
  { type: RuneType.EARTH, name: '土', color: '#8B4513', icon: '🪨' },
  { type: RuneType.LIGHT, name: '光', color: '#FFD700', icon: '✨' },
  { type: RuneType.DARK, name: '暗', color: '#4B0082', icon: '🌙' },
];

export const RunePanel: React.FC<RunePanelProps> = ({
  selectedRunes,
  onRuneDragStart,
  onRuneClick,
  onRuneRemove,
}) => {
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, rune: RuneType) => {
    e.dataTransfer.setData('runeType', rune);
    e.dataTransfer.effectAllowed = 'copy';
    onRuneDragStart(rune);
  };

  return (
    <div className="rune-panel">
      <h3 className="panel-title">符文架</h3>
      <div className="rune-grid">
        {runeConfig.map((rune) => (
          <motion.div
            key={rune.type}
            className="rune-item"
            draggable
            onDragStart={(e) => handleDragStart(e as unknown as React.DragEvent<HTMLDivElement>, rune.type)}
            onClick={() => onRuneClick(rune.type)}
            style={{ backgroundColor: rune.color }}
            whileHover={{ scale: 1.1, boxShadow: `0 0 20px ${rune.color}` }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.2 }}
            title={`${rune.name}符文`}
          >
            <span className="rune-icon">{rune.icon}</span>
            <span className="rune-name">{rune.name}</span>
          </motion.div>
        ))}
      </div>

      <div className="selected-runes-section">
        <h4 className="section-subtitle">已选符文 ({selectedRunes.length}/3)</h4>
        <div className="selected-runes">
          {selectedRunes.length === 0 ? (
            <div className="empty-slot">拖拽或点击符文</div>
          ) : (
            <AnimatePresence>
              {selectedRunes.map((rune, index) => {
                const config = runeConfig.find(r => r.type === rune);
                return (
                  <motion.div
                    key={`${rune}-${index}`}
                    className="selected-rune"
                    style={{ backgroundColor: config?.color }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    onClick={() => onRuneRemove(index)}
                    title="点击移除"
                  >
                    <span>{config?.icon}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
};
