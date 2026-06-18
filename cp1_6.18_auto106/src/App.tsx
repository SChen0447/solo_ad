import React, { useCallback, useEffect, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { create } from 'zustand';
import OceanScene from './components/OceanScene';
import UIPanel from './components/UIPanel';

export interface ParticleDetail {
  latitude: number;
  longitude: number;
  speed: number;
  temperature: number;
  salinity: number;
  currentId: string;
  position: [number, number, number];
}

interface AppState {
  month: number;
  isPlaying: boolean;
  visibleCurrents: string[];
  particleDetail: ParticleDetail | null;
  selectedParticle: number | null;
  setMonth: (m: number) => void;
  togglePlaying: () => void;
  toggleCurrent: (id: string) => void;
  setParticleDetail: (detail: ParticleDetail | null) => void;
  setSelectedParticle: (idx: number | null) => void;
}

export const useStore = create<AppState>((set) => ({
  month: 0,
  isPlaying: true,
  visibleCurrents: [
    'kuroshio', 'gulf_stream', 'elnino', 'north_atlantic',
    'antarctic_circumpolar', 'california', 'benguela',
    'south_equatorial', 'north_equatorial', 'peru',
    'brazil', 'agulhas',
  ],
  particleDetail: null,
  selectedParticle: null,
  setMonth: (m) => set({ month: m }),
  togglePlaying: () => set((s) => ({ isPlaying: !s.isPlaying })),
  toggleCurrent: (id) =>
    set((s) => ({
      visibleCurrents: s.visibleCurrents.includes(id)
        ? s.visibleCurrents.filter((c) => c !== id)
        : [...s.visibleCurrents, id],
    })),
  setParticleDetail: (detail) => set({ particleDetail: detail }),
  setSelectedParticle: (idx) => set({ selectedParticle: idx }),
}));

function AutoTimeAdvance() {
  const month = useStore((s) => s.month);
  const isPlaying = useStore((s) => s.isPlaying);
  const setMonth = useStore((s) => s.setMonth);
  const frameRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) return;
    let elapsed = 0;
    let lastTime = performance.now();

    const tick = (now: number) => {
      elapsed += (now - lastTime) / 1000;
      lastTime = now;

      if (elapsed >= 3) {
        elapsed = 0;
        setMonth((month + 1) % 12);
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [isPlaying, month, setMonth]);

  return null;
}

export default function App() {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #0a0e27 0%, #020510 100%)',
      }}
    >
      <Canvas
        camera={{ position: [0, 3, 12], fov: 50, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        }}
        dpr={[1, 1.5]}
        style={{ position: 'absolute', top: 0, left: 0 }}
      >
        <OceanScene />
      </Canvas>
      <AutoTimeAdvance />
      <UIPanel />
    </div>
  );
}
