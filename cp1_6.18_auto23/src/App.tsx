import { useState, useEffect, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useControls, Leva } from 'leva';
import LightSculpture from '@/LightSculpture';
import InteractionControls from '@/InteractionControls';
import FPSCounter from '@/components/FPSCounter';
import { ColorTheme } from '@/utils/colorThemes';

export default function App() {
  const [particleCount, setParticleCount] = useState(800);
  const [isMobile, setIsMobile] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleLowFPS = useCallback((fps: number) => {
    setParticleCount((prev) => {
      if (prev > 400) {
        const newCount = Math.max(400, prev - 100);
        console.log(`FPS dropped to ${fps.toFixed(0)}, reducing particles to ${newCount}`);
        return newCount;
      }
      return prev;
    });
  }, []);

  const [controls, setControls] = useControls(() => ({
    flowSpeed: {
      value: 1.0,
      min: 0.1,
      max: 2.0,
      step: 0.1,
      label: '流动速度',
    },
    colorTheme: {
      value: 'aurora' as ColorTheme,
      options: {
        '黄昏暖色': 'sunset',
        '极光冷色': 'aurora',
        '霓虹炫色': 'neon',
      },
      label: '色彩主题',
    },
    amplitude: {
      value: 20,
      min: 0,
      max: 100,
      step: 1,
      label: '振幅',
    },
    particleSize: {
      value: 1.0,
      min: 0.5,
      max: 2.0,
      step: 0.1,
      label: '粒子大小',
    },
    bloomIntensity: {
      value: 1.0,
      min: 0,
      max: 3.0,
      step: 0.1,
      label: '辉光强度',
    },
  }), []);

  return (
    <div className="w-full h-screen relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-radial from-[#0a1628] via-[#050a14] to-black" />
      
      <Canvas
        camera={{ position: [0, 1, 5], fov: 60, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: true }}
        dpr={[1, 2]}
      >
        <LightSculpture
          particleCount={particleCount}
          flowSpeed={controls.flowSpeed}
          colorTheme={controls.colorTheme}
          amplitude={controls.amplitude}
          particleSize={controls.particleSize}
        />
        
        <InteractionControls
          autoRotateSpeed={0.3}
          idleTimeout={3000}
          resetDuration={2000}
          minDistance={0.5}
          maxDistance={3.0}
        />
        
        <EffectComposer>
          <Bloom
            intensity={controls.bloomIntensity}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
        </EffectComposer>
      </Canvas>

      <Leva
        theme={{
          colors: {
            accent1: '#4fc3f7',
            accent2: '#29b6f6',
            accent3: '#0288d1',
            highlight1: '#81d4fa',
            highlight2: '#4fc3f7',
            highlight3: '#0288d1',
            content1: '#ffffff',
            content2: 'rgba(255, 255, 255, 0.7)',
            content3: 'rgba(255, 255, 255, 0.5)',
            background1: 'rgba(10, 22, 40, 0.8)',
            background2: 'rgba(20, 40, 70, 0.6)',
            background3: 'rgba(30, 50, 90, 0.4)',
          },
          radii: {
            lg: '12px',
            md: '8px',
            sm: '6px',
          },
        }}
        flat={false}
        fill={false}
        collapsed={isMobile}
        position={isMobile ? 'bottom-center' : 'right-top'}
      />

      <FPSCounter 
        onLowFPS={handleLowFPS}
        position={isMobile ? 'top-left' : 'top-right'}
      />

      {isMobile && (
        <button
          onClick={() => setIsPanelOpen(!isPanelOpen)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-full backdrop-blur-md bg-white/10 border border-white/20 text-white/80 text-sm font-medium transition-all duration-300 hover:bg-white/20 hover:-translate-y-0.5 hover:border-white/40 hover:shadow-lg"
          style={{
            boxShadow: '0 0 15px rgba(79, 195, 247, 0.3)',
          }}
        >
          {isPanelOpen ? '收起控制' : '打开控制面板'}
        </button>
      )}

      <div className="fixed top-4 left-4 z-40 pointer-events-none">
        <h1 className="text-white/90 text-xl font-light tracking-widest" style={{
          textShadow: '0 0 20px rgba(79, 195, 247, 0.5)',
        }}>
          流动光雕塑
        </h1>
        <p className="text-white/50 text-xs mt-1 tracking-wide">
          Light Sculpture
        </p>
      </div>

      <div className="fixed bottom-4 left-4 z-40 pointer-events-none hidden md:block">
        <p className="text-white/40 text-xs tracking-wide">
          拖拽旋转 · 滚轮缩放
        </p>
      </div>
    </div>
  );
}
