import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { useCaveStore } from '../stores/caveStore';
import type { SliceData } from '../stores/caveStore';

function SliceHeatMap({ data }: { data: SliceData }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 300;
    const height = 200;
    canvas.width = width;
    canvas.height = height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    const gridRes = Math.sqrt(data.densityMap.length) | 0;
    const cellW = width / gridRes;
    const cellH = height / gridRes;

    for (let y = 0; y < gridRes; y++) {
      for (let x = 0; x < gridRes; x++) {
        const idx = y * gridRes + x;
        const density = data.densityMap[idx] || 0.8;
        const r = Math.floor(density * 255);
        const g = Math.floor((1 - Math.abs(density - 0.5) * 2) * 150);
        const b = Math.floor((1 - density) * 100);
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fillRect(x * cellW, y * cellH, cellW + 1, cellH + 1);
      }
    }

    if (data.contourPoints.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;

      const scaleX = width / data.width;
      const scaleY = height / data.height;

      let started = false;
      for (const pt of data.contourPoints) {
        const px = (pt.x + data.width / 2) * scaleX;
        const py = (pt.y + data.height / 2) * scaleY;
        if (!started) {
          ctx.moveTo(px, py);
          started = true;
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();
    }
  }, [data]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    scaleRef.current = Math.max(0.5, Math.min(3, scaleRef.current * delta));
    if (canvasRef.current) {
      canvasRef.current.style.transform = `scale(${scaleRef.current}) translate(${offsetRef.current.x}px, ${offsetRef.current.y}px)`;
    }
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX - offsetRef.current.x, y: e.clientY - offsetRef.current.y };
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    offsetRef.current = { x: e.clientX - dragStartRef.current.x, y: e.clientY - dragStartRef.current.y };
    if (canvasRef.current) {
      canvasRef.current.style.transform = `scale(${scaleRef.current}) translate(${offsetRef.current.x}px, ${offsetRef.current.y}px)`;
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        overflow: 'hidden',
        borderRadius: '6px',
        cursor: 'grab',
        position: 'relative',
        height: '200px',
      }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <canvas ref={canvasRef} style={{ transformOrigin: 'center', transition: 'transform 0.1s ease' }} />
    </div>
  );
}

function FpsMonitor() {
  const fps = useCaveStore((s) => s.fps);
  const framesRef = useRef<number[]>([]);

  useEffect(() => {
    let animId: number;
    const tick = () => {
      const now = performance.now();
      framesRef.current.push(now);
      framesRef.current = framesRef.current.filter((t) => now - t < 1000);
      useCaveStore.getState().setFps(framesRef.current.length);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: '12px',
        right: '12px',
        background: 'rgba(0,0,0,0.5)',
        color: '#44ff44',
        fontFamily: 'monospace',
        fontSize: '14px',
        padding: '6px 12px',
        borderRadius: '6px',
        zIndex: 200,
        letterSpacing: '1px',
      }}
    >
      {fps} FPS
    </div>
  );
}

export default function InfoPanel() {
  const sliceData = useCaveStore((s) => s.sliceData);
  const setSliceData = useCaveStore((s) => s.setSliceData);
  const isFlying = useCaveStore((s) => s.isFlying);
  const caveData = useCaveStore((s) => s.caveData);

  const nodeCount = useMemo(() => caveData?.branchNodes.length ?? 0, [caveData]);
  const tunnelCount = useMemo(() => caveData?.tunnelMeshes.length ?? 0, [caveData]);
  const stalactiteCount = useMemo(() => caveData?.stalactites.length ?? 0, [caveData]);

  return (
    <>
      <FpsMonitor />

      {caveData && (
        <div
          style={{
            position: 'fixed',
            bottom: '16px',
            left: '300px',
            background: 'rgba(26,26,46,0.75)',
            backdropFilter: 'blur(8px)',
            border: '1px solid #4a4a6a',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#8888bb',
            fontSize: '12px',
            fontFamily: 'monospace',
            zIndex: 150,
            display: 'flex',
            gap: '16px',
          }}
        >
          <span>通道: {tunnelCount}</span>
          <span>节点: {nodeCount}</span>
          <span>钟乳石: {stalactiteCount}</span>
        </div>
      )}

      {isFlying && (
        <div
          style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#5588ff',
            fontSize: '16px',
            fontFamily: 'monospace',
            zIndex: 200,
            textShadow: '0 0 10px rgba(85,136,255,0.5)',
            pointerEvents: 'none',
            animation: 'pulse 1s ease-in-out infinite',
          }}
        >
          ✈ 飞行中...
        </div>
      )}

      {sliceData && (
        <div
          style={{
            position: 'fixed',
            right: '16px',
            top: '60px',
            width: '340px',
            background: 'rgba(26,26,46,0.9)',
            backdropFilter: 'blur(12px)',
            border: '1px solid #4a4a6a',
            borderRadius: '10px',
            padding: '16px',
            zIndex: 200,
            color: '#c8c8e0',
            fontFamily: "'Segoe UI', system-ui, sans-serif",
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 600, color: '#8888cc' }}>
              剖面视图
            </span>
            <button
              onClick={() => setSliceData(null)}
              style={{
                background: 'none',
                border: '1px solid #4a4a6a',
                color: '#8888bb',
                borderRadius: '4px',
                cursor: 'pointer',
                padding: '2px 8px',
                fontSize: '12px',
              }}
            >
              ✕
            </button>
          </div>
          <SliceHeatMap data={sliceData} />
          <div
            style={{
              marginTop: '8px',
              fontSize: '11px',
              color: '#6a6a8a',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>宽度: {sliceData.width.toFixed(1)}</span>
            <span>高度: {sliceData.height.toFixed(1)}</span>
            <span>滚轮缩放 | 拖拽平移</span>
          </div>
        </div>
      )}
    </>
  );
}
