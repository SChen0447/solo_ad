import React from 'react';
import { useCanvasStore } from '../store/canvasStore';
import { MAX_HISTORY } from '../types';

const HistoryIndicator: React.FC = () => {
  const past = useCanvasStore((s) => s.past);
  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        padding: '4px 10px',
        background: 'rgba(0, 0, 0, 0.5)',
        color: 'white',
        fontSize: 12,
        borderRadius: 6,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 30,
        letterSpacing: 0.3,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {past.length}/{MAX_HISTORY}
    </div>
  );
};

export default HistoryIndicator;
