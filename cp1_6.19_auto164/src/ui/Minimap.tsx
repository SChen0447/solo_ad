import React, { useRef, useEffect } from 'react';

interface MinimapProps {
  heightGrid: number[][];
  maxHeight: number;
}

export const Minimap: React.FC<MinimapProps> = ({ heightGrid, maxHeight }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const gridSize = heightGrid.length;
    const cellSize = size / gridSize;

    ctx.fillStyle = '#0A1628';
    ctx.fillRect(0, 0, size, size);

    const effectiveMaxHeight = Math.max(maxHeight, 0.1);

    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        const height = Math.max(0, heightGrid[i]?.[j] || 0);
        const normalizedHeight = Math.min(1, height / effectiveMaxHeight);

        const r = Math.floor(normalizedHeight * 200 + 55);
        const g = Math.floor((1 - Math.abs(normalizedHeight - 0.5) * 2) * 180 + 30);
        const b = Math.floor((1 - normalizedHeight) * 220 + 35);

        ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
        ctx.fillRect(i * cellSize, j * cellSize, cellSize + 0.5, cellSize + 0.5);
      }
    }

    ctx.strokeStyle = 'rgba(74, 144, 217, 0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, size, size);
  }, [heightGrid, maxHeight]);

  return (
    <div
      style={{
        background: 'rgba(20, 30, 45, 0.75)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(74, 144, 217, 0.25)',
        borderRadius: '12px',
        padding: '12px',
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
      }}
    >
      <div
        style={{
          color: '#B8C5D6',
          fontSize: '12px',
          fontWeight: 500,
          marginBottom: '8px',
          textAlign: 'center',
        }}
      >
        俯视图
      </div>
      <canvas
        ref={canvasRef}
        width={120}
        height={120}
        style={{
          display: 'block',
          borderRadius: '6px',
        }}
      />
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: '6px',
          fontSize: '10px',
        }}
      >
        <span style={{ color: '#4A90D9' }}>低</span>
        <span style={{ color: '#FF6B4A' }}>高</span>
      </div>
    </div>
  );
};

export default Minimap;
