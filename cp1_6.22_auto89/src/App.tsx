import { useState, useCallback, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import SceneManager from './SceneManager';
import InfoPanel from './InfoPanel';
import TourMode from './TourMode';
import roomsData from './data/rooms.json';
import type { RoomData } from './types';

const rooms = roomsData as RoomData[];

export default function App() {
  const [selectedRoom, setSelectedRoom] = useState<RoomData | null>(null);
  const [isTouring, setIsTouring] = useState(false);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const handleRoomSelect = useCallback((room: RoomData | null) => {
    setSelectedRoom(room);
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).tagName === 'CANVAS') {
      setSelectedRoom(null);
    }
  }, []);

  const handleResetView = useCallback(() => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;
    const startPos = cam.position.clone();
    const endPos = new THREE.Vector3(8, 6, 8);
    const duration = 1000;
    const startTime = performance.now();

    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      cam.position.lerpVectors(startPos, endPos, eased);
      cam.lookAt(0, 0, 0);
      if (t < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, []);

  return (
    <div
      style={{ width: '100%', height: '100%', position: 'relative' }}
      onClick={handleCanvasClick}
    >
      <Canvas
        camera={{ position: [8, 6, 8], fov: 50 }}
        style={{ background: '#1a202c' }}
        onCreated={({ camera }) => {
          cameraRef.current = camera as THREE.PerspectiveCamera;
        }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[10, 10, 5]} intensity={0.8} />
        <SceneManager
          rooms={rooms}
          selectedRoomId={selectedRoom?.id || null}
          onRoomSelect={handleRoomSelect}
        />
      </Canvas>

      <div
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          background: 'rgba(0,0,0,0.6)',
          borderRadius: 8,
          padding: 8,
          display: 'flex',
          gap: 8,
          zIndex: 10,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setIsTouring(true)}
          disabled={isTouring}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: isTouring ? 'not-allowed' : 'pointer',
            background: isTouring
              ? 'linear-gradient(135deg, #999, #777)'
              : 'linear-gradient(135deg, #667eea, #764ba2)',
            transition: 'filter 0.3s ease-in-out, opacity 0.3s ease-in-out',
            opacity: isTouring ? 0.7 : 1,
          }}
          onMouseEnter={(e) => {
            if (!isTouring) (e.currentTarget.style.filter = 'brightness(1.2)');
          }}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
        >
          漫游模式
        </button>
        <button
          onClick={handleResetView}
          disabled={isTouring}
          style={{
            padding: '10px 18px',
            border: 'none',
            borderRadius: 8,
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: isTouring ? 'not-allowed' : 'pointer',
            background: 'linear-gradient(135deg, #4a5568, #2d3748)',
            transition: 'filter 0.3s ease-in-out',
            filter: 'brightness(1)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.filter = 'brightness(1.2)')}
          onMouseLeave={(e) => (e.currentTarget.style.filter = 'brightness(1)')}
        >
          重置视角
        </button>
      </div>

      {selectedRoom && (
        <InfoPanel
          room={selectedRoom}
          allRooms={rooms}
          onClose={() => setSelectedRoom(null)}
        />
      )}

      {isTouring && cameraRef.current && (
        <TourMode
          rooms={rooms}
          camera={cameraRef.current}
          onFinish={() => setIsTouring(false)}
        />
      )}
    </div>
  );
}
