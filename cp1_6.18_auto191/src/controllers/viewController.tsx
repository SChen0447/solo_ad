import { useRef, useEffect, useState } from 'react';
import { OrbitControls } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import { WHEEL_PRESETS, COLOR_PRESETS, SIZE_RANGE, DEFAULT_CAMERA_STATE } from '../types';

interface ViewControllerProps {
  controlsRef?: React.RefObject<any>;
}

export function CameraController({ controlsRef }: ViewControllerProps) {
  const { camera } = useThree();
  const setCameraState = useAppStore((state) => state.setCameraState);
  const cameraState = useAppStore((state) => state.cameraState);

  useEffect(() => {
    camera.position.set(...cameraState.position);
  }, []);

  const handleChange = () => {
    if (controlsRef?.current) {
      const target = controlsRef.current.target;
      setCameraState({
        position: [camera.position.x, camera.position.y, camera.position.z],
        target: [target.x, target.y, target.z],
      });
    }
  };

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minPolarAngle={Math.PI / 2 - Math.PI / 3}
      maxPolarAngle={Math.PI / 2 + Math.PI / 9}
      minDistance={3}
      maxDistance={15}
      target={DEFAULT_CAMERA_STATE.target}
      onChange={handleChange}
      makeDefault
    />
  );
}

function WheelThumbnail({ wheelId, color }: { wheelId: string; color: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 60;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 4;
    const preset = WHEEL_PRESETS.find((w) => w.id === wheelId);

    ctx.clearRect(0, 0, size, size);

    const tireGradient = ctx.createRadialGradient(centerX, centerY, radius * 0.7, centerX, centerY, radius);
    tireGradient.addColorStop(0, '#2a2a2a');
    tireGradient.addColorStop(1, '#1a1a1a');
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.fillStyle = tireGradient;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.82, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    if (preset) {
      ctx.fillStyle = color;
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;

      switch (preset.type) {
        case 'classic':
          for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle);
            ctx.fillRect(-3, -radius * 0.75, 6, radius * 0.55);
            ctx.restore();
          }
          break;
        case 'sport':
          for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2 - Math.PI / 2;
            const offset = i % 2 === 0 ? 2 : -2;
            ctx.save();
            ctx.translate(centerX + offset * Math.cos(angle + Math.PI / 2), centerY + offset * Math.sin(angle + Math.PI / 2));
            ctx.rotate(angle);
            ctx.fillRect(-2, -radius * 0.75, 4, radius * 0.55);
            ctx.restore();
          }
          break;
        case 'cross':
          for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
            const twist = i % 2 === 0 ? 0.2 : -0.2;
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle + twist);
            ctx.fillRect(-2, -radius * 0.75, 4, radius * 0.55);
            ctx.restore();
          }
          break;
        case 'dense':
          for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2 - Math.PI / 2;
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(angle);
            ctx.fillRect(-1, -radius * 0.75, 2, radius * 0.55);
            ctx.restore();
          }
          break;
        case 'concept':
          ctx.beginPath();
          ctx.arc(centerX, centerY, radius * 0.78, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();
          ctx.fillStyle = '#1a1a1a';
          for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2 + Math.PI / 10;
            const cx = centerX + Math.cos(angle) * radius * 0.35;
            const cy = centerY + Math.sin(angle) * radius * 0.35;
            ctx.beginPath();
            ctx.arc(cx, cy, radius * 0.12, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
      }
    }

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = '#666';
    ctx.fill();
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = '#444';
    ctx.fill();
  }, [wheelId, color]);

  return (
    <canvas
      ref={canvasRef}
      width={60}
      height={60}
      style={{
        borderRadius: '50%',
        background: '#1a1a1a',
        boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
      }}
    />
  );
}

export function ControlPanel() {
  const [isMobile, setIsMobile] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const selectWheel = useAppStore((state) => state.selectWheel);
  const setColor = useAppStore((state) => state.setColor);
  const setSize = useAppStore((state) => state.setSize);
  const toggleComparisonMode = useAppStore((state) => state.toggleComparisonMode);
  const comparisonMode = useAppStore((state) => state.comparisonMode);
  const leftWheelParams = useAppStore((state) => state.leftWheelParams);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const colorIndex = COLOR_PRESETS.indexOf(leftWheelParams.color);
  const colorProgress = (colorIndex / (COLOR_PRESETS.length - 1)) * 100;
  const sizeProgress = ((leftWheelParams.size - SIZE_RANGE.min) / (SIZE_RANGE.max - SIZE_RANGE.min)) * 100;

  const panelContent = (
    <>
      <div style={styles.logoSection}>
        <div style={styles.logoIcon}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#d4a843" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="3" />
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <line
                key={angle}
                x1={12 + 4 * Math.cos((angle * Math.PI) / 180)}
                y1={12 + 4 * Math.sin((angle * Math.PI) / 180)}
                x2={12 + 9 * Math.cos((angle * Math.PI) / 180)}
                y2={12 + 9 * Math.sin((angle * Math.PI) / 180)}
              />
            ))}
          </svg>
        </div>
        <div>
          <h1 style={styles.title}>轮毂配置器</h1>
          <p style={styles.subtitle}>Wheel Configurator</p>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>选择轮毂款式</h3>
        <div style={styles.wheelList}>
          {WHEEL_PRESETS.map((preset) => (
            <div
              key={preset.id}
              style={{
                ...styles.wheelCard,
                ...(leftWheelParams.wheelId === preset.id ? styles.wheelCardActive : {}),
              }}
              onClick={() => selectWheel(preset.id)}
            >
              <WheelThumbnail wheelId={preset.id} color={leftWheelParams.color} />
              <span style={styles.wheelName}>{preset.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          轮毂颜色 <span style={styles.valueBadge}>{leftWheelParams.color}</span>
        </h3>
        <div style={styles.sliderContainer}>
          <input
            type="range"
            min={0}
            max={COLOR_PRESETS.length - 1}
            step={1}
            value={colorIndex}
            onChange={(e) => setColor(COLOR_PRESETS[parseInt(e.target.value)])}
            style={{
              ...styles.slider,
              background: `linear-gradient(to right, #d4a843 0%, #d4a843 ${colorProgress}%, #555 ${colorProgress}%, #555 100%)`,
            }}
          />
          <div style={styles.colorSwatches}>
            {COLOR_PRESETS.map((c, i) => (
              <div
                key={i}
                style={{
                  ...styles.colorSwatch,
                  backgroundColor: c,
                  ...(c === leftWheelParams.color ? styles.colorSwatchActive : {}),
                }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          轮毂尺寸 <span style={styles.valueBadge}>{leftWheelParams.size} 英寸</span>
        </h3>
        <div style={styles.sliderContainer}>
          <input
            type="range"
            min={SIZE_RANGE.min}
            max={SIZE_RANGE.max}
            step={SIZE_RANGE.step}
            value={leftWheelParams.size}
            onChange={(e) => setSize(parseInt(e.target.value))}
            style={{
              ...styles.slider,
              background: `linear-gradient(to right, #d4a843 0%, #d4a843 ${sizeProgress}%, #555 ${sizeProgress}%, #555 100%)`,
            }}
          />
          <div style={styles.sizeMarks}>
            {Array.from(
              { length: SIZE_RANGE.max - SIZE_RANGE.min + 1 },
              (_, i) => SIZE_RANGE.min + i
            ).map((s) => (
              <span
                key={s}
                style={{
                  ...styles.sizeMark,
                  ...(s === leftWheelParams.size ? styles.sizeMarkActive : {}),
                }}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>
    </>
  );

  return (
    <>
      {isMobile ? (
        <>
          <button style={styles.drawerToggle} onClick={() => setDrawerOpen(!drawerOpen)}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              {drawerOpen ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
          {drawerOpen && (
            <div style={styles.drawerOverlay} onClick={() => setDrawerOpen(false)}>
              <div style={styles.drawer} onClick={(e) => e.stopPropagation()}>
                {panelContent}
              </div>
            </div>
          )}
        </>
      ) : (
        <div style={styles.panel}>{panelContent}</div>
      )}

      <button style={styles.splitButton} onClick={toggleComparisonMode}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="3" width="7" height="18" rx="1" fill={comparisonMode ? '#d4a843' : 'none'} />
          <rect x="14" y="3" width="7" height="18" rx="1" fill={comparisonMode ? '#888' : 'none'} />
          <line x1="12" y1="3" x2="12" y2="21" strokeDasharray="2,2" />
        </svg>
        <span style={styles.splitButtonText}>{comparisonMode ? '退出分屏' : '分屏对比'}</span>
      </button>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: {
    width: 280,
    height: '100vh',
    backgroundColor: '#2a2a2a',
    color: '#e0e0e0',
    padding: 0,
    overflowY: 'auto',
    boxShadow: '2px 0 10px rgba(0,0,0,0.3)',
    zIndex: 100,
    flexShrink: 0,
  },
  logoSection: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '20px 20px',
    backgroundColor: '#1a1a1a',
    borderBottom: '1px solid #3a3a3a',
  },
  logoIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2a2a2a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 700,
    margin: 0,
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 11,
    margin: '2px 0 0 0',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    padding: '20px 20px',
    borderBottom: '1px solid #3a3a3a',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    margin: '0 0 16px 0',
    color: '#e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  valueBadge: {
    fontSize: 12,
    fontWeight: 500,
    color: '#d4a843',
    backgroundColor: 'rgba(212, 168, 67, 0.1)',
    padding: '4px 10px',
    borderRadius: 12,
  },
  wheelList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  wheelCard: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '12px 14px',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '2px solid transparent',
  },
  wheelCardActive: {
    borderColor: '#d4a843',
    backgroundColor: 'rgba(212, 168, 67, 0.08)',
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 12px rgba(212, 168, 67, 0.2)',
  },
  wheelName: {
    fontSize: 14,
    fontWeight: 500,
    color: '#e0e0e0',
  },
  sliderContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  slider: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    outline: 'none',
    WebkitAppearance: 'none',
    appearance: 'none',
    cursor: 'pointer',
  },
  colorSwatches: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  colorSwatch: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    cursor: 'pointer',
    border: '2px solid transparent',
    transition: 'all 0.2s ease',
  },
  colorSwatchActive: {
    borderColor: '#d4a843',
    transform: 'scale(1.2)',
  },
  sizeMarks: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0 4px',
  },
  sizeMark: {
    fontSize: 11,
    color: '#666',
    transition: 'all 0.2s ease',
  },
  sizeMarkActive: {
    color: '#d4a843',
    fontWeight: 600,
    transform: 'scale(1.1)',
  },
  splitButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 16px',
    backgroundColor: 'rgba(42, 42, 42, 0.9)',
    color: '#e0e0e0',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    zIndex: 200,
    backdropFilter: 'blur(8px)',
  },
  splitButtonText: {
    fontSize: 13,
    fontWeight: 500,
  },
  drawerToggle: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(42, 42, 42, 0.9)',
    color: '#e0e0e0',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    zIndex: 200,
    backdropFilter: 'blur(8px)',
  },
  drawerOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 300,
    animation: 'fadeIn 0.2s ease',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 280,
    height: '100%',
    backgroundColor: '#2a2a2a',
    animation: 'slideIn 0.3s ease',
    overflowY: 'auto',
  },
};
