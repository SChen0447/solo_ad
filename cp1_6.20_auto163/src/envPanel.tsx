import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnvironmentParams } from './plantEngine';
import { SceneId, SCENE_PRESETS } from './dataManager';

interface EnvContextValue {
  env: EnvironmentParams;
  smoothedEnv: EnvironmentParams;
  setEnv: React.Dispatch<React.SetStateAction<EnvironmentParams>>;
  updateSingle: (key: keyof EnvironmentParams, value: number) => void;
  paused: boolean;
  setPaused: (v: boolean) => void;
  growthFrame: number;
  setGrowthFrame: (v: number) => void;
  currentScene: SceneId;
  setCurrentScene: (s: SceneId) => void;
  resetGrowth: () => void;
}

const EnvContext = createContext<EnvContextValue | null>(null);

export const useEnv = () => {
  const ctx = useContext(EnvContext);
  if (!ctx) throw new Error('useEnv must be used within EnvProvider');
  return ctx;
};

export const EnvProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [env, setEnv] = useState<EnvironmentParams>({
    light: SCENE_PRESETS.temperate.defaultEnv.light,
    moisture: SCENE_PRESETS.temperate.defaultEnv.moisture,
    temperature: SCENE_PRESETS.temperate.defaultEnv.temperature,
  });

  const [smoothedEnv, setSmoothedEnv] = useState<EnvironmentParams>({ ...env });
  const targetEnv = useRef<EnvironmentParams>({ ...env });
  const animationRef = useRef<number | null>(null);
  const transitionStart = useRef<number | null>(null);
  const startEnv = useRef<EnvironmentParams>({ ...env });

  const [paused, setPaused] = useState(false);
  const [growthFrame, setGrowthFrame] = useState(0);
  const [currentScene, setCurrentScene] = useState<SceneId>('temperate');

  useEffect(() => {
    targetEnv.current = { ...env };
    startEnv.current = { ...smoothedEnv };
    transitionStart.current = performance.now();

    if (animationRef.current) cancelAnimationFrame(animationRef.current);

    const duration = 300;
    const animate = (now: number) => {
      const t = Math.min(1, (now - (transitionStart.current || now)) / duration);
      const eased = 1 - Math.pow(1 - t, 3);

      setSmoothedEnv({
        light: startEnv.current.light + (targetEnv.current.light - startEnv.current.light) * eased,
        moisture: startEnv.current.moisture + (targetEnv.current.moisture - startEnv.current.moisture) * eased,
        temperature:
          startEnv.current.temperature +
          (targetEnv.current.temperature - startEnv.current.temperature) * eased,
      });

      if (t < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setSmoothedEnv({ ...targetEnv.current });
      }
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [env.light, env.moisture, env.temperature]);

  const updateSingle = useCallback((key: keyof EnvironmentParams, value: number) => {
    setEnv((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetGrowth = useCallback(() => {
    setGrowthFrame(0);
  }, []);

  const value = useMemo(
    () => ({
      env,
      smoothedEnv,
      setEnv,
      updateSingle,
      paused,
      setPaused,
      growthFrame,
      setGrowthFrame,
      currentScene,
      setCurrentScene,
      resetGrowth,
    }),
    [env, smoothedEnv, updateSingle, paused, growthFrame, currentScene, resetGrowth]
  );

  return <EnvContext.Provider value={value}>{children}</EnvContext.Provider>;
};

interface SliderProps {
  label: string;
  icon: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  colorHint?: string;
}

const Slider: React.FC<SliderProps> = ({
  label,
  icon,
  min,
  max,
  step,
  value,
  onChange,
  unit = '',
  colorHint,
}) => {
  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);

  const pct = ((value - min) / (max - min)) * 100;

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDragging(true);
    updateFromPointer(e);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    updateFromPointer(e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    setDragging(false);
  };

  const updateFromPointer = (e: React.PointerEvent) => {
    const track = trackRef.current;
    if (!track) return;
    const rect = track.getBoundingClientRect();
    let ratio = (e.clientX - rect.left) / rect.width;
    ratio = Math.max(0, Math.min(1, ratio));
    const steps = Math.round((ratio * (max - min)) / step);
    const newValue = Math.max(min, Math.min(max, min + steps * step));
    onChange(Number(newValue.toFixed(step < 1 ? 1 : 0)));
  };

  return (
    <div style={{ marginBottom: 18 }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 14 }}>{icon}</span>
          <span
            style={{
              color: '#e0e0f0',
              fontSize: 13,
              fontWeight: 500,
              letterSpacing: 0.2,
            }}
          >
            {label}
          </span>
        </div>
        <span
          style={{
            color: '#00d4ff',
            fontFamily: '"JetBrains Mono", "SF Mono", Consolas, monospace',
            fontSize: 13,
            fontWeight: 600,
            background: 'rgba(0, 212, 255, 0.08)',
            padding: '2px 8px',
            borderRadius: 4,
          }}
        >
          {step < 1 ? value.toFixed(1) : value}
          {unit}
        </span>
      </div>
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'relative',
          width: '100%',
          height: 6,
          borderRadius: 3,
          background: '#2a2a4e',
          cursor: 'pointer',
          touchAction: 'none',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${pct}%`,
            borderRadius: 3,
            background: colorHint || 'linear-gradient(90deg, #0088cc, #00d4ff)',
            transition: dragging ? 'none' : 'width 0.15s ease-out',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: `calc(${pct}% - 9px)`,
            top: -6,
            width: 18,
            height: 18,
            borderRadius: '50%',
            background: '#00d4ff',
            boxShadow: dragging
              ? '0 0 0 6px rgba(0, 212, 255, 0.25), 0 2px 8px rgba(0, 212, 255, 0.5)'
              : '0 0 0 3px rgba(0, 212, 255, 0.15), 0 2px 6px rgba(0, 0, 0, 0.4)',
            transition: dragging ? 'none' : 'left 0.15s ease-out, box-shadow 0.2s ease',
            cursor: 'grab',
          }}
        />
      </div>
    </div>
  );
};

interface PlantInfo {
  type: string;
  typeLabel: string;
  height: number;
  branchLevels: number;
  envScore: number;
  x: number;
  y: number;
}

export const PlantInfoCard: React.FC<{ info: PlantInfo | null }> = ({ info }) => {
  return (
    <AnimatePresence>
      {info && (
        <motion.div
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            left: info.x,
            top: info.y,
            transform: 'translate(-50%, -110%)',
            width: 200,
            background: 'white',
            borderRadius: 8,
            padding: 14,
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
            zIndex: 1000,
            pointerEvents: 'none',
            color: '#1a1a2e',
          }}
        >
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              marginBottom: 10,
              paddingBottom: 8,
              borderBottom: '1px solid #eee',
              color: '#1a1a2e',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{info.typeLabel}</span>
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.9, color: '#444' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>植物类型</span>
              <span style={{ fontWeight: 600 }}>{info.typeLabel}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>当前高度</span>
              <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                {info.height.toFixed(2)} u
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>分叉级数</span>
              <span style={{ fontWeight: 600 }}>{info.branchLevels}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: '#666' }}>环境评分</span>
              <span
                style={{
                  fontWeight: 700,
                  color:
                    info.envScore >= 0.75
                      ? '#22c55e'
                      : info.envScore >= 0.5
                      ? '#eab308'
                      : '#ef4444',
                }}
              >
                {(info.envScore * 100).toFixed(0)} 分
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const EnvironmentPanel: React.FC = () => {
  const { env, updateSingle, paused, setPaused, resetGrowth } = useEnv();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const panelContent = (
    <div style={{ padding: 16 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div>
          <h3
            style={{
              margin: 0,
              color: '#ffffff',
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 0.3,
            }}
          >
            🌱 环境参数控制
          </h3>
          <p
            style={{
              margin: '4px 0 0',
              color: '#8888a0',
              fontSize: 11,
            }}
          >
            调节参数观察植物群落变化
          </p>
        </div>
      </div>

      <Slider
        label="光照强度"
        icon="☀️"
        min={0.2}
        max={1.5}
        step={0.1}
        value={env.light}
        onChange={(v) => updateSingle('light', v)}
        colorHint="linear-gradient(90deg, #f59e0b, #fde047)"
      />
      <Slider
        label="土壤湿度"
        icon="💧"
        min={0}
        max={100}
        step={1}
        value={env.moisture}
        onChange={(v) => updateSingle('moisture', v)}
        unit="%"
        colorHint="linear-gradient(90deg, #0ea5e9, #38bdf8)"
      />
      <Slider
        label="环境温度"
        icon="🌡️"
        min={5}
        max={40}
        step={1}
        value={env.temperature}
        onChange={(v) => updateSingle('temperature', v)}
        unit="°C"
        colorHint="linear-gradient(90deg, #22c55e, #f97316, #ef4444)"
      />

      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <motion.button
          whileHover={{ scale: 1.05, filter: 'brightness(1.15)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={() => setPaused(!paused)}
          style={{
            flex: 1,
            padding: '10px 12px',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: '#ffffff',
            background: paused
              ? 'linear-gradient(135deg, #22c55e, #16a34a)'
              : 'linear-gradient(135deg, #00d4ff, #0088cc)',
            letterSpacing: 0.3,
          }}
        >
          {paused ? '▶ 继续生长' : '⏸ 暂停生长'}
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.05, filter: 'brightness(1.15)' }}
          whileTap={{ scale: 0.97 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          onClick={resetGrowth}
          style={{
            flex: 1,
            padding: '10px 12px',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: '#ffffff',
            background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
            letterSpacing: 0.3,
          }}
        >
          ↻ 重新生长
        </motion.button>
      </div>
    </div>
  );

  const desktopPanel = (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        width: 280,
        background: 'rgba(26, 26, 46, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 12,
        border: '1px solid rgba(0, 212, 255, 0.15)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
        zIndex: 100,
        overflow: 'hidden',
      }}
    >
      {panelContent}
    </motion.div>
  );

  const mobilePanel = (
    <>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setDrawerOpen(true)}
        style={{
          position: 'fixed',
          bottom: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 24px',
          border: 'none',
          borderRadius: 30,
          cursor: 'pointer',
          fontSize: 14,
          fontWeight: 700,
          color: '#ffffff',
          background: 'linear-gradient(135deg, #00d4ff, #0088cc)',
          boxShadow: '0 4px 20px rgba(0, 212, 255, 0.4)',
          zIndex: 99,
        }}
      >
        🌱 环境控制
      </motion.button>
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setDrawerOpen(false)}
              style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(0, 0, 0, 0.5)',
                zIndex: 100,
              }}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{
                position: 'fixed',
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(26, 26, 46, 0.95)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderRadius: '16px 16px 0 0',
                border: '1px solid rgba(0, 212, 255, 0.15)',
                zIndex: 101,
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 4,
                  margin: '10px auto',
                  borderRadius: 2,
                  background: '#4a4a6e',
                }}
              />
              {panelContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );

  return isMobile ? mobilePanel : desktopPanel;
};
