import { useEffect, useState } from 'react';
import * as THREE from 'three';
import type { RoomData } from './types';

interface TourModeProps {
  rooms: RoomData[];
  camera: THREE.PerspectiveCamera;
  onFinish: () => void;
}

interface Waypoint {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
}

function computeWaypoint(room: RoomData): Waypoint {
  const [dx, dz] = room.doorPosition;
  const cx = room.polygon.reduce((s, p) => s + p[0], 0) / room.polygon.length;
  const cz = room.polygon.reduce((s, p) => s + p[1], 0) / room.polygon.length;

  let dirX = cx - dx;
  let dirZ = cz - dz;
  const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
  if (len < 0.01) {
    dirX = 0;
    dirZ = -1;
  } else {
    dirX /= len;
    dirZ /= len;
  }

  const position = new THREE.Vector3(dx + dirX * 1.2, 1.7, dz + dirZ * 1.2);
  const lookAt = new THREE.Vector3(cx, 0.8, cz);
  return { position, lookAt };
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export default function TourMode({ rooms, camera, onFinish }: TourModeProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    let rafId: number = 0;
    let isCancelledLocal = false;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        isCancelledLocal = true;
        setCancelled(true);
        onFinish();
      }
    };
    window.addEventListener('keydown', handleKey);

    const waypoints: Waypoint[] = rooms.map(computeWaypoint);

    const startPos = camera.position.clone();
    const startLook = new THREE.Vector3();
    camera.getWorldDirection(startLook);
    startLook.multiplyScalar(8).add(camera.position);

    const fullPath: Waypoint[] = [{ position: startPos, lookAt: startLook }, ...waypoints];

    const MOVE_DURATION = 2000;
    const PAUSE_DURATION = 2000;

    let segment = 0;
    let segmentStartTime = performance.now();
    let phase: 'move' | 'pause' = 'move';

    const animate = (now: number) => {
      if (isCancelledLocal) return;

      if (phase === 'move') {
        const elapsed = now - segmentStartTime;
        const t = Math.min(elapsed / MOVE_DURATION, 1);
        const eased = easeInOut(t);

        const from = fullPath[segment];
        const to = fullPath[segment + 1];
        if (from && to) {
          camera.position.lerpVectors(from.position, to.position, eased);
          const look = from.lookAt.clone().lerp(to.lookAt, eased);
          camera.lookAt(look);
        }

        if (t >= 1) {
          phase = 'pause';
          segmentStartTime = now;
          setCurrentIdx(segment);
        }
      } else {
        const elapsed = now - segmentStartTime;
        if (elapsed >= PAUSE_DURATION) {
          segment++;
          if (segment >= fullPath.length - 1) {
            onFinish();
            return;
          }
          phase = 'move';
          segmentStartTime = now;
        }
      }

      rafId = requestAnimationFrame(animate);
    };

    rafId = requestAnimationFrame(animate);

    return () => {
      isCancelledLocal = true;
      window.removeEventListener('keydown', handleKey);
      cancelAnimationFrame(rafId);
    };
  }, [rooms, camera, onFinish]);

  if (cancelled) return null;

  const displayRoom = rooms[Math.min(currentIdx, rooms.length - 1)];

  return (
    <div
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        background: 'rgba(102, 126, 234, 0.9)',
        color: 'white',
        padding: '10px 16px',
        borderRadius: 8,
        fontSize: 14,
        zIndex: 15,
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          background: '#f56565',
          borderRadius: '50%',
          animation: 'tourPulse 1s infinite',
        }}
      />
      <span>
        漫游中 · {displayRoom?.name} ({Math.min(currentIdx + 1, rooms.length)}/{rooms.length})
      </span>
      <span style={{ color: '#e2e8f0', fontSize: 12, marginLeft: 4 }}>按 ESC 退出</span>
      <style>{`
        @keyframes tourPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
