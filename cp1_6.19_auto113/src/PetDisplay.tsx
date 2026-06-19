import { useEffect, useRef, useMemo } from 'react';
import type { Pet, PetStats, StatPopup } from './types';
import { getPetSprite } from './petSprites';

interface PetDisplayProps {
  pet: Pet;
  statPopups: StatPopup[];
  flashingStats: { stat: keyof PetStats; isPositive: boolean }[];
}

type Particle = {
  x: number;
  y: number;
  size: number;
  color: string;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
};

const PARTICLE_COLORS = [
  '#ffd89b',
  '#f4b8c5',
  '#a8d5ba',
  '#bbdefb',
  '#ffcc80',
  '#f8bbd0',
  '#c5e1a5',
  '#ffab91',
  '#ce93d8',
  '#81d4fa',
];

function PixelPet({ type, colorVariant, animationState }: {
  type: Pet['type'];
  colorVariant: Pet['colorVariant'];
  animationState: Pet['animationState'];
}) {
  const sprite = useMemo(() => getPetSprite(type, colorVariant), [type, colorVariant]);
  const rows = sprite.length;
  const cols = sprite[0]?.length ?? 0;

  return (
    <div
      className={`pixel-pet ${animationState}`}
      style={{
        gridTemplateColumns: `repeat(${cols}, var(--cell-size, 16px))`,
        gridTemplateRows: `repeat(${rows}, var(--cell-size, 16px))`,
      }}
    >
      {sprite.flatMap((row, rIdx) =>
        row.map((cell, cIdx) => (
          <div
            key={`${rIdx}-${cIdx}`}
            className="pixel-cell"
            style={{
              backgroundColor: cell ?? 'transparent',
            }}
          />
        ))
      )}
    </div>
  );
}

function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(canvas);

    const createParticle = (): Particle => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: Math.random() * rect.width,
        y: rect.height + Math.random() * 50,
        size: 2 + Math.random() * 5,
        color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
        vx: (Math.random() - 0.5) * 0.8,
        vy: -(0.3 + Math.random() * 1.2),
        life: 0,
        maxLife: 200 + Math.random() * 200,
      };
    };

    const initParticles = () => {
      const rect = canvas.getBoundingClientRect();
      particlesRef.current = Array.from({ length: 50 }, () => {
        const p = createParticle();
        p.y = Math.random() * rect.height;
        p.life = Math.random() * p.maxLife;
        return p;
      });
    };

    initParticles();

    const animate = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      particlesRef.current.forEach((p, idx) => {
        p.life++;
        p.x += p.vx + Math.sin((p.life + idx) * 0.02) * 0.3;
        p.y += p.vy;

        if (p.life >= p.maxLife || p.y < -10 || p.x < -20 || p.x > rect.width + 20) {
          Object.assign(p, createParticle());
        }

        const alpha =
          p.life < 30
            ? p.life / 30
            : p.life > p.maxLife - 30
              ? (p.maxLife - p.life) / 30
              : 1;

        ctx.beginPath();
        ctx.globalAlpha = alpha * 0.7;
        ctx.fillStyle = p.color;
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      resizeObserver.disconnect();
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return <canvas ref={canvasRef} className="particle-canvas" />;
}

function StatBar({
  label,
  icon,
  value,
  statKey,
  flashing,
  isPositive,
  popups,
}: {
  label: string;
  icon: string;
  value: number;
  statKey: keyof PetStats;
  flashing: boolean | undefined;
  isPositive: boolean;
  popups: StatPopup[];
}) {
  const relatedPopups = popups.filter((p) => p.stat === statKey);
  const flashClass = flashing
    ? isPositive
      ? 'flash-green'
      : 'flash-red'
    : '';

  return (
    <div className="stat-bar">
      <div className="stat-label">
        <span className="stat-label-name">
          <span>{icon}</span>
          <span>{label}</span>
        </span>
        <span className={`stat-value ${flashClass}`}>{Math.round(value)}</span>
      </div>
      <div className="stat-track">
        <div
          className={`stat-fill ${statKey}`}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
      {relatedPopups.map((p) => (
        <div
          key={p.id}
          className={`stat-popup ${p.isPositive ? 'positive' : 'negative'}`}
        >
          {p.isPositive ? '+' : ''}
          {p.value}
        </div>
      ))}
    </div>
  );
}

export default function PetDisplay({ pet, statPopups, flashingStats }: PetDisplayProps) {
  const { hunger, happiness, cleanliness } = pet.stats;

  const warningEmoji = useMemo(() => {
    if (hunger < 20) return '🍽️';
    if (happiness < 20) return '🥱';
    if (cleanliness < 20) return '💨';
    return null;
  }, [hunger, happiness, cleanliness]);

  const hungerFlash = flashingStats.find((f) => f.stat === 'hunger');
  const happinessFlash = flashingStats.find((f) => f.stat === 'happiness');
  const cleanlinessFlash = flashingStats.find((f) => f.stat === 'cleanliness');

  return (
    <section className="pet-display-section">
      <div className="pet-stage-wrapper">
        <ParticleCanvas />
        <div className="pet-container">
          {warningEmoji && <div className="status-bubble">{warningEmoji}</div>}
          <div className="pet-sprite">
            <PixelPet
              type={pet.type}
              colorVariant={pet.colorVariant}
              animationState={pet.animationState}
            />
          </div>
        </div>
      </div>

      <div className="stats-panel">
        <StatBar
          label="饱腹度"
          icon="🍖"
          value={hunger}
          statKey="hunger"
          flashing={!!hungerFlash}
          isPositive={hungerFlash?.isPositive ?? true}
          popups={statPopups}
        />
        <StatBar
          label="快乐度"
          icon="🎮"
          value={happiness}
          statKey="happiness"
          flashing={!!happinessFlash}
          isPositive={happinessFlash?.isPositive ?? true}
          popups={statPopups}
        />
        <StatBar
          label="清洁度"
          icon="🧼"
          value={cleanliness}
          statKey="cleanliness"
          flashing={!!cleanlinessFlash}
          isPositive={cleanlinessFlash?.isPositive ?? true}
          popups={statPopups}
        />
      </div>
    </section>
  );
}
