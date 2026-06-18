import React, { useRef, useEffect, useCallback } from 'react';
import {
  type PlacedComponent,
  type ComponentType,
  type PlayerState,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_SIZE,
  COMPONENT_DEFS,
  getComponentDef,
  getDefaultParams,
} from '@/modules/ComponentRegistry';
import { Engine } from '@/modules/PhysicsEngine';
import { v4 as uuidv4 } from 'uuid';

interface GameCanvasProps {
  components: PlacedComponent[];
  onAddComponent: (comp: PlacedComponent) => void;
  onRemoveComponent: (id: string) => void;
  onMoveComponent: (id: string, gridX: number, gridY: number) => void;
  onPlayerStateUpdate?: (player: PlayerState) => void;
  fadeIn?: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface ComponentAnim {
  id: string;
  scale: number;
  pulseTime: number;
  pulseScale: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = React.memo(({
  components,
  onAddComponent,
  onRemoveComponent,
  onMoveComponent,
  onPlayerStateUpdate,
  fadeIn = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef(new Engine());
  const playerRef = useRef<PlayerState>(engineRef.current.createInitialPlayer());
  const keysRef = useRef<Set<string>>(new Set());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const compAnimsRef = useRef<Map<string, ComponentAnim>>(new Map());
  const edgeFlashRef = useRef<{ color: string; alpha: number } | null>(null);
  const dragOverRef = useRef<{ type: ComponentType; x: number; y: number } | null>(null);
  const [dragPreview, setDragPreview] = React.useState<{ type: ComponentType; gridX: number; gridY: number } | null>(null);
  const fadeAlphaRef = useRef(fadeIn ? 0 : 1);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());
      if (['w', 'a', 's', 'd', ' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (fadeIn) {
      fadeAlphaRef.current = 0;
    }
  }, [fadeIn]);

  const spawnParticles = useCallback((x: number, y: number, color: string, count: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      particlesRef.current.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.5,
        color,
        size: 2 + Math.random() * 3,
      });
    }
  }, []);

  const drawBackground = useCallback((ctx: CanvasRenderingContext2D) => {
    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    grad.addColorStop(0, '#0f0c29');
    grad.addColorStop(0.5, '#302b63');
    grad.addColorStop(1, '#24243e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }, []);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
  }, []);

  const drawGround = useCallback((ctx: CanvasRenderingContext2D) => {
    const groundY = CANVAS_HEIGHT - 40;
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, groundY, CANVAS_WIDTH, 40);
    ctx.strokeStyle = 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(CANVAS_WIDTH, groundY);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let x = 0; x < CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.fillRect(x, groundY, GRID_SIZE, 1);
      ctx.fillRect(x + GRID_SIZE - 1, groundY, 1, 40);
    }
  }, []);

  const drawComponent = useCallback((ctx: CanvasRenderingContext2D, comp: PlacedComponent, anim: ComponentAnim | undefined) => {
    const def = getComponentDef(comp.type);
    if (!def) return;

    const cx = comp.gridX * GRID_SIZE + GRID_SIZE / 2;
    const cy = comp.gridY * GRID_SIZE + GRID_SIZE / 2;
    const scale = anim?.scale ?? 1;
    const pulseScale = anim?.pulseScale ?? 0;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale + pulseScale * 0.2, scale + pulseScale * 0.2);

    const glowSize = comp.type === 'bounce'
      ? 8 + (comp.params.force ?? 5) * 2
      : 10;

    ctx.shadowColor = def.color;
    ctx.shadowBlur = glowSize + pulseScale * 10;

    ctx.fillStyle = def.color + '30';
    ctx.fillRect(-GRID_SIZE / 2 + 2, -GRID_SIZE / 2 + 2, GRID_SIZE - 4, GRID_SIZE - 4);

    ctx.strokeStyle = def.color;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-GRID_SIZE / 2 + 2, -GRID_SIZE / 2 + 2, GRID_SIZE - 4, GRID_SIZE - 4);

    if (comp.type === 'teleport') {
      const intensity = comp.params.distance ?? 120;
      const r = intensity / 200;
      ctx.strokeStyle = def.color;
      ctx.globalAlpha = 0.3 + r * 0.5;
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (comp.type === 'bounce') {
      const force = comp.params.force ?? 5;
      ctx.strokeStyle = def.color;
      ctx.globalAlpha = 0.2 + force * 0.06;
      ctx.beginPath();
      ctx.arc(0, 0, 8 + force, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(def.icon, 0, 0);

    ctx.restore();
  }, []);

  const drawPlayer = useCallback((ctx: CanvasRenderingContext2D, player: PlayerState) => {
    ctx.save();
    ctx.translate(player.x, player.y);
    ctx.scale(player.scaleX, player.scaleY);

    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(0, 0, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(-3, -2, 1.5, 0, Math.PI * 2);
    ctx.arc(3, -2, 1.5, 0, Math.PI * 2);
    ctx.fill();

    if (!player.onGround) {
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 2, 3, 0, Math.PI);
      ctx.stroke();
    }

    if (player.gravityReversed) {
      ctx.strokeStyle = '#fee440';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(0, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.restore();
  }, []);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, dt: number) => {
    const particles = particlesRef.current;
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= dt / p.maxLife;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      ctx.save();
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size * p.life, p.size * p.life);
      ctx.restore();
    }
  }, []);

  const drawEdgeFlash = useCallback((ctx: CanvasRenderingContext2D) => {
    const flash = edgeFlashRef.current;
    if (!flash || flash.alpha <= 0) return;

    ctx.save();
    const thickness = 30;
    let grad: CanvasGradient;

    grad = ctx.createLinearGradient(0, 0, thickness, 0);
    grad.addColorStop(0, flash.color + Math.round(flash.alpha * 255).toString(16).padStart(2, '0'));
    grad.addColorStop(1, flash.color + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, thickness, CANVAS_HEIGHT);

    grad = ctx.createLinearGradient(CANVAS_WIDTH, 0, CANVAS_WIDTH - thickness, 0);
    grad.addColorStop(0, flash.color + Math.round(flash.alpha * 255).toString(16).padStart(2, '0'));
    grad.addColorStop(1, flash.color + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(CANVAS_WIDTH - thickness, 0, thickness, CANVAS_HEIGHT);

    grad = ctx.createLinearGradient(0, 0, 0, thickness);
    grad.addColorStop(0, flash.color + Math.round(flash.alpha * 255).toString(16).padStart(2, '0'));
    grad.addColorStop(1, flash.color + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, thickness);

    grad = ctx.createLinearGradient(0, CANVAS_HEIGHT, 0, CANVAS_HEIGHT - thickness);
    grad.addColorStop(0, flash.color + Math.round(flash.alpha * 255).toString(16).padStart(2, '0'));
    grad.addColorStop(1, flash.color + '00');
    ctx.fillStyle = grad;
    ctx.fillRect(0, CANVAS_HEIGHT - thickness, CANVAS_WIDTH, thickness);

    ctx.restore();
  }, []);

  const drawDragPreview = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!dragPreview) return;
    const def = getComponentDef(dragPreview.type);
    if (!def) return;

    const cx = dragPreview.gridX * GRID_SIZE + GRID_SIZE / 2;
    const cy = dragPreview.gridY * GRID_SIZE + GRID_SIZE / 2;

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.strokeStyle = def.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(
      dragPreview.gridX * GRID_SIZE + 2,
      dragPreview.gridY * GRID_SIZE + 2,
      GRID_SIZE - 4,
      GRID_SIZE - 4
    );
    ctx.setLineDash([]);

    ctx.font = '16px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = def.color;
    ctx.fillText(def.icon, cx, cy);
    ctx.restore();
  }, [dragPreview]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const loop = (time: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = time;
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = time;

      if (fadeAlphaRef.current < 1) {
        fadeAlphaRef.current = Math.min(1, fadeAlphaRef.current + dt * 2);
      }

      const result = engineRef.current.update(
        playerRef.current,
        keysRef.current,
        components,
        dt
      );

      playerRef.current = result.player;

      if (result.activatedComponents.length > 0) {
        for (const id of result.activatedComponents) {
          const comp = components.find((c) => c.id === id);
          const def = comp ? getComponentDef(comp.type) : undefined;
          if (comp && def) {
            spawnParticles(
              comp.gridX * GRID_SIZE + GRID_SIZE / 2,
              comp.gridY * GRID_SIZE + GRID_SIZE / 2,
              def.color,
              comp.type === 'teleport' ? 20 : 10
            );

            if (comp.type === 'teleport') {
              spawnParticles(result.player.x, result.player.y, def.color, 15);
            }

            const anim = compAnimsRef.current.get(id);
            compAnimsRef.current.set(id, {
              id,
              scale: anim?.scale ?? 1,
              pulseTime: 0.3,
              pulseScale: 1,
            });
          }
        }
      }

      if (result.edgeFlash) {
        edgeFlashRef.current = result.edgeFlash;
      }
      if (edgeFlashRef.current) {
        edgeFlashRef.current.alpha -= dt * 3;
        if (edgeFlashRef.current.alpha <= 0) {
          edgeFlashRef.current = null;
        }
      }

      for (const comp of components) {
        const anim = compAnimsRef.current.get(comp.id);
        if (anim) {
          anim.pulseTime -= dt;
          if (anim.pulseTime <= 0) {
            anim.pulseScale = Math.max(0, anim.pulseScale - dt * 5);
            if (anim.pulseScale <= 0) {
              compAnimsRef.current.delete(comp.id);
            }
          }
        }
        if (!anim) {
          let current = compAnimsRef.current.get(comp.id);
          if (!current) {
            compAnimsRef.current.set(comp.id, { id: comp.id, scale: 0, pulseTime: 0, pulseScale: 0 });
            current = compAnimsRef.current.get(comp.id)!;
          }
          current.scale = Math.min(1, current.scale + dt * 5);
        }
      }

      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawBackground(ctx);
      drawGrid(ctx);
      drawGround(ctx);

      for (const comp of components) {
        const anim = compAnimsRef.current.get(comp.id);
        drawComponent(ctx, comp, anim);
      }

      drawDragPreview(ctx);
      drawPlayer(ctx, playerRef.current);
      drawParticles(ctx, dt);
      drawEdgeFlash(ctx);

      if (fadeAlphaRef.current < 1) {
        ctx.save();
        ctx.globalAlpha = 1 - fadeAlphaRef.current;
        ctx.fillStyle = '#0f0c29';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.restore();
      }

      if (onPlayerStateUpdate) {
        onPlayerStateUpdate(playerRef.current);
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [components, onPlayerStateUpdate, spawnParticles, drawBackground, drawGrid, drawGround, drawComponent, drawPlayer, drawParticles, drawEdgeFlash, drawDragPreview]);

  const getGridPos = useCallback((e: React.DragEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const gridX = Math.floor(x / GRID_SIZE);
    const gridY = Math.floor(y / GRID_SIZE);
    if (gridX < 0 || gridX >= CANVAS_WIDTH / GRID_SIZE || gridY < 0 || gridY >= CANVAS_HEIGHT / GRID_SIZE) return null;
    return { gridX, gridY };
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    const pos = getGridPos(e);
    const type = e.dataTransfer.types.includes('componenttype')
      ? null
      : null;

    if (pos) {
      const compType = dragOverRef.current?.type;
      if (compType) {
        setDragPreview({ type: compType, gridX: pos.gridX, gridY: pos.gridY });
      }
    }
  }, [getGridPos]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('componentType') as ComponentType;
    if (type) {
      dragOverRef.current = { type, x: 0, y: 0 };
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragPreview(null);
    dragOverRef.current = null;
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragPreview(null);

    const pos = getGridPos(e);
    if (!pos) return;

    const placedId = e.dataTransfer.getData('placedComponentId');
    const compType = e.dataTransfer.getData('componentType') as ComponentType;

    const occupied = components.some(
      (c) => c.gridX === pos.gridX && c.gridY === pos.gridY && c.id !== placedId
    );
    if (occupied) return;

    if (placedId) {
      onMoveComponent(placedId, pos.gridX, pos.gridY);
    } else if (compType && COMPONENT_DEFS.some((d) => d.type === compType)) {
      onAddComponent({
        id: uuidv4(),
        type: compType,
        gridX: pos.gridX,
        gridY: pos.gridY,
        params: getDefaultParams(compType),
      });
    }
  }, [components, getGridPos, onAddComponent, onMoveComponent]);

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          display: 'block',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 4,
          cursor: 'crosshair',
          boxShadow: '0 0 30px rgba(155,93,229,0.15), inset 0 0 60px rgba(0,0,0,0.3)',
        }}
      />
    </div>
  );
});

GameCanvas.displayName = 'GameCanvas';
