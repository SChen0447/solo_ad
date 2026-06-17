import { useEffect, useRef, useState, useCallback } from 'react';
import Matter from 'matter-js';
import { ParticleSystem } from '@/ParticleSystem';
import { BlockData, MaterialType, SimulationStats } from '@/types';
import { MATERIAL_CONFIGS, calculateEnergyTransfer, canTransferEnergy } from '@/utils';

interface PhysicsSceneProps {
  blocks: BlockData[];
  selectedMaterial: MaterialType | null;
  onStatsUpdate: (stats: SimulationStats | null) => void;
  onShowResult: (show: boolean) => void;
  onReset: () => void;
  simulationResetKey: number;
  onAddBlock?: (block: BlockData) => void;
}

const SCENE_W = 800;
const SCENE_H = 600;
const GRID_SIZE = 40;
const BG = '#f0ead6';
const GRID_COLOR = 'rgba(200,200,200,0.45)';

type TweenState = { startY: number; targetY: number; startTime: number; duration: number };

export default function PhysicsScene({
  blocks,
  selectedMaterial,
  onStatsUpdate,
  onShowResult,
  onReset: _onReset,
  simulationResetKey,
  onAddBlock,
}: PhysicsSceneProps) {
  const engineRef = useRef<Matter.Engine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bodyMapRef = useRef<Map<string, Matter.Body>>(new Map());
  const particleSystemRef = useRef<ParticleSystem>(new ParticleSystem());
  const simSpeedRef = useRef<number>(1.0);
  const chainActiveRef = useRef<boolean>(false);
  const chainEnergyRef = useRef<number>(0);
  const chainCollisionsRef = useRef<number>(0);
  const chainMaxDistanceRef = useRef<number>(0);
  const chainDestroyedRef = useRef<number>(0);
  const chainStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const chainHitCountRef = useRef<number>(0);
  const hitBodiesSetRef = useRef<Set<string>>(new Set());
  const lastFrameTimeRef = useRef<number>(0);
  const fpsRef = useRef<number>(60);
  const lowFpsVisibleRef = useRef<boolean>(false);
  const lowFpsFrameCountRef = useRef<number>(0);
  const draggingLauncherRef = useRef<{ startX: number; startY: number; curX: number; curY: number } | null>(null);
  const placingBlockRef = useRef<{ x: number; y: number; material: MaterialType } | null>(null);
  const statsRef = useRef<number>(0);
  const energyLastUpdateRef = useRef<number>(0);
  const lastCollisionTimeRef = useRef<number>(0);
  const tweenMapRef = useRef<Map<string, TweenState>>(new Map());
  const destroyedBodiesRef = useRef<Set<string>>(new Set());
  const animFrameIdRef = useRef<number>(0);
  const rafStartTimeRef = useRef<number>(0);
  const sliderDragRef = useRef<boolean>(false);
  const dashOffsetRef = useRef<number>(0);
  const [, forceRender] = useState(0);

  const getCanvasCoords = useCallback((e: MouseEvent): { x: number; y: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }, []);

  const findLauncherBody = useCallback((): Matter.Body | null => {
    for (const body of bodyMapRef.current.values()) {
      if ((body as any).material === 'launcher') return body;
    }
    return null;
  }, []);

  const isPointNearLauncher = useCallback((px: number, py: number): boolean => {
    const launcher = findLauncherBody();
    if (!launcher) return false;
    const dx = px - launcher.position.x;
    const dy = py - launcher.position.y;
    return Math.sqrt(dx * dx + dy * dy) < 60;
  }, [findLauncherBody]);

  const getLauncherPosition = useCallback((): { x: number; y: number } => {
    const launcher = findLauncherBody();
    if (launcher) {
      return { x: launcher.position.x, y: launcher.position.y };
    }
    return { x: 100, y: SCENE_H - 100 };
  }, [findLauncherBody]);

  const finishChain = useCallback(() => {
    if (!chainActiveRef.current) return;
    chainActiveRef.current = false;

    const initialEnergy = 100;
    const currentMinEnergy = chainEnergyRef.current;
    const energyLossRate = Math.round(100 - (currentMinEnergy / initialEnergy) * 100);

    const stats: SimulationStats = {
      totalCollisions: chainCollisionsRef.current,
      maxTransferDistance: Math.round(chainMaxDistanceRef.current),
      energyLossRate: Math.max(0, Math.min(100, energyLossRate)),
      destroyedCount: chainDestroyedRef.current,
    };

    onStatsUpdate(stats);
    onShowResult(true);
  }, [onStatsUpdate, onShowResult]);

  const handleExplosion = useCallback((x: number, y: number, radius: number = 60) => {
    const engine = engineRef.current;
    if (!engine) return;

    particleSystemRef.current.createParticles(x, y, 'explosive', 100, 0);

    for (const body of bodyMapRef.current.values()) {
      if ((body as any).destroyed || (body as any).material === 'launcher') continue;
      const dx = body.position.x - x;
      const dy = body.position.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius && dist > 0) {
        const force = (1 - dist / radius) * 0.05;
        const nx = dx / dist;
        const ny = dy / dist;
        Matter.Body.applyForce(body, body.position, { x: nx * force, y: ny * force });

        const boostEnergy = Math.round((1 - dist / radius) * 80);
        const curEnergy = (body as any).energy || 0;
        (body as any).energy = Math.min(100, curEnergy + boostEnergy);
      }
    }
  }, []);

  const destroyBody = useCallback((body: Matter.Body) => {
    const blockId = (body as any).blockId as string;
    if (destroyedBodiesRef.current.has(blockId)) return;
    destroyedBodiesRef.current.add(blockId);
    (body as any).destroyed = true;
    chainDestroyedRef.current++;

    const material = (body as any).material as MaterialType;
    const energy = (body as any).energy as number;

    particleSystemRef.current.createParticles(body.position.x, body.position.y, material, energy, 0);

    if (material === 'explosive') {
      handleExplosion(body.position.x, body.position.y, 60);
    }

    setTimeout(() => {
      const engine = engineRef.current;
      if (engine && bodyMapRef.current.has(blockId)) {
        Matter.World.remove(engine.world, body);
        bodyMapRef.current.delete(blockId);
      }
    }, 100);
  }, [handleExplosion]);

  const checkDestroyThreshold = useCallback((body: Matter.Body) => {
    const material = (body as any).material as MaterialType;
    const energy = (body as any).energy as number;
    const blockId = (body as any).blockId as string;
    if (destroyedBodiesRef.current.has(blockId)) return;

    switch (material) {
      case 'wood':
        if (energy < 30) destroyBody(body);
        break;
      case 'glass':
        if (energy < 50) destroyBody(body);
        break;
      case 'explosive':
        destroyBody(body);
        break;
      case 'iron':
      case 'launcher':
        break;
    }
  }, [destroyBody]);

  const handleCollision = useCallback((event: Matter.IEventCollision<Matter.Engine>) => {
    const pairs = event.pairs;
    const now = performance.now();

    for (const pair of pairs) {
      const bodyA = pair.bodyA;
      const bodyB = pair.bodyB;

      const matA = (bodyA as any).material as MaterialType | undefined;
      const matB = (bodyB as any).material as MaterialType | undefined;

      if (!matA || !matB) continue;

      const velA = Math.abs(bodyA.velocity.x) + Math.abs(bodyA.velocity.y);
      const velB = Math.abs(bodyB.velocity.x) + Math.abs(bodyB.velocity.y);
      const impactVelocity = Math.max(velA, velB);

      const impactAngle = Math.atan2(
        bodyB.position.y - bodyA.position.y,
        bodyB.position.x - bodyA.position.x
      );

      const midX = (bodyA.position.x + bodyB.position.x) / 2;
      const midY = (bodyA.position.y + bodyB.position.y) / 2;

      if (!chainActiveRef.current) {
        if (impactVelocity > 3) {
          const higher = ((bodyA as any).energy || 0) >= ((bodyB as any).energy || 0) ? bodyA : bodyB;
          particleSystemRef.current.createParticles(
            midX, midY,
            (higher as any).material as MaterialType,
            (higher as any).energy || 0,
            impactAngle
          );
        }
        continue;
      }

      lastCollisionTimeRef.current = now;

      const energyA = (bodyA as any).energy || 0;
      const energyB = (bodyB as any).energy || 0;

      let source: Matter.Body | null = null;
      let target: Matter.Body | null = null;

      if (energyA > 0 && !hitBodiesSetRef.current.has((bodyA as any).blockId)) {
        source = bodyA;
        target = bodyB;
      } else if (energyB > 0 && !hitBodiesSetRef.current.has((bodyB as any).blockId)) {
        source = bodyB;
        target = bodyA;
      }

      if (!source || !target) continue;

      const sourceEnergy = (source as any).energy as number;
      const newEnergy = calculateEnergyTransfer(sourceEnergy);
      (source as any).energy = newEnergy;
      (target as any).energy = newEnergy;
      chainEnergyRef.current = newEnergy;

      chainCollisionsRef.current++;

      const targetId = (target as any).blockId as string;
      if (!hitBodiesSetRef.current.has(targetId)) {
        hitBodiesSetRef.current.add(targetId);
        chainHitCountRef.current++;

        if (chainStartPosRef.current) {
          const dx = target.position.x - chainStartPosRef.current.x;
          const dy = target.position.y - chainStartPosRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > chainMaxDistanceRef.current) {
            chainMaxDistanceRef.current = dist;
          }
        }
      }

      particleSystemRef.current.createParticles(
        midX, midY,
        (target as any).material as MaterialType,
        newEnergy,
        impactAngle
      );

      statsRef.current = Math.min(100, Math.max(0, newEnergy));

      checkDestroyThreshold(source);
      checkDestroyThreshold(target);

      if (!canTransferEnergy(newEnergy) || chainHitCountRef.current >= 30) {
        setTimeout(() => finishChain(), 300);
      }
    }
  }, [checkDestroyThreshold, finishChain]);

  const createBodyFromBlock = useCallback((block: BlockData): Matter.Body => {
    const config = MATERIAL_CONFIGS[block.material];
    const isLauncher = block.material === 'launcher';

    const body = Matter.Bodies.rectangle(block.x, block.y - 50, block.width, block.height, {
      restitution: config.restitution,
      friction: config.friction,
      density: config.density,
      label: block.id,
      isStatic: isLauncher,
    });

    (body as any).energy = block.energy;
    (body as any).material = block.material;
    (body as any).blockId = block.id;
    (body as any).destroyed = false;

    tweenMapRef.current.set(block.id, {
      startY: block.y - 50,
      targetY: block.y,
      startTime: performance.now(),
      duration: 800,
    });

    return body;
  }, []);

  const rebuildBodies = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;

    for (const body of bodyMapRef.current.values()) {
      Matter.World.remove(engine.world, body);
    }
    bodyMapRef.current.clear();
    tweenMapRef.current.clear();
    destroyedBodiesRef.current.clear();

    for (const block of blocks) {
      const body = createBodyFromBlock(block);
      Matter.World.add(engine.world, body);
      bodyMapRef.current.set(block.id, body);
    }
  }, [blocks, createBodyFromBlock]);

  const launchChain = useCallback((startX: number, startY: number, dirX: number, dirY: number) => {
    const engine = engineRef.current;
    if (!engine) return;

    const len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len < 1) return;
    const nx = dirX / len;
    const ny = dirY / len;

    let nearestBody: Matter.Body | null = null;
    let nearestDist = Infinity;

    for (const body of bodyMapRef.current.values()) {
      if ((body as any).material === 'launcher') continue;
      const dx = body.position.x - startX;
      const dy = body.position.y - startY;
      const t = dx * nx + dy * ny;
      if (t < 0) continue;
      const projX = startX + nx * t;
      const projY = startY + ny * t;
      const perpX = body.position.x - projX;
      const perpY = body.position.y - projY;
      const perpDist = Math.sqrt(perpX * perpX + perpY * perpY);
      const halfW = Math.max(body.bounds.max.x - body.position.x, 30);
      if (perpDist < halfW && t < nearestDist) {
        nearestDist = t;
        nearestBody = body;
      }
    }

    if (!nearestBody) {
      const impulseStrength = 0.02;
      for (const body of bodyMapRef.current.values()) {
        if ((body as any).material === 'launcher') continue;
        const dx = body.position.x - startX;
        const dy = body.position.y - startY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200 && dist > 0) {
          const falloff = 1 - dist / 200;
          Matter.Body.applyForce(body, body.position, {
            x: (dx / dist) * impulseStrength * falloff,
            y: (dy / dist) * impulseStrength * falloff,
          });
        }
      }
      return;
    }

    const forceStrength = 0.03;
    Matter.Body.applyForce(nearestBody, nearestBody.position, {
      x: nx * forceStrength,
      y: ny * forceStrength,
    });

    particleSystemRef.current.createParticles(
      nearestBody.position.x,
      nearestBody.position.y,
      (nearestBody as any).material as MaterialType,
      100,
      Math.atan2(ny, nx)
    );

    chainActiveRef.current = true;
    chainEnergyRef.current = 100;
    chainCollisionsRef.current = 0;
    chainMaxDistanceRef.current = 0;
    chainDestroyedRef.current = 0;
    chainHitCountRef.current = 1;
    hitBodiesSetRef.current.clear();
    const firstId = (nearestBody as any).blockId as string;
    hitBodiesSetRef.current.add(firstId);
    (nearestBody as any).energy = 100;
    chainStartPosRef.current = { x: nearestBody.position.x, y: nearestBody.position.y };
    lastCollisionTimeRef.current = performance.now();
    statsRef.current = 100;
  }, []);

  const handleSliderMouseDown = useCallback((e: MouseEvent) => {
    const coords = getCanvasCoords(e);
    const sliderX = SCENE_W / 2 - 100;
    const sliderY = 20;
    if (
      coords.x >= sliderX - 10 &&
      coords.x <= sliderX + 210 &&
      coords.y >= sliderY - 10 &&
      coords.y <= sliderY + 20
    ) {
      sliderDragRef.current = true;
      handleSliderDrag(coords.x);
    }
  }, [getCanvasCoords]);

  const handleSliderDrag = useCallback((mouseX: number) => {
    const sliderX = SCENE_W / 2 - 100;
    let ratio = (mouseX - sliderX) / 200;
    ratio = Math.max(0, Math.min(1, ratio));
    simSpeedRef.current = 0.1 + ratio * 2.9;
    forceRender((v) => v + 1);
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent) => {
    const coords = getCanvasCoords(e);
    const engine = engineRef.current;
    if (!engine) return;

    handleSliderMouseDown(e);
    if (sliderDragRef.current) return;

    if (chainActiveRef.current) return;

    if (selectedMaterial === 'launcher' || isPointNearLauncher(coords.x, coords.y)) {
      const pos = getLauncherPosition();
      draggingLauncherRef.current = {
        startX: pos.x,
        startY: pos.y,
        curX: coords.x,
        curY: coords.y,
      };
      return;
    }

    if (selectedMaterial && onAddBlock) {
      const config = MATERIAL_CONFIGS[selectedMaterial];
      const newBlock: BlockData = {
        id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        material: selectedMaterial,
        x: Math.max(config.width / 2 + 10, Math.min(SCENE_W - config.width / 2 - 10, coords.x)),
        y: Math.max(config.height / 2 + 10, Math.min(SCENE_H - config.height / 2 - 80, coords.y)),
        width: config.width,
        height: config.height,
        energy: 100,
      };
      onAddBlock(newBlock);
    }
  }, [selectedMaterial, onAddBlock, getCanvasCoords, isPointNearLauncher, getLauncherPosition, handleSliderMouseDown]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const coords = getCanvasCoords(e);

    if (sliderDragRef.current) {
      handleSliderDrag(coords.x);
      return;
    }

    if (draggingLauncherRef.current) {
      draggingLauncherRef.current.curX = coords.x;
      draggingLauncherRef.current.curY = coords.y;
      return;
    }

    if (selectedMaterial && selectedMaterial !== 'launcher' && !chainActiveRef.current) {
      placingBlockRef.current = { x: coords.x, y: coords.y, material: selectedMaterial };
    } else {
      placingBlockRef.current = null;
    }
  }, [selectedMaterial, getCanvasCoords, handleSliderDrag]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (sliderDragRef.current) {
      sliderDragRef.current = false;
      return;
    }

    if (draggingLauncherRef.current) {
      const coords = getCanvasCoords(e);
      const { startX, startY } = draggingLauncherRef.current;
      const dx = startX - coords.x;
      const dy = startY - coords.y;
      launchChain(startX, startY, dx, dy);
      draggingLauncherRef.current = null;
    }
  }, [getCanvasCoords, launchChain]);

  const drawBody = useCallback((ctx: CanvasRenderingContext2D, body: Matter.Body) => {
    const material = (body as any).material as MaterialType;
    const energy = (body as any).energy as number;
    const destroyed = (body as any).destroyed as boolean;
    const config = MATERIAL_CONFIGS[material];

    if (destroyed || !config) return;

    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle);

    const w = body.bounds.max.x - body.bounds.min.x;
    const h = body.bounds.max.y - body.bounds.min.y;

    switch (material) {
      case 'wood': {
        ctx.fillStyle = config.color;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = config.strokeColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = 'rgba(120,80,40,0.35)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(-w / 2, -h / 2 + (h / 4) * i);
          ctx.lineTo(w / 2, -h / 2 + (h / 4) * i);
          ctx.stroke();
        }
        break;
      }
      case 'iron': {
        const grad = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
        grad.addColorStop(0, '#9a9a9a');
        grad.addColorStop(0.5, '#6a6a6a');
        grad.addColorStop(1, '#888888');
        ctx.fillStyle = grad;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = config.strokeColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(-w / 2 + 3, -h / 2 + 3, w - 6, 3);
        break;
      }
      case 'glass': {
        ctx.fillStyle = 'rgba(136,204,255,0.3)';
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = config.strokeColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-w / 2 + 5, -h / 2 + 5);
        ctx.lineTo(-w / 2 + w * 0.35, -h / 2 + h * 0.35);
        ctx.stroke();
        break;
      }
      case 'explosive': {
        ctx.fillStyle = config.color;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = '#ffff33';
        ctx.lineWidth = 2;
        const stripeW = 6;
        for (let i = -w / 2 - h; i < w / 2 + h; i += stripeW * 2) {
          ctx.beginPath();
          ctx.moveTo(i, -h / 2);
          ctx.lineTo(i + h, h / 2);
          ctx.lineWidth = stripeW;
          ctx.strokeStyle = '#ffff33';
          ctx.save();
          ctx.beginPath();
          ctx.rect(-w / 2, -h / 2, w, h);
          ctx.clip();
          ctx.beginPath();
          ctx.moveTo(i, -h / 2);
          ctx.lineTo(i + h, h / 2);
          ctx.lineWidth = stripeW;
          ctx.stroke();
          ctx.restore();
        }
        ctx.strokeStyle = config.strokeColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        break;
      }
      case 'launcher': {
        const t = (performance.now() / 1000) % 2;
        const pulse = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
        const grad = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
        grad.addColorStop(0, `rgba(170,102,255,${0.6 + pulse * 0.4})`);
        grad.addColorStop(0.5, `rgba(200,150,255,${0.7 + pulse * 0.3})`);
        grad.addColorStop(1, `rgba(170,102,255,${0.6 + pulse * 0.4})`);
        ctx.fillStyle = grad;
        ctx.fillRect(-w / 2, -h / 2, w, h);
        ctx.strokeStyle = config.strokeColor;
        ctx.lineWidth = 2;
        ctx.strokeRect(-w / 2, -h / 2, w, h);
        ctx.shadowColor = '#aa66ff';
        ctx.shadowBlur = 8 + pulse * 8;
        ctx.strokeRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2);
        ctx.shadowBlur = 0;
        break;
      }
    }

    ctx.restore();

    if (material !== 'launcher') {
      const barW = w * 0.9;
      const barH = 4;
      const barX = body.position.x - barW / 2;
      const barY = body.position.y - h / 2 - 10;
      const energyRatio = Math.max(0, Math.min(1, energy / 100));
      const r = Math.round(255 * (1 - energyRatio));
      const g = Math.round(200 * energyRatio);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = `rgb(${r},${g},60)`;
      ctx.fillRect(barX, barY, barW * energyRatio, barH);
      ctx.strokeStyle = 'rgba(0,0,0,0.4)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(barX, barY, barW, barH);
    }
  }, []);

  const drawAimLine = useCallback((ctx: CanvasRenderingContext2D) => {
    const drag = draggingLauncherRef.current;
    if (!drag) return;

    const { startX, startY, curX, curY } = drag;
    dashOffsetRef.current = (dashOffsetRef.current + 2) % 12;

    ctx.save();
    ctx.strokeStyle = '#ff6699';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 4]);
    ctx.lineDashOffset = dashOffsetRef.current;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(curX, curY);
    ctx.stroke();
    ctx.setLineDash([]);

    const dx = curX - startX;
    const dy = curY - startY;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) { ctx.restore(); return; }
    const ux = dx / len;
    const uy = dy / len;
    const arrowSize = 10;
    ctx.beginPath();
    ctx.moveTo(curX, curY);
    ctx.lineTo(curX - ux * arrowSize - uy * arrowSize * 0.6, curY - uy * arrowSize + ux * arrowSize * 0.6);
    ctx.lineTo(curX - ux * arrowSize + uy * arrowSize * 0.6, curY - uy * arrowSize - ux * arrowSize * 0.6);
    ctx.closePath();
    ctx.fillStyle = '#ff6699';
    ctx.fill();

    const power = Math.min(100, Math.round(len / 3));
    ctx.font = '12px Orbitron, sans-serif';
    ctx.fillStyle = '#ff6699';
    ctx.fillText(`力量 ${power}%`, curX + 12, curY - 8);

    ctx.restore();
  }, []);

  const drawGhostBlock = useCallback((ctx: CanvasRenderingContext2D) => {
    const ghost = placingBlockRef.current;
    if (!ghost || chainActiveRef.current) return;
    const config = MATERIAL_CONFIGS[ghost.material];
    if (!config) return;

    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = config.color;
    ctx.fillRect(
      ghost.x - config.width / 2,
      ghost.y - config.height / 2,
      config.width,
      config.height
    );
    ctx.globalAlpha = 0.75;
    ctx.strokeStyle = config.strokeColor || config.color;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.strokeRect(
      ghost.x - config.width / 2,
      ghost.y - config.height / 2,
      config.width,
      config.height
    );
    ctx.setLineDash([]);
    ctx.restore();
  }, []);

  const drawEnergyGauge = useCallback((ctx: CanvasRenderingContext2D) => {
    const cx = SCENE_W - 70;
    const cy = SCENE_H - 60;
    const r = 42;
    const value = statsRef.current;

    ctx.save();

    ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI, Math.PI * 2);
    ctx.stroke();

    const startAngle = Math.PI;
    const endAngle = Math.PI + (Math.PI * Math.min(100, value)) / 100;
    const grad = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    grad.addColorStop(0, '#3388ff');
    grad.addColorStop(0.5, '#ffcc33');
    grad.addColorStop(1, '#ff3355');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.stroke();
    ctx.lineCap = 'butt';

    ctx.fillStyle = '#1e1e2f';
    ctx.font = 'bold 16px Orbitron, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(value)}`, cx, cy + 6);
    ctx.font = '9px Orbitron, sans-serif';
    ctx.fillStyle = '#666';
    ctx.fillText('能量', cx, cy + 20);

    ctx.restore();
  }, []);

  const drawSpeedSlider = useCallback((ctx: CanvasRenderingContext2D) => {
    const cx = SCENE_W / 2;
    const trackX = cx - 100;
    const trackY = 22;
    const trackW = 200;
    const trackH = 6;
    const speed = simSpeedRef.current;
    const ratio = (speed - 0.1) / 2.9;
    const fillW = trackW * Math.max(0, Math.min(1, ratio));

    ctx.save();

    ctx.fillStyle = '#333355';
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, trackW, trackH, 3);
    ctx.fill();

    ctx.fillStyle = '#ff6699';
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, fillW, trackH, 3);
    ctx.fill();

    const handleX = trackX + fillW;
    ctx.fillStyle = '#ff88aa';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(handleX, trackY + trackH / 2, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.font = '11px Orbitron, sans-serif';
    ctx.fillStyle = '#1e1e2f';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`模拟速度 ${speed.toFixed(1)}x`, trackX + trackW + 12, trackY + trackH / 2);

    ctx.restore();
  }, []);

  const drawFPSWarning = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!lowFpsVisibleRef.current) return;

    const blink = Math.floor(performance.now() / 500) % 2 === 0;
    if (!blink) return;

    ctx.save();
    ctx.font = 'bold 14px Orbitron, sans-serif';
    ctx.fillStyle = '#ff3355';
    ctx.textAlign = 'right';
    ctx.fillText('低帧率！请减少方块数量', SCENE_W - 12, 26);
    ctx.restore();
  }, []);

  const renderScene = useCallback(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    if (!canvas || !engine) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, SCENE_W, SCENE_H);

    ctx.fillStyle = BG;
    ctx.fillRect(0, 0, SCENE_W, SCENE_H);

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let x = 0; x <= SCENE_W; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, SCENE_H);
      ctx.stroke();
    }
    for (let y = 0; y <= SCENE_H; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(SCENE_W, y);
      ctx.stroke();
    }

    for (const body of bodyMapRef.current.values()) {
      drawBody(ctx, body);
    }

    drawGhostBlock(ctx);
    drawAimLine(ctx);
    particleSystemRef.current.render?.(ctx);
    drawEnergyGauge(ctx);
    drawSpeedSlider(ctx);
    drawFPSWarning(ctx);
  }, [drawBody, drawGhostBlock, drawAimLine, drawEnergyGauge, drawSpeedSlider, drawFPSWarning]);

  useEffect(() => {
    const engine = Matter.Engine.create({
      gravity: { x: 0, y: 1.0, scale: 0.001 },
    });
    engineRef.current = engine;

    const wallThickness = 50;
    const walls = [
      Matter.Bodies.rectangle(SCENE_W / 2, -wallThickness / 2 + 2, SCENE_W + wallThickness * 2, wallThickness, { isStatic: true, label: 'wall-top' }),
      Matter.Bodies.rectangle(SCENE_W / 2, SCENE_H + wallThickness / 2 - 5, SCENE_W + wallThickness * 2, wallThickness, { isStatic: true, label: 'wall-bottom' }),
      Matter.Bodies.rectangle(-wallThickness / 2 + 2, SCENE_H / 2, wallThickness, SCENE_H + wallThickness * 2, { isStatic: true, label: 'wall-left' }),
      Matter.Bodies.rectangle(SCENE_W + wallThickness / 2 - 2, SCENE_H / 2, wallThickness, SCENE_H + wallThickness * 2, { isStatic: true, label: 'wall-right' }),
    ];
    Matter.World.add(engine.world, walls);

    Matter.Events.on(engine, 'collisionStart', handleCollision);

    return () => {
      Matter.Events.off(engine, 'collisionStart', handleCollision);
      Matter.Engine.clear(engine);
    };
  }, [handleCollision]);

  useEffect(() => {
    rebuildBodies();
    chainActiveRef.current = false;
    destroyedBodiesRef.current.clear();
  }, [blocks, simulationResetKey, rebuildBodies]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseDown, handleMouseMove, handleMouseUp]);

  useEffect(() => {
    rafStartTimeRef.current = performance.now();
    lastFrameTimeRef.current = rafStartTimeRef.current;
    energyLastUpdateRef.current = rafStartTimeRef.current;

    const tick = (now: number) => {
      let dt = (now - lastFrameTimeRef.current) / 1000;
      if (dt > 0.05) dt = 0.05;
      lastFrameTimeRef.current = now;

      const instFps = dt > 0 ? 1 / dt : 60;
      fpsRef.current = fpsRef.current * 0.9 + instFps * 0.1;
      if (fpsRef.current < 45) {
        lowFpsFrameCountRef.current++;
        if (lowFpsFrameCountRef.current >= 3) lowFpsVisibleRef.current = true;
      } else {
        lowFpsFrameCountRef.current = 0;
        lowFpsVisibleRef.current = false;
      }

      const engine = engineRef.current;
      if (engine) {
        for (const [id, tween] of tweenMapRef.current.entries()) {
          const elapsed = now - tween.startTime;
          if (elapsed < tween.duration) {
            const t = elapsed / tween.duration;
            const eased = 1 - Math.pow(1 - t, 3);
            const y = tween.startY + (tween.targetY - tween.startY) * eased;
            const body = bodyMapRef.current.get(id);
            if (body) {
              Matter.Body.setPosition(body, { x: body.position.x, y });
            }
          } else {
            tweenMapRef.current.delete(id);
          }
        }

        const steps = Math.max(1, Math.ceil(simSpeedRef.current));
        const stepMs = (dt * 1000 * simSpeedRef.current) / steps;
        for (let i = 0; i < steps; i++) {
          Matter.Engine.update(engine, stepMs);
        }
      }

      particleSystemRef.current.update?.(dt);

      if (chainActiveRef.current && now - lastCollisionTimeRef.current > 1500) {
        finishChain();
      }

      renderScene();

      animFrameIdRef.current = requestAnimationFrame(tick);
    };

    animFrameIdRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [renderScene, finishChain]);

  return (
    <canvas
      ref={canvasRef}
      width={SCENE_W}
      height={SCENE_H}
      style={{
        width: '100%',
        maxWidth: SCENE_W,
        height: 'auto',
        borderRadius: 12,
        cursor: selectedMaterial === 'launcher' ? 'crosshair' : selectedMaterial ? 'copy' : 'default',
        display: 'block',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}
    />
  );
}
