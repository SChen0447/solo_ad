import { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import Earth from './components/Earth';
import OceanCurrents from './components/OceanCurrents';
import OceanLayer from './components/OceanLayer';
import Stars from './components/Stars';
import Header from './components/Header';
import InfoPanel from './components/InfoPanel';
import SearchBox from './components/SearchBox';
import Legend from './components/Legend';
import LoadingScreen from './components/LoadingScreen';
import { useStore } from './store/useStore';

function App() {
  const { isLoading, setIsLoading, activeLayer } = useStore();
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLoadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    return () => clearInterval(interval);
  }, []);

  const handleEarthLoaded = () => {
    setLoadProgress(100);
    setTimeout(() => {
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="w-full h-full bg-space-dark relative overflow-hidden">
      <AnimatePresence>
        {isLoading && <LoadingScreen progress={Math.min(100, loadProgress)} />}
      </AnimatePresence>

      <div className="canvas-container">
        <Canvas
          camera={{
            position: [0, 0, 3.5],
            fov: 60,
            near: 0.1,
            far: 1000,
          }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: 'high-performance',
          }}
          onCreated={({ gl, scene }) => {
            gl.setClearColor('#0a1628', 1);
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.2;
            scene.fog = new THREE.FogExp2('#0a1628', 0.02);
          }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight
            position={[5, 3, 5]}
            intensity={1.2}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <directionalLight position={[-3, -1, -3]} intensity={0.3} color="#4a90d9" />

          <Stars />
          <Earth onLoaded={handleEarthLoaded} />
          <OceanLayer activeLayer={activeLayer} visible={true} />
          <OceanCurrents showLayer={true} />

          <OrbitControls
            enablePan={false}
            minDistance={2}
            maxDistance={10}
            enableDamping
            dampingFactor={0.05}
            rotateSpeed={0.5}
            zoomSpeed={0.8}
            autoRotate={false}
          />
        </Canvas>
      </div>

      <Header />
      <Legend />
      <SearchBox />
      <InfoPanel />

      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 hidden md:block">
        <div className="glass-panel rounded-full px-4 py-2 text-xs text-gray-400">
          拖拽旋转 · 滚轮缩放 · 点击洋流查看详情
        </div>
      </div>
    </div>
  );
}

export default App;
