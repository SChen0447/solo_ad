import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BeamRenderer } from './BeamRenderer';
import { PlayerController } from './PlayerController';
import { useMazeStore } from './store';
import { MAZE_SIZE, CELL_SIZE, BEAM_HEIGHT } from './MazeGenerator';

function ExitOrb() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshPhysicalMaterial>(null);

  useFrame((state) => {
    if (materialRef.current) {
      const t = (state.clock.elapsedTime % 1) / 1;
      materialRef.current.opacity = 0.6 + 0.4 * Math.sin(t * Math.PI * 2);
    }
    if (meshRef.current) {
      meshRef.current.position.y =
        BEAM_HEIGHT / 2 + 0.5 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
  });

  const exitX = (MAZE_SIZE - 1) * CELL_SIZE;
  const exitZ = (MAZE_SIZE - 1) * CELL_SIZE;

  return (
    <mesh ref={meshRef} position={[exitX, BEAM_HEIGHT / 2 + 0.5, exitZ]}>
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshPhysicalMaterial
        ref={materialRef}
        color="#ffd700"
        transparent
        roughness={0.2}
        metalness={0.8}
        emissive="#ffd700"
        emissiveIntensity={0.5}
        opacity={0.8}
      />
    </mesh>
  );
}

function Environment() {
  const floorSize = MAZE_SIZE * CELL_SIZE + 2;

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight
        position={[(MAZE_SIZE - 1) / 2, BEAM_HEIGHT + 2, (MAZE_SIZE - 1) / 2]}
        color="#4466ff"
        intensity={0.8}
        distance={30}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(MAZE_SIZE - 1) / 2, 0, (MAZE_SIZE - 1) / 2]}>
        <planeGeometry args={[floorSize, floorSize]} />
        <meshPhysicalMaterial
          color="#222244"
          transparent
          opacity={0.3}
          roughness={0.9}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[(MAZE_SIZE - 1) / 2, BEAM_HEIGHT, (MAZE_SIZE - 1) / 2]}>
        <planeGeometry args={[floorSize, floorSize]} />
        <meshPhysicalMaterial
          color="#222244"
          transparent
          opacity={0.1}
          roughness={0.9}
        />
      </mesh>
      <ExitOrb />
    </>
  );
}

function MiniMap() {
  const maze = useMazeStore((state) => state.maze);
  const player = useMazeStore((state) => state.player);

  const mapSize = 180;
  const cellSize = mapSize / MAZE_SIZE;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  useMemo(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, mapSize, mapSize);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, mapSize, mapSize);

    for (let z = 0; z < MAZE_SIZE; z++) {
      for (let x = 0; x < MAZE_SIZE; x++) {
        if (maze[z] && maze[z][x] === 'wall') {
          ctx.fillStyle = 'rgba(150, 150, 200, 0.8)';
          ctx.fillRect(x * cellSize, z * cellSize, cellSize, cellSize);
        }
      }
    }

    const playerX = (player.roomX + 0.5) * cellSize;
    const playerZ = (player.roomZ + 0.5) * cellSize;

    ctx.beginPath();
    ctx.arc(playerX, playerZ, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#4488ff';
    ctx.fill();

    ctx.beginPath();
    ctx.arc((MAZE_SIZE - 0.5) * cellSize, (MAZE_SIZE - 0.5) * cellSize, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#ffd700';
    ctx.fill();
  }, [maze, player.roomX, player.roomZ, cellSize]);

  return (
    <canvas
      ref={canvasRef}
      width={mapSize}
      height={mapSize}
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        borderRadius: '8px',
        zIndex: 100,
      }}
    />
  );
}

function RoomIndicator() {
  const roomX = useMazeStore((state) => state.player.roomX);
  const roomZ = useMazeStore((state) => state.player.roomZ);

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        left: '20px',
        fontSize: '14px',
        color: 'white',
        textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, -2px 0 0 #000, 2px 0 0 #000, 0 -2px 0 #000, 0 2px 0 #000',
        WebkitTextStroke: '2px black',
        paintOrder: 'stroke fill',
        fontWeight: 'bold',
        zIndex: 100,
        userSelect: 'none',
      }}
    >
      Room ({roomX}, {roomZ})
    </div>
  );
}

function CompletionScreen() {
  const isComplete = useMazeStore((state) => state.isComplete);

  if (!isComplete) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          fontSize: '2rem',
          color: 'white',
          textShadow: '-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000',
          WebkitTextStroke: '3px black',
          paintOrder: 'stroke fill',
          fontWeight: 'bold',
          userSelect: 'none',
        }}
      >
        恭喜通关
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Canvas
        camera={{ fov: 60, near: 0.1, far: 1000, position: [0, 2, 0] }}
        gl={{ antialias: true }}
        style={{ background: '#0a0a1a' }}
        onWheel={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
      >
        <fog attach="fog" args={['#0a0a1a', 10, 35]} />
        <Environment />
        <BeamRenderer />
        <PlayerController />
      </Canvas>
      <MiniMap />
      <RoomIndicator />
      <CompletionScreen />
    </div>
  );
}
