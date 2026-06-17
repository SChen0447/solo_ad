import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface HorseRaceState {
  id: string;
  name: string;
  color: string;
  strategy: string;
  isAI: boolean;
  position: number;
  currentSpeed: number;
  currentStamina: number;
  maxStamina: number;
  maxSpeed: number;
  finished: boolean;
  finishTime: number;
  lane: number;
}

export interface RaceData {
  horses: HorseRaceState[];
  trackLength: number;
  elapsedTime: number;
  phase: 'waiting' | 'countdown' | 'racing' | 'finished';
  countdown: number;
  rankings: string[];
}

type ViewMode = 'standard' | 'first-person' | 'minimap';

const HorseSVG: React.FC<{ color: string }> = ({ color }) => (
  <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="16" cy="20" rx="8" ry="5" fill={color} />
    <circle cx="22" cy="14" r="4" fill={color} />
    <polygon points="24,12 28,8 26,14" fill={color} />
    <circle cx="23" cy="13" r="1" fill="#fff" />
    <rect x="10" y="24" width="2" height="6" rx="1" fill={color} opacity="0.8" />
    <rect x="14" y="24" width="2" height="6" rx="1" fill={color} opacity="0.8" />
    <rect x="18" y="24" width="2" height="6" rx="1" fill={color} opacity="0.8" />
    <rect x="22" y="24" width="2" height="6" rx="1" fill={color} opacity="0.8" />
    <path d="M8 18 L6 14" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

interface Props {
  raceData: RaceData | null;
  viewMode: ViewMode;
}

export default function RaceTrack({ raceData, viewMode }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const positionsRef = useRef<Map<string, number>>(new Map());
  const [stars, setStars] = useState<Array<{ id: string; x: number; y: number }>>([]);

  const getRankings = useCallback(() => {
    if (!raceData) return [];
    return [...raceData.horses]
      .sort((a, b) => b.position - a.position)
      .map((h, i) => ({ ...h, rank: i + 1 }));
  }, [raceData]);

  useEffect(() => {
    if (!raceData || viewMode !== 'standard') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastTime = performance.now();

    const draw = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      const laneHeight = 80;
      const laneStartY = (h - laneHeight * 8) / 2;
      const finishX = w - 60;
      const trackWidth = finishX - 40;

      for (let i = 0; i < 8; i++) {
        const y = laneStartY + i * laneHeight;

        ctx.fillStyle = i % 2 === 0 ? 'rgba(141, 110, 99, 0.5)' : 'rgba(141, 110, 99, 0.35)';
        ctx.fillRect(0, y, w, laneHeight);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.moveTo(0, y + laneHeight);
        ctx.lineTo(w, y + laneHeight);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.fillRect(finishX, 0, 4, h);

      if (!raceData) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const ranked = getRankings();
      const leaderId = ranked.length > 0 ? ranked[0].id : null;

      for (const horse of raceData.horses) {
        const targetPos = (horse.position / raceData.trackLength) * trackWidth + 40;
        const currentPos = positionsRef.current.get(horse.id) ?? 40;
        const newPos = currentPos + (targetPos - currentPos) * Math.min(1, dt * 20);
        positionsRef.current.set(horse.id, newPos);

        const laneY = laneStartY + horse.lane * laneHeight + laneHeight / 2;
        const horseX = newPos;
        const horseY = laneY;

        const isLeader = horse.id === leaderId && raceData.phase === 'racing';
        const isSprinting = horse.strategy === 'sprint' &&
          (horse.position / raceData.trackLength) > 0.7 &&
          raceData.phase === 'racing';

        if (isSprinting) {
          const gradient = ctx.createRadialGradient(horseX + 16, horseY, 4, horseX + 16, horseY, 30);
          gradient.addColorStop(0, horse.color + '60');
          gradient.addColorStop(1, horse.color + '00');
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(horseX + 16, horseY, 30, 0, Math.PI * 2);
          ctx.fill();
        }

        if (isLeader) {
          const sparklePhase = (time / 200) % 1;
          if (sparklePhase > 0.3) {
            ctx.fillStyle = '#ffd700';
            ctx.shadowColor = '#ffd700';
            ctx.shadowBlur = 6;
            for (let s = 0; s < 3; s++) {
              const sx = horseX + 36 + Math.random() * 12;
              const sy = horseY - 8 + Math.random() * 16;
              const sr = 2 + Math.random() * 2;
              ctx.beginPath();
              ctx.arc(sx, sy, sr, 0, Math.PI * 2);
              ctx.fill();
            }
            ctx.shadowBlur = 0;
          }
        }

        ctx.fillStyle = horse.color;
        ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetY = 2;

        const bounce = raceData.phase === 'racing' && !horse.finished
          ? Math.sin(time / 80 + horse.lane) * 2
          : 0;

        ctx.beginPath();
        ctx.ellipse(horseX + 16, horseY + bounce + 2, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(horseX + 24, horseY + bounce - 6, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.beginPath();
        ctx.arc(horseX + 25, horseY + bounce - 7, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = horse.color;
        ctx.beginPath();
        ctx.moveTo(horseX + 28, horseY + bounce - 10);
        ctx.lineTo(horseX + 33, horseY + bounce - 16);
        ctx.lineTo(horseX + 30, horseY + bounce - 8);
        ctx.fill();

        ctx.strokeStyle = horse.color;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        const legPhase = raceData.phase === 'racing' && !horse.finished
          ? time / 60 + horse.lane
          : 0;
        for (let leg = 0; leg < 4; leg++) {
          const lx = horseX + 6 + leg * 5;
          const offset = Math.sin(legPhase + leg * 1.5) * 4;
          ctx.beginPath();
          ctx.moveTo(lx, horseY + bounce + 4);
          ctx.lineTo(lx + offset, horseY + bounce + 12);
          ctx.stroke();
        }

        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(horse.name, horseX + 16, laneY + laneHeight / 2 + 30);

        const progressW = (horse.position / raceData.trackLength) * (w - 80);
        ctx.fillStyle = horse.color + '40';
        ctx.fillRect(0, laneStartY + (horse.lane + 1) * laneHeight - 3, progressW, 3);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [raceData, viewMode, getRankings]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  if (viewMode === 'first-person') {
    return <FirstPersonView raceData={raceData} />;
  }

  if (viewMode === 'minimap') {
    return <MinimapView raceData={raceData} />;
  }

  return (
    <div className="race-container" style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      />
      {raceData?.phase === 'countdown' && (
        <div className="countdown-overlay">
          <span className="countdown-number">{raceData.countdown}</span>
        </div>
      )}
      <div className="view-mode-hint">
        按 1 标准视角 | 按 2 第一人称 | 按 3 俯视地图
      </div>
    </div>
  );
}

function FirstPersonView({ raceData }: { raceData: RaceData | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = (time: number) => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      const w = rect.width;
      const h = rect.height;

      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, '#87CEEB');
      gradient.addColorStop(0.45, '#b8d4e8');
      gradient.addColorStop(0.5, '#2e7d32');
      gradient.addColorStop(1, '#1b5e20');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      if (raceData && raceData.phase === 'racing') {
        const playerHorse = raceData.horses[0];
        if (playerHorse) {
          const horizonY = h * 0.5;
          const scrollOffset = (time / 20) * (playerHorse.currentSpeed / playerHorse.maxSpeed);

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1;
          for (let i = 0; i < 20; i++) {
            const y = horizonY + ((i * 30 + scrollOffset) % (h * 0.5));
            const perspective = (y - horizonY) / (h - horizonY);
            if (perspective <= 0) continue;
            const lineWidth = w * perspective;
            const startX = (w - lineWidth) / 2;
            ctx.beginPath();
            ctx.moveTo(startX, y);
            ctx.lineTo(startX + lineWidth, y);
            ctx.stroke();
          }

          for (let lane = 0; lane < 8; lane++) {
            const horse = raceData.horses[lane];
            if (!horse || horse.id === playerHorse.id) continue;
            const relPos = horse.position - playerHorse.position;
            if (relPos < -100 || relPos > 500) continue;

            const dist = Math.max(0.1, 1 - relPos / 500);
            const x = w / 2 + (lane - 4) * 40 * (1 - dist);
            const y = horizonY + (1 - dist) * (h - horizonY);
            const size = Math.max(2, 20 * (1 - dist));

            ctx.fillStyle = horse.color;
            ctx.beginPath();
            ctx.ellipse(x, y, size, size * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(0, h - 30, w, 30);
        ctx.font = '12px Orbitron, monospace';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText('第一人称视角', w / 2, h - 12);
      }

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [raceData]);

  return (
    <div className="first-person-view">
      <canvas
        ref={canvasRef}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />
      <div className="view-mode-hint">
        按 1 标准视角 | 按 2 第一人称 | 按 3 俯视地图
      </div>
    </div>
  );
}

function MinimapView({ raceData }: { raceData: RaceData | null }) {
  if (!raceData) return null;

  return (
    <div className="minimap-container">
      <div className="minimap-title">俯视地图</div>
      <div className="minimap-track">
        {raceData.horses.map((horse) => (
          <div key={horse.id} className="minimap-lane">
            <div
              className="minimap-dot"
              style={{
                left: `${(horse.position / raceData.trackLength) * 100}%`,
                background: horse.color,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
