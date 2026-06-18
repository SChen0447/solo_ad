import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, Tower, Enemy, Projectile, ParticleEffect, HEX_SIZE } from '@game/store';
import { towerManager, updateProjectiles, cleanupParticles } from '@game/towerManager';
import { enemyManager, checkWaveEnd } from '@game/enemyManager';

function getHexShapePoints(size: number): THREE.Vector2[] {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    pts.push(new THREE.Vector2(Math.cos(a) * size, Math.sin(a) * size));
  }
  return pts;
}

const PATH_COLOR = '#6b8e4e';
const GRASS_COLOR = '#556b2f';
const SPAWN_COLOR = '#8b3a3a';
const CASTLE_COLOR = '#4a3728';
const HEX_LINE = '#3d2817';

function HexCell({ cell, onClick, onPointerOver, onPointerOut, hovered }: {
  cell: ReturnType<typeof useGameStore.getState>['hexGrid'][number];
  onClick: () => void;
  onPointerOver: () => void;
  onPointerOut: () => void;
  hovered: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lineRef = useRef<THREE.LineSegments>(null);
  const [hoverIntensity, setHoverIntensity] = useState(0);

  const { geometry, edgeGeometry } = useMemo(() => {
    const shape = new THREE.Shape(getHexShapePoints(HEX_SIZE * 0.97));
    const geom = new THREE.ExtrudeGeometry(shape, { depth: 0.1, bevelEnabled: false });
    geom.rotateX(-Math.PI / 2);
    geom.translate(0, 0, 0);

    const edgePts = getHexShapePoints(HEX_SIZE * 0.97);
    const v3: THREE.Vector3[] = [];
    for (let i = 0; i < edgePts.length; i++) {
      const p1 = edgePts[i];
      const p2 = edgePts[(i + 1) % edgePts.length];
      v3.push(new THREE.Vector3(p1.x, 0.11, p1.y));
      v3.push(new THREE.Vector3(p2.x, 0.11, p2.y));
    }
    const edgeGeom = new THREE.BufferGeometry().setFromPoints(v3);
    return { geometry: geom, edgeGeometry: edgeGeom };
  }, []);

  let color = GRASS_COLOR;
  if (cell.isPath) color = PATH_COLOR;
  if (cell.isSpawn) color = SPAWN_COLOR;
  if (cell.isCastle) color = CASTLE_COLOR;

  useFrame((_, delta) => {
    const target = hovered ? 1 : 0;
    const nv = hoverIntensity + (target - hoverIntensity) * delta * 8;
    setHoverIntensity(nv);
    if (lineRef.current) {
      const mat = lineRef.current.material as THREE.LineBasicMaterial;
      const col = new THREE.Color().lerpColors(
        new THREE.Color(HEX_LINE),
        new THREE.Color('#d4af37'),
        nv
      );
      mat.color.copy(col);
      const s = 1 + nv * 0.12;
      mat.linewidth = 1;
      lineRef.current.scale.set(s, 1, s);
    }
  });

  return (
    <group position={[cell.x, 0, cell.z]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        onPointerOver={(e) => { e.stopPropagation(); onPointerOver(); }}
        onPointerOut={(e) => { e.stopPropagation(); onPointerOut(); }}
      >
        <meshStandardMaterial
          color={color}
          roughness={0.95}
          metalness={0}
        />
      </mesh>
      <lineSegments ref={lineRef} geometry={edgeGeometry}>
        <lineBasicMaterial color={HEX_LINE} />
      </lineSegments>
    </group>
  );
}

function PathArrows({ paths }: { paths: { x: number; z: number }[][] }) {
  const group = useRef<THREE.Group>(null);
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (group.current) {
      group.current.children.forEach((c, i) => {
        c.position.y = 0.3 + Math.sin(t * 2 + i * 0.5) * 0.05;
      });
    }
  });

  const arrows = useMemo(() => {
    const arr: JSX.Element[] = [];
    paths.forEach((path, pi) => {
      for (let i = 0; i < path.length - 1; i++) {
        const p1 = path[i];
        const p2 = path[i + 1];
        const midx = (p1.x + p2.x) / 2;
        const midz = (p1.z + p2.z) / 2;
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const rot = Math.atan2(dz, dx);
        arr.push(
          <group key={`${pi}-${i}`} position={[midx, 0.3, midz]} rotation={[-Math.PI / 2, 0, -rot]}>
            <mesh>
              <coneGeometry args={[0.22, 0.45, 3]} />
              <meshStandardMaterial
                color="#90ee90"
                transparent
                opacity={0.45}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        );
      }
    });
    return arr;
  }, [paths]);

  return <group ref={group}>{arrows}</group>;
}

function Castle({ position, flash, hpPct }: { position: [number, number, number]; flash: boolean; hpPct: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!ref.current) return;
    const tower = ref.current.children[1] as THREE.Mesh | undefined;
    if (tower && tower.material instanceof THREE.MeshStandardMaterial) {
      const target = flash ? new THREE.Color('#ff4444') : new THREE.Color('#a0896b');
      tower.material.color.lerp(target, 0.3);
    }
  });

  return (
    <group ref={ref} position={position}>
      <mesh position={[0, 0.4, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.1, 1.3, 0.8, 8]} />
        <meshStandardMaterial color="#6b5842" roughness={0.85} />
      </mesh>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.75, 0.95, 1.3, 8]} />
        <meshStandardMaterial color="#a0896b" roughness={0.8} />
      </mesh>
      <mesh position={[0, 2.15, 0]} castShadow>
        <coneGeometry args={[0.95, 0.8, 4]} />
        <meshStandardMaterial color="#8b3a3a" roughness={0.7} />
      </mesh>
      <mesh position={[0, 2.7, 0]}>
        <sphereGeometry args={[0.18, 16, 16]} />
        <meshStandardMaterial color="#d4af37" emissive="#d4af37" emissiveIntensity={0.6} />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <ringGeometry args={[1.4, 1.55, 32]} />
        <meshBasicMaterial color={hpPct > 0.5 ? '#4caf50' : hpPct > 0.25 ? '#ff9800' : '#f44336'} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.045, 0]} rotation={[0, 0, 0]}>
        <ringGeometry args={[1.4, 1.4 + (1.55 - 1.4) * hpPct, 32]} />
        <meshBasicMaterial color={hpPct > 0.5 ? '#81c784' : hpPct > 0.25 ? '#ffb74d' : '#e57373'} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

function TowerMesh({ tower, isSelected, onClick }: { tower: Tower; isSelected: boolean; onClick: () => void }) {
  const ref = useRef<THREE.Group>(null);
  const flowRef = useRef<THREE.Points>(null);

  const colors: Record<string, string> = {
    arrow: '#d4a24c',
    magic: '#5b8dd9',
    stone: '#9e6b3d',
  };
  const flowColors: Record<string, string> = {
    arrow: '#ffd700',
    magic: '#6bb8ff',
    stone: '#ff8c42',
  };

  const isSRank = tower.rank === 'S';

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (ref.current) {
      ref.current.position.y = 0.15 + Math.sin(t * 0.7 + tower.x) * 0.02;
    }
    if (flowRef.current && isSRank) {
      const geom = flowRef.current.geometry as THREE.BufferGeometry;
      const pos = geom.attributes.position.array as Float32Array;
      for (let i = 0; i < pos.length / 3; i++) {
        const phase = (t * 2 + i * 0.4) % (Math.PI * 2);
        const angle = phase + (i / (pos.length / 3)) * Math.PI * 2;
        const r = 0.85 + Math.sin(phase * 3) * 0.08;
        pos[i * 3] = Math.cos(angle) * r;
        pos[i * 3 + 2] = Math.sin(angle) * r;
        pos[i * 3 + 1] = 0.8 + (phase / (Math.PI * 2)) * 1.6 + Math.sin(phase * 5) * 0.05;
      }
      geom.attributes.position.needsUpdate = true;
    }
  });

  const flowPoints = useMemo(() => {
    if (!isSRank) return null;
    const n = 36;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      arr[i * 3] = Math.cos(a) * 0.9;
      arr[i * 3 + 1] = 1;
      arr[i * 3 + 2] = Math.sin(a) * 0.9;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, [isSRank]);

  const renderTowerBody = () => {
    const baseColor = colors[tower.type];
    const rankScale: Record<string, number> = { D: 0.85, C: 0.92, B: 1.0, A: 1.08, S: 1.18 };
    const s = rankScale[tower.rank];

    if (tower.type === 'arrow') {
      return (
        <group scale={s}>
          <mesh position={[0, 0.35, 0]} castShadow>
            <cylinderGeometry args={[0.5, 0.55, 0.7, 6]} />
            <meshStandardMaterial color="#6b5335" roughness={0.85} />
          </mesh>
          <mesh position={[0, 1.05, 0]} castShadow>
            <cylinderGeometry args={[0.38, 0.48, 0.6, 6]} />
            <meshStandardMaterial color={baseColor} roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.5, 0]} castShadow>
            <coneGeometry args={[0.5, 0.45, 4]} />
            <meshStandardMaterial color="#5a4526" roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.25, 0.4]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.85, 6]} />
            <meshStandardMaterial color="#8b6914" />
          </mesh>
        </group>
      );
    } else if (tower.type === 'magic') {
      return (
        <group scale={s}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <cylinderGeometry args={[0.55, 0.6, 0.6, 6]} />
            <meshStandardMaterial color="#4a4a6a" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.95, 0]} castShadow>
            <cylinderGeometry args={[0.42, 0.52, 0.7, 6]} />
            <meshStandardMaterial color="#6b6ba0" roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.7, 0]} castShadow>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshStandardMaterial
              color={baseColor}
              emissive={baseColor}
              emissiveIntensity={0.4}
              roughness={0.4}
            />
          </mesh>
          <mesh position={[0, 1.7, 0]}>
            <sphereGeometry args={[0.22, 16, 16]} />
            <meshBasicMaterial color="#a0d8ff" transparent opacity={0.7} />
          </mesh>
        </group>
      );
    } else {
      return (
        <group scale={s}>
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[1.0, 0.6, 1.0]} />
            <meshStandardMaterial color="#5a4a3a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.9, 0]} castShadow>
            <cylinderGeometry args={[0.35, 0.4, 0.7, 8]} />
            <meshStandardMaterial color={baseColor} roughness={0.85} />
          </mesh>
          <mesh position={[0.15, 1.3, 0.35]} rotation={[-0.4, 0.5, 0.3]} castShadow>
            <boxGeometry args={[0.2, 0.15, 0.8]} />
            <meshStandardMaterial color="#3d2817" roughness={0.85} />
          </mesh>
          <mesh position={[0.35, 1.35, 0.65]} castShadow>
            <sphereGeometry args={[0.2, 12, 12]} />
            <meshStandardMaterial color="#6e6e6e" roughness={0.95} />
          </mesh>
        </group>
      );
    }
  };

  return (
    <group
      ref={ref}
      position={[tower.x, 0.15, tower.z]}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
    >
      {renderTowerBody()}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
          <ringGeometry args={[tower.range - 0.05, tower.range, 64]} />
          <meshBasicMaterial color="#ffd700" transparent opacity={0.35} side={THREE.DoubleSide} />
        </mesh>
      )}
      {isSRank && flowPoints && (
        <points ref={flowRef} geometry={flowPoints}>
          <pointsMaterial
            color={flowColors[tower.type]}
            size={0.12}
            transparent
            opacity={0.9}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
}

function EnemyMesh({ enemy }: { enemy: Enemy }) {
  const ref = useRef<THREE.Group>(null);
  const hpPct = Math.max(0, enemy.hp / enemy.maxHp);

  useFrame(() => {
    if (!ref.current) return;
    const rot = Math.atan2(1, 1);
    const path = useGameStore.getState().paths[enemy.pathId];
    if (path && enemy.pathIndex < path.length - 1) {
      const next = path[enemy.pathIndex + 1];
      const dx = next.x - enemy.x;
      const dz = next.z - enemy.z;
      ref.current.rotation.y = Math.atan2(dx, dz);
    }
  });

  const renderBody = () => {
    if (enemy.type === 'infantry') {
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.35, 0.55, 0.25]} />
            <meshStandardMaterial color="#7a5c3f" roughness={0.8} />
          </mesh>
          <mesh position={[0, 0.9, 0]} castShadow>
            <sphereGeometry args={[0.18, 12, 12]} />
            <meshStandardMaterial color="#d2b48c" roughness={0.6} />
          </mesh>
          <mesh position={[0.2, 0.55, 0]} rotation={[0, 0, -0.3]} castShadow>
            <boxGeometry args={[0.08, 0.5, 0.08]} />
            <meshStandardMaterial color="#a0522d" />
          </mesh>
        </group>
      );
    } else if (enemy.type === 'cavalry') {
      return (
        <group>
          <mesh position={[0, 0.45, 0]} castShadow>
            <boxGeometry args={[0.5, 0.5, 0.9]} />
            <meshStandardMaterial color="#3f2a1a" roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.15, 0.4]} castShadow>
            <boxGeometry args={[0.18, 0.3, 0.18]} />
            <meshStandardMaterial color="#2a1a0a" />
          </mesh>
          <mesh position={[0, 0.15, -0.4]} castShadow>
            <boxGeometry args={[0.18, 0.3, 0.18]} />
            <meshStandardMaterial color="#2a1a0a" />
          </mesh>
          <mesh position={[0.35, 0.45, 0]} castShadow>
            <boxGeometry args={[0.45, 0.3, 0.2]} />
            <meshStandardMaterial color="#8b4513" />
          </mesh>
          <mesh position={[0.35, 0.7, 0]} castShadow>
            <sphereGeometry args={[0.14, 12, 12]} />
            <meshStandardMaterial color="#d2b48c" />
          </mesh>
        </group>
      );
    } else if (enemy.type === 'batteringRam') {
      return (
        <group>
          <mesh position={[0, 0.3, 0]} castShadow>
            <boxGeometry args={[0.8, 0.35, 1.1]} />
            <meshStandardMaterial color="#3d2817" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.18, 1.3, 12]} rotation={[0, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#5a4020" />
          </mesh>
          <mesh position={[0, 0.55, 0.65]} castShadow>
            <sphereGeometry args={[0.28, 16, 16]} />
            <meshStandardMaterial color="#888" metalness={0.7} roughness={0.4} />
          </mesh>
          <mesh position={[-0.45, 0.1, 0.3]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.3, 8]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0.45, 0.1, 0.3]} castShadow>
            <cylinderGeometry args={[0.08, 0.08, 0.3, 8]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
      );
    } else {
      return (
        <group>
          <mesh position={[0, 0.25, 0]} castShadow>
            <cylinderGeometry args={[0.65, 0.7, 0.3, 12]} />
            <meshStandardMaterial color="#4a3828" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.55, 0]} rotation={[0.5, 0, 0]} castShadow>
            <boxGeometry args={[0.25, 0.25, 1.0]} />
            <meshStandardMaterial color="#2a1a0a" />
          </mesh>
          <mesh position={[0, 0.8, 0.6]} castShadow>
            <sphereGeometry args={[0.25, 16, 16]} />
            <meshStandardMaterial color="#6e6e6e" roughness={0.95} />
          </mesh>
          <mesh position={[-0.55, 0.1, 0]} castShadow>
            <torusGeometry args={[0.15, 0.07, 8, 16]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[0.55, 0.1, 0]} castShadow>
            <torusGeometry args={[0.15, 0.07, 8, 16]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
      );
    }
  };

  return (
    <group ref={ref} position={[enemy.x, 0, enemy.z]}>
      {renderBody()}
      <mesh position={[0, 1.4, 0]}>
        <planeGeometry args={[0.6, 0.08]} />
        <meshBasicMaterial color="#333" />
      </mesh>
      <mesh position={[-0.3 + 0.3 * hpPct, 1.4, 0.001]}>
        <planeGeometry args={[0.6 * hpPct, 0.06]} />
        <meshBasicMaterial color={hpPct > 0.5 ? '#4caf50' : hpPct > 0.25 ? '#ff9800' : '#f44336'} />
      </mesh>
    </group>
  );
}

function ProjectileMesh({ proj, enemies }: { proj: Projectile; enemies: Enemy[] }) {
  const ref = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!ref.current) return;
    const p = proj.progress;
    const target = enemies.find(e => e.id === proj.targetId);
    let tx = proj.targetX;
    let tz = proj.targetZ;
    if (target) {
      tx = target.x;
      tz = target.z;
    }
    const x = proj.startX + (tx - proj.startX) * p;
    const z = proj.startZ + (tz - proj.startZ) * p;
    let y = proj.startY;
    if (proj.type === 'stone') {
      y = proj.startY + Math.sin(p * Math.PI) * 3.5;
    } else if (proj.type === 'magic') {
      y = proj.startY + Math.sin(p * Math.PI) * 0.8 + Math.sin(p * 40) * 0.06;
    } else {
      y = proj.startY + Math.sin(p * Math.PI) * 0.4;
    }
    ref.current.position.set(x, y, z);
    const dx = tx - proj.startX;
    const dz = tz - proj.startZ;
    ref.current.rotation.y = Math.atan2(dx, dz);
  });

  if (proj.type === 'arrow') {
    return (
      <group ref={ref}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.55, 6]} />
          <meshStandardMaterial color="#f4d03f" emissive="#ffdb58" emissiveIntensity={0.6} />
        </mesh>
        <mesh position={[0, 0, 0.3]}>
          <coneGeometry args={[0.06, 0.15, 4]} />
          <meshStandardMaterial color="#8b6914" />
        </mesh>
      </group>
    );
  } else if (proj.type === 'magic') {
    return (
      <group ref={ref}>
        <mesh>
          <sphereGeometry args={[0.15, 16, 16]} />
          <meshStandardMaterial
            color="#4a7ad9"
            emissive="#6ba3ff"
            emissiveIntensity={0.9}
            transparent
            opacity={0.85}
          />
        </mesh>
        <mesh>
          <torusGeometry args={[0.22, 0.025, 8, 20]} />
          <meshStandardMaterial color="#88c0ff" transparent opacity={0.7} emissive="#a0d0ff" emissiveIntensity={0.5} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.2, 0.02, 8, 20]} />
          <meshStandardMaterial color="#88c0ff" transparent opacity={0.5} />
        </mesh>
      </group>
    );
  } else {
    return (
      <group ref={ref}>
        <mesh castShadow>
          <sphereGeometry args={[0.2, 12, 12]} />
          <meshStandardMaterial color="#808080" roughness={0.95} />
        </mesh>
      </group>
    );
  }
}

function ParticleMesh({ particle }: { particle: ParticleEffect }) {
  const ref = useRef<THREE.Mesh>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const start = particle.createdAt;

  const pointsGeom = useMemo(() => {
    const n = 24;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * 0.1;
      arr[i * 3] = Math.cos(a) * r;
      arr[i * 3 + 1] = Math.random() * 0.1;
      arr[i * 3 + 2] = Math.sin(a) * r;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, [particle.id]);

  useFrame((state) => {
    const elapsed = state.clock.elapsedTime * 1000 - start;
    const t = Math.min(1, elapsed / particle.duration);
    const geom = pointsGeom;
    const pos = geom.attributes.position.array as Float32Array;
    for (let i = 0; i < pos.length / 3; i++) {
      const scale = 1 + t * 3;
      pos[i * 3] *= 1 + 0.02;
      pos[i * 3 + 1] += 0.01 + t * 0.005;
      pos[i * 3 + 2] *= 1 + 0.02;
    }
    geom.attributes.position.needsUpdate = true;

    if (pointsRef.current) {
      const mat = pointsRef.current.material as THREE.PointsMaterial;
      mat.opacity = Math.max(0, 1 - t);
      mat.size = 0.06 + t * 0.14;
    }
  });

  const color = particle.color || (
    particle.type === 'explosion' ? '#ff8844' :
    particle.type === 'death' ? '#ff4444' :
    particle.type === 'buildDust' ? '#b08864' :
    '#d4a878'
  );

  return (
    <group ref={ref as any} position={[particle.x, particle.y, particle.z]}>
      <points ref={pointsRef} geometry={pointsGeom}>
        <pointsMaterial
          color={color}
          size={0.1}
          transparent
          opacity={0.9}
          depthWrite={false}
          blending={particle.type === 'explosion' ? THREE.AdditiveBlending : THREE.NormalBlending}
        />
      </points>
    </group>
  );
}

export default function Scene3D() {
  const { scene } = useThree();
  const grid = useGameStore(s => s.hexGrid);
  const paths = useGameStore(s => s.paths);
  const towers = useGameStore(s => s.towers);
  const enemies = useGameStore(s => s.enemies);
  const projectiles = useGameStore(s => s.projectiles);
  const particles = useGameStore(s => s.particles);
  const buildMode = useGameStore(s => s.buildMode);
  const selectedTowerType = useGameStore(s => s.selectedTowerType);
  const selectedTowerId = useGameStore(s => s.selectedTowerId);
  const hoveredHex = useGameStore(s => s.hoveredHex);
  const castleFlash = useGameStore(s => s.castleFlash);
  const castleHp = useGameStore(s => s.castleHp);
  const maxCastleHp = useGameStore(s => s.maxCastleHp);
  const phase = useGameStore(s => s.phase);

  const state = useGameStore.getState;

  useEffect(() => {
    if (grid.length === 0) {
      useGameStore.getState().initializeGrid();
    }
  }, [grid.length]);

  useEffect(() => {
    if (phase === 'waveActive' && enemies.length === 0) {
    }
  }, [phase, enemies.length]);

  useFrame((_, delta) => {
    const currentTime = performance.now();
    const dt = Math.min(delta, 0.05);

    towerManager.updateAttacks(dt, currentTime);
    enemyManager.updateEnemies(dt, currentTime);
    updateProjectiles(dt, currentTime);
    cleanupParticles(currentTime);
    checkWaveEnd(currentTime);
  });

  const handleCellClick = (q: number, r: number, x: number, z: number, buildable: boolean) => {
    const s = state();
    if (s.buildMode && s.selectedTowerType && buildable) {
      const occupied = s.towers.some(t => t.hexQ === q && t.hexR === r);
      if (!occupied) {
        towerManager.addTower(s.selectedTowerType, q, r, x, z);
      }
    }
    s.setHoveredHex(null);
  };

  const handleCellHover = (q: number, r: number) => {
    state().setHoveredHex({ q, r });
  };

  const handleCellOut = () => {
    state().setHoveredHex(null);
  };

  const hpPct = castleHp / maxCastleHp;

  const buildPreview = useMemo(() => {
    if (!buildMode || !hoveredHex) return null;
    const cell = grid.find(c => c.q === hoveredHex.q && c.r === hoveredHex.r);
    if (!cell || !cell.isBuildable) return null;
    const occupied = towers.some(t => t.hexQ === cell.q && t.hexR === cell.r);
    if (occupied) return null;
    const range = selectedTowerType
      ? ({ arrow: 5, magic: 4.5, stone: 4 }[selectedTowerType])
      : 5;
    return { x: cell.x, z: cell.z, range };
  }, [buildMode, hoveredHex, grid, towers, selectedTowerType]);

  return (
    <>
      <color attach="background" args={['#1a1410']} />
      <fog attach="fog" args={['#1a1410', 18, 36]} />

      <ambientLight intensity={0.45} color="#ffe0b0" />
      <directionalLight
        position={[8, 14, 6]}
        intensity={1.1}
        color="#ffd9a0"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <hemisphereLight args={['#d7b88a', '#3d2817', 0.4]} />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={8}
        maxDistance={32}
        maxPolarAngle={Math.PI / 2.3}
        target={[0, 0, 0]}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <circleGeometry args={[14, 64]} />
        <meshStandardMaterial color="#2a1e12" roughness={1} />
      </mesh>

      {grid.map(cell => (
        <HexCell
          key={`${cell.q},${cell.r}`}
          cell={cell}
          onClick={() => handleCellClick(cell.q, cell.r, cell.x, cell.z, cell.isBuildable)}
          onPointerOver={() => handleCellHover(cell.q, cell.r)}
          onPointerOut={handleCellOut}
          hovered={!!(hoveredHex && hoveredHex.q === cell.q && hoveredHex.r === cell.r)}
        />
      ))}

      <PathArrows paths={paths} />

      <Castle position={[0, 0, 0]} flash={castleFlash} hpPct={hpPct} />

      {buildPreview && (
        <group position={[buildPreview.x, 0.15, buildPreview.z]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[buildPreview.range - 0.04, buildPreview.range, 64]} />
            <meshBasicMaterial color="#90ee90" transparent opacity={0.4} side={THREE.DoubleSide} />
          </mesh>
          <mesh position={[0, 1.5, 0]}>
            <boxGeometry args={[0.6, 2.5, 0.6]} />
            <meshStandardMaterial color="#fff8d0" transparent opacity={0.35} />
          </mesh>
        </group>
      )}

      {towers.map(tower => (
        <TowerMesh
          key={tower.id}
          tower={tower}
          isSelected={tower.id === selectedTowerId}
          onClick={() => state().selectTower(tower.id === selectedTowerId ? null : tower.id)}
        />
      ))}

      {enemies.filter(e => e.hp > 0 && !e.reachedCastle).map(enemy => (
        <EnemyMesh key={enemy.id} enemy={enemy} />
      ))}

      {projectiles.map(p => (
        <ProjectileMesh key={p.id} proj={p} enemies={enemies} />
      ))}

      {particles.map(p => (
        <ParticleMesh key={p.id} particle={p} />
      ))}
    </>
  );
}
