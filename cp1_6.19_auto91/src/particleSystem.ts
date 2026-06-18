import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore, Particle, PoemGroup, OrbitingParticle, ConnectionLine } from './store';

const HIGHLIGHT_COLOR = new THREE.Color('#ffd700');
const EXPLOSION_DURATION = 0.8;
const BREATH_FREQUENCY = 0.3;
const FUSION_DURATION = 3;

export function useParticleAnimation() {
  const poemGroups = useStore(state => state.poemGroups);
  const isFusing = useStore(state => state.isFusing);
  const orbitingParticles = useStore(state => state.orbitingParticles);
  const coreSphere = useStore(state => state.coreSphere);
  const updateFusionProgress = useStore(state => state.updateFusionProgress);
  const completeFusion = useStore(state => state.completeFusion);
  const setAudioPlaying = useStore(state => state.setAudioPlaying);
  
  const fusionStartTime = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (isFusing && fusionStartTime.current === null) {
      fusionStartTime.current = performance.now();
      startBackgroundMusic();
    }
    if (!isFusing) {
      fusionStartTime.current = null;
    }
  }, [isFusing]);

  const startBackgroundMusic = () => {
    if (audioContextRef.current) return;
    
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioCtx();
      const ctx = audioContextRef.current;
      
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0, ctx.currentTime);
      masterGain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 2);
      masterGain.connect(ctx.destination);
      
      const chords = [
        [261.63, 329.63, 392.00],
        [349.23, 440.00, 523.25],
        [392.00, 493.88, 587.33],
        [440.00, 523.25, 659.25]
      ];
      
      const chordDuration = 5;
      
      const playChord = (chordIndex: number, startTime: number) => {
        if (!audioContextRef.current) return;
        
        const chord = chords[chordIndex % chords.length];
        chord.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          
          osc.type = 'sine';
          osc.frequency.value = freq;
          
          gain.gain.setValueAtTime(0, startTime);
          gain.gain.linearRampToValueAtTime(0.15, startTime + 0.1);
          gain.gain.setValueAtTime(0.15, startTime + chordDuration - 0.5);
          gain.gain.linearRampToValueAtTime(0, startTime + chordDuration);
          
          osc.connect(gain);
          gain.connect(masterGain);
          
          osc.start(startTime);
          osc.stop(startTime + chordDuration);
        });
      };
      
      const scheduleLoop = () => {
        if (!audioContextRef.current) return;
        
        const now = ctx.currentTime;
        for (let i = 0; i < 4; i++) {
          playChord(i, now + i * chordDuration);
        }
        
        setTimeout(() => {
          if (audioContextRef.current) {
            scheduleLoop();
          }
        }, 4 * chordDuration * 1000);
      };
      
      scheduleLoop();
      setAudioPlaying(true);
    } catch (e) {
      console.log('Audio not supported');
    }
  };

  useFrame((_, delta) => {
    const time = performance.now() / 1000;
    
    poemGroups.forEach(group => {
      updatePoemGroup(group, delta, time);
    });
    
    if (isFusing && fusionStartTime.current !== null) {
      const elapsed = (performance.now() - fusionStartTime.current) / 1000;
      const progress = Math.min(elapsed / FUSION_DURATION, 1);
      updateFusionProgress(progress);
      
      if (progress >= 1) {
        completeFusion();
      }
    }
    
    orbitingParticles.forEach(particle => {
      particle.angle += particle.speed * delta;
      particle.position.set(
        Math.cos(particle.angle) * particle.radius,
        Math.sin(particle.angle * 0.7) * particle.radius * 0.3,
        Math.sin(particle.angle) * particle.radius * Math.cos(particle.inclination)
      );
    });
    
    if (coreSphere) {
      coreSphere.rotation.y += coreSphere.rotationSpeed;
    }
  });
}

function updatePoemGroup(group: PoemGroup, delta: number, time: number) {
  group.rotation.y += group.rotationSpeed * delta;
  
  if (group.isFusing) {
    const lerpFactor = 2 * delta;
    group.centerPosition.lerp(group.targetCenterPosition, lerpFactor);
  }
  
  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(group.rotation);
  
  group.particles.forEach((particle, index) => {
    updateParticle(particle, group, index, delta, time, rotationMatrix);
  });
  
  if (group.isHighlighted) {
    group.highlightTime = Math.max(0, group.highlightTime - delta);
    if (group.highlightTime <= 0) {
      group.isHighlighted = false;
    }
  }
}

function updateParticle(
  particle: Particle,
  group: PoemGroup,
  _index: number,
  delta: number,
  time: number,
  rotationMatrix: THREE.Matrix4
) {
  if (particle.isExploding) {
    particle.explosionTime += delta;
    
    if (particle.explosionTime < EXPLOSION_DURATION) {
      particle.position.add(particle.velocity.clone().multiplyScalar(delta));
      const decayFactor = 1 - delta / EXPLOSION_DURATION;
      particle.velocity.multiplyScalar(decayFactor);
    } else {
      particle.isExploding = false;
      particle.position.copy(particle.targetPosition);
    }
  }
  
  if (!particle.isExploding) {
    const breathScale = 0.2 + 0.3 * (0.5 + 0.5 * Math.sin(time * Math.PI * 2 * BREATH_FREQUENCY + particle.phase));
    particle.size = particle.baseSize * breathScale;
  }
  
  if (group.isHighlighted) {
    const highlightIntensity = Math.min(group.highlightTime / 2, 1);
    particle.color.lerpColors(particle.baseColor, HIGHLIGHT_COLOR, highlightIntensity);
    particle.size = particle.baseSize * 1.5;
  } else if (!particle.isExploding) {
    particle.color.copy(particle.baseColor);
  }
  
  const rotatedTarget = particle.targetPosition.clone()
    .sub(group.centerPosition)
    .applyMatrix4(rotationMatrix)
    .add(group.centerPosition);
  
  if (!particle.isExploding) {
    particle.position.lerp(rotatedTarget, 0.1);
  }
}

export function ParticleMesh({ 
  particles, 
  onParticleClick 
}: { 
  particles: Particle[]; 
  onParticleClick: (poemId: string) => void;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame(() => {
    if (!meshRef.current) return;
    
    particles.forEach((particle, i) => {
      dummy.position.copy(particle.position);
      dummy.scale.setScalar(particle.size);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      
      const color = particle.color;
      meshRef.current!.setColorAt(i, color);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });
  
  const handleClick = (e: any) => {
    e.stopPropagation();
    const instanceId = e.instanceId;
    if (instanceId !== undefined && particles[instanceId]) {
      onParticleClick(particles[instanceId].poemId);
    }
  };
  
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, particles.length]}
      onClick={handleClick}
    >
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

export function StarField() {
  const starsRef = useRef<THREE.Points>(null);
  const starCount = 300;
  
  const { positions, sizes, phases } = useMemo(() => {
    const positions = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);
    const phases = new Float32Array(starCount);
    
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 50 + Math.random() * 50;
      
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      
      sizes[i] = 0.5 + Math.random() * 1.5;
      phases[i] = Math.random() * Math.PI * 2;
    }
    
    return { positions, sizes, phases };
  }, []);
  
  useFrame(({ clock }) => {
    if (!starsRef.current) return;
    
    const geometry = starsRef.current.geometry;
    const sizeAttribute = geometry.attributes.size as THREE.BufferAttribute;
    const time = clock.getElapsedTime();
    
    for (let i = 0; i < starCount; i++) {
      const pulse = 0.7 + 0.3 * Math.sin(time * 2 + phases[i]);
      sizeAttribute.setX(i, sizes[i] * pulse);
    }
    
    sizeAttribute.needsUpdate = true;
  });
  
  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={starCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={starCount}
          array={new Float32Array(starCount)}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        size={1}
        sizeAttenuation
        color="#ffffff"
        transparent
        opacity={0.8}
      />
    </points>
  );
}

export function ConnectionLines({ lines }: { lines: ConnectionLine[] }) {
  const lineRef = useRef<THREE.LineSegments>(null);
  
  const geometry = useMemo(() => {
    const positions = new Float32Array(lines.length * 6);
    const colors = new Float32Array(lines.length * 6);
    
    lines.forEach((line, i) => {
      positions[i * 6] = line.start.x;
      positions[i * 6 + 1] = line.start.y;
      positions[i * 6 + 2] = line.start.z;
      positions[i * 6 + 3] = line.end.x;
      positions[i * 6 + 4] = line.end.y;
      positions[i * 6 + 5] = line.end.z;
      
      colors[i * 6] = line.color.r;
      colors[i * 6 + 1] = line.color.g;
      colors[i * 6 + 2] = line.color.b;
      colors[i * 6 + 3] = line.color.r;
      colors[i * 6 + 4] = line.color.g;
      colors[i * 6 + 5] = line.color.b;
    });
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [lines]);
  
  useFrame(() => {
    if (!lineRef.current) return;
    const positions = geometry.attributes.position.array as Float32Array;
    
    lines.forEach((line, i) => {
      positions[i * 6] = line.start.x;
      positions[i * 6 + 1] = line.start.y;
      positions[i * 6 + 2] = line.start.z;
      positions[i * 6 + 3] = line.end.x;
      positions[i * 6 + 4] = line.end.y;
      positions[i * 6 + 5] = line.end.z;
    });
    
    geometry.attributes.position.needsUpdate = true;
  });
  
  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial vertexColors transparent opacity={0.3} />
    </lineSegments>
  );
}

export function OrbitingParticles({ particles }: { particles: OrbitingParticle[] }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  
  useFrame(() => {
    if (!meshRef.current) return;
    
    particles.forEach((particle, i) => {
      dummy.position.copy(particle.position);
      dummy.scale.setScalar(0.15);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, particle.color);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });
  
  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, particles.length]}
    >
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

export function CoreSphere({ rotation }: { rotation: THREE.Euler }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.copy(rotation);
    }
  });
  
  const textPositions = useMemo(() => {
    const positions: Array<{ pos: THREE.Vector3; normal: THREE.Vector3; color: THREE.Color }> = [];
    const texts = ['诗', '词', '歌', '赋', '风', '雅', '颂', '韵'];
    const colorPool = ['#ff6b6b', '#feca57', '#ff9ff3', '#54a0ff', '#5f27cd'];
    
    for (let lat = 0; lat < 8; lat++) {
      const phi = (lat / 8) * Math.PI;
      for (let lon = 0; lon < 16; lon++) {
        const theta = (lon / 16) * Math.PI * 2;
        const r = 0.8;
        
        const pos = new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta)
        );
        
        const normal = pos.clone().normalize();
        const color = new THREE.Color(colorPool[Math.floor(Math.random() * colorPool.length)]);
        
        positions.push({ pos, normal, color });
      }
    }
    
    return positions;
  }, []);
  
  return (
    <group ref={groupRef}>
      <mesh>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial color="#1a1a2e" transparent opacity={0.3} wireframe />
      </mesh>
      {textPositions.map((tp, i) => (
        <mesh key={i} position={tp.pos}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshBasicMaterial color={tp.color} />
        </mesh>
      ))}
    </group>
  );
}

export function DrawPath({ points }: { points: THREE.Vector3[] }) {
  const lineRef = useRef<THREE.Line>(null);
  
  const geometry = useMemo(() => {
    const positions = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, [points]);
  
  useFrame(() => {
    if (!lineRef.current || points.length === 0) return;
    const positions = geometry.attributes.position.array as Float32Array;
    
    points.forEach((p, i) => {
      positions[i * 3] = p.x;
      positions[i * 3 + 1] = p.y;
      positions[i * 3 + 2] = p.z;
    });
    
    geometry.attributes.position.needsUpdate = true;
  });
  
  if (points.length < 2) return null;
  
  return (
    <>
      <line ref={lineRef} geometry={geometry}>
        <lineBasicMaterial color="#4fc3f7" transparent opacity={0.6} linewidth={3} />
      </line>
      <lineSegments geometry={geometry}>
        <lineBasicMaterial color="#4fc3f7" transparent opacity={0.3} linewidth={1} />
      </lineSegments>
    </>
  );
}
