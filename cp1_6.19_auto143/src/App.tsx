import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PhysicsEngine } from './physics/PhysicsEngine';
import { usePhysicsLoop } from './hooks/usePhysicsLoop';
import { Renderer } from './components/Renderer';
import { ControlPanel } from './components/ControlPanel';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const GROUND_Y = 520;
const SOFT_BODY_RADIUS = 100;
const SOFT_BODY_START_Y = 100;

const App: React.FC = () => {
  const [physicsEngine, setPhysicsEngine] = useState<PhysicsEngine | null>(null);
  const [gravity, setGravity] = useState(9.8);
  const [stiffness, setStiffness] = useState(50);
  const [damping, setDamping] = useState(0.98);
  const [ballCount, setBallCount] = useState(3);
  const [isMobile, setIsMobile] = useState(false);
  const draggedParticleIdRef = useRef<string | null>(null);

  useEffect(() => {
    const engine = new PhysicsEngine({
      gravity: 9.8,
      stiffness: 50,
      damping: 0.98,
      groundY: GROUND_Y,
      worldWidth: CANVAS_WIDTH,
      worldHeight: CANVAS_HEIGHT,
    });

    engine.createSoftBody(CANVAS_WIDTH / 2, SOFT_BODY_START_Y, SOFT_BODY_RADIUS);

    for (let i = 0; i < 3; i++) {
      const x = 50 + Math.random() * (CANVAS_WIDTH - 100);
      const y = -20 - Math.random() * 200;
      engine.addCollisionBall(x, y, (Math.random() - 0.5) * 50, 0);
    }

    setPhysicsEngine(engine);
  }, []);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const physicsState = usePhysicsLoop(physicsEngine, true);

  const handleGravityChange = useCallback(
    (value: number) => {
      setGravity(value);
      if (physicsEngine) {
        physicsEngine.setConfig({ gravity: value });
      }
    },
    [physicsEngine]
  );

  const handleStiffnessChange = useCallback(
    (value: number) => {
      setStiffness(value);
      if (physicsEngine) {
        physicsEngine.setConfig({ stiffness: value });
      }
    },
    [physicsEngine]
  );

  const handleDampingChange = useCallback(
    (value: number) => {
      setDamping(value);
      if (physicsEngine) {
        physicsEngine.setConfig({ damping: value });
      }
    },
    [physicsEngine]
  );

  const handleBallCountChange = useCallback(
    (value: number) => {
      setBallCount(value);
      if (physicsEngine) {
        physicsEngine.setCollisionBallCount(value);
      }
    },
    [physicsEngine]
  );

  const handleParticleDragStart = useCallback(
    (particleId: string, x: number, y: number) => {
      if (!physicsEngine) return;
      draggedParticleIdRef.current = particleId;
      physicsEngine.pinParticle(particleId, x, y, 200);
    },
    [physicsEngine]
  );

  const handleParticleDragMove = useCallback(
    (x: number, y: number) => {
      if (!physicsEngine || !draggedParticleIdRef.current) return;
      physicsEngine.pinParticle(draggedParticleIdRef.current, x, y, 200);
    },
    [physicsEngine]
  );

  const handleParticleDragEnd = useCallback(() => {
    if (!physicsEngine || !draggedParticleIdRef.current) return;
    physicsEngine.unpinParticle(draggedParticleIdRef.current);
    draggedParticleIdRef.current = null;
  }, [physicsEngine]);

  const containerStyle: React.CSSProperties = {
    width: '100vw',
    height: '100vh',
    display: 'flex',
    flexDirection: isMobile ? 'column' : 'row',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    overflow: 'hidden',
    padding: isMobile ? '16px' : '20px',
    boxSizing: 'border-box',
    gap: '20px',
  };

  const canvasContainerStyle: React.CSSProperties = {
    width: isMobile ? '100%' : 'calc(70% - 10px)',
    maxWidth: CANVAS_WIDTH,
    maxHeight: isMobile ? '60vh' : '100%',
    aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
    borderRadius: '16px',
    overflow: 'hidden',
    boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    position: 'relative',
  };

  const footerStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '12px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '20px',
    alignItems: 'center',
    background: 'rgba(0, 0, 0, 0.5)',
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '12px',
    color: '#ccc',
    backdropFilter: 'blur(4px)',
  };

  return (
    <div style={containerStyle}>
      <div style={canvasContainerStyle}>
        <Renderer
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          particles={physicsState.particles}
          springs={physicsState.springs}
          collisionBalls={physicsState.collisionBalls}
          shockwaves={physicsState.shockwaves}
          groundY={GROUND_Y}
          onParticleDragStart={handleParticleDragStart}
          onParticleDragMove={handleParticleDragMove}
          onParticleDragEnd={handleParticleDragEnd}
          showTensionHeatmap={true}
          showTrails={true}
        />
        <div style={footerStyle}>
          <span style={{ color: '#4caf50', fontWeight: 'bold' }}>
            {physicsState.fps} FPS
          </span>
          <span>|</span>
          <span>质点数量: {physicsState.particleCount}</span>
        </div>
      </div>

      <div
        style={{
          width: isMobile ? '100%' : '260px',
          maxWidth: isMobile ? '400px' : 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <ControlPanel
          gravity={gravity}
          stiffness={stiffness}
          damping={damping}
          ballCount={ballCount}
          onGravityChange={handleGravityChange}
          onStiffnessChange={handleStiffnessChange}
          onDampingChange={handleDampingChange}
          onBallCountChange={handleBallCountChange}
        />
      </div>
    </div>
  );
};

export default App;
