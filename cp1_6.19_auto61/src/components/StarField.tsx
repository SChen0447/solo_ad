import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useGalaxyStore } from '../store/galaxyStore';
import { Particle } from '../simulation/galaxyPhysics';

const vertexShader = `
  attribute float size;
  attribute vec3 velocity;
  attribute float speed;
  varying vec3 vColor;
  
  vec3 colorLow = vec3(1.0, 0.666, 0.4);
  vec3 colorHigh = vec3(0.666, 0.8, 1.0);
  
  void main() {
    float speedNorm = clamp(speed, 0.5, 2.0);
    float t = (speedNorm - 0.5) / 1.5;
    vColor = mix(colorLow, colorHigh, t);
    
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = size * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    
    float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
    gl_FragColor = vec4(vColor, alpha);
  }
`;

interface BackgroundStar {
  position: [number, number, number];
  size: number;
  color: string;
}

function generateBackgroundStars(count: number): BackgroundStar[] {
  const stars: BackgroundStar[] = [];
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = 50 + Math.random() * 50;
    
    const x = r * Math.sin(phi) * Math.cos(theta);
    const y = r * Math.sin(phi) * Math.sin(theta);
    const z = r * Math.cos(phi);
    
    const brightness = 0.5 + Math.random() * 0.5;
    const color = `rgba(${Math.floor(200 + 55 * brightness)}, ${Math.floor(200 + 55 * brightness)}, ${Math.floor(230 + 25 * brightness)}, ${0.3 + Math.random() * 0.7})`;
    
    stars.push({
      position: [x, y, z],
      size: 0.05 + Math.random() * 0.1,
      color,
    });
  }
  return stars;
}

export default function StarField() {
  const pointsRef = useRef<THREE.Points>(null);
  const particles = useGalaxyStore((state) => state.particles);
  const backgroundStars = useMemo(() => generateBackgroundStars(300), []);

  const { positions, sizes, velocities, speeds } = useMemo(() => {
    const n = particles.length;
    const positions = new Float32Array(n * 3);
    const sizes = new Float32Array(n);
    const velocities = new Float32Array(n * 3);
    const speeds = new Float32Array(n);

    for (let i = 0; i < n; i++) {
      const p: Particle = particles[i];
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
      sizes[i] = p.size;
      velocities[i * 3] = p.vx;
      velocities[i * 3 + 1] = p.vy;
      velocities[i * 3 + 2] = p.vz;
      speeds[i] = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
    }

    return { positions, sizes, velocities, speeds };
  }, [particles]);

  const shaderMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
  }, []);

  useEffect(() => {
    if (!pointsRef.current) return;
    const geometry = pointsRef.current.geometry;
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
    geometry.setAttribute('speed', new THREE.BufferAttribute(speeds, 1));
    
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.size.needsUpdate = true;
    geometry.attributes.velocity.needsUpdate = true;
    geometry.attributes.speed.needsUpdate = true;
  }, [positions, sizes, velocities, speeds]);

  useFrame(() => {
    if (pointsRef.current) {
      const geometry = pointsRef.current.geometry;
      if (geometry.attributes.position) {
        geometry.attributes.position.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry />
        <primitive object={shaderMaterial} attach="material" />
      </points>
      
      {backgroundStars.map((star, i) => (
        <mesh key={i} position={star.position}>
          <sphereGeometry args={[star.size, 8, 8]} />
          <meshBasicMaterial color={star.color} transparent />
        </mesh>
      ))}
    </>
  );
}
