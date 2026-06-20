import React, { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnvProvider, EnvironmentPanel, PlantInfoCard, useEnv } from './envPanel';
import { SceneSetup } from './sceneSetup';
import { SceneId, SCENE_PRESETS, exportData, downloadJSON } from './dataManager';
import { generatePlantDistribution, computeEnvScoreForPlant, generatePlantStructure, computePlantHeight, GROWTH_TOTAL_FRAMES } from './plantEngine';

interface PlantInfoType {
  id: string;
  type: string;
  typeLabel: string;
  height: number;
  branchLevels: number;
  envScore: number;
  x: number;
  y: number;
} | null;

const SceneSwitcher: React.FC<{
  currentScene: SceneId;
  onSwitch: (s: SceneId) => void;
  onExport: () => void;
  plantCount: number;
}> = ({ currentScene, onSwitch, onExport, plantCount }) => {
  const scenes: Array<{ id: SceneId; icon: string; name: string }> = [
    { id: 'rainforest', icon: '🌴', name: '雨林' },
    { id: 'temperate', icon: '🌲', name: '温带' },
    { id: 'desert', icon: '🌵', name: '荒漠' },
  ];

  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4, ease: 'easeOut' }}
      style={{
        position: 'fixed',
        left: isMobile ? '50%' : 16,
        bottom: isMobile ? 72 : 16,
        transform: isMobile ? 'translateX(-50%)' : 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        background: 'rgba(26, 26, 46, 0.85',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 12,
        border: '1px solid rgba(0, 212, 255, 0.15',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4),
        zIndex: 100,
      }}
    >
      {scenes.map((s) => {
        const active = currentScene === s.id;
        return (
          <motion.button
            key={s.id}
            whileHover={{ scale: active ? 1 : 1.05, filter: active ? 'none' : 'brightness(1.15)' }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            onClick={() => onSwitch(s.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              padding: '8px 12px',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              color: active ? '#ffffff' : '#a0a0c0',
              background: active
                ? 'linear-gradient(135deg, #00d4ff, #0088cc)'
                : 'rgba(42, 42, 78, 0.6)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 16 }}>{s.icon}</span>
            <span>{s.name}</span>
          </motion.button>
        );
      })}

      <div style={{ width: 1, height: 24, background: 'rgba(100,100,140, 0.3)', margin: '0 4px' }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 10px',
          borderRadius: 8,
          background: 'rgba(42, 42, 78, 0.6)',
          color: '#b0b0d0',
          fontSize: 12,
          fontFamily: 'monospace',
          whiteSpace: 'nowrap',
        }}
      >
        🌿 {plantCount} 株
      </div>

      <motion.button
        whileHover={{ scale: 1.05, filter: 'brightness(1.15)' }}
        whileTap={{ scale: 0.97 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        onClick={onExport}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 14px',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 600,
          color: '#ffffff',
          background: 'linear-gradient(135deg, #10b981, #059669)',
          letterSpacing: 0.2,
          whiteSpace: 'nowrap',
        }}
      >
        ⬇ 导出
      </motion.button>
    </motion.div>
  );
};

const TitleBadge: React.FC = () => {
  const { currentScene, env, growthFrame } = useEnv();

  const growthPct = Math.round((growthFrame / GROWTH_TOTAL_FRAMES) * 100);
  const progress = Math.max(0, Math.min(100, growthPct));
  const preset = SCENE_PRESETS[currentScene];
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1 }}
      style={{
        position: 'fixed',
        top: 16,
        left: 16,
        padding: '12px 18px',
        background: 'rgba(26, 26, 46, 0.85)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: 12,
        border: '1px solid rgba(0, 212, 255, 0.15)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        zIndex: 100,
        color: '#ffffff',
        minWidth: 180,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: preset.groundColor,
            boxShadow: `0 0 8px ${preset.groundColor}`,
          }}
        />
        <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.3 }}>
          {preset.name}生态
        </span>
      </div>
      <div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: '#8888a0',
            marginBottom: 4,
          }}
        >
          <span>生长进度</span>
          <span style={{ fontFamily: 'monospace', color: '#00d4ff', fontWeight: 600 }}>
            {progress}%
          </span>
        </div>
        <div
          style={{
            width: '100%',
            height: 5,
            borderRadius: 3,
            background: '#2a2a4e',
            overflow: 'hidden',
          }}
        >
          <motion.div
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #00d4ff, #22c55e)',
              borderRadius: 3,
            }}
          />
        </div>
      </div>
    </motion.div>
  );
};

const HintText: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 1.2 }}
      style={{
        position: 'fixed',
        top: '50%',
        right: 16,
        transform: 'translateY(-50%)',
        writingMode: 'vertical-rl',
        color: 'rgba(160, 160, 200, 0.35)',
        fontSize: 11,
        lineHeight: 2,
        pointerEvents: 'none',
        zIndex: 1,
        letterSpacing: 2,
      }}
    >
      🖱️ 拖拽旋转 · 滚轮缩放 · 点击植物查看详情
    </motion.div>
  );
};

const AppInner: React.FC = () => {
  const { currentScene, setCurrentScene, env, growthFrame, smoothedEnv, resetGrowth } = useEnv();
  const [plantInfo, setPlantInfo] = useState<PlantInfoType>(null);
  const [regenKey, setRegenKey] = useState(0);

  const preset = SCENE_PRESETS[currentScene];

  const handleSceneSwitch = useCallback(
    (s: SceneId) => {
      setCurrentScene(s);
      setRegenKey((k) => k + 1);
      resetGrowth();
      setPlantInfo(null);
    },
    [setCurrentScene, resetGrowth]
  );

  const handleExport = useCallback(() => {
    const plants = generatePlantDistribution(smoothedEnv, {
      minDistance: 2,
      plantCount: preset.targetCount,
      distribution: preset.plantDistribution,
    });
    const data = exportData(currentScene, smoothedEnv, plants, Math.floor(growthFrame));
    downloadJSON(data);
  }, [currentScene, smoothedEnv, preset, growthFrame]);

  const plantCount = useMemo(() => {
    const base = preset.targetCount;
    const envFactor =
      (smoothedEnv.light / 1.5 + smoothedEnv.moisture / 100 + (smoothedEnv.temperature - 5) / 35) / 3;
    return Math.round(50 + (preset.targetCount - 50) * Math.max(0.5, envFactor));
  }, [preset, smoothedEnv]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <SceneSetup
        sceneId={currentScene}
        onPlantInfo={setPlantInfo}
        onPlantClick={() => {}}
        regenKey={regenKey}
      />
      <TitleBadge />
      <EnvironmentPanel />
      <SceneSwitcher
        currentScene={currentScene}
        onSwitch={handleSceneSwitch}
        onExport={handleExport}
        plantCount={plantCount}
      />
      <HintText />
      <PlantInfoCard info={plantInfo} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <EnvProvider>
      <AppInner />
    </EnvProvider>
  );
};

export default App;
