import React, { useEffect, useRef, useState, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import { PhysicsEngine } from './physicsEngine';
import { ShapesManager } from './shapesManager';
import { Renderer } from './renderer';
import {
  PhysicsParams,
  Point,
  CreateMode,
  DraggedInfo,
  Rope,
  Cloth,
} from './types';

const CONTROL_PANEL_WIDTH = 200;
const PICK_RADIUS = 12;
const DRAG_THRESHOLD = 5;

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const physicsEngineRef = useRef<PhysicsEngine | null>(null);
  const shapesManagerRef = useRef<ShapesManager | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const createModeRef = useRef<CreateMode>('none');
  const ropeStartRef = useRef<Point | null>(null);
  const clothStartRef = useRef<Point | null>(null);
  const mouseDownPosRef = useRef<Point | null>(null);
  const mousePosRef = useRef<Point>({ x: 0, y: 0 });
  const draggedRef = useRef<DraggedInfo | null>(null);
  const hasDraggedRef = useRef(false);
  const attachmentCandidateRef = useRef<{
    cloth: Cloth;
    particleIndex: number;
  } | null>(null);

  const [params, setParams] = useState<PhysicsParams>({
    gravity: 1,
    airResistance: 0.02,
    elasticity: 200,
  });

  const [isDragging, setIsDragging] = useState(false);

  const getCanvasPos = useCallback((e: MouseEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const resizeCanvas = useCallback(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas || !rendererRef.current) return;

    const width = window.innerWidth - CONTROL_PANEL_WIDTH;
    const height = window.innerHeight;
    rendererRef.current.resize(width, height);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    physicsEngineRef.current = new PhysicsEngine();
    shapesManagerRef.current = new ShapesManager();
    rendererRef.current = new Renderer(canvas);

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [resizeCanvas]);

  useEffect(() => {
    if (physicsEngineRef.current) {
      physicsEngineRef.current.setParams(params);
    }
  }, [params]);

  useEffect(() => {
    const animate = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 1 / 30);
      lastTimeRef.current = time;

      if (physicsEngineRef.current && rendererRef.current) {
        physicsEngineRef.current.update(dt);

        const world = physicsEngineRef.current.getWorld();
        rendererRef.current.render(world, {
          createMode: createModeRef.current,
          ropeStart: ropeStartRef.current,
          mousePos: mousePosRef.current,
          clothStart: clothStartRef.current,
          draggedParticle: draggedRef.current?.particle || null,
          attachmentCandidate: attachmentCandidateRef.current,
          isDragging: isDragging,
        });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastTimeRef.current = performance.now();
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isDragging]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getCanvasPos(e.nativeEvent);
      mouseDownPosRef.current = pos;
      mousePosRef.current = pos;
      hasDraggedRef.current = false;

      if (!physicsEngineRef.current) return;

      const hit = physicsEngineRef.current.getParticleAt(pos.x, pos.y, PICK_RADIUS);

      if (hit) {
        draggedRef.current = {
          particle: hit.particle,
          parent: hit.parent,
          parentType: hit.parentType,
          parentId: hit.parentId,
          particleIndex: hit.index,
          offsetX: pos.x - hit.particle.x,
          offsetY: pos.y - hit.particle.y,
        };
        setIsDragging(true);

        if (
          hit.parentType === 'rope' &&
          physicsEngineRef.current.isRopeEndpoint(hit.parentId, hit.index)
        ) {
          const candidate = physicsEngineRef.current.checkAttachmentCandidate(
            hit.particle,
            pos
          );
          attachmentCandidateRef.current = candidate;
        }
      } else {
        if (createModeRef.current === 'none') {
          createModeRef.current = 'rope-first';
          ropeStartRef.current = pos;
        }
      }
    },
    [getCanvasPos]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getCanvasPos(e.nativeEvent);
      mousePosRef.current = pos;

      if (mouseDownPosRef.current && !hasDraggedRef.current) {
        const dx = pos.x - mouseDownPosRef.current.x;
        const dy = pos.y - mouseDownPosRef.current.y;
        if (Math.sqrt(dx * dx + dy * dy) > DRAG_THRESHOLD) {
          hasDraggedRef.current = true;

          if (createModeRef.current === 'rope-first' && ropeStartRef.current) {
            createModeRef.current = 'cloth-dragging';
            clothStartRef.current = ropeStartRef.current;
            ropeStartRef.current = null;
          }
        }
      }

      if (draggedRef.current && physicsEngineRef.current) {
        const newX = pos.x - draggedRef.current.offsetX;
        const newY = pos.y - draggedRef.current.offsetY;

        draggedRef.current.particle.x = newX;
        draggedRef.current.particle.y = newY;
        draggedRef.current.particle.oldX = newX;
        draggedRef.current.particle.oldY = newY;

        if (
          draggedRef.current.parentType === 'rope' &&
          physicsEngineRef.current.isRopeEndpoint(
            draggedRef.current.parentId,
            draggedRef.current.particleIndex
          )
        ) {
          const candidate = physicsEngineRef.current.checkAttachmentCandidate(
            draggedRef.current.particle,
            pos
          );
          attachmentCandidateRef.current = candidate;
        }
      }
    },
    [getCanvasPos]
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const pos = getCanvasPos(e.nativeEvent);

      if (
        draggedRef.current &&
        attachmentCandidateRef.current &&
        draggedRef.current.parentType === 'rope' &&
        physicsEngineRef.current &&
        shapesManagerRef.current
      ) {
        physicsEngineRef.current.createAttachment(
          draggedRef.current.parent as Rope,
          draggedRef.current.particleIndex,
          attachmentCandidateRef.current.cloth,
          attachmentCandidateRef.current.particleIndex
        );
      }

      if (!hasDraggedRef.current && !draggedRef.current) {
        if (createModeRef.current === 'rope-first' && ropeStartRef.current) {
          if (shapesManagerRef.current && physicsEngineRef.current) {
            const rope = shapesManagerRef.current.createRope(ropeStartRef.current, pos);
            physicsEngineRef.current.addRope(rope);
          }
          createModeRef.current = 'none';
          ropeStartRef.current = null;
        }
      } else if (
        createModeRef.current === 'cloth-dragging' &&
        clothStartRef.current &&
        shapesManagerRef.current &&
        physicsEngineRef.current
      ) {
        const rect = {
          x: Math.min(clothStartRef.current.x, pos.x),
          y: Math.min(clothStartRef.current.y, pos.y),
          width: Math.abs(pos.x - clothStartRef.current.x),
          height: Math.abs(pos.y - clothStartRef.current.y),
        };

        if (rect.width > 30 && rect.height > 30) {
          const cloth = shapesManagerRef.current.createCloth(rect);
          physicsEngineRef.current.addCloth(cloth);
        }

        createModeRef.current = 'none';
        clothStartRef.current = null;
      }

      draggedRef.current = null;
      attachmentCandidateRef.current = null;
      mouseDownPosRef.current = null;
      setIsDragging(false);
    },
    [getCanvasPos]
  );

  const handleMouseLeave = useCallback(() => {
    if (!hasDraggedRef.current && !draggedRef.current) {
      createModeRef.current = 'none';
      ropeStartRef.current = null;
    }
    draggedRef.current = null;
    attachmentCandidateRef.current = null;
    mouseDownPosRef.current = null;
    clothStartRef.current = null;
    setIsDragging(false);
  }, []);

  const handleParamChange = (key: keyof PhysicsParams, value: number) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div
      ref={containerRef}
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: isDragging ? 'grabbing' : 'grab',
          flex: 1,
          display: 'block',
        }}
      />
      <div
        style={{
          width: CONTROL_PANEL_WIDTH,
          background: '#2d3748',
          padding: '20px',
          color: 'white',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px',
          boxShadow: '-2px 0 10px rgba(0,0,0,0.3)',
        }}
      >
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 600,
            margin: 0,
            paddingBottom: '12px',
            borderBottom: '1px solid #4a5568',
          }}
        >
          物理参数
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <label style={{ fontSize: '14px', color: '#e2e8f0' }}>重力强度</label>
            <span
              style={{
                fontSize: '14px',
                fontFamily: 'monospace',
                color: '#60a5fa',
                minWidth: '40px',
                textAlign: 'right',
              }}
            >
              {params.gravity.toFixed(1)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={params.gravity}
            onChange={e => handleParamChange('gravity', parseFloat(e.target.value))}
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: '#4a5568',
              outline: 'none',
              cursor: 'pointer',
              accentColor: '#38bdf8',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <label style={{ fontSize: '14px', color: '#e2e8f0' }}>空气阻力</label>
            <span
              style={{
                fontSize: '14px',
                fontFamily: 'monospace',
                color: '#60a5fa',
                minWidth: '40px',
                textAlign: 'right',
              }}
            >
              {params.airResistance.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={params.airResistance}
            onChange={e =>
              handleParamChange('airResistance', parseFloat(e.target.value))
            }
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: '#4a5568',
              outline: 'none',
              cursor: 'pointer',
              accentColor: '#38bdf8',
            }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <label style={{ fontSize: '14px', color: '#e2e8f0' }}>弹性系数</label>
            <span
              style={{
                fontSize: '14px',
                fontFamily: 'monospace',
                color: '#60a5fa',
                minWidth: '40px',
                textAlign: 'right',
              }}
            >
              {params.elasticity}
            </span>
          </div>
          <input
            type="range"
            min="50"
            max="500"
            step="10"
            value={params.elasticity}
            onChange={e =>
              handleParamChange('elasticity', parseFloat(e.target.value))
            }
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '3px',
              background: '#4a5568',
              outline: 'none',
              cursor: 'pointer',
              accentColor: '#38bdf8',
            }}
          />
        </div>

        <div
          style={{
            marginTop: 'auto',
            paddingTop: '20px',
            borderTop: '1px solid #4a5568',
            fontSize: '12px',
            color: '#a0aec0',
            lineHeight: '1.6',
          }}
        >
          <p style={{ margin: '0 0 8px 0', fontWeight: 600, color: '#e2e8f0' }}>
            操作说明：
          </p>
          <p style={{ margin: '0 0 6px 0' }}>• 点击两点创建绳索</p>
          <p style={{ margin: '0 0 6px 0' }}>• 拖拽矩形创建布料</p>
          <p style={{ margin: '0 0 6px 0' }}>• 拖拽质点进行交互</p>
          <p style={{ margin: '0' }}>• 绳索端点可吸附布料</p>
        </div>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
