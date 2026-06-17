import { useEffect, useRef, useState } from 'react';
import { SpellType } from './GestureRecognizer';
import { TrackPoint, HandLandmark } from './GestureRecognizer';

export interface SpellIconState {
  type: SpellType;
  isCharging: boolean;
  cooldownProgress: number;
}

export interface SpellLogEntry {
  id: number;
  spellName: string;
  timestamp: string;
  color: string;
}

interface UIOverlayProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  handLandmarks: HandLandmark[] | null;
  trajectory: TrackPoint[];
  spellIcons: SpellIconState[];
  spellLogs: SpellLogEntry[];
}

const HAND_CONNECTIONS: [number, number][] = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17]
];

const SPELL_NAMES: Record<string, string> = {
  fireball: '火球术',
  iceSpike: '冰锥术',
  lightning: '雷电术'
};

export function UIOverlay({
  videoRef,
  handLandmarks,
  trajectory,
  spellIcons,
  spellLogs
}: UIOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [displayedLogs, setDisplayedLogs] = useState<SpellLogEntry[]>([]);

  useEffect(() => {
    if (spellLogs.length === 0) return;
    const newLog = spellLogs[spellLogs.length - 1];
    const existing = displayedLogs.find(l => l.id === newLog.id);
    if (!existing) {
      setDisplayedLogs(prev => [...prev, newLog].slice(-5));
      setTimeout(() => {
        setDisplayedLogs(prev => prev.map(l =>
          l.id === newLog.id ? { ...l } : l
        ));
      }, 20);
    }
  }, [spellLogs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      if (trajectory.length > 1) {
        ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        trajectory.forEach((p, i) => {
          const x = p.x * w;
          const y = p.y * h;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }

      if (handLandmarks && handLandmarks.length === 21) {
        ctx.strokeStyle = '#6b9080';
        ctx.lineWidth = 1;
        HAND_CONNECTIONS.forEach(([a, b]) => {
          const p1 = handLandmarks[a];
          const p2 = handLandmarks[b];
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x * w, p1.y * h);
            ctx.lineTo(p2.x * w, p2.y * h);
            ctx.stroke();
          }
        });

        ctx.fillStyle = '#6b9080';
        handLandmarks.forEach(p => {
          ctx.beginPath();
          ctx.arc(p.x * w, p.y * h, 2, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      requestAnimationFrame(render);
    };
    const id = requestAnimationFrame(render);
    return () => cancelAnimationFrame(id);
  }, [handLandmarks, trajectory]);

  return (
    <div style={styles.overlay}>
      <div style={styles.cameraWindow}>
        <video
          ref={videoRef as any}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '12px',
            transform: 'scaleX(-1)'
          }}
          muted
          playsInline
        />
        <canvas
          ref={canvasRef}
          width={320}
          height={240}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            transform: 'scaleX(-1)',
            pointerEvents: 'none'
          }}
        />
      </div>

      <div style={styles.spellIconsContainer}>
        {spellIcons.map((icon, idx) => (
          <SpellIcon key={idx} state={icon} index={idx} />
        ))}
      </div>

      <div style={styles.logPanel}>
        <div style={styles.logHeader}>技能日志</div>
        <div style={styles.logList}>
          {displayedLogs.map((log, idx) => (
            <LogItem key={log.id} entry={log} index={displayedLogs.length - 1 - idx} />
          ))}
        </div>
      </div>
    </div>
  );
}

function SpellIcon({ state, index }: { state: SpellIconState; index: number }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [rotAngle, setRotAngle] = useState(0);

  const colors: Record<string, { main: string; glow: string; bg: string }> = {
    fireball: { main: '#ff4422', glow: '#ff8844', bg: '#3a1510' },
    iceSpike: { main: '#44aaff', glow: '#88ddff', bg: '#10203a' },
    lightning: { main: '#ffdd33', glow: '#ffee88', bg: '#3a3510' }
  };
  const c = colors[state.type || 'fireball'];
  const icons: Record<string, string> = {
    fireball: '🔥',
    iceSpike: '❄',
    lightning: '⚡'
  };

  useEffect(() => {
    let raf: number;
    const animate = () => {
      if (state.isCharging) {
        setRotAngle(prev => (prev + 360 / (0.6 * 60)) % 360);
      }
      raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [state.isCharging]);

  const isOnCooldown = state.cooldownProgress < 1;

  return (
    <div style={{
      position: 'relative',
      width: 72,
      height: 72,
      margin: index < 2 ? '0 12px 0 0' : 0
    }}>
      <svg
        width={72}
        height={72}
        ref={svgRef}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <circle
          cx={36}
          cy={36}
          r={32}
          fill="none"
          stroke={c.bg}
          strokeWidth={3}
        />
        {state.isCharging && (
          <g transform={`rotate(${rotAngle} 36 36)`}>
            <circle
              cx={36}
              cy={36}
              r={32}
              fill="none"
              stroke={c.main}
              strokeWidth={3}
              strokeLinecap="round"
              strokeDasharray={`${32 * 2 * Math.PI * 0.25} ${32 * 2 * Math.PI * 0.75}`}
              style={{ filter: `drop-shadow(0 0 6px ${c.glow})` }}
            />
          </g>
        )}
        {isOnCooldown && !state.isCharging && (
          <circle
            cx={36}
            cy={36}
            r={32}
            fill="none"
            stroke={c.main}
            strokeWidth={4}
            strokeLinecap="round"
            strokeDasharray={`${32 * 2 * Math.PI * state.cooldownProgress} ${32 * 2 * Math.PI}`}
            transform="rotate(-90 36 36)"
            opacity={0.6}
          />
        )}
      </svg>
      <div style={{
        position: 'absolute',
        top: 6,
        left: 6,
        width: 60,
        height: 60,
        borderRadius: '50%',
        background: isOnCooldown && !state.isCharging
          ? `linear-gradient(135deg, ${c.bg}, #111)`
          : `radial-gradient(circle at 30% 30%, ${c.glow}, ${c.main}, ${c.bg})`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 28,
        opacity: isOnCooldown && !state.isCharging ? 0.5 : 1,
        transition: 'opacity 0.2s',
        boxShadow: state.isCharging
          ? `0 0 20px ${c.glow}, inset 0 0 10px ${c.main}`
          : `inset 0 0 5px rgba(0,0,0,0.5)`
      }}>
        {icons[state.type || 'fireball']}
      </div>
      <div style={{
        position: 'absolute',
        bottom: -18,
        left: 0,
        width: 72,
        textAlign: 'center',
        fontSize: 11,
        color: c.main,
        textShadow: `0 0 4px ${c.glow}`
      }}>
        {SPELL_NAMES[state.type || 'fireball']}
      </div>
    </div>
  );
}

function LogItem({ entry, index }: { entry: SpellLogEntry; index: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      style={{
        transform: visible ? 'translateX(0)' : 'translateX(30px)',
        opacity: visible ? 1 - index * 0.15 : 0,
        transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '4px 8px',
        marginBottom: 4,
        borderRadius: 6,
        background: 'rgba(0,0,0,0.3)',
        borderLeft: `2px solid ${entry.color}`,
        fontSize: 12
      }}
    >
      <span style={{ color: entry.color, fontWeight: 600 }}>{entry.spellName}</span>
      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>{entry.timestamp}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
    zIndex: 10
  },
  cameraWindow: {
    position: 'absolute',
    top: 20,
    left: 20,
    width: 320,
    height: 240,
    borderRadius: 12,
    border: '3px solid #555',
    overflow: 'hidden',
    boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
    background: '#000'
  },
  spellIconsContainer: {
    position: 'absolute',
    bottom: 140,
    right: 40,
    display: 'flex',
    alignItems: 'center',
    pointerEvents: 'none'
  },
  logPanel: {
    position: 'absolute',
    bottom: 30,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 360,
    background: 'rgba(15, 10, 20, 0.55)',
    backdropFilter: 'blur(8px)',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.1)',
    padding: '10px 14px 12px',
    pointerEvents: 'none'
  },
  logHeader: {
    fontSize: 13,
    fontWeight: 700,
    color: 'rgba(255,255,255,0.85)',
    marginBottom: 8,
    paddingBottom: 6,
    borderBottom: '1px solid rgba(255,255,255,0.12)',
    letterSpacing: 1
  },
  logList: {
    display: 'flex',
    flexDirection: 'column-reverse'
  }
};

export function formatTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
