import React, { useEffect, useRef, useCallback } from 'react';
import { useAppStore, DRUM_ZONES } from './store';
import { DrumZone, RippleAnimation, HitRecord } from './types';

interface DrumRendererProps {
  onExport: () => void;
  onResetGesture: () => void;
  onToggleMute: () => void;
  gestureEngineRef: React.MutableRefObject<{ reset: () => Promise<void> } | null>;
}

const DrumPad: React.FC<{
  drum: DrumZone;
  canvasWidth: number;
  canvasHeight: number;
  isHit: boolean;
  brightness: number;
}> = ({ drum, canvasWidth, canvasHeight, isHit, brightness }) => {
  const centerX = (drum.x / 100) * canvasWidth;
  const centerY = (drum.y / 100) * canvasHeight;
  const halfWidth = Math.max(30, (drum.width / 100) * canvasWidth / 2);
  const halfHeight = Math.max(30, (drum.height / 100) * canvasHeight / 2);

  const gradientId = `grad-${drum.id}`;

  const renderShape = () => {
    if (drum.shape === 'circle') {
      return (
        <>
          <circle
            cx={centerX}
            cy={centerY}
            r={halfWidth}
            fill={`url(#${gradientId})`}
            stroke={isHit ? '#FFFFFF' : drum.strokeColor}
            strokeWidth={2}
            style={{
              filter: isHit ? 'drop-shadow(0 0 15px rgba(255,255,255,0.8))' : 'drop-shadow(2px 4px 6px rgba(0,0,0,0.4))',
              transition: 'filter 0.1s ease, stroke 0.1s ease',
            }}
          />
          {drum.hasMetalRing && (
            <circle
              cx={centerX}
              cy={centerY}
              r={halfWidth * 0.85}
              fill="none"
              stroke="#C0C0C0"
              strokeWidth={3}
              opacity={0.8}
            />
          )}
          {drum.hasRayTexture && (
            <g>
              {[...Array(12)].map((_, i) => {
                const angle = (i * 30 * Math.PI) / 180;
                const x1 = centerX + Math.cos(angle) * halfWidth * 0.3;
                const y1 = centerY + Math.sin(angle) * halfWidth * 0.3;
                const x2 = centerX + Math.cos(angle) * halfWidth * 0.9;
                const y2 = centerY + Math.sin(angle) * halfWidth * 0.9;
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="rgba(255,215,0,0.4)"
                    strokeWidth={1.5}
                  />
                );
              })}
            </g>
          )}
        </>
      );
    } else if (drum.shape === 'ellipse') {
      return (
        <ellipse
          cx={centerX}
          cy={centerY}
          rx={halfWidth}
          ry={halfHeight}
          fill={`url(#${gradientId})`}
          stroke={isHit ? '#FFFFFF' : drum.strokeColor}
          strokeWidth={2}
          style={{
            filter: isHit ? 'drop-shadow(0 0 15px rgba(255,255,255,0.8))' : 'drop-shadow(2px 4px 6px rgba(0,0,0,0.4))',
            transition: 'filter 0.1s ease, stroke 0.1s ease',
          }}
        />
      );
    } else {
      return (
        <rect
          x={centerX - halfWidth}
          y={centerY - halfHeight}
          width={halfWidth * 2}
          height={halfHeight * 2}
          rx={8}
          fill={`url(#${gradientId})`}
          stroke={isHit ? '#FFFFFF' : drum.strokeColor}
          strokeWidth={2}
          style={{
            filter: isHit ? 'drop-shadow(0 0 15px rgba(255,255,255,0.8))' : 'drop-shadow(2px 4px 6px rgba(0,0,0,0.4))',
            transition: 'filter 0.1s ease, stroke 0.1s ease',
          }}
        />
      );
    }
  };

  return (
    <g className="drum-pad" style={{ cursor: 'pointer' }}>
      <defs>
        <radialGradient id={gradientId} cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor={drum.gradient[0]} />
          <stop offset="50%" stopColor={drum.gradient[1]} />
          <stop offset="100%" stopColor={drum.gradient[2]} />
        </radialGradient>
      </defs>
      {renderShape()}
      {brightness > 0 && (
        drum.shape === 'circle' ? (
          <circle
            cx={centerX}
            cy={centerY}
            r={halfWidth}
            fill={`rgba(255,255,255,${brightness * 0.5})`}
            style={{ pointerEvents: 'none' }}
          />
        ) : drum.shape === 'ellipse' ? (
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={halfWidth}
            ry={halfHeight}
            fill={`rgba(255,255,255,${brightness * 0.5})`}
            style={{ pointerEvents: 'none' }}
          />
        ) : (
          <rect
            x={centerX - halfWidth}
            y={centerY - halfHeight}
            width={halfWidth * 2}
            height={halfHeight * 2}
            rx={8}
            fill={`rgba(255,255,255,${brightness * 0.5})`}
            style={{ pointerEvents: 'none' }}
          />
        )
      )}
      <text
        x={centerX}
        y={centerY + 5}
        textAnchor="middle"
        fill="rgba(255,255,255,0.7)"
        fontSize={Math.min(14, halfWidth * 0.3)}
        fontWeight="bold"
        style={{ pointerEvents: 'none', userSelect: 'none' }}
      >
        {drum.name}
      </text>
    </g>
  );
};

const Ripple: React.FC<{ ripple: RippleAnimation; canvasWidth: number }> = ({
  ripple,
  canvasWidth,
}) => {
  const [progress, setProgress] = React.useState(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    const startTime = ripple.startTime;
    const duration = 200;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(1, elapsed / duration);
      setProgress(newProgress);

      if (newProgress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [ripple.startTime]);

  const currentRadius = ripple.startRadius + progress * (ripple.maxRadius * (canvasWidth / 100) - ripple.startRadius);
  const opacity = 0.8 * (1 - progress);

  return (
    <circle
      cx={ripple.x}
      cy={ripple.y}
      r={currentRadius}
      fill="none"
      stroke={`rgba(255,255,255,${opacity})`}
      strokeWidth={3}
      style={{ pointerEvents: 'none' }}
    />
  );
};

const TrailPoints: React.FC<{
  trails: Record<string, { x: number; y: number; opacity: number }[]>;
}> = ({ trails }) => {
  return (
    <g>
      {Object.values(trails).map((points, handIndex) =>
        points.map((point, pointIndex) => (
          <circle
            key={`${handIndex}-${pointIndex}`}
            cx={point.x}
            cy={point.y}
            r={3 + point.opacity * 2}
            fill={`rgba(100, 200, 255, ${point.opacity * 0.8})`}
            style={{
              filter: `blur(${1 - point.opacity}px)`,
              pointerEvents: 'none',
            }}
          />
        ))
      )}
    </g>
  );
};

const HandLandmarks: React.FC<{
  handData: { landmarks: { x: number; y: number }[] }[];
  canvasWidth: number;
  canvasHeight: number;
}> = ({ handData, canvasWidth, canvasHeight }) => {
  return (
    <g>
      {handData.map((hand, handIndex) =>
        hand.landmarks.map((landmark, lmIndex) => {
          const x = landmark.x * canvasWidth;
          const y = landmark.y * canvasHeight;
          const isIndexTip = lmIndex === 8;
          return (
            <circle
              key={`${handIndex}-${lmIndex}`}
              cx={x}
              cy={y}
              r={isIndexTip ? 6 : 3}
              fill={isIndexTip ? '#FF6B6B' : 'rgba(100, 200, 255, 0.8)'}
              style={{
                filter: isIndexTip ? 'drop-shadow(0 0 8px #FF6B6B)' : 'none',
                pointerEvents: 'none',
              }}
            />
          );
        })
      )}
    </g>
  );
};

const Particles: React.FC<{
  particles: { x: number; y: number; size: number; opacity: number }[];
}> = ({ particles }) => {
  return (
    <g>
      {particles.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r={p.size}
          fill={`rgba(150, 180, 255, ${p.opacity})`}
          style={{ pointerEvents: 'none' }}
        />
      ))}
    </g>
  );
};

const HitRecordItem: React.FC<{ record: HitRecord; isNew: boolean }> = ({ record, isNew }) => {
  const time = new Date(record.timestamp);
  const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time
    .getMinutes()
    .toString()
    .padStart(2, '0')}:${time.getSeconds().toString().padStart(2, '0')}.${time
    .getMilliseconds()
    .toString()
    .padStart(3, '0')}`;

  const velocityColors: Record<string, string> = {
    弱: '#4CAF50',
    中: '#FFC107',
    强: '#F44336',
  };

  return (
    <div
      className="hit-record"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '8px 12px',
        marginBottom: '6px',
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: '6px',
        borderLeft: `3px solid ${velocityColors[record.velocity]}`,
        opacity: isNew ? 0 : 1,
        animation: isNew ? 'fadeIn 0.2s ease forwards' : 'none',
        fontSize: '12px',
      }}
    >
      <span style={{ color: '#E0E0E0', fontWeight: 'bold' }}>{record.drumName}</span>
      <span style={{ color: '#8899BB', fontFamily: 'monospace', fontSize: '11px' }}>{timeStr}</span>
      <span
        style={{
          color: velocityColors[record.velocity],
          fontWeight: 'bold',
          minWidth: '24px',
          textAlign: 'center',
        }}
      >
        {record.velocity}
      </span>
    </div>
  );
};

export const DrumRenderer: React.FC<DrumRendererProps> = ({
  onExport,
  onResetGesture,
  onToggleMute,
  gestureEngineRef,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<SVGSVGElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const lastParticleUpdate = useRef<number>(0);

  const {
    canvasSize,
    setCanvasSize,
    drumStates,
    ripples,
    trails,
    handData,
    particles,
    updateParticles,
    initParticles,
    hitRecords,
    audioState,
    gestureState,
  } = useAppStore();

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        setCanvasSize(width, height);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [setCanvasSize]);

  useEffect(() => {
    if (canvasSize.width > 0 && canvasSize.height > 0) {
      initParticles();
    }
  }, [canvasSize.width, canvasSize.height, initParticles]);

  useEffect(() => {
    const animate = (timestamp: number) => {
      const deltaTime = timestamp - lastParticleUpdate.current;
      if (deltaTime > 16) {
        updateParticles(deltaTime);
        lastParticleUpdate.current = timestamp;
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [updateParticles]);

  useEffect(() => {
    if (listRef.current && hitRecords.length > 0) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [hitRecords.length]);

  const handleResetGesture = useCallback(async () => {
    if (gestureEngineRef.current) {
      await gestureEngineRef.current.reset();
      onResetGesture();
    }
  }, [gestureEngineRef, onResetGesture]);

  return (
    <div
      className="app-container"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'linear-gradient(180deg, #12162C 0%, #1E2240 100%)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .control-btn:hover {
          filter: brightness(1.1);
        }
        .control-btn:active {
          transform: scale(0.95);
        }
        .drum-pad:hover circle,
        .drum-pad:hover ellipse,
        .drum-pad:hover rect {
          filter: brightness(1.1) drop-shadow(2px 4px 8px rgba(0,0,0,0.5));
        }
      `}</style>

      <div className="glow-overlay" style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(ellipse at center, rgba(100, 120, 200, 0.1) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div
        className="main-content"
        style={{
          flex: 1,
          display: 'flex',
          padding: '20px',
          gap: '20px',
          minHeight: 0,
        }}
      >
        <div
          ref={containerRef}
          className="drum-canvas-container"
          style={{
            flex: 1,
            position: 'relative',
            minWidth: 0,
            borderRadius: '16px',
            overflow: 'hidden',
            background: 'rgba(0,0,0,0.2)',
          }}
        >
          <svg
            ref={canvasRef}
            width={canvasSize.width}
            height={canvasSize.height}
            style={{ display: 'block', width: '100%', height: '100%' }}
          >
            <defs>
              <filter id="inner-shadow">
                <feOffset dx="0" dy="2" />
                <feGaussianBlur stdDeviation="2" result="offset-blur" />
                <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
                <feFlood floodColor="black" floodOpacity="0.3" result="color" />
                <feComposite operator="in" in="color" in2="inverse" result="shadow" />
                <feComposite operator="over" in="shadow" in2="SourceGraphic" />
              </filter>
            </defs>

            <Particles particles={particles} />

            {DRUM_ZONES.map((drum) => (
              <DrumPad
                key={drum.id}
                drum={drum}
                canvasWidth={canvasSize.width}
                canvasHeight={canvasSize.height}
                isHit={drumStates[drum.id].isHit}
                brightness={drumStates[drum.id].brightness}
              />
            ))}

            {ripples.map((ripple) => (
              <Ripple
                key={ripple.id}
                ripple={ripple}
                canvasWidth={canvasSize.width}
              />
            ))}

            <TrailPoints trails={trails} />
            <HandLandmarks
              handData={handData}
              canvasWidth={canvasSize.width}
              canvasHeight={canvasSize.height}
            />
          </svg>
        </div>

        <div
          className="hit-list-container"
          style={{
            width: '280px',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(20, 25, 50, 0.6)',
            backdropFilter: 'blur(10px)',
            border: '2px solid #4A5B82',
            borderRadius: '12px',
            padding: '16px',
            flexShrink: 0,
          }}
        >
          <h3
            style={{
              color: '#E0E0E0',
              margin: '0 0 12px 0',
              fontSize: '16px',
              fontWeight: 'bold',
              borderBottom: '1px solid #4A5B82',
              paddingBottom: '8px',
            }}
          >
            敲击记录 ({hitRecords.length}/30)
          </h3>
          <div
            ref={listRef}
            className="hit-list"
            style={{
              flex: 1,
              overflowY: 'auto',
              minHeight: 0,
              paddingRight: '8px',
            }}
          >
            {hitRecords.length === 0 ? (
              <div
                style={{
                  color: '#667799',
                  textAlign: 'center',
                  padding: '40px 0',
                  fontSize: '12px',
                }}
              >
                暂无敲击记录
              </div>
            ) : (
              hitRecords.map((record, index) => (
                <HitRecordItem
                  key={record.id}
                  record={record}
                  isNew={index === hitRecords.length - 1}
                />
              ))
            )}
          </div>
        </div>
      </div>

      <div
        className="controls-container"
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '20px',
          padding: '20px',
          background: 'rgba(0,0,0,0.3)',
        }}
      >
        <button
          className="control-btn"
          onClick={onToggleMute}
          disabled={!audioState.initialized}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            background: audioState.muted ? '#F44336' : '#4CAF50',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            minWidth: '140px',
          }}
        >
          {audioState.muted ? '🔇 取消静音' : '🔊 静音'}
        </button>

        <button
          className="control-btn"
          onClick={handleResetGesture}
          disabled={gestureState.isInitializing}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            background: '#2196F3',
            border: 'none',
            borderRadius: '8px',
            cursor: gestureState.isInitializing ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            minWidth: '160px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          {gestureState.isInitializing ? (
            <>
              <span
                style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              加载中...
            </>
          ) : (
            '🔄 重置手势检测'
          )}
        </button>

        <button
          className="control-btn"
          onClick={onExport}
          disabled={hitRecords.length === 0}
          style={{
            padding: '12px 24px',
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#FFFFFF',
            background: hitRecords.length === 0 ? '#666666' : '#9C27B0',
            border: 'none',
            borderRadius: '8px',
            cursor: hitRecords.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
            minWidth: '160px',
          }}
        >
          📥 导出演奏录音
        </button>
      </div>
    </div>
  );
};
