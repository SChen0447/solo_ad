import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SceneManager } from './SceneManager';
import ControlPanel from './ControlPanel';
import {
  MaterialType,
  EnvironmentPreset,
  LightingParams,
  GeometryMaterials
} from './types';

const App: React.FC = () => {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const sceneManagerRef = useRef<SceneManager | null>(null);
  const [fps, setFps] = useState(60);
  const [envColor, setEnvColor] = useState('#e6f3ff');
  const [envName, setEnvName] = useState('室外正午');

  const [materials, setMaterials] = useState<GeometryMaterials>({
    sphere: MaterialType.DIFFUSE,
    cube: MaterialType.SPECULAR,
    torusKnot: MaterialType.TRANSPARENT
  });

  const [environment, setEnvironment] = useState<EnvironmentPreset>(
    EnvironmentPreset.OUTDOOR_NOON
  );

  const [lighting, setLighting] = useState<LightingParams>({
    horizontalAngle: 45,
    elevationAngle: 60,
    lightIntensity: 100,
    ambientIntensity: 100
  });

  const handleFpsUpdate = useCallback((newFps: number) => {
    setFps(newFps);
  }, []);

  useEffect(() => {
    if (!canvasContainerRef.current) return;

    const manager = new SceneManager(canvasContainerRef.current, handleFpsUpdate);
    sceneManagerRef.current = manager;

    setEnvColor(manager.getCurrentEnvColor());
    setEnvName(manager.getCurrentEnvName());

    return () => {
      manager.dispose();
      sceneManagerRef.current = null;
    };
  }, [handleFpsUpdate]);

  const handleMaterialChange = useCallback(
    (geom: keyof GeometryMaterials, type: MaterialType) => {
      setMaterials((prev) => ({ ...prev, [geom]: type }));
      sceneManagerRef.current?.setGeometryMaterial(geom, type);
    },
    []
  );

  const handleEnvironmentChange = useCallback((env: EnvironmentPreset) => {
    setEnvironment(env);
    sceneManagerRef.current?.setEnvironment(env);
    setTimeout(() => {
      if (sceneManagerRef.current) {
        setEnvColor(sceneManagerRef.current.getCurrentEnvColor());
        setEnvName(sceneManagerRef.current.getCurrentEnvName());
      }
    }, 100);
  }, []);

  const handleLightingChange = useCallback((params: Partial<LightingParams>) => {
    setLighting((prev) => ({ ...prev, ...params }));
    sceneManagerRef.current?.setCustomLighting(params);
  }, []);

  const fpsLow = fps < 30;

  return (
    <div style={styles.appContainer}>
      <div style={styles.canvasContainer} ref={canvasContainerRef}>
        <div style={{
          ...styles.envBadge,
          borderLeftColor: envColor,
          boxShadow: `0 4px 20px rgba(0, 0, 0, 0.4), inset 0 0 30px ${envColor}10`
        }}>
          <div style={styles.envBadgeLabel}>当前环境</div>
          <div style={{
            ...styles.envBadgeName,
            textShadow: `0 0 20px ${envColor}60`
          }}>
            {envName}
          </div>
          <div style={{ ...styles.envBadgeIndicator, background: envColor }} />
        </div>

        <div style={{
          ...styles.fpsCounter,
          color: fpsLow ? '#ff4444' : '#4ade80',
          animation: fpsLow ? 'fpsBlink 0.5s infinite' : 'none'
        }}>
          <span style={styles.fpsIcon}>●</span>
          <span style={styles.fpsLabel}>FPS</span>
          <span style={styles.fpsValue}>{fps}</span>
        </div>

        <div style={styles.controlsHint}>
          <span>🖱️ 拖拽旋转</span>
          <span>滚轮缩放</span>
        </div>

        <style>{`
          @keyframes fpsBlink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
          }
        `}</style>
      </div>

      <div style={styles.panelContainer}>
        <ControlPanel
          materials={materials}
          environment={environment}
          lighting={lighting}
          onMaterialChange={handleMaterialChange}
          onEnvironmentChange={handleEnvironmentChange}
          onLightingChange={handleLightingChange}
        />
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  appContainer: {
    width: '100%',
    height: '100%',
    display: 'flex',
    background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 50%, #0d0d0d 100%)',
    position: 'relative',
    overflow: 'hidden'
  },
  canvasContainer: {
    flex: 1,
    position: 'relative',
    minWidth: 0,
    background: 'linear-gradient(180deg, #2a2a2a 0%, #0d0d0d 100%)'
  },
  panelContainer: {
    width: '360px',
    minWidth: '320px',
    maxWidth: '28vw',
    padding: '20px',
    display: 'flex',
    alignItems: 'stretch',
    flexShrink: 0
  },
  envBadge: {
    position: 'absolute',
    top: '24px',
    left: '24px',
    padding: '14px 20px 14px 20px',
    background: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: '12px',
    borderLeft: '4px solid #e6f3ff',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    borderRight: '1px solid rgba(255, 255, 255, 0.08)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
    minWidth: '160px',
    zIndex: 10
  },
  envBadgeLabel: {
    fontSize: '11px',
    color: '#a0a0a0',
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    marginBottom: '6px',
    fontWeight: 500
  },
  envBadgeName: {
    fontSize: '18px',
    fontWeight: 700,
    color: '#ffffff',
    letterSpacing: '0.5px'
  },
  envBadgeIndicator: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    boxShadow: '0 0 10px currentColor'
  },
  fpsCounter: {
    position: 'absolute',
    bottom: '24px',
    right: '24px',
    padding: '10px 16px',
    background: 'rgba(0, 0, 0, 0.6)',
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    borderRadius: '10px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontFamily: '"SF Mono", "Fira Code", "Consolas", monospace',
    fontSize: '14px',
    fontWeight: 600,
    zIndex: 10
  },
  fpsIcon: {
    fontSize: '10px'
  },
  fpsLabel: {
    fontSize: '11px',
    opacity: 0.8,
    letterSpacing: '1px'
  },
  fpsValue: {
    fontSize: '18px',
    fontVariantNumeric: 'tabular-nums'
  },
  controlsHint: {
    position: 'absolute',
    bottom: '24px',
    left: '24px',
    display: 'flex',
    gap: '16px',
    padding: '8px 16px',
    background: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(6px)',
    WebkitBackdropFilter: 'blur(6px)',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.06)',
    fontSize: '12px',
    color: '#888888',
    zIndex: 10
  }
};

export default App;
