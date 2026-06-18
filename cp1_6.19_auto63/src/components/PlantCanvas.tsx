import React, { useEffect, useRef, memo } from 'react';
import { useGameStore } from '../store/gameStore';
import {
  Plant,
  Leaf,
  Flower,
  Crystal,
  GROWTH_ANIM_DURATION,
  BLOOM_ANIM_DURATION,
  BREATH_PERIOD,
  MUTATION_LIFETIME,
} from '../store/types';

const ease = 'cubic-bezier(0.4, 0, 0.2, 1)';

interface LeafRenderProps {
  leaf: Leaf;
  stemX: number;
  isMutating: boolean;
  wilting: boolean;
  colorIndex: number;
}

const LeafRender: React.FC<LeafRenderProps> = memo(({ leaf, stemX, isMutating, wilting, colorIndex }) => {
  const maxColor = 10;
  const t = Math.min(colorIndex / maxColor, 1);

  let startColor: string, endColor: string;
  if (wilting) {
    startColor = '#fdd835';
    endColor = '#f9a825';
  } else if (isMutating) {
    startColor = '#ce93d8';
    endColor = '#9c27b0';
  } else {
    const r1 = Math.round(102 + (46 - 102) * t);
    const g1 = Math.round(187 + (125 - 187) * t);
    const b1 = Math.round(106 + (50 - 106) * t);
    startColor = `rgb(${r1},${g1},${b1})`;
    const r2 = Math.round(76 + (33 - 76) * t);
    const g2 = Math.round(175 + (115 - 175) * t);
    const b2 = Math.round(80 + (36 - 80) * t);
    endColor = `rgb(${r2},${g2},${b2})`;
  }

  const sign = leaf.side === 'left' ? -1 : 1;
  const width = 34;
  const height = 16;
  const cx = stemX + sign * width * 0.45;
  const cy = -leaf.y;

  const gradId = `leaf-g-${leaf.id}`;

  return (
    <g transform={`translate(${cx}, ${cy}) scale(${sign}, 1)`}>
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={startColor} />
          <stop offset="100%" stopColor={endColor} />
        </linearGradient>
      </defs>
      <ellipse
        cx={width * 0.5}
        cy={0}
        rx={width * 0.55}
        ry={height * 0.55}
        fill={`url(#${gradId})`}
        stroke={isMutating ? '#ba68c8' : 'rgba(0,0,0,0.25)'}
        strokeWidth={1}
        style={{
          transformOrigin: '0px 0px',
          animation: `leafPop 0.5s ${ease} both`,
        }}
      />
      <line
        x1={0}
        y1={0}
        x2={width * 0.9}
        y2={0}
        stroke={wilting ? '#f57f17' : isMutating ? '#8e24aa' : 'rgba(27,94,32,0.55)'}
        strokeWidth={1.2}
        strokeLinecap="round"
      />
    </g>
  );
});

LeafRender.displayName = 'LeafRender';

interface FlowerRenderProps {
  flower: Flower;
  now: number;
  stemTopX: number;
  stemTopY: number;
}

const FlowerRender: React.FC<FlowerRenderProps> = memo(({ flower, now, stemTopX, stemTopY }) => {
  const lifeElapsed = now - flower.createdAt;
  const bloomProgress = Math.min(lifeElapsed / BLOOM_ANIM_DURATION, 1);
  const fadeStart = 16000;
  const fadeProgress = lifeElapsed > fadeStart
    ? Math.max(0, 1 - (lifeElapsed - fadeStart) / 4000)
    : 1;

  const scale = 0.1 + bloomProgress * 0.9;
  const rotation = bloomProgress * 180;
  const opacity = Math.min(1, fadeProgress);

  const petals: React.ReactElement[] = [];
  for (let i = 0; i < flower.petalCount; i++) {
    const angle = (360 / flower.petalCount) * i;
    petals.push(
      <ellipse
        key={i}
        cx={0}
        cy={-14}
        rx={8}
        ry={16}
        fill={flower.color}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={0.8}
        transform={`rotate(${angle})`}
        style={{ transformOrigin: '0 0' }}
      />,
    );
  }

  return (
    <g
      transform={`translate(${stemTopX + flower.x}, ${stemTopY + flower.y}) scale(${scale}) rotate(${rotation})`}
      opacity={opacity}
      style={{ transition: `opacity 0.4s ${ease}` }}
    >
      {petals}
      <circle cx={0} cy={0} r={5.5} fill="#fff59d" stroke="#fbc02d" strokeWidth={1.2} />
      <circle cx={-1.5} cy={-1.2} r={1.4} fill="#fff9c4" />
      <circle cx={1.6} cy={1} r={1.1} fill="#fdd835" opacity={0.8} />
    </g>
  );
});

FlowerRender.displayName = 'FlowerRender';

interface CrystalRenderProps { crystal: Crystal }

const CrystalRender: React.FC<CrystalRenderProps> = memo(({ crystal }) => {
  const size = 10;
  const h = (size * Math.sqrt(3)) / 2;
  const points = `0,${-h * 0.66} ${size / 2},${h * 0.33} ${-size / 2},${h * 0.33}`;
  return (
    <g
      transform={`translate(${crystal.x}, ${crystal.y}) rotate(${crystal.rotation})`}
      style={{
        animation: `crystalTwinkle 2.2s ease-in-out infinite`,
      }}
    >
      <polygon
        points={points}
        fill="#e1bee7"
        stroke="#ce93d8"
        strokeWidth={1}
        style={{ filter: 'drop-shadow(0 0 4px #e1bee7)' }}
      />
      <polygon
        points={`0,${-h * 0.66} ${size / 4},${h * 0.05} ${-size / 4},${h * 0.05}`}
        fill="#f3e5f5"
        opacity={0.8}
      />
    </g>
  );
});

CrystalRender.displayName = 'CrystalRender';

interface PlantRenderProps {
  plant: Plant;
  now: number;
  breathPhase: number;
}

const PlantRender: React.FC<PlantRenderProps> = memo(({ plant, now, breathPhase }) => {
  const growthT = plant.growthAnimation > now
    ? 1 - (plant.growthAnimation - now) / GROWTH_ANIM_DURATION
    : 1;
  const growPopScale = plant.growthAnimation > now
    ? (growthT < 0.5 ? 1 + growthT * 0.2 : 1 + (1 - growthT) * 0.1)
    : 1;

  const breathScale = 1 + 0.03 * Math.sin(breathPhase);
  const totalScale = growPopScale * breathScale;

  const stemColor = plant.isMutating ? '#7b1fa2' : '#4caf50';
  const stemDark = plant.isMutating ? '#4a148c' : '#2e7d32';
  const stemX = 0;
  const stemWidth = 8;
  const stemY = 0;
  const stemTopY = -plant.stemHeight;

  const sortedLeaves = [...plant.leaves].sort((a, b) => a.y - b.y);

  return (
    <g
      style={{
        transformOrigin: `${stemX}px ${stemY}px`,
        transform: `scale(${totalScale})`,
        transition: plant.growthAnimation > now ? `transform 0.08s linear` : undefined,
        willChange: 'transform',
      }}
    >
      <defs>
        <linearGradient id={`stem-${plant.id}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={stemDark} />
          <stop offset="35%" stopColor={stemColor} />
          <stop offset="65%" stopColor={stemColor} />
          <stop offset="100%" stopColor={stemDark} />
        </linearGradient>
        <radialGradient id={`soil-${plant.id}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="rgba(76,175,80,0.35)" />
          <stop offset="100%" stopColor="rgba(76,175,80,0)" />
        </radialGradient>
      </defs>

      <ellipse cx={stemX} cy={stemY + 4} rx={40} ry={10} fill={`url(#soil-${plant.id})`} />
      <ellipse cx={stemX} cy={stemY + 2} rx={22} ry={5} fill="#3e2723" opacity={0.7} />

      <rect
        x={stemX - stemWidth / 2}
        y={stemTopY}
        width={stemWidth}
        height={plant.stemHeight}
        rx={stemWidth / 2}
        fill={`url(#stem-${plant.id})`}
        stroke={plant.isMutating ? '#9c27b0' : '#388e3c'}
        strokeWidth={0.8}
      />

      {sortedLeaves.map((leaf, idx) => (
        <LeafRender
          key={leaf.id}
          leaf={leaf}
          stemX={stemX}
          isMutating={plant.isMutating}
          wilting={plant.wilting}
          colorIndex={leaf.colorIndex ?? idx}
        />
      ))}

      {plant.flowers.map(f => (
        <FlowerRender key={f.id} flower={f} now={now} stemTopX={stemX} stemTopY={stemTopY} />
      ))}

      {plant.crystals.map(c => (
        <CrystalRender key={c.id} crystal={c} />
      ))}

      {plant.isMutating && (
        <circle
          cx={stemX}
          cy={stemTopY + 10}
          r={22 + Math.sin(now / 180) * 3}
          fill="none"
          stroke="#e040fb"
          strokeWidth={1.5}
          opacity={0.35 + Math.sin(now / 250) * 0.15}
          strokeDasharray="4 5"
          style={{ transformOrigin: `${stemX}px ${stemTopY + 10}px`, animation: 'auraSpin 6s linear infinite' }}
        />
      )}
    </g>
  );
});

PlantRender.displayName = 'PlantRender';

interface MutationBannerProps { plant: Plant; now: number }

const MutationBanner: React.FC<MutationBannerProps> = ({ plant, now }) => {
  if (!plant.isMutating) return null;
  const remaining = Math.max(0, Math.ceil((plant.mutationEndsAt - now) / 1000));
  const totalSec = Math.ceil(MUTATION_LIFETIME / 1000);
  const t = remaining / totalSec;
  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        padding: '8px 18px',
        borderRadius: 20,
        background: 'rgba(224, 64, 251, 0.15)',
        border: '1px solid #e040fb',
        color: '#f8bbd0',
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 0.5,
        boxShadow: '0 0 20px rgba(224,64,251,0.3)',
        animation: `fadeSlide 0.4s ${ease}`,
        backdropFilter: 'blur(4px)',
      }}
    >
      ✦ 变异状态持续 {remaining}s
      <div
        style={{
          marginTop: 4,
          height: 3,
          borderRadius: 2,
          background: 'rgba(255,255,255,0.15)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${t * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #e040fb, #ff80ab)',
            transition: 'width 1s linear',
          }}
        />
      </div>
    </div>
  );
};

const PlantCanvas: React.FC = () => {
  const plants = useGameStore(s => s.plants);
  const updateGrowth = useGameStore(s => s.updateGrowth);
  const runeFeedback = useGameStore(s => s.runeFeedback);
  const clearFeedback = useGameStore(s => s.clearFeedback);
  const fbTimerRef = useRef<number | null>(null);

  const nowRef = useRef(Date.now());
  const breathRef = useRef(0);

  const [, forceTick] = React.useReducer((x: number) => x + 1, 0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let stateUpdateAccum = 0;
    const loop = (t: number) => {
      const dt = t - last;
      last = t;
      nowRef.current = Date.now();
      breathRef.current += (dt / 1000) * Math.PI * 2 / (BREATH_PERIOD / 1000);

      stateUpdateAccum += dt;
      if (stateUpdateAccum >= 16) {
        updateGrowth(nowRef.current);
        stateUpdateAccum = 0;
      }
      forceTick();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [updateGrowth]);

  useEffect(() => {
    if (runeFeedback) {
      if (fbTimerRef.current) window.clearTimeout(fbTimerRef.current);
      fbTimerRef.current = window.setTimeout(() => clearFeedback(), 1500);
    }
    return () => {
      if (fbTimerRef.current) window.clearTimeout(fbTimerRef.current);
    };
  }, [runeFeedback, clearFeedback]);

  const plant = plants[0];
  const now = nowRef.current;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        background:
          'radial-gradient(ellipse at 50% 45%, #1a1a2e 0%, #16213e 75%, #0f1629 100%)',
        overflow: 'hidden',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'radial-gradient(rgba(0,255,204,0.08) 1px, transparent 1px), radial-gradient(rgba(124,77,255,0.06) 1px, transparent 1px)',
          backgroundSize: '50px 50px, 80px 80px',
          backgroundPosition: '0 0, 25px 25px',
          pointerEvents: 'none',
        }}
      />

      <MutationBanner plant={plant} now={now} />

      {runeFeedback && (
        <div
          style={{
            position: 'absolute',
            top: 70,
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '7px 18px',
            borderRadius: 18,
            background: runeFeedback.type === 'success'
              ? 'rgba(0, 255, 150, 0.12)'
              : 'rgba(255, 100, 100, 0.15)',
            border: `1px solid ${runeFeedback.type === 'success' ? '#00ffa2' : '#ff7777'}`,
            color: runeFeedback.type === 'success' ? '#b2ffd9' : '#ffc9c9',
            fontSize: 13,
            fontWeight: 600,
            animation: `fadeSlide 0.35s ${ease}`,
            backdropFilter: 'blur(4px)',
            zIndex: 5,
          }}
        >
          {runeFeedback.msg}
        </div>
      )}

      <svg
        viewBox="-250 -280 500 400"
        preserveAspectRatio="xMidYMid meet"
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
        }}
      >
        <PlantRender plant={plant} now={now} breathPhase={breathRef.current} />
      </svg>

      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 80,
          background:
            'linear-gradient(to top, rgba(76,175,80,0.14), rgba(76,175,80,0))',
          pointerEvents: 'none',
        }}
      />

      <style>{`
        @keyframes leafPop {
          0% { transform-origin: 0px 0px; transform: scale(0.2) rotate(-20deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(6deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes crystalTwinkle {
          0%, 100% { opacity: 0.85; filter: drop-shadow(0 0 4px #e1bee7); }
          50% { opacity: 1; filter: drop-shadow(0 0 10px #e040fb); }
        }
        @keyframes auraSpin { to { transform: rotate(360deg); } }
        @keyframes fadeSlide {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  );
};

export default memo(PlantCanvas);
