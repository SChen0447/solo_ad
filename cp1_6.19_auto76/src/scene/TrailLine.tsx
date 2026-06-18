import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import type { Drone, Vector3 } from '../types';

interface TrailLineProps {
  drone: Drone;
}

export function TrailLine({ drone }: TrailLineProps) {
  const lineRef = useRef<THREE.Line>(null);

  const trailPoints = useMemo(() => {
    if (drone.path.length === 0) return [];

    const progress = Math.floor(drone.trailProgress);
    const points: Vector3[] = [];

    for (let i = 0; i <= progress && i < drone.path.length; i++) {
      points.push(drone.path[i]);
    }

    if (progress < drone.path.length - 1) {
      const t = drone.trailProgress - progress;
      const curr = drone.path[progress];
      const next = drone.path[progress + 1];
      if (curr && next) {
        points.push({
          x: curr.x + (next.x - curr.x) * t,
          y: curr.y + (next.y - curr.y) * t,
          z: curr.z + (next.z - curr.z) * t,
        });
      }
    }

    return points;
  }, [drone.path, drone.trailProgress]);

  const geometry = useMemo(() => {
    const positions = new Float32Array(trailPoints.length * 3);
    trailPoints.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [trailPoints]);

  if (trailPoints.length < 2) return null;

  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        color={drone.color}
        transparent
        opacity={0.5}
        linewidth={0.15}
      />
    </line>
  );
}
