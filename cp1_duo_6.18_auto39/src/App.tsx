import { useEffect, useRef, useState, useCallback } from 'react';
import { PhysicsEngine } from './physicsEngine';
import { ShapesManager } from './shapesManager';
import { Renderer } from './renderer';
import type { Particle, Vec2, ControlPanelState } from './types';

const PANEL_WIDTH = 200;
const ATTACHMENT_THRESHOLD = 30;
const DRAG_THRESHOLD = 5;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const physicsEngineRef = useRef<PhysicsEngine | null>(null);
  const shapesManagerRef = useRef<ShapesManager | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const animationFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  const [gravity, setGravity] = useState(1);
  const [airResistance, setAirResistance] = useState(0.02);
  const [stiffness, setStiffness] = useState(200);
  const [cursor, setCursor] = useState('default');

  const mouseStateRef = useRef({
    isDown: false,
    startPos: { x: 0, y: 0 },
    currentPos: { x: 0, y: 0 },
    dragStartPos: { x: 0, y: 0 },
    hasMoved: false,
    mode: 'none' as 'none' | 'create-rope' | 'create-cloth' | 'drag-particle' | 'attach',
    draggedParticle: null as Particle | null,
    draggedRopeParticle: null as Particle | null,
    hoveredParticle: null as Particle | null,
    attachTarget: null as { particle: Particle; cloth: any } | null,
    ropeEndIndex: -1,
  });

  const initEngine = useCallback(() => {
    const config = {
      gravity,
      airResistance,
      stiffness,
      damping: 0.98,
      attachmentThreshold: ATTACHMENT_THRESHOLD,
    };

    physicsEngineRef.current = new PhysicsEngine(config);
    shapesManagerRef.current = new ShapesManager(config);
  }, [gravity, airResistance, stiffness]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    if (rendererRef.current) {
      rendererRef.current.resize(width, height);
    }
  }, []);

  const getCanvasPos = useCallback((e: React.MouseEvent | MouseEvent): Vec2 => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const findParticleAtPos = useCallback((pos: Vec2, maxDist = 10): Particle | null => {
    const engine = physicsEngineRef.current;
    if (!engine) return null;
    return engine.findNearestParticle(pos, maxDist);
  }, []);

  const findClothEdgeParticle = useCallback((pos: Vec2) => {
    const engine = physicsEngineRef.current;
    if (!engine) return null;
    return engine.findClothEdgeParticle(pos, ATTACHMENT_THRESHOLD);
  }, []);

  const isRopeEndParticle = useCallback((particle: Particle): { isEnd: boolean; rope: any; endIndex: number } => {
    const engine = physicsEngineRef.current;
    if (!engine) return { isEnd: false, rope: null, endIndex: -1 };

    for (const rope of engine.getWorld().ropes) {
      if (rope.particles[0].id === particle.id) {
        return { isEnd: true, rope, endIndex: 0 };
      }
      if (rope.particles[rope.particles.length - 1].id === particle.id) {
        return { isEnd: true, rope, endIndex: rope.particles.length - 1 };
      }
    }

    return { isEnd: false, rope: null, endIndex: -1 };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const mouseState = mouseStateRef.current;

    mouseState.isDown = true;
    mouseState.startPos = { ...pos };
    mouseState.currentPos = { ...pos };
    mouseState.dragStartPos = { ...pos };
    mouseState.hasMoved = false;

    const particle = findParticleAtPos(pos, 15);

    if (particle) {
      const { isEnd, rope, endIndex } = isRopeEndParticle(particle);
      if (isEnd && rope) {
        mouseState.mode = 'attach';
        mouseState.draggedRopeParticle = particle;
        mouseState.ropeEndIndex = endIndex;
        particle.pinned = true;
      } else {
        mouseState.mode = 'drag-particle';
        mouseState.draggedParticle = particle;
        particle.pinned = true;
      }
      setCursor('grabbing');
    } else {
      mouseState.mode = 'create-rope';
      setCursor('crosshair');
    }
  }, [getCanvasPos, findParticleAtPos, isRopeEndParticle]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const mouseState = mouseStateRef.current;

    mouseState.currentPos = { ...pos };

    const dx = pos.x - mouseState.dragStartPos.x;
    const dy = pos.y - mouseState.dragStartPos.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
      mouseState.hasMoved = true;
    }

    if (mouseState.isDown) {
      if (mouseState.mode === 'drag-particle' && mouseState.draggedParticle) {
        mouseState.draggedParticle.pos.x = pos.x;
        mouseState.draggedParticle.pos.y = pos.y;
        mouseState.draggedParticle.prevPos.x = pos.x;
        mouseState.draggedParticle.prevPos.y = pos.y;
      } else if (mouseState.mode === 'attach' && mouseState.draggedRopeParticle) {
        mouseState.draggedRopeParticle.pos.x = pos.x;
        mouseState.draggedRopeParticle.pos.y = pos.y;
        mouseState.draggedRopeParticle.prevPos.x = pos.x;
        mouseState.draggedRopeParticle.prevPos.y = pos.y;

        const clothEdge = findClothEdgeParticle(pos);
        mouseState.attachTarget = clothEdge;
      } else if (mouseState.mode === 'create-rope') {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 50) {
          mouseState.mode = 'create-cloth';
        }
      }
    } else {
      const hovered = findParticleAtPos(pos, 15);
      mouseState.hoveredParticle = hovered;

      if (hovered) {
        setCursor('grab');
      } else {
        setCursor('crosshair');
      }
    }
  }, [getCanvasPos, findParticleAtPos, findClothEdgeParticle]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const mouseState = mouseStateRef.current;
    const engine = physicsEngineRef.current;
    const shapesManager = shapesManagerRef.current;

    if (!engine || !shapesManager) {
      mouseState.isDown = false;
      return;
    }

    if (mouseState.mode === 'attach' && mouseState.draggedRopeParticle) {
      if (mouseState.attachTarget) {
        const { particle: clothParticle, cloth } = mouseState.attachTarget;
        const ropeEndCheck = isRopeEndParticle(mouseState.draggedRopeParticle);

        if (ropeEndCheck.rope) {
          engine.attachRopeToCloth(
            ropeEndCheck.rope,
            cloth,
            mouseState.draggedRopeParticle,
            clothParticle
          );
        }
      }
      mouseState.draggedRopeParticle.pinned = false;
      mouseState.draggedRopeParticle = null;
      mouseState.attachTarget = null;
    }

    if (mouseState.mode === 'drag-particle' && mouseState.draggedParticle) {
      mouseState.draggedParticle.pinned = false;
      mouseState.draggedParticle = null;
    }

    if (mouseState.mode === 'create-rope' && !mouseState.hasMoved) {
      // Single click - start creating rope
    }

    if (mouseState.mode === 'create-cloth' && mouseState.hasMoved) {
      const startX = Math.min(mouseState.startPos.x, pos.x);
      const startY = Math.min(mouseState.startPos.y, pos.y);
      const width = Math.abs(pos.x - mouseState.startPos.x);
      const height = Math.abs(pos.y - mouseState.startPos.y);

      if (width > 30 && height > 30) {
        const cloth = shapesManager.createCloth(startX, startY, width, height);
        engine.addCloth(cloth);
      }
    }

    if (mouseState.mode === 'create-rope' && !mouseState.hasMoved) {
      // Single click - we'll use two-click creation for ropes
      // For now, create a short rope
      const rope = shapesManager.createRope(
        { x: pos.x, y: pos.y },
        { x: pos.x + 50, y: pos.y + 50 },
        10
      );
      engine.addRope(rope);
    }

    mouseState.isDown = false;
    mouseState.mode = 'none';
    mouseState.hasMoved = false;
    setCursor('default');
  }, [getCanvasPos, isRopeEndParticle]);

  const handleMouseLeave = useCallback(() => {
    const mouseState = mouseStateRef.current;

    if (mouseState.draggedParticle) {
      mouseState.draggedParticle.pinned = false;
      mouseState.draggedParticle = null;
    }
    if (mouseState.draggedRopeParticle) {
      mouseState.draggedRopeParticle.pinned = false;
      mouseState.draggedRopeParticle = null;
    }

    mouseState.isDown = false;
    mouseState.mode = 'none';
    mouseState.hoveredParticle = null;
    mouseState.attachTarget = null;
    setCursor('default');
  }, []);

  useEffect(() => {
    initEngine();
    resizeCanvas();

    window.addEventListener('resize', resizeCanvas);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [initEngine, resizeCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    rendererRef.current = new Renderer(canvas);
    resizeCanvas();

    const animate = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      const engine = physicsEngineRef.current;
      const renderer = rendererRef.current;
      const mouseState = mouseStateRef.current;

      if (engine && renderer) {
        engine.update(dt);

        let attachHintPos: Vec2 | null = null;
        if (mouseState.attachTarget) {
          attachHintPos = mouseState.attachTarget.particle.pos;
        }

        let createStart: Vec2 | null = null;
        let createEnd: Vec2 | null = null;
        if (mouseState.isDown && (mouseState.mode === 'create-rope' || mouseState.mode === 'create-cloth')) {
          createStart = mouseState.startPos;
          createEnd = mouseState.currentPos;
        }

        renderer.render(engine.getWorld(), {
          hoveredParticle: mouseState.hoveredParticle,
          createStart,
          createEnd,
          isCreatingCloth: mouseState.mode === 'create-cloth',
          attachHintPos,
        });
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [resizeCanvas]);

  useEffect(() => {
    const engine = physicsEngineRef.current;
    const shapesManager = shapesManagerRef.current;

    if (engine && shapesManager) {
      engine.setConfig({ gravity, airResistance, stiffness });
      shapesManager.updateConfig({ gravity, airResistance, stiffness });
    }
  }, [gravity, airResistance, stiffness]);

  const handleControlsChange = useCallback((key: keyof ControlPanelState, value: number) => {
    if (key === 'gravity') setGravity(value);
    if (key === 'airResistance') setAirResistance(value);
    if (key === 'stiffness') setStiffness(value);
  }, []);

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      <div
        ref={containerRef}
        style={{
          flex: 1,
          position: 'relative',
          cursor,
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
          }}
        />
      </div>

      <div
        style={{
          width: PANEL_WIDTH,
          backgroundColor: '#2d3748',
          color: 'white',
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 24,
          flexShrink: 0,
          overflowY: 'auto',
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>控制面板</h2>

        <ControlSlider
          label="重力强度"
          value={gravity}
          min={0}
          max={5}
          step={0.1}
          onChange={(v) => handleControlsChange('gravity', v)}
        />

        <ControlSlider
          label="空气阻力"
          value={airResistance}
          min={0}
          max={1}
          step={0.01}
          onChange={(v) => handleControlsChange('airResistance', v)}
        />

        <ControlSlider
          label="弹性系数"
          value={stiffness}
          min={50}
          max={500}
          step={10}
          onChange={(v) => handleControlsChange('stiffness', v)}
        />

        <div style={{ marginTop: 'auto', fontSize: 12, color: '#a0aec0', lineHeight: 1.6 }}>
          <p style={{ margin: '8px 0' }}>操作说明：</p>
          <p style={{ margin: '4px 0' }}>• 点击画布创建绳索</p>
          <p style={{ margin: '4px 0' }}>• 拖拽绘制矩形创建布料</p>
          <p style={{ margin: '4px 0' }}>• 拖拽质点可以交互</p>
          <p style={{ margin: '4px 0' }}>• 拖拽绳端到布料边缘吸附</p>
        </div>
      </div>
    </div>
  );
}

interface ControlSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}

function ControlSlider({ label, value, min, max, step, onChange }: ControlSliderProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 14 }}>{label}</span>
        <span style={{ fontSize: 13, color: '#a0aec0' }}>{value.toFixed(step < 1 ? 2 : 0)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          width: '100%',
          height: 6,
          borderRadius: 3,
          background: '#4a5568',
          outline: 'none',
          appearance: 'none',
          cursor: 'pointer',
          accentColor: '#38bdf8',
        }}
      />
    </div>
  );
}
