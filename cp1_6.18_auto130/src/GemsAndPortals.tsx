import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  useGameStore,
  COLOR_MAP,
  GemColor,
  gridToWorld,
  GRID_SCALE,
  HEIGHT_SCALE,
  Gem,
  Portal,
} from './GameCore';

const GEM_TRAIL = 18;

function GemMesh({ gem }: { gem: Gem }) {
  const gemRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);
  const { mazeSize, platforms, player, allGemsCollected } = useGameStore();

  const gemColor = COLOR_MAP[gem.color];

  const trailPositions = useMemo(() => new Float32Array(GEM_TRAIL * 3), []);
  const trailColors = useMemo(() => {
    const arr = new Float32Array(GEM_TRAIL * 3);
    const c = new THREE.Color(gemColor);
    for (let i = 0; i < GEM_TRAIL; i++) {
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, [gemColor]);
  const trailWrite = useRef(0);
  const trailPointsRef = useRef<THREE.Points>(null);
  const trailGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    g.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    return g;
  }, [trailPositions, trailColors]);

  const basePlat = platforms[gem.gridZ]?.[gem.gridX];
  const [baseX, baseY, baseZ] = basePlat
    ? gridToWorld(gem.gridX, gem.gridZ, basePlat.height, mazeSize)
    : [0, 0, 0];

  useFrame((_, delta) => {
    timeRef.current += delta;
    if (!gemRef.current) return;

    if (gem.collected) {
      gemRef.current.visible = false;
      return;
    }
    gemRef.current.visible = true;

    let px = baseX;
    let py = baseY + 1.15 + Math.sin(timeRef.current * 2 + gem.gridX) * 0.12;
    let pz = baseZ;
    let scale = 1;

    if (gem.flying) {
      const t = gem.flyProgress;
      const ease = t * t * (3 - 2 * t);
      px = baseX + (player.worldX - baseX) * ease;
      py =
        baseY +
        1.15 +
        (player.worldY - (baseY + 1.15)) * ease +
        Math.sin(t * Math.PI) * 0.8;
      pz = baseZ + (player.worldZ - baseZ) * ease;
      scale = 1 - ease * 0.85;

      const idx = trailWrite.current % GEM_TRAIL;
      trailPositions[idx * 3] = px;
      trailPositions[idx * 3 + 1] = py;
      trailPositions[idx * 3 + 2] = pz;
      trailWrite.current++;
      if (trailPointsRef.current) {
        trailPointsRef.current.geometry.attributes.position.needsUpdate = true;
      }
    } else {
      for (let i = 0; i < GEM_TRAIL; i++) {
        const ii = (trailWrite.current + i) % GEM_TRAIL;
        trailPositions[ii * 3] = px;
        trailPositions[ii * 3 + 1] = py;
        trailPositions[ii * 3 + 2] = pz;
      }
    }

    gemRef.current.position.set(px, py, pz);
    gemRef.current.rotation.y += delta * 2.2;
    gemRef.current.rotation.x += delta * 0.8;
    gemRef.current.scale.setScalar(scale);
  });

  if (gem.collected) return null;

  return (
    <>
      <group ref={gemRef}>
        <mesh>
          <octahedronGeometry args={[0.26, 0]} />
          <meshStandardMaterial
            color={gemColor}
            emissive={gemColor}
            emissiveIntensity={allGemsCollected ? 0.4 : 1.1}
            metalness={0.5}
            roughness={0.15}
            transparent
            opacity={0.95}
          />
        </mesh>
        <mesh scale={1.6}>
          <octahedronGeometry args={[0.26, 0]} />
          <meshBasicMaterial
            color={gemColor}
            transparent
            opacity={0.18}
            wireframe
            depthWrite={false}
          />
        </mesh>
        <pointLight
          color={gemColor}
          intensity={gem.flying ? 2.5 : 1.3}
          distance={4.5}
          decay={2}
        />
      </group>
      <points ref={trailPointsRef} geometry={trailGeom}>
        <pointsMaterial
          size={0.15}
          vertexColors
          transparent
          opacity={0.7}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  );
}

function PortalMesh({ portal }: { portal: Portal }) {
  const ringRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);
  const { mazeSize, platforms, allGemsCollected } = useGameStore();

  const portalColor = COLOR_MAP[portal.color];

  const basePlat = platforms[portal.gridZ]?.[portal.gridX];
  const [baseX, baseY, baseZ] = basePlat
    ? gridToWorld(portal.gridX, portal.gridZ, basePlat.height, mazeSize)
    : [0, 0, 0];

  useFrame((_, delta) => {
    timeRef.current += delta;
    const progress = portal.activationProgress;
    const rotSpeed = portal.rotationSpeed;

    if (ringRef.current) {
      ringRef.current.rotation.z += delta * (0.6 + rotSpeed * 2.8);
      const mat = ringRef.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.4 + progress * 1.6 + Math.sin(timeRef.current * 3) * 0.15;
      mat.opacity = 0.55 + progress * 0.45;
    }
    if (innerRef.current) {
      innerRef.current.rotation.z -= delta * (0.9 + rotSpeed * 3.5);
      const mat = innerRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.15 + progress * 0.5 + Math.sin(timeRef.current * 4) * 0.1;
    }
    if (haloRef.current) {
      haloRef.current.rotation.y += delta * (0.4 + rotSpeed * 1.5);
      const mat = haloRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + progress * 0.28;
    }
    if (beamRef.current && allGemsCollected) {
      const mat = beamRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.35 + Math.sin(timeRef.current * 2.5) * 0.12;
      beamRef.current.visible = true;
    } else if (beamRef.current) {
      beamRef.current.visible = false;
    }
  });

  const endPlat = platforms[mazeSize - 1]?.[mazeSize - 1];
  const [endX, endY, endZ] = endPlat
    ? gridToWorld(endPlat.x, endPlat.z, endPlat.height, mazeSize)
    : [0, 0, 0];

  const portalWorldPos = new THREE.Vector3(baseX, baseY + 1.5, baseZ);
  const endWorldPos = new THREE.Vector3(endX, endY + 3.5, endZ);
  const beamDir = new THREE.Vector3().subVectors(endWorldPos, portalWorldPos);
  const beamLength = beamDir.length();
  const beamMid = new THREE.Vector3()
    .addVectors(portalWorldPos, endWorldPos)
    .multiplyScalar(0.5);
  const beamQuat = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    beamDir.clone().normalize()
  );

  return (
    <>
      <group position={[baseX, baseY + 1.4, baseZ]}>
        <mesh ref={ringRef}>
          <torusGeometry args={[0.72, 0.09, 18, 56]} />
          <meshStandardMaterial
            color={portalColor}
            emissive={portalColor}
            emissiveIntensity={0.8}
            metalness={0.7}
            roughness={0.2}
            transparent
            opacity={0.7}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh ref={innerRef}>
          <circleGeometry args={[0.63, 48]} />
          <meshBasicMaterial
            color={portalColor}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
        <mesh ref={haloRef}>
          <torusGeometry args={[0.92, 0.02, 8, 64]} />
          <meshBasicMaterial
            color={portalColor}
            transparent
            opacity={0.25}
            depthWrite={false}
          />
        </mesh>
        <pointLight
          color={portalColor}
          intensity={0.5 + portal.activationProgress * 1.8}
          distance={6}
          decay={2}
        />
      </group>
      {allGemsCollected && (
        <mesh
          ref={beamRef}
          position={beamMid}
          quaternion={beamQuat}
        >
          <cylinderGeometry args={[0.06, 0.12, beamLength, 10, 1, true]} />
          <meshBasicMaterial
            color={portalColor}
            transparent
            opacity={0.45}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </>
  );
}

function CelebrationBurst() {
  const { celebrationParticles, phase, wonAnimationTime, victoryFlash } = useGameStore();
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<Map<number, THREE.Mesh>>(new Map());
  const { player } = useGameStore();

  useFrame((_, delta) => {
    celebrationParticles.forEach((p) => {
      const mesh = meshRefs.current.get(p.id);
      if (!mesh) return;
      const elapsed = 3 - p.life + wonAnimationTime * 0;
      const t = (3 - p.life) / 3;
      mesh.position.x =
        player.worldX + Math.cos(p.angle) * p.speed * t * 4 + Math.sin(t * 10) * 0.2;
      mesh.position.y =
        player.worldY + t * 6 * p.speed * 0.9 - 4.9 * t * t * 0.8;
      mesh.position.z =
        player.worldZ + Math.sin(p.angle) * p.speed * t * 4 + Math.cos(t * 8) * 0.15;
      mesh.rotation.x += delta * 5;
      mesh.rotation.y += delta * 3;
      const mat = mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, p.life / 2.5);
    });
  });

  if (phase !== 'won' || celebrationParticles.length === 0) return null;

  return (
    <group ref={groupRef}>
      {celebrationParticles.map((p) => (
        <mesh
          key={p.id}
          ref={(el) => {
            if (el) meshRefs.current.set(p.id, el);
          }}
        >
          <tetrahedronGeometry args={[0.1, 0]} />
          <meshBasicMaterial
            color={p.color}
            transparent
            opacity={1}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}
      {victoryFlash > 0.1 && (
        <mesh position={[player.worldX, player.worldY + 2, player.worldZ]}>
          <sphereGeometry args={[victoryFlash * 10, 24, 24]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={Math.min(0.5, victoryFlash * 0.4)}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
}

export default function GemsAndPortals() {
  const { gems, portals } = useGameStore();
  return (
    <>
      {gems.map((gem) => (
        <GemMesh key={gem.id} gem={gem} />
      ))}
      {portals.map((portal) => (
        <PortalMesh key={portal.id} portal={portal} />
      ))}
      <CelebrationBurst />
    </>
  );
}
