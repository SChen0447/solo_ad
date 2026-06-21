import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { LightMode, Seat } from '../types';
import { renderLoop } from '../utils/renderLoop';

interface StageProps {
  lightMode: LightMode;
  spotlightColor: string;
  isPerforming: boolean;
  selectedSeat: Seat | null;
  onCameraChange?: (position: THREE.Vector3) => void;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
  active: boolean;
}

const STAGE_WIDTH = 20;
const STAGE_DEPTH = 12;
const STAGE_HEIGHT = 0.5;
const ARCH_HEIGHT = 10;
const ARCH_WIDTH = 24;

export default function Stage({
  lightMode,
  spotlightColor,
  isPerforming,
  selectedSeat,
  onCameraChange,
}: StageProps) {
  const stageGroupRef = useRef<THREE.Group>(null);
  const spotlightRefs = useRef<THREE.SpotLight[]>([]);
  const lightSpotRefs = useRef<THREE.Mesh[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const particleGeometryRef = useRef<THREE.BufferGeometry | null>(null);
  const particleMaterialRef = useRef<THREE.PointsMaterial | null>(null);
  const particlesMeshRef = useRef<THREE.Points | null>(null);
  const [currentLightColor, setCurrentLightColor] = useState(spotlightColor);
  const [strobeIntensity, setStrobeIntensity] = useState(1);
  const [rainbowHue, setRainbowHue] = useState(0);
  const performanceStartTimeRef = useRef<number>(0);

  const spotlightPositions = useMemo(() => {
    const positions: { x: number; y: number; z: number }[] = [];
    for (let row = 0; row < 2; row++) {
      for (let col = -3; col <= 3; col++) {
        positions.push({
          x: col * 2.5,
          y: 8,
          z: -3 + row * 2,
        });
      }
    }
    return positions;
  }, []);

  const backdropGradientTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#8b2252');
    gradient.addColorStop(1, '#4b0082');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const stageFloorTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.fillStyle = '#2d2d2d';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = Math.random() * 2 + 0.5;
      const alpha = Math.random() * 0.3 + 0.1;
      ctx.fillStyle = `rgba(80, 80, 80, ${alpha})`;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    texture.needsUpdate = true;
    return texture;
  }, []);

  const initParticles = useCallback(() => {
    const particles: Particle[] = [];
    const particleCount = 400;

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * STAGE_WIDTH,
          0,
          (Math.random() - 0.5) * STAGE_DEPTH * 0.5
        ),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 5,
          30,
          (Math.random() - 0.5) * 5
        ),
        color: new THREE.Color().setHSL(Math.random(), 1, 0.6),
        size: Math.random() * 2 + 1,
        life: 0,
        maxLife: 2,
        active: false,
      });
    }
    particlesRef.current = particles;

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = particles[i].position.x;
      positions[i * 3 + 1] = particles[i].position.y;
      positions[i * 3 + 2] = particles[i].position.z;
      colors[i * 3] = particles[i].color.r;
      colors[i * 3 + 1] = particles[i].color.g;
      colors[i * 3 + 2] = particles[i].color.b;
      sizes[i] = particles[i].size;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    particleGeometryRef.current = geometry;

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    particleMaterialRef.current = material;

    return { geometry, material };
  }, []);

  const emitParticles = useCallback(() => {
    const now = performance.now();
    particlesRef.current.forEach((particle, index) => {
      const delay = (index / 400) * 500;
      if (!particle.active && now - performanceStartTimeRef.current > delay) {
        particle.active = true;
        particle.life = 0;
        particle.position.set(
          (Math.random() - 0.5) * STAGE_WIDTH * 0.8,
          0.5,
          (Math.random() - 0.5) * STAGE_DEPTH * 0.4
        );
        particle.velocity.set(
          (Math.random() - 0.5) * 8,
          25 + Math.random() * 10,
          (Math.random() - 0.5) * 8
        );
        particle.color.setHSL(Math.random(), 1, 0.5 + Math.random() * 0.3);
      }
    });
  }, []);

  useEffect(() => {
    if (isPerforming) {
      performanceStartTimeRef.current = performance.now();
      emitParticles();
    }
  }, [isPerforming, emitParticles]);

  useEffect(() => {
    const particleData = initParticles();
    if (particleData) {
      particlesMeshRef.current = new THREE.Points(particleData.geometry, particleData.material);
    }

    return () => {
      if (particleGeometryRef.current) {
        particleGeometryRef.current.dispose();
      }
      if (particleMaterialRef.current) {
        particleMaterialRef.current.dispose();
      }
    };
  }, [initParticles]);

  useEffect(() => {
    const updateLighting = (deltaTime: number) => {
      let targetColor = spotlightColor;
      let intensity = 1;

      switch (lightMode) {
        case LightMode.WARM_STEADY:
          targetColor = '#ff9933';
          intensity = 1.2;
          break;
        case LightMode.COLD_STROBE:
          targetColor = '#66ccff';
          const strobeSpeed = 10;
          intensity = (Math.sin(performance.now() * strobeSpeed * 0.01) + 1) * 0.5;
          setStrobeIntensity(intensity);
          break;
        case LightMode.PARTY_RAINBOW:
          const newHue = (rainbowHue + deltaTime * 0.5) % 1;
          setRainbowHue(newHue);
          const rainbowColor = new THREE.Color().setHSL(newHue, 1, 0.5);
          targetColor = '#' + rainbowColor.getHexString();
          intensity = 1.5;
          break;
      }

      setCurrentLightColor(targetColor);

      spotlightRefs.current.forEach((spotlight) => {
        if (spotlight) {
          spotlight.color.set(targetColor);
          spotlight.intensity = intensity * 2;
        }
      });

      lightSpotRefs.current.forEach((spot) => {
        if (spot && spot.material instanceof THREE.MeshBasicMaterial) {
          spot.material.color.set(targetColor);
          spot.material.opacity = 0.3 + intensity * 0.3;
        }
      });
    };

    const updateParticles = (deltaTime: number) => {
      if (!isPerforming && !particlesRef.current.some(p => p.active)) return;
      if (!particleGeometryRef.current) return;

      const positions = particleGeometryRef.current.attributes.position.array as Float32Array;
      const colors = particleGeometryRef.current.attributes.color.array as Float32Array;

      particlesRef.current.forEach((particle, index) => {
        if (!particle.active) return;

        particle.life += deltaTime;

        if (particle.life >= particle.maxLife) {
          if (isPerforming && performance.now() - performanceStartTimeRef.current < 2000) {
            particle.life = 0;
            particle.position.set(
              (Math.random() - 0.5) * STAGE_WIDTH * 0.8,
              0.5,
              (Math.random() - 0.5) * STAGE_DEPTH * 0.4
            );
            particle.velocity.set(
              (Math.random() - 0.5) * 8,
              25 + Math.random() * 10,
              (Math.random() - 0.5) * 8
            );
            particle.color.setHSL(Math.random(), 1, 0.5 + Math.random() * 0.3);
          } else {
            particle.active = false;
            positions[index * 3 + 1] = -100;
            return;
          }
        }

        particle.position.addScaledVector(particle.velocity, deltaTime);
        particle.velocity.y -= 9.8 * deltaTime * 0.3;

        positions[index * 3] = particle.position.x;
        positions[index * 3 + 1] = particle.position.y;
        positions[index * 3 + 2] = particle.position.z;

        const alpha = 0.6 * (1 - particle.life / particle.maxLife);
        colors[index * 3] = particle.color.r * alpha;
        colors[index * 3 + 1] = particle.color.g * alpha;
        colors[index * 3 + 2] = particle.color.b * alpha;
      });

      particleGeometryRef.current.attributes.position.needsUpdate = true;
      particleGeometryRef.current.attributes.color.needsUpdate = true;
    };

    const updateLightSpots = (deltaTime: number) => {
      const time = performance.now() * 0.001;
      lightSpotRefs.current.forEach((spot, index) => {
        if (spot) {
          const offsetX = Math.sin(time + index * 0.5) * 0.3;
          const offsetZ = Math.cos(time * 0.7 + index * 0.3) * 0.2;
          spot.position.x = spot.userData.baseX + offsetX;
          spot.position.z = spot.userData.baseZ + offsetZ;
        }
      });
    };

    const callbackId = renderLoop.addCallback((deltaTime) => {
      updateLighting(deltaTime);
      updateParticles(deltaTime);
      updateLightSpots(deltaTime);
    });

    return () => {
      renderLoop.removeCallback(callbackId);
    };
  }, [lightMode, spotlightColor, isPerforming, rainbowHue]);

  useFrame(({ camera }) => {
    if (onCameraChange) {
      onCameraChange(camera.position);
    }
  });

  const handlePointerOver = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    document.body.style.cursor = 'default';
  };

  const archShape = useMemo(() => {
    const shape = new THREE.Shape();
    const archRadius = ARCH_WIDTH / 2;
    const archSegments = 32;

    shape.moveTo(-archRadius, 0);

    for (let i = 0; i <= archSegments; i++) {
      const angle = (i / archSegments) * Math.PI;
      const x = Math.cos(angle) * archRadius;
      const y = Math.sin(angle) * ARCH_HEIGHT;
      shape.lineTo(x, y);
    }

    shape.lineTo(archRadius, -2);
    shape.lineTo(-archRadius, -2);
    shape.lineTo(-archRadius, 0);

    return shape;
  }, []);

  const archExtrudeSettings = useMemo(() => ({
    depth: 1,
    bevelEnabled: false,
  }), []);

  return (
    <group ref={stageGroupRef}>
      <ambientLight intensity={0.2} />
      <directionalLight position={[0, 10, 5]} intensity={0.3} color="#ffffff" />

      <mesh
        position={[0, STAGE_HEIGHT / 2, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <planeGeometry args={[STAGE_WIDTH, STAGE_DEPTH]} />
        <meshStandardMaterial
          map={stageFloorTexture}
          color="#2d2d2d"
          roughness={0.8}
          metalness={0.2}
        />
      </mesh>

      <mesh position={[0, ARCH_HEIGHT / 2, -STAGE_DEPTH / 2 - 0.5]}>
        <extrudeGeometry args={[archShape, archExtrudeSettings]} />
        <meshBasicMaterial
          map={backdropGradientTexture}
          side={THREE.DoubleSide}
        />
      </mesh>

      {spotlightPositions.map((pos, index) => (
        <group key={index}>
          <spotLight
            ref={(el) => {
              if (el) spotlightRefs.current[index] = el;
            }}
            position={[pos.x, pos.y, pos.z]}
            angle={Math.PI / 6}
            penumbra={0.5}
            intensity={2}
            distance={20}
            color={currentLightColor}
            castShadow
            target-position={[pos.x, 0, 0]}
          />
          <mesh position={[pos.x, pos.y - 0.3, pos.z]}>
            <cylinderGeometry args={[0.15, 0.2, 0.4, 16]} />
            <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[pos.x, pos.y - 0.5, pos.z]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color={currentLightColor} />
          </mesh>
        </group>
      ))}

      {spotlightPositions.slice(0, 4).map((pos, index) => (
        <mesh
          key={`spot-${index}`}
          ref={(el) => {
            if (el) {
              lightSpotRefs.current[index] = el;
              el.userData.baseX = pos.x;
              el.userData.baseZ = 0;
            }
          }}
          position={[pos.x, STAGE_HEIGHT + 0.01, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
        >
          <circleGeometry args={[1.5, 32]} />
          <meshBasicMaterial
            color={currentLightColor}
            transparent
            opacity={0.4}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}

      {particlesMeshRef.current && (
        <primitive object={particlesMeshRef.current} />
      )}
    </group>
  );
}
