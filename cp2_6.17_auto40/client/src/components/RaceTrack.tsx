import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';

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

const HORSE_COLORS = [
  '#e94560', '#6c63ff', '#00bcd4', '#4caf50',
  '#ff9800', '#e91e63', '#9c27b0', '#ffeb3b',
];

function getColorIndex(color: string): number {
  return HORSE_COLORS.findIndex(c => c.toLowerCase() === color.toLowerCase());
}

interface Props {
  raceData: RaceData | null;
  viewMode: ViewMode;
}

export default function RaceTrack({ raceData, viewMode }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const positionsRef = useRef<Map<string, number>>(new Map());
  const animRef = useRef<number>(0);
  const [renderTick, setRenderTick] = useState(0);

  const getRankings = useCallback(() => {
    if (!raceData) return [];
    return [...raceData.horses]
      .sort((a, b) => b.position - a.position)
      .map((h, i) => ({ ...h, rank: i + 1 }));
  }, [raceData]);

  const leaderId = useMemo(() => {
    const ranked = getRankings();
    return ranked.length > 0 && raceData?.phase === 'racing' ? ranked[0].id : null;
  }, [getRankings, raceData]);

  useEffect(() => {
    if (!raceData || viewMode !== 'standard') return;

    let lastTime = performance.now();

    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      for (const horse of raceData.horses) {
        const currentPos = positionsRef.current.get(horse.id) ?? 0;
        const targetPos = horse.position;
        const newPos = currentPos + (targetPos - currentPos) * Math.min(1, dt * 20);
        positionsRef.current.set(horse.id, newPos);
      }

      setRenderTick(t => t + 1);
      animRef.current = requestAnimationFrame(animate);
    };

    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [raceData, viewMode]);

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

  const trackWidth = 100;

  return (
    <div className="race-container" ref={trackRef}>
      <div className="race-lanes" style={{ position: 'relative', width: '100%', height: '100%' }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="race-lane"
            style={{
              top: `${i * 87.5 + 50}px`,
              height: '80px',
            }}
          />
        ))}

        <div className="finish-line" />

        {raceData?.horses.map((horse) => {
          const pos = positionsRef.current.get(horse.id) ?? horse.position;
          const leftPct = (pos / raceData.trackLength) * (trackWidth - 8) + 2;
          const top = horse.lane * 87.5 + 50 + 24;
          const colorIdx = getColorIndex(horse.color);
          const isLeader = horse.id === leaderId;
          const isSprinting = horse.strategy === 'sprint' &&
            (horse.position / raceData.trackLength) > 0.7 &&
            raceData.phase === 'racing';
          const isRunning = raceData.phase === 'racing' && !horse.finished;

          return (
            <div
              key={horse.id}
              className={`horse-sprite horse-color-${colorIdx} ${isRunning ? 'horse-running' : 'horse-idle'}`}
              style={{
                left: `calc(${leftPct}%)`,
                top: `${top}px`,
              }}
              title={horse.name}
            >
              {isLeader && (
                <div className="horse-leader-stars">
                  <div className="horse-leader-star" />
                  <div className="horse-leader-star" />
                  <div className="horse-leader-star" />
                </div>
              )}
              {isSprinting && (
                <div
                  className="horse-sprint-glow"
                  style={{
                    background: `radial-gradient(circle, ${horse.color}60 0%, ${horse.color}00 70%)`,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [speedLines, setSpeedLines] = useState<Array<{ id: number; left: number; delay: number }>>([]);
  const [scrollOffset, setScrollOffset] = useState(0);

  useEffect(() => {
    if (!raceData || raceData.phase !== 'racing') return;

    let animId: number;
    let lastTime = performance.now();
    let lines: Array<{ id: number; left: number; delay: number }> = [];
    let lineId = 0;

    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      const playerHorse = raceData.horses[0];
      if (playerHorse) {
        const speedFactor = playerHorse.currentSpeed / playerHorse.maxSpeed;
        setScrollOffset(prev => (prev + dt * 300 * speedFactor) % 40);

        if (Math.random() < speedFactor * 0.3) {
          lines.push({
            id: lineId++,
            left: Math.random() * 100,
            delay: 0,
          });
          if (lines.length > 12) lines = lines.slice(-12);
          setSpeedLines([...lines]);
        }
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [raceData]);

  const playerHorse = raceData?.horses[0];
  const speedFactor = playerHorse ? playerHorse.currentSpeed / playerHorse.maxSpeed : 0;

  const sortedHorses = useMemo(() => {
    if (!raceData) return [];
    return [...raceData.horses]
      .map(h => ({
        ...h,
        relPos: h.position - (playerHorse?.position ?? 0),
      }))
      .filter(h => Math.abs(h.relPos) < 400)
      .sort((a, b) => a.relPos - b.relPos);
  }, [raceData, playerHorse]);

  return (
    <div className="first-person-view" ref={containerRef}>
      <div className="fp-speed-lines">
        {speedLines.map((line) => (
          <div
            key={line.id}
            className="fp-speed-line"
            style={{
              left: `${line.left}%`,
              top: '-40px',
              animationDuration: `${0.4 / Math.max(0.3, speedFactor)}s`,
              height: `${30 + speedFactor * 40}px`,
            }}
          />
        ))}
      </div>

      <div className="first-person-track">
        <div className="fp-ground-texture" style={{ animationDuration: `${0.6 / Math.max(0.2, speedFactor)}s` }} />
      </div>

      <div className="fp-motion-blur" style={{ opacity: 0.3 + speedFactor * 0.5 }} />

      {sortedHorses.filter(h => h.id !== playerHorse?.id).map((horse) => {
        const dist = Math.max(0.1, 1 - (horse.relPos / 400));
        const laneOffset = (horse.lane - (playerHorse?.lane ?? 4)) * 50;
        const x = 50 + laneOffset * dist;
        const y = 45 + (1 - dist) * 45;
        const size = Math.max(8, 40 * (1 - dist));
        const colorIdx = getColorIndex(horse.color);
        const opacity = Math.min(1, dist * 3);

        return (
          <div
            key={horse.id}
            className={`horse-sprite horse-color-${colorIdx} horse-running`}
            style={{
              left: `${x}%`,
              top: `${y}%`,
              width: `${size}px`,
              height: `${size}px`,
              backgroundSize: `${size * 8}px ${size * 2}px`,
              backgroundPosition: `-${colorIdx * size}px 0`,
              opacity,
              filter: `blur(${(1 - dist) * 3}px)`,
              transform: 'translate(-50%, -50%)',
              zIndex: Math.floor(100 - dist * 100),
            }}
          />
        );
      })}

      <div className="fp-horse-silhouette">
        <div
          className={`horse-sprite horse-color-${getColorIndex(playerHorse?.color ?? '#e94560')} horse-running`}
          style={{
            width: '120px',
            height: '120px',
            backgroundSize: '960px 240px',
            backgroundPosition: `-${getColorIndex(playerHorse?.color ?? '#e94560') * 120}px 0`,
            opacity: 0.7,
            filter: 'blur(2px)',
          }}
        />
      </div>

      <div className="view-mode-hint" style={{ bottom: '12px' }}>
        按 1 标准视角 | 按 2 第一人称 | 按 3 俯视地图
      </div>
    </div>
  );
}

function MinimapView({ raceData }: { raceData: RaceData | null }) {
  if (!raceData) return null;

  const sorted = [...raceData.horses].sort((a, b) => a.lane - b.lane);

  return (
    <div className="minimap-container">
      <div className="minimap-title">俯视地图</div>
      <div className="minimap-track">
        {sorted.map((horse) => (
          <div key={horse.id} className="minimap-lane">
            <div
              className="minimap-dot"
              style={{
                left: `${(horse.position / raceData.trackLength) * 90}%`,
                background: horse.color,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
