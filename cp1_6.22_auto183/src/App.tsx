import React, { useEffect, useRef, useState, useCallback } from 'react';
import { WindScene, RenderParams } from '@/visualizer/WindScene';
import UIPanel from '@/visualizer/UIPanel';
import { WindApiService, SceneType, SceneInfo, WindGridData, IncrementalUpdate } from '@/services/WindApiService';

const altitudeLabelStyles: React.CSSProperties = {
  position: 'fixed',
  top: '16px',
  right: '16px',
  background: 'rgba(0, 0, 0, 0.6)',
  color: 'white',
  padding: '10px 16px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 500,
  zIndex: 100,
  backdropFilter: 'blur(4px)',
  WebkitBackdropFilter: 'blur(4px)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
};

const loadingOverlayStyles: React.CSSProperties = {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  background: 'rgba(10, 10, 35, 0.8)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  color: '#e2e8f0',
};

const App: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const windSceneRef = useRef<WindScene | null>(null);
  const windServiceRef = useRef<WindApiService | null>(null);

  const [scenes, setScenes] = useState<SceneInfo[]>([]);
  const [currentScene, setCurrentScene] = useState<SceneType>('typhoon');
  const [params, setParams] = useState<RenderParams>({
    timeStep: 0.5,
    heightLevel: 2500,
    particleDensity: 100,
  });
  const [fps, setFps] = useState(60);
  const [altitude, setAltitude] = useState(2500);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [performanceWarning, setPerformanceWarning] = useState(false);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  useEffect(() => {
    const service = new WindApiService();
    windServiceRef.current = service;
    (window as any).__windService = service;

    const init = async () => {
      try {
        const sceneList = await service.getScenes();
        setScenes(sceneList);

        const data = await service.initScene(currentScene);
        if (containerRef.current && windSceneRef.current) {
          windSceneRef.current.updateWindData(data, true);
        }

        service.onData((d: WindGridData | IncrementalUpdate) => {
          const isFull = !!(d as WindGridData).gridSize;
          if (windSceneRef.current) {
            windSceneRef.current.updateWindData(d, isFull);
          }
        });

        service.onConnectionChange((connected: boolean) => {
          setIsConnected(connected);
        });

        service.connect(currentScene);
        setIsLoading(false);
        setInitialLoadDone(true);
      } catch (e) {
        console.error('Failed to initialize:', e);
        setIsLoading(false);
        setInitialLoadDone(true);
      }
    };

    init();

    return () => {
      service.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new WindScene(containerRef.current, {
      onFpsUpdate: (f: number) => setFps(f),
      onAltitudeUpdate: (a: number) => setAltitude(a),
      onPerformanceWarning: () => {
        setPerformanceWarning(true);
        const reducedDensity = Math.max(50, Math.round(params.particleDensity * 0.7));
        setParams((prev) => ({ ...prev, particleDensity: reducedDensity }));
        windSceneRef.current?.setTargetParams({ particleDensity: reducedDensity });
      },
    });
    windSceneRef.current = scene;

    return () => {
      scene.dispose();
    };
  }, []);

  const handleSceneChange = useCallback(async (scene: SceneType) => {
    if (scene === currentScene) return;
    setCurrentScene(scene);
    setIsLoading(true);

    try {
      const service = windServiceRef.current;
      if (service) {
        service.sendSceneChange(scene);
        const data = await service.initScene(scene);
        if (windSceneRef.current) {
          windSceneRef.current.updateWindData(data, true);
        }
      }
    } catch (e) {
      console.error('Scene change failed:', e);
    } finally {
      setIsLoading(false);
    }
  }, [currentScene]);

  const handleParamsChange = useCallback((newParams: Partial<RenderParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
    windSceneRef.current?.setTargetParams(newParams);
  }, []);

  const handleDismissWarning = useCallback(() => {
    setPerformanceWarning(false);
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <div style={altitudeLabelStyles}>
        海拔高度：<span style={{ color: '#06b6d4', fontWeight: 600 }}>{altitude.toFixed(0)} 米</span>
      </div>

      {initialLoadDone && (
        <UIPanel
          scenes={scenes}
          currentScene={currentScene}
          params={params}
          fps={fps}
          isLoading={isLoading}
          isConnected={isConnected}
          performanceWarning={performanceWarning}
          onSceneChange={handleSceneChange}
          onParamsChange={handleParamsChange}
          onDismissWarning={handleDismissWarning}
        />
      )}

      {!initialLoadDone && (
        <div style={loadingOverlayStyles}>
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '3px solid #334155',
              borderTop: '3px solid #06b6d4',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              marginBottom: '16px',
            }}
          />
          <div style={{ fontSize: '16px', color: '#94a3b8' }}>数据加载中...</div>
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      )}
    </div>
  );
};

export default App;
