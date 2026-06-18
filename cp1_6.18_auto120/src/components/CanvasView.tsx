import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useAcousticStore } from '../store';
import { simulateReflections } from '../simulation/waveSimulator';
import {
  generateHeatmap,
  generateHeatmapInfo,
  splToColor,
  GRID_RESOLUTION,
} from '../simulation/heatmapGenerator';
import { Point } from '../simulation/roomModel';

const CanvasView: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const [localCanvasSize, setLocalCanvasSize] = useState({ width: 800, height: 600 });

  const {
    walls,
    sources,
    selectedSourceId,
    toolMode,
    drawing,
    isSimulating,
    simulationStartTime,
    reflectionPaths,
    heatmap,
    heatmapInfo,
    hoveredPoint,
    hoveredInfo,
    addWallPoint,
    finishDrawing,
    cancelDrawing,
    addSource,
    selectSource,
    setReflectionPaths,
    setHeatmap,
    setHeatmapInfo,
    setHoveredPoint,
    setHoveredInfo,
    setCanvasSize,
    moveWallEndpoint,
  } = useAcousticStore();

  const pulsePhaseRef = useRef(0);
  const heatmapReadyRef = useRef(false);
  const lastSimCalcRef = useRef(0);

  const getCanvasPoint = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): Point => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  useEffect(() => {
    const container = canvasRef.current?.parentElement;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.floor(entry.contentRect.width);
        const h = Math.floor(entry.contentRect.height);
        if (w > 0 && h > 0) {
          setCanvasSize(w, h);
          setLocalCanvasSize({ width: w, height: h });
        }
      }
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isSimulating && walls.length >= 3 && sources.length > 0) {
      const now = Date.now();
      if (now - lastSimCalcRef.current > 150 || reflectionPaths.length === 0) {
        lastSimCalcRef.current = now;
        const config = {
          walls,
          sources,
          width: localCanvasSize.width,
          height: localCanvasSize.height,
        };

        const reducedRays = 72;
        const sampledSources = sources.map((s) => s);
        const paths = simulateReflections({
          ...config,
          sources: sampledSources,
        });
        setReflectionPaths(paths);

        if (simulationStartTime && Date.now() - simulationStartTime > 3000 && !heatmapReadyRef.current) {
          const hm = generateHeatmap(paths, localCanvasSize.width, localCanvasSize.height);
          setHeatmap(hm);
          const info = generateHeatmapInfo(paths, localCanvasSize.width, localCanvasSize.height);
          setHeatmapInfo(info);
          heatmapReadyRef.current = true;
        }
      }
    } else {
      heatmapReadyRef.current = false;
    }
  }, [isSimulating, walls, sources, localCanvasSize, simulationStartTime]);

  useEffect(() => {
    if (!simulationStartTime) return;
    heatmapReadyRef.current = false;
  }, [simulationStartTime]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pt = getCanvasPoint(e);

      if (toolMode === 'wall') {
        addWallPoint(pt);
        return;
      }

      if (toolMode === 'source') {
        addSource('point', pt);
        return;
      }

      for (const source of sources) {
        const dx = source.position.x - pt.x;
        const dy = source.position.y - pt.y;
        if (Math.sqrt(dx * dx + dy * dy) < 15) {
          selectSource(source.id);
          return;
        }
      }
      selectSource(null);
    },
    [toolMode, sources, getCanvasPoint, addWallPoint, addSource, selectSource]
  );

  const handleCanvasDblClick = useCallback(() => {
    if (toolMode === 'wall' && drawing.isDrawing && drawing.currentPoints.length >= 3) {
      finishDrawing();
    }
  }, [toolMode, drawing, finishDrawing]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pt = getCanvasPoint(e);
      setHoveredPoint(pt);

      if (heatmapInfo) {
        const col = Math.floor(pt.x / GRID_RESOLUTION);
        const row = Math.floor(pt.y / GRID_RESOLUTION);
        if (row >= 0 && row < heatmapInfo.length && col >= 0 && col < heatmapInfo[0].length) {
          const info = heatmapInfo[row][col];
          setHoveredInfo({ spl: info.spl, source: info.dominantSource });
        } else {
          setHoveredInfo(null);
        }
      } else {
        setHoveredInfo(null);
      }
    },
    [heatmapInfo, getCanvasPoint, setHoveredPoint, setHoveredInfo]
  );

  const handleMouseLeave = useCallback(() => {
    setHoveredPoint(null);
    setHoveredInfo(null);
  }, [setHoveredPoint, setHoveredInfo]);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    const gridSize = 20;
    for (let x = 0; x <= w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }, []);

  const drawWalls = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.strokeStyle = '#00bcd4';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#00bcd4';
      ctx.shadowBlur = 8;

      for (const wall of walls) {
        ctx.beginPath();
        ctx.moveTo(wall.start.x, wall.start.y);
        ctx.lineTo(wall.end.x, wall.end.y);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;

      if (walls.length > 0) {
        ctx.fillStyle = 'rgba(0,188,212,0.05)';
        ctx.beginPath();
        ctx.moveTo(walls[0].start.x, walls[0].start.y);
        for (const wall of walls) {
          ctx.lineTo(wall.end.x, wall.end.y);
        }
        ctx.closePath();
        ctx.fill();
      }

      for (const wall of walls) {
        if (wall.label) {
          const mx = (wall.start.x + wall.end.x) / 2;
          const my = (wall.start.y + wall.end.y) / 2;
          ctx.font = '11px sans-serif';
          ctx.fillStyle = 'rgba(0,188,212,0.6)';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(wall.label, mx, my - 10);
        }
      }
    },
    [walls]
  );

  const drawDrawingPreview = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!drawing.isDrawing || drawing.currentPoints.length === 0) return;

      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(drawing.currentPoints[0].x, drawing.currentPoints[0].y);
      for (let i = 1; i < drawing.currentPoints.length; i++) {
        ctx.lineTo(drawing.currentPoints[i].x, drawing.currentPoints[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      for (const pt of drawing.currentPoints) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#00e5ff';
        ctx.fill();
      }
    },
    [drawing]
  );

  const drawSources = useCallback(
    (ctx: CanvasRenderingContext2D, phase: number) => {
      for (const source of sources) {
        const isSelected = source.id === selectedSourceId;

        const t = Math.min(1, Math.max(0, (source.frequency - 100) / 4900));
        const r = Math.round(255 * (1 - t));
        const g = Math.round(100 * (1 - Math.abs(t - 0.5) * 2));
        const b = Math.round(255 * t);
        const color = `rgb(${r},${g},${b})`;

        for (let ring = 0; ring < 3; ring++) {
          const ringPhase = (phase + ring * 0.33) % 1;
          const radius = 8 + ringPhase * 30;
          const alpha = (1 - ringPhase) * 0.6;
          ctx.beginPath();
          ctx.arc(source.position.x, source.position.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(source.position.x, source.position.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (isSelected) {
          ctx.beginPath();
          ctx.arc(source.position.x, source.position.y, 12, 0, Math.PI * 2);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.font = '10px sans-serif';
        ctx.fillStyle = '#e0e0e0';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(
          `${source.frequency}Hz ${source.volume}dB`,
          source.position.x,
          source.position.y + 14
        );
      }
    },
    [sources, selectedSourceId]
  );

  const drawPulseWaves = useCallback(
    (ctx: CanvasRenderingContext2D, time: number) => {
      if (!isSimulating) return;

      const elapsed = (time - startTimeRef.current) / 1000;

      for (const source of sources) {
        const t = Math.min(1, Math.max(0, (source.frequency - 100) / 4900));
        const r = Math.round(255 * (1 - t));
        const g = Math.round(100 * (1 - Math.abs(t - 0.5) * 2));
        const b = Math.round(255 * t);

        const maxRadius = Math.max(localCanvasSize.width, localCanvasSize.height);
        const waveSpeed = 150;
        const numWaves = 5;

        for (let i = 0; i < numWaves; i++) {
          const waveElapsed = elapsed - i * 0.3;
          if (waveElapsed < 0) continue;

          const radius = waveElapsed * waveSpeed;
          if (radius > maxRadius * 1.5) continue;

          const alpha = Math.max(0, 0.4 * (1 - radius / (maxRadius * 1.2)));
          ctx.beginPath();
          ctx.arc(source.position.x, source.position.y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    },
    [isSimulating, sources, localCanvasSize]
  );

  const drawReflectionPaths = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!isSimulating || reflectionPaths.length === 0) return;

      const step = Math.max(1, Math.floor(reflectionPaths.length / 72));

      for (let i = 0; i < reflectionPaths.length; i += step) {
        const path = reflectionPaths[i];

        for (const segment of path.segments) {
          let strokeColor: string;
          let lineWidth: number;
          let alpha: number;

          if (segment.reflectionOrder === 0) {
            strokeColor = path.color;
            lineWidth = 1;
            alpha = 0.3;
          } else if (segment.reflectionOrder === 1) {
            strokeColor = '#ffffff';
            lineWidth = 1.5;
            alpha = 0.6;
          } else if (segment.reflectionOrder === 2) {
            strokeColor = '#aaaaaa';
            lineWidth = 1;
            alpha = 0.4;
          } else {
            strokeColor = '#888888';
            lineWidth = 0.5;
            alpha = Math.max(0.05, 0.3 - segment.reflectionOrder * 0.05);
          }

          ctx.beginPath();
          ctx.moveTo(segment.start.x, segment.start.y);
          ctx.lineTo(segment.end.x, segment.end.y);
          ctx.strokeStyle =
            strokeColor.startsWith('rgb(') || strokeColor.startsWith('rgba(')
              ? strokeColor.replace(')', `,${alpha})`).replace('rgb(', 'rgba(')
              : `${strokeColor}`;
          ctx.globalAlpha = alpha;
          ctx.lineWidth = lineWidth;
          ctx.stroke();
          ctx.globalAlpha = 1;

          if (segment.reflectionOrder <= 2) {
            ctx.beginPath();
            ctx.arc(segment.end.x, segment.end.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = segment.reflectionOrder === 1 ? '#ffffff' : '#aaaaaa';
            ctx.globalAlpha = alpha;
            ctx.fill();
            ctx.globalAlpha = 1;
          }

          if (segment.reflectionOrder >= 1 && segment.reflectionOrder <= 3) {
            ctx.font = '9px sans-serif';
            ctx.fillStyle = `rgba(200,200,200,${alpha})`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText(`${segment.splAtEnd}dB`, segment.end.x + 5, segment.end.y - 3);
          }
        }
      }
    },
    [isSimulating, reflectionPaths]
  );

  const drawHeatmap = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!heatmap || !isSimulating) return;

      let minSPL = Infinity;
      let maxSPL = -Infinity;
      for (const row of heatmap) {
        for (const val of row) {
          if (val < minSPL) minSPL = val;
          if (val > maxSPL) maxSPL = val;
        }
      }

      const cols = heatmap[0]?.length || 0;
      const rows = heatmap.length;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const color = splToColor(heatmap[r][c], minSPL, maxSPL);
          ctx.fillStyle = color;
          ctx.globalAlpha = 0.35;
          ctx.fillRect(c * GRID_RESOLUTION, r * GRID_RESOLUTION, GRID_RESOLUTION, GRID_RESOLUTION);
        }
      }
      ctx.globalAlpha = 1;
    },
    [heatmap, isSimulating]
  );

  const drawHoverInfo = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!hoveredPoint || !hoveredInfo) return;

      const px = hoveredPoint.x;
      const py = hoveredPoint.y;

      ctx.beginPath();
      ctx.arc(px, py, 6, 0, Math.PI * 2);
      ctx.strokeStyle = '#00e5ff';
      ctx.lineWidth = 2;
      ctx.stroke();

      const text1 = `${hoveredInfo.spl} dB`;
      const text2 = hoveredInfo.source || '';

      ctx.font = '12px sans-serif';
      const tw = Math.max(ctx.measureText(text1).width, ctx.measureText(text2).width);

      const boxX = px + 15;
      const boxY = py - 30;
      const boxW = tw + 16;
      const boxH = text2 ? 38 : 22;

      ctx.fillStyle = 'rgba(20,20,40,0.85)';
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 6);
      ctx.fill();

      ctx.strokeStyle = 'rgba(0,188,212,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(boxX, boxY, boxW, boxH, 6);
      ctx.stroke();

      ctx.fillStyle = '#00e5ff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(text1, boxX + 8, boxY + 4);

      if (text2) {
        ctx.fillStyle = '#aaaaaa';
        ctx.font = '10px sans-serif';
        ctx.fillText(text2, boxX + 8, boxY + 20);
      }
    },
    [hoveredPoint, hoveredInfo]
  );

  const render = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      if (!startTimeRef.current) startTimeRef.current = timestamp;
      pulsePhaseRef.current = ((timestamp - startTimeRef.current) / 1500) % 1;

      const w = localCanvasSize.width;
      const h = localCanvasSize.height;

      canvas.width = w * (window.devicePixelRatio || 1);
      canvas.height = h * (window.devicePixelRatio || 1);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = 'rgba(22,33,62,0.3)';
      ctx.fillRect(0, 0, w, h);

      drawGrid(ctx, w, h);
      drawHeatmap(ctx);
      drawWalls(ctx);
      drawDrawingPreview(ctx);
      drawPulseWaves(ctx, timestamp);
      drawReflectionPaths(ctx);
      drawSources(ctx, pulsePhaseRef.current);
      drawHoverInfo(ctx);

      animFrameRef.current = requestAnimationFrame(render);
    },
    [
      localCanvasSize,
      drawGrid,
      drawWalls,
      drawDrawingPreview,
      drawPulseWaves,
      drawReflectionPaths,
      drawSources,
      drawHeatmap,
      drawHoverInfo,
    ]
  );

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      if (drawing.isDrawing) {
        cancelDrawing();
      }
    },
    [drawing, cancelDrawing]
  );

  return (
    <canvas
      ref={canvasRef}
      onClick={handleCanvasClick}
      onDoubleClick={handleCanvasDblClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
      style={{
        display: 'block',
        width: '100%',
        height: '100%',
        cursor:
          toolMode === 'wall'
            ? 'crosshair'
            : toolMode === 'source'
            ? 'copy'
            : 'default',
        boxShadow: '0 0 40px rgba(0,188,212,0.15), inset 0 0 60px rgba(0,0,0,0.3)',
        borderRadius: '4px',
      }}
    />
  );
};

export default CanvasView;
