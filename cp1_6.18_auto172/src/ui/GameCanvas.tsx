import React, { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from '../engine/GameStore';
import { updatePhysics, updateParticles } from '../physics/PhysicsEngine';
import { getSlopeVertices } from '../physics/CollisionResolver';

const CANVAS_W = 1600;
const CANVAS_H = 900;
const CHARACTER_RADIUS = 15;

const BODY_COLORS: Record<string, string> = {
  ground: '#4CAF50',
  wall: '#2196F3',
  slope: '#FF9800',
  movingPlatform: '#9C27B0',
  bouncePad: '#F44336',
};

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const jumpPressedRef = useRef(false);
  const frameTimesRef = useRef<number[]>([]);
  const animTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const rafRef = useRef(0);

  const storeRef = useRef(useGameStore.getState());
  useEffect(() => {
    const unsub = useGameStore.subscribe((state) => {
      storeRef.current = state;
    });
    return unsub;
  }, []);

  const getCanvasScale = useCallback(() => {
    const container = containerRef.current;
    if (!container) return { scale: 1, offsetX: 0, offsetY: 0 };
    const rect = container.getBoundingClientRect();
    const scaleX = rect.width / CANVAS_W;
    const scaleY = rect.height / CANVAS_H;
    const scale = Math.min(scaleX, scaleY);
    return {
      scale,
      offsetX: (rect.width - CANVAS_W * scale) / 2,
      offsetY: (rect.height - CANVAS_H * scale) / 2,
    };
  }, []);

  const screenToCanvas = useCallback(
    (screenX: number, screenY: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const { scale, offsetX, offsetY } = getCanvasScale();
      const x = (screenX - rect.left - offsetX) / scale;
      const y = (screenY - rect.top - offsetY) / scale;
      return { x, y };
    },
    [getCanvasScale]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      keysRef.current = new Set(keysRef.current);
      keysRef.current.add(e.key);
      if (e.key === ' ') e.preventDefault();
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current = new Set(keysRef.current);
      keysRef.current.delete(e.key);
      if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w') {
        jumpPressedRef.current = false;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      const store = storeRef.current;
      if (store.dragState.isDragging && store.dragState.bodyType) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        const type = store.dragState.bodyType;
        const defaults = getDefaultBodyProps(type);
        store.addBody({
          type,
          x: Math.round(pos.x - defaults.width / 2),
          y: Math.round(pos.y - defaults.height / 2),
          ...defaults,
        });
        store.setDragState({ isDragging: false, bodyType: null });
        return;
      }

      const pos = screenToCanvas(e.clientX, e.clientY);
      let found: string | null = null;
      for (let i = store.bodies.length - 1; i >= 0; i--) {
        const body = store.bodies[i];
        if (body.type === 'slope') {
          const verts = getSlopeVertices(body);
          if (pointInTriangle(pos.x, pos.y, verts)) {
            found = body.id;
            break;
          }
        } else {
          if (
            pos.x >= body.x &&
            pos.x <= body.x + body.width &&
            pos.y >= body.y &&
            pos.y <= body.y + body.height
          ) {
            found = body.id;
            break;
          }
        }
      }
      store.setSelectedBodyId(found);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const store = storeRef.current;
      if (store.dragState.isDragging) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        store.setDragState({ previewX: pos.x, previewY: pos.y });
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('mousedown', handleMouseDown);
      canvas.addEventListener('mousemove', handleMouseMove);
    }
    return () => {
      if (canvas) {
        canvas.removeEventListener('mousedown', handleMouseDown);
        canvas.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [screenToCanvas]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    lastTimeRef.current = performance.now();

    const loop = (timestamp: number) => {
      const dt = Math.min((timestamp - lastTimeRef.current) / 1000, 0.05);
      lastTimeRef.current = timestamp;
      animTimeRef.current += dt;

      const store = storeRef.current;
      const keys = keysRef.current;
      const jumpKeys = [' ', 'ArrowUp', 'w'];
      const jumpDown = jumpKeys.some((k) => keys.has(k));

      if (jumpDown && !jumpPressedRef.current) {
        jumpPressedRef.current = true;
      } else if (!jumpDown) {
        jumpPressedRef.current = false;
      }

      const effectiveKeys = new Set(keys);
      if (jumpDown) {
        effectiveKeys.add(' ');
      } else {
        effectiveKeys.delete(' ');
      }

      const result = updatePhysics(
        store.character,
        store.bodies,
        store.physics,
        effectiveKeys,
        dt
      );

      const existingParticles = store.particles;
      const newParticles = [...existingParticles, ...result.newParticles];
      const updatedParticles = updateParticles(newParticles, dt);

      store.setCharacter(result.character);
      if (result.bodies !== store.bodies) {
        for (const updatedBody of result.bodies) {
          const original = store.bodies.find((b) => b.id === updatedBody.id);
          if (original && (original.x !== updatedBody.x || original.y !== updatedBody.y || original.bounceCooldown !== updatedBody.bounceCooldown || original.platformDirection !== updatedBody.platformDirection)) {
            store.updateBody(updatedBody.id, {
              x: updatedBody.x,
              y: updatedBody.y,
              bounceCooldown: updatedBody.bounceCooldown,
              platformDirection: updatedBody.platformDirection,
            });
          }
        }
      }
      store.setParticles(updatedParticles);

      const now = performance.now();
      frameTimesRef.current.push(now);
      frameTimesRef.current = frameTimesRef.current.filter((t) => now - t < 1000);
      const fps = frameTimesRef.current.length;
      const frameTime = dt * 1000;
      store.setFps(fps, frameTime);

      render(ctx, store, result.character, updatedParticles);

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  function render(
    ctx: CanvasRenderingContext2D,
    store: ReturnType<typeof useGameStore.getState>,
    character: typeof store.character,
    particles: typeof store.particles
  ) {
    const dpr = window.devicePixelRatio || 1;
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const displayW = rect.width;
      const displayH = rect.height;
      if (canvasRef.current) {
        canvasRef.current.style.width = displayW + 'px';
        canvasRef.current.style.height = displayH + 'px';
        canvasRef.current.width = displayW * dpr;
        canvasRef.current.height = displayH * dpr;
      }
    }
    ctx.save();
    ctx.scale(dpr, dpr);

    const { scale, offsetX, offsetY } = getCanvasScale();

    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, ctx.canvas.width / dpr, ctx.canvas.height / dpr);

    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.strokeStyle = 'rgba(255,255,255,0.125)';
    ctx.lineWidth = 1 / scale;
    ctx.strokeRect(0, 0, CANVAS_W, CANVAS_H);

    for (const body of store.bodies) {
      drawBody(ctx, body, body.id === store.selectedBodyId);
    }

    if (store.dragState.isDragging && store.dragState.bodyType) {
      const type = store.dragState.bodyType;
      const defaults = getDefaultBodyProps(type);
      ctx.globalAlpha = 0.5;
      drawBody(
        ctx,
        {
          id: '__preview__',
          type,
          x: store.dragState.previewX - defaults.width / 2,
          y: store.dragState.previewY - defaults.height / 2,
          ...defaults,
        },
        false
      );
      ctx.globalAlpha = 1;
    }

    drawCharacter(ctx, character);
    drawParticles(ctx, particles);
    drawHUD(ctx, character, store);

    ctx.restore();
    ctx.restore();
  }

  function drawBody(ctx: CanvasRenderingContext2D, body: typeof storeRef.current.bodies[0], selected: boolean) {
    ctx.save();

    if (selected) {
      ctx.shadowColor = 'rgba(255,255,255,0.3)';
      ctx.shadowBlur = 15;
    }

    const color = BODY_COLORS[body.type] || '#ffffff';

    if (body.type === 'slope') {
      const verts = getSlopeVertices(body);
      ctx.beginPath();
      ctx.moveTo(verts[0][0], verts[0][1]);
      ctx.lineTo(verts[1][0], verts[1][1]);
      ctx.lineTo(verts[2][0], verts[2][1]);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    } else {
      ctx.fillStyle = color;
      ctx.fillRect(body.x, body.y, body.width, body.height);

      if (body.type === 'bouncePad') {
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        const arrowSize = Math.min(body.width, body.height) * 0.3;
        const cx = body.x + body.width / 2;
        const by = body.y + body.height * 0.7;
        ctx.beginPath();
        ctx.moveTo(cx, by - arrowSize);
        ctx.lineTo(cx - arrowSize * 0.6, by);
        ctx.lineTo(cx + arrowSize * 0.6, by);
        ctx.closePath();
        ctx.fill();
      }

      if (body.type === 'movingPlatform') {
        ctx.fillStyle = 'rgba(255,255,255,0.2)';
        const arrowY = body.y + body.height / 2;
        ctx.beginPath();
        ctx.moveTo(body.x + 8, arrowY);
        ctx.lineTo(body.x + 16, arrowY - 5);
        ctx.lineTo(body.x + 16, arrowY + 5);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(body.x + body.width - 8, arrowY);
        ctx.lineTo(body.x + body.width - 16, arrowY - 5);
        ctx.lineTo(body.x + body.width - 16, arrowY + 5);
        ctx.closePath();
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawCharacter(ctx: CanvasRenderingContext2D, char: typeof storeRef.current.character) {
    ctx.save();

    let bobOffset = 0;
    if (char.onGround && Math.abs(char.vx) > 10) {
      bobOffset = Math.sin(animTimeRef.current * Math.abs(char.vx) * 0.04) * 3;
    }

    ctx.beginPath();
    ctx.arc(char.x, char.y + bobOffset, CHARACTER_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#FF6B35';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(char.x - 4, char.y - 4 + bobOffset, 3, 0, Math.PI * 2);
    ctx.arc(char.x + 4, char.y - 4 + bobOffset, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(char.x - 4, char.y - 4 + bobOffset, 1.5, 0, Math.PI * 2);
    ctx.arc(char.x + 4, char.y - 4 + bobOffset, 1.5, 0, Math.PI * 2);
    ctx.fillStyle = '#000000';
    ctx.fill();

    ctx.restore();
  }

  function drawParticles(ctx: CanvasRenderingContext2D, particles: typeof storeRef.current.particles) {
    ctx.save();
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#FFD54F';
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function drawHUD(ctx: CanvasRenderingContext2D, char: typeof storeRef.current.character, store: ReturnType<typeof useGameStore.getState>) {
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const padding = 10;
    const lineH = 18;
    const lines = [
      `X: ${Math.round(char.x)}  Y: ${Math.round(char.y)}`,
      `VX: ${char.vx.toFixed(1)}  VY: ${char.vy.toFixed(1)}`,
      `On Ground: ${char.onGround}`,
      `FPS: ${store.fps}  Frame: ${store.frameTime.toFixed(1)}ms`,
    ];
    const boxW = 220;
    const boxH = lines.length * lineH + padding * 2;
    ctx.fillRect(8, 8, boxW, boxH);

    ctx.font = '13px monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    lines.forEach((line, i) => {
      ctx.fillText(line, 8 + padding, 8 + padding + 13 + i * lineH);
    });
    ctx.restore();
  }

  function pointInTriangle(px: number, py: number, verts: [number, number][]): boolean {
    const [v0, v1, v2] = verts;
    const d00 = (v1[0] - v0[0]) * (v1[0] - v0[0]) + (v1[1] - v0[1]) * (v1[1] - v0[1]);
    const d01 = (v1[0] - v0[0]) * (v2[0] - v0[0]) + (v1[1] - v0[1]) * (v2[1] - v0[1]);
    const d02 = (v1[0] - v0[0]) * (px - v0[0]) + (v1[1] - v0[1]) * (py - v0[1]);
    const d11 = (v2[0] - v0[0]) * (v2[0] - v0[0]) + (v2[1] - v0[1]) * (v2[1] - v0[1]);
    const d12 = (v2[0] - v0[0]) * (px - v0[0]) + (v2[1] - v0[1]) * (py - v0[1]);
    const inv = 1 / (d00 * d11 - d01 * d01);
    const u = (d11 * d02 - d01 * d12) * inv;
    const v = (d00 * d12 - d01 * d02) * inv;
    return u >= 0 && v >= 0 && u + v <= 1;
  }

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          cursor: storeRef.current.dragState.isDragging ? 'crosshair' : 'default',
          display: 'block',
        }}
      />
    </div>
  );
};

function getDefaultBodyProps(type: string) {
  switch (type) {
    case 'ground':
      return { width: 200, height: 30, rotation: 0, slopeAngle: 45 as const, platformSpeed: 0, platformDirection: 1 as const, platformRange: 200, bounceCooldown: 0 };
    case 'wall':
      return { width: 30, height: 150, rotation: 0, slopeAngle: 45 as const, platformSpeed: 0, platformDirection: 1 as const, platformRange: 200, bounceCooldown: 0 };
    case 'slope':
      return { width: 200, height: 100, rotation: 0, slopeAngle: 45 as const, platformSpeed: 0, platformDirection: 1 as const, platformRange: 200, bounceCooldown: 0 };
    case 'movingPlatform':
      return { width: 150, height: 20, rotation: 0, slopeAngle: 45 as const, platformSpeed: 2, platformDirection: 1 as const, platformRange: 200, bounceCooldown: 0 };
    case 'bouncePad':
      return { width: 80, height: 15, rotation: 0, slopeAngle: 45 as const, platformSpeed: 0, platformDirection: 1 as const, platformRange: 200, bounceCooldown: 0 };
    default:
      return { width: 100, height: 30, rotation: 0, slopeAngle: 45 as const, platformSpeed: 0, platformDirection: 1 as const, platformRange: 200, bounceCooldown: 0 };
  }
}
