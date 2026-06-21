import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Leva, useControls, button } from 'leva';
import * as THREE from 'three';
import { generateTrack, type TrackParams, type TrackType, type TrackData } from './modules/track-generator';
import { TrackRenderer, type RenderMode } from './modules/track-renderer';
import { CarController, type CarState } from './modules/car-controller';
import { saveTrack, loadTracks, type SavedTrack } from './modules/save-load-api';

const TRACK_TYPE_LABELS: Record<TrackType, string> = {
  circle: '环形赛道',
  figure8: '8字赛道',
  mountain: '山地赛道'
};

interface FirstPersonCameraProps {
  carController: CarController | null;
}

function FirstPersonCamera({ carController }: FirstPersonCameraProps) {
  const { camera } = useThree();
  const prevTime = useRef(performance.now());

  useFrame(() => {
    if (!carController) return;
    const now = performance.now();
    const dt = Math.min((now - prevTime.current) / 1000, 0.1);
    prevTime.current = now;

    const state: CarState = carController.update(dt);
    const cameraOffset = new THREE.Vector3(0, 1.4, 0);
    const carForward = new THREE.Vector3(
      Math.sin(state.rotation),
      0,
      Math.cos(state.rotation)
    );

    const targetPos = state.position.clone().add(cameraOffset);
    camera.position.lerp(targetPos, 0.3);

    const lookAt = state.position.clone().add(cameraOffset).add(carForward.multiplyScalar(10));
    camera.lookAt(lookAt);
    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = 80;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

function Scene({
  trackData,
  renderMode,
  carController
}: {
  trackData: TrackData;
  renderMode: RenderMode;
  carController: CarController | null;
}) {
  return (
    <>
      <FirstPersonCamera carController={carController} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 80, 50]} intensity={1} castShadow />
      <hemisphereLight args={['#87ceeb', '#222222', 0.3]} />
      <TrackRenderer trackData={trackData} renderMode={renderMode} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[1000, 1000]} />
        <meshStandardMaterial color={renderMode === 'wireframe' ? '#0a0a1a' : '#111827'} />
      </mesh>
      <fog attach="fog" args={[renderMode === 'wireframe' ? '#0a0a1a' : '#1a1a2e', 80, 400]} />
    </>
  );
}

export default function App() {
  const [trackParams, setTrackParams] = useState<TrackParams>({
    radius: 100,
    turns: 8,
    width: 10,
    trackType: 'circle'
  });

  const [renderMode, setRenderMode] = useState<RenderMode>('material');
  const [savedTracks, setSavedTracks] = useState<SavedTrack[]>([]);
  const [fadeTransition, setFadeTransition] = useState(false);
  const carControllerRef = useRef<CarController | null>(null);

  const trackData: TrackData = useMemo(() => {
    return generateTrack(trackParams);
  }, [trackParams]);

  const initializeCarController = useCallback((data: TrackData) => {
    if (carControllerRef.current) {
      carControllerRef.current.reset(data.startPosition, data.startRotation);
    } else {
      carControllerRef.current = new CarController(data.startPosition, data.startRotation);
    }
  }, []);

  useEffect(() => {
    initializeCarController(trackData);
  }, [trackData, initializeCarController]);

  useEffect(() => {
    const fetchSavedTracks = async () => {
      try {
        const tracks = await loadTracks();
        setSavedTracks(tracks);
      } catch (e) {
        console.log('No saved tracks available');
      }
    };
    fetchSavedTracks();
  }, []);

  const { radius, turns, width, trackType } = useControls('赛道参数', {
    radius: {
      value: 100,
      min: 50,
      max: 200,
      step: 10,
      label: '赛道半径'
    },
    turns: {
      value: 8,
      min: 4,
      max: 12,
      step: 2,
      label: '弯道数量'
    },
    width: {
      value: 10,
      min: 6,
      max: 16,
      step: 2,
      label: '赛道宽度'
    },
    trackType: {
      value: 'circle',
      options: {
        '环形赛道': 'circle',
        '8字赛道': 'figure8',
        '山地赛道': 'mountain'
      },
      label: '赛道类型'
    }
  }, { collapsed: false });

  useEffect(() => {
    setTrackParams({ radius, turns, width, trackType: trackType as TrackType });
  }, [radius, turns, width, trackType]);

  useControls('显示模式', {
    [renderMode === 'wireframe' ? '切换到材质模式' : '切换到线框模式']: button(() => {
      setFadeTransition(true);
      setTimeout(() => {
        setRenderMode((prev) => (prev === 'wireframe' ? 'material' : 'wireframe'));
        setTimeout(() => setFadeTransition(false), 150);
      }, 150);
    }),
    保存赛道: button(async () => {
      try {
        const saved = await saveTrack(trackParams, trackParams.trackType);
        setSavedTracks((prev) => [...prev, saved]);
      } catch (e) {
        console.error('Failed to save track:', e);
      }
    })
  });

  const handleLoadTrack = useCallback((saved: SavedTrack) => {
    setTrackParams(saved.config);
    setTimeout(() => {
      if (carControllerRef.current && trackData) {
        carControllerRef.current.reset(trackData.startPosition, trackData.startRotation);
      }
    }, 50);
  }, [trackData]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 0
        }}
      >
        <Canvas
          shadows
          camera={{ fov: 80, position: [0, 5, 0], near: 0.1, far: 1000 }}
          gl={{ antialias: true }}
        >
          <Scene trackData={trackData} renderMode={renderMode} carController={carControllerRef.current} />
        </Canvas>
      </div>

      {renderMode === 'wireframe' && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(5, 5, 20, 0.3)',
            pointerEvents: 'none',
            zIndex: 1,
            transition: 'opacity 0.3s ease',
            opacity: fadeTransition ? 0 : 1
          }}
        />
      )}

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          zIndex: 5,
          transition: 'opacity 0.3s ease',
          opacity: fadeTransition ? 0 : 1
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 16,
            left: 16,
            pointerEvents: 'auto',
            background: 'rgba(26, 32, 44, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 12,
            border: '1px solid rgba(102, 126, 234, 0.3)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
            maxWidth: 320,
            width: 320
          }}
        >
          <Leva
            theme={
              {
                colors: {
                  accent1: '#667eea',
                  accent2: '#5a67d8',
                  accent3: '#4c51bf'
                },
                font: {
                  family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                  size: 13
                },
                radii: {
                  lg: '8px',
                  md: '6px',
                  sm: '4px'
                },
                space: {
                  md: '8px',
                  lg: '12px'
                }
              } as any
            }
            fill
            collapsed={false}
            titleBar={{
              drag: false,
              filter: false
            }}
          />
        </div>

        {savedTracks.length > 0 && (
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              width: 280,
              maxHeight: 'calc(100vh - 32px)',
              overflowY: 'auto',
              pointerEvents: 'auto',
              background: 'rgba(26, 32, 44, 0.85)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
              borderRadius: 12,
              border: '1px solid rgba(102, 126, 234, 0.3)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              padding: 16,
              zIndex: 10
            }}
          >
            <div
              style={{
                color: '#f7fafc',
                fontSize: 14,
                fontWeight: 600,
                marginBottom: 12,
                paddingBottom: 8,
                borderBottom: '1px solid rgba(74, 85, 104, 0.5)'
              }}
            >
              已保存赛道
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {savedTracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => handleLoadTrack(track)}
                  style={{
                    padding: '10px 12px',
                    background: 'rgba(45, 55, 72, 0.8)',
                    border: '1px solid rgba(74, 85, 104, 0.6)',
                    borderRadius: 8,
                    color: '#e2e8f0',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    fontSize: 12,
                    lineHeight: 1.4
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(102, 126, 234, 0.3)';
                    e.currentTarget.style.borderColor = '#667eea';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(45, 55, 72, 0.8)';
                    e.currentTarget.style.borderColor = 'rgba(74, 85, 104, 0.6)';
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#667eea', marginBottom: 4 }}>
                    {TRACK_TYPE_LABELS[track.trackType]}
                  </div>
                  <div style={{ color: '#a0aec0', fontSize: 11 }}>
                    {new Date(track.createdAt).toLocaleString('zh-CN')}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            position: 'absolute',
            bottom: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(26, 32, 44, 0.85)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            borderRadius: 8,
            border: '1px solid rgba(102, 126, 234, 0.3)',
            padding: '8px 16px',
            color: '#e2e8f0',
            fontSize: 12,
            pointerEvents: 'none',
            textAlign: 'center'
          }}
        >
          <span style={{ color: '#667eea', fontWeight: 600 }}>W/↑</span> 加速 &nbsp;·&nbsp;
          <span style={{ color: '#667eea', fontWeight: 600 }}>S/↓</span> 减速 &nbsp;·&nbsp;
          <span style={{ color: '#667eea', fontWeight: 600 }}>A/←</span> 左转 &nbsp;·&nbsp;
          <span style={{ color: '#667eea', fontWeight: 600 }}>D/→</span> 右转
        </div>
      </div>

      <style>{`
        .leva__root {
          --accent-1: #667eea;
          --accent-2: #5a67d8;
        }
        .leva__control input[type='range'] {
          background: #4a5568 !important;
          height: 6px;
          border-radius: 3px;
        }
        .leva__control input[type='range']::-webkit-slider-thumb {
          background: #667eea !important;
          border: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          cursor: pointer;
          transition: transform 0.1s ease;
        }
        .leva__control input[type='range']::-webkit-slider-thumb:active {
          transform: scale(0.85);
        }
        .leva__control input[type='range']::-moz-range-thumb {
          background: #667eea !important;
          border: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          cursor: pointer;
        }
        .leva__row-button, .leva__button {
          background: #667eea !important;
          color: white !important;
          transition: background 0.2s ease !important;
          border-radius: 6px !important;
        }
        .leva__row-button:hover, .leva__button:hover {
          background: #5a67d8 !important;
        }
        @media (max-width: 768px) {
          .leva__root {
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
    </div>
  );
}
