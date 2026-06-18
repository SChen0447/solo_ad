import { useEffect, useRef, useCallback } from 'react';
import { useGameStore } from '@/store/useGameStore';
import { refreshVeins, isInMiningRange, MINING_RADIUS } from '@/planet/PlanetSystem';
import { TERRAIN_COLORS, MINERAL_COLORS } from '@/types/game';
import type { Particle } from '@/types/game';

const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 700;

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const targetPosRef = useRef<{ x: number; y: number } | null>(null);
  const miningIntervalRef = useRef<number | null>(null);

  const {
    planet,
    ship,
    particles,
    stars,
    miningTarget,
    isPaused,
    isAtStation,
    updateParticles,
    moveShip,
    mineNearestVein,
    setMessage,
    setPlanet,
  } = useGameStore();

  const drawStars = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    stars.forEach((star) => {
      const twinkle = Math.sin(time * 0.001 * star.twinkleSpeed) * 0.3 + 0.7;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity * twinkle})`;
      ctx.fill();
    });
  }, [stars]);

  const drawTerrain = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!planet) return;

    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    const terrainColor = TERRAIN_COLORS[planet.terrain];
    
    gradient.addColorStop(0, '#0a0e27');
    gradient.addColorStop(0.3, '#1a1a2e');
    gradient.addColorStop(0.6, terrainColor);
    gradient.addColorStop(1, terrainColor);
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.beginPath();
    ctx.moveTo(0, CANVAS_HEIGHT * 0.6);
    
    for (let x = 0; x <= CANVAS_WIDTH; x += 20) {
      const noise = Math.sin(x * 0.02) * 20 + Math.sin(x * 0.05) * 10;
      ctx.lineTo(x, CANVAS_HEIGHT * 0.6 + noise);
    }
    
    ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.lineTo(0, CANVAS_HEIGHT);
    ctx.closePath();
    
    const terrainGradient = ctx.createLinearGradient(0, CANVAS_HEIGHT * 0.5, 0, CANVAS_HEIGHT);
    terrainGradient.addColorStop(0, terrainColor);
    terrainGradient.addColorStop(1, adjustColor(terrainColor, -30));
    ctx.fillStyle = terrainGradient;
    ctx.fill();
  }, [planet]);

  const drawVeins = useCallback((ctx: CanvasRenderingContext2D, time: number) => {
    if (!planet) return;

    planet.veins.forEach((vein) => {
      if (vein.amount <= 0) {
        ctx.beginPath();
        ctx.arc(vein.x, vein.y, 12, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(100, 100, 100, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        return;
      }

      const pulse = Math.sin(time * 0.003) * 0.3 + 1;