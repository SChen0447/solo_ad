import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Stars, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useStore, useCurrentMolecule, useLayerPeelProgress } from '@/store/useStore';
import {
  AtomData,
  BondData,
  LayerData,
  CPK_COLORS,
  ATOMIC_RADII,
  getLayerByAtomId,
  getAtomById,
  getAdjacentAtoms,
  calculateBondLength,
  ELEMENT_NAMES,
} from '@/data/molecules';
import {
  calculatePeelPosition,
  calculateBondPosition,
  ParticleSystem,
  hexToRgb,
  easeInOutCubic,
} from '@/utils/animation';

interface AtomProps {
  atom: AtomData;
  position: [number, number, number];
  opacity: number;
  isPeeled: boolean;
  isSelected: boolean;
  onClick: (e: any) => void;
  onDoubleClick: (e: any) => void;
  showLabel: boolean;
  autoRotate: boolean;
}

function Atom({
  atom,
  position,
  opacity,
  isPeeled,
  isSelected,
  onClick,
  onDoubleClick,
  showLabel,
  autoRotate,
}: AtomProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const color = CPK_COLORS[atom.element];
  const radius = ATOMIC_RADII[atom.element];

  useFrame((_, delta) => {
    if (meshRef.current && autoRotate) {
      meshRef.current.rotation.y += delta * Math.PI;
    }
    if (glowRef.current) {
      const scale = 1 + Math.sin(Date.now() * 0.002) * 0.05;
      glowRef.current.scale.set(scale, scale, scale);
    }
  });

  const labelPosition: [number, number, number] = [
    position[0],
    position[1] + radius + 0.3,
    position[2],
  ];

  return (
    <group position={position}>
      <mesh
        ref={glowRef}
        scale={1.15}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={opacity * 0.3}
          side={THREE.BackSide}
        />
      </mesh>

      <mesh
        ref={meshRef}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[radius, 32, 32]} />
        <meshPhongMaterial
          color={color}
          transparent
          opacity={opacity}
          shininess={80}
          specular="#ffffff"
          emissive={color}
          emissiveIntensity={isSelected ? 0.3 : 0.1}
        />
      </mesh>

      {showLabel && (
        <Html
          position={labelPosition}
          center
          distanceFactor={8}
          zIndexRange={[100, 0]}
        >
          <div
            style={{
              padding: '4px 10px',
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              color: '#333',
              fontSize: '12px',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
              pointerEvents: 'none',
            }}
          >
            <span style={{ color: color, fontWeight: 700 }}>{atom.element}</span>
            <span style={{ marginLeft: '4px', fontSize: '11px', color: '#666' }}>
              {ELEMENT_NAMES[atom.element]}
            </span>
          </div>
        </Html>
      )}
    </group>
  );
}

interface BondProps {
  bond: BondData;
  atom1Pos: [number, number, number];
  atom2Pos: [number, number, number];
  opacity: number;
  color: string;
}

function Bond({ atom1Pos, atom2Pos, opacity, color }: BondProps) {
  const { position, rotation, length } = calculateBondPosition(atom1Pos, atom2Pos);
  const radius = 0.1;

  return (
    <mesh position={position} rotation={rotation}>
      <cylinderGeometry args={[radius, radius, length, 12]} />
      <meshPhongMaterial
        color={color}
        transparent
        opacity={opacity}
        shininess={60}
      />
    </mesh>
  );
}

interface OrbitRingProps {
  radius: number;
  opacity: number;
  visible: boolean;
}

function OrbitRing({ radius, opacity, visible }: OrbitRingProps) {
  const points = useMemo(() => {
    const pts: [number, number, number][] = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      pts.push([
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius,
      ]);
    }
    return pts;
  }, [radius]);

  if (!visible) return null;

  return (
    <Line
      points={points}
      color="#6bb6ff"
      transparent
      opacity={opacity * 0.5}
      lineWidth={1}
    />
  );
}

interface ParticleTrailProps {
  particles: {
    id: number;
    position: [number, number, number];
    color: string;
    life: number;
    size: number;
  }[];
}

function ParticleTrail({ particles }: ParticleTrailProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    if (!meshRef.current) return;
    
    particles.forEach((particle, i) => {
      if (i >= 200) return;
      dummy.position.set(...particle.position);
      const scale = particle.size * particle.life;
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      
      const rgb = hexToRgb(particle.color);
      const color = new THREE.Color(rgb.r, rgb.g, rgb.b);
      meshRef.current!.setColorAt(i, color);
    });
    
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [particles]);

  if (particles.length === 0) return null;

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, Math.min(particles.length, 200)]}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshBasicMaterial transparent opacity={0.8} />
    </instancedMesh>
  );
}

interface AtomInfoLabelProps {
  atom: AtomData;
  position: [number, number, number];
  molecule: ReturnType<typeof useCurrentMolecule>;
}

function AtomInfoLabel({ atom, position, molecule }: AtomInfoLabelProps) {
  const layer = getLayerByAtomId(molecule, atom.id);
  const adjacent = getAdjacentAtoms(molecule, atom.id);

  const labelPos: [number, number, number] = [
    position[0] + 0.5,
    position[1] + 0.5,
    position[2] + 0.5,
  ];

  return (
    <Html
      position={labelPos}
      distanceFactor={6}
      zIndexRange={[200, 0]}
    >
      <div
        style={{
          padding: '12px 16px',
          background: 'rgba(10, 14, 26, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(107, 182, 255, 0.3)',
          color: '#fff',
          fontSize: '13px',
          minWidth: '180px',
          pointerEvents: 'none',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: CPK_COLORS[atom.element],
              boxShadow: `0 0 8px ${CPK_COLORS[atom.element]}`,
            }}
          />
          <span style={{ fontWeight: 700, fontSize: '15px' }}>
            {atom.element} - {ELEMENT_NAMES[atom.element]}原子
          </span>
        </div>
        <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '4px' }}>
          所在层：<span style={{ color: '#6bb6ff' }}>{layer?.name || '未知'}</span>
        </div>
        {adjacent.length > 0 && (
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
            相邻原子：
            {adjacent.map((a, i) => (
              <span key={a.id} style={{ color: '#6bb6ff' }}>
                {a.element}
                <span style={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                  ({calculateBondLength(atom, a).toFixed(2)}Å)
                </span>
                {i < adjacent.length - 1 ? ', ' : ''}
              </span>
            ))}
          </div>
        )}
        <div style={{ position: 'absolute', left: '-6px', top: '14px', width: '12px', height: '12px', background: 'rgba(10, 14, 26, 0.9)', borderLeft: '1px solid rgba(107, 182, 255, 0.3)', borderBottom: '1px solid rgba(107, 182, 255, 0.3)', transform: 'rotate(45deg)' }} />
      </div>
    </Html>
  );
}

export function Scene() {
  const molecule = useCurrentMolecule();
  const atomOpacity = useStore(state => state.atomOpacity);
  const peelSpeed = useStore(state => state.peelSpeed);
  const selectedAtomId = useStore(state => state.selectedAtomId);
  const backgroundColor = useStore(state => state.backgroundColor);
  const toggleLayerPeel = useStore(state => state.toggleLayerPeel);
  const updatePeelProgress = useStore(state => state.updatePeelProgress);
  const finishPeelAnimation = useStore(state => state.finishPeelAnimation);
  const setSelectedAtom = useStore(state => state.setSelectedAtom);
  const peeledLayers = useStore(state => state.peeledLayers);

  const controlsRef = useRef<any>(null);
  const { camera } = useThree();
  
  const particleSystemRef = useRef<ParticleSystem>(new ParticleSystem(200));
  const [particles, setParticles] = useState<{ id: number; position: [number, number, number]; color: string; life: number; size: number }[]>([]);
  
  const lastEmitTimeRef = useRef<Record<string, number>>({});

  const getAtomPosition = useCallback((atomId: string): [number, number, number] => {
    const atom = getAtomById(molecule, atomId);
    if (!atom) return [0, 0, 0];

    const layer = getLayerByAtomId(molecule, atomId);
    if (!layer) return atom.position;

    const peelState = peeledLayers.find(p => p.layerId === layer.id);
    if (!peelState || peelState.progress <= 0) {
      return atom.position;
    }

    const atomIndex = layer.atomIds.indexOf(atomId);
    return calculatePeelPosition(
      atom.position,
      molecule.center,
      layer.peelRadius,
      layer.peelAngle,
      peelState.progress,
      atomIndex,
      layer.atomIds.length
    );
  }, [molecule, peeledLayers]);

  const isAtomPeeled = useCallback((atomId: string): boolean => {
    const layer = getLayerByAtomId(molecule, atomId);
    if (!layer) return false;
    const peelState = peeledLayers.find(p => p.layerId === layer.id);
    return peelState ? peelState.progress >= 1 : false;
  }, [molecule, peeledLayers]);

  const getAtomOpacity = useCallback((atomId: string): number => {
    const layer = getLayerByAtomId(molecule, atomId);
    if (!layer) return atomOpacity;
    
    const peelState = peeledLayers.find(p => p.layerId === layer.id);
    if (!peelState || peelState.progress <= 0) {
      const hasPeeledLayer = peeledLayers.some(p => p.progress > 0);
      return hasPeeledLayer ? 0.2 : atomOpacity;
    }
    
    return atomOpacity * (0.8 + peelState.progress * 0.2);
  }, [molecule, peeledLayers, atomOpacity]);

  const getBondOpacity = useCallback((bondId: string): number => {
    const bond = molecule.bonds.find(b => b.id === bondId);
    if (!bond) return atomOpacity;

    const layer1 = getLayerByAtomId(molecule, bond.atom1Id);
    const layer2 = getLayerByAtomId(molecule, bond.atom2Id);
    
    if (layer1?.id === layer2?.id) {
      const peelState = peeledLayers.find(p => p.layerId === layer1?.id);
      if (peelState && peelState.progress > 0) {
        return atomOpacity * (0.7 + peelState.progress * 0.3);
      }
    }

    const hasPeeledLayer = peeledLayers.some(p => p.progress > 0);
    return hasPeeledLayer ? 0.15 : atomOpacity * 0.8;
  }, [molecule, peeledLayers, atomOpacity]);

  const getBondColor = useCallback((bondId: string): string => {
    const bond = molecule.bonds.find(b => b.id === bondId);
    if (!bond) return '#888888';

    const atom1 = getAtomById(molecule, bond.atom1Id);
    const atom2 = getAtomById(molecule, bond.atom2Id);
    
    if (atom1 && atom2) {
      return CPK_COLORS[atom1.element];
    }
    return '#888888';
  }, [molecule]);

  useFrame((_, delta) => {
    peeledLayers.forEach(peelState => {
      if (!peelState.isAnimating) return;

      const animationDuration = 1.2 / peelSpeed;
      const progressDelta = delta / animationDuration;
      
      let newProgress = peelState.direction === 'peel'
        ? peelState.progress + progressDelta
        : peelState.progress - progressDelta;

      if (peelState.direction === 'peel' && newProgress >= 1) {
        newProgress = 1;
        finishPeelAnimation(peelState.layerId);
      } else if (peelState.direction === 'recombine' && newProgress <= 0) {
        newProgress = 0;
        finishPeelAnimation(peelState.layerId);
      } else {
        updatePeelProgress(peelState.layerId, newProgress);
      }

      const now = Date.now();
      const lastEmit = lastEmitTimeRef.current[peelState.layerId] || 0;
      if (now - lastEmit > 30 && newProgress > 0 && newProgress < 1) {
        lastEmitTimeRef.current[peelState.layerId] = now;
        
        const layer = molecule.layers.find(l => l.id === peelState.layerId);
        if (layer) {
          layer.atomIds.forEach((atomId, idx) => {
            const pos = getAtomPosition(atomId);
            const atom = getAtomById(molecule, atomId);
            if (atom) {
              particleSystemRef.current.emit(
                pos,
                CPK_COLORS[atom.element],
                1,
                0.01
              );
            }
          });
        }
      }
    });

    particleSystemRef.current.update(delta);
    setParticles(particleSystemRef.current.getParticles());
  });

  const handleAtomClick = useCallback((atom: AtomData) => {
    const layer = getLayerByAtomId(molecule, atom.id);
    if (layer) {
      toggleLayerPeel(layer.id);
    }
  }, [molecule, toggleLayerPeel]);

  const handleAtomDoubleClick = useCallback((atom: AtomData) => {
    setSelectedAtom(atom.id);
    
    const pos = getAtomPosition(atom.id);
    const targetPos = new THREE.Vector3(pos[0], pos[1], pos[2]);
    
    if (controlsRef.current) {
      controlsRef.current.target.copy(targetPos);
      controlsRef.current.update();
    }
  }, [molecule, getAtomPosition, setSelectedAtom]);

  const handleBackgroundClick = useCallback(() => {
    setSelectedAtom(null);
  }, [setSelectedAtom]);

  const bgColor = useMemo(() => {
    switch (backgroundColor) {
      case 'deep-space': return '#0a0e1a';
      case 'research-white': return '#f5f7fa';
      case 'pure-black': return '#000000';
      default: return '#0a0e1a';
    }
  }, [backgroundColor]);

  const selectedAtom = selectedAtomId ? getAtomById(molecule, selectedAtomId) : null;
  const selectedAtomPosition = selectedAtomId ? getAtomPosition(selectedAtomId) : null;

  const showStars = backgroundColor === 'deep-space' || backgroundColor === 'pure-black';

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 5, 5]} intensity={0.8} castShadow />
      <directionalLight position={[-5, -3, -5]} intensity={0.3} color="#6bb6ff" />
      <pointLight position={[0, 3, 0]} intensity={0.5} color="#ffffff" />

      {showStars && <Stars radius={100} depth={50} count={1000} factor={4} saturation={0} fade speed={0.5} />}

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={30}
        enablePan={true}
      />

      <group onClick={handleBackgroundClick}>
        {molecule.layers.map(layer => {
          const peelProgress = useLayerPeelProgress(layer.id);
          const isPeeled = peelProgress >= 1;
          
          return (
            <OrbitRing
              key={`orbit-${layer.id}`}
              radius={layer.peelRadius}
              opacity={0.6}
              visible={isPeeled || peelProgress > 0}
            />
          );
        })}

        {molecule.bonds.map(bond => {
          const atom1Pos = getAtomPosition(bond.atom1Id);
          const atom2Pos = getAtomPosition(bond.atom2Id);
          const opacity = getBondOpacity(bond.id);
          const color = getBondColor(bond.id);

          return (
            <Bond
              key={bond.id}
              bond={bond}
              atom1Pos={atom1Pos}
              atom2Pos={atom2Pos}
              opacity={opacity}
              color={color}
            />
          );
        })}

        {molecule.atoms.map(atom => {
          const position = getAtomPosition(atom.id);
          const opacity = getAtomOpacity(atom.id);
          const isPeeled = isAtomPeeled(atom.id);
          const isSelected = selectedAtomId === atom.id;
          const showLabel = isPeeled || isSelected;
          const autoRotate = !isPeeled;

          return (
            <Atom
              key={atom.id}
              atom={atom}
              position={position}
              opacity={opacity}
              isPeeled={isPeeled}
              isSelected={isSelected}
              showLabel={showLabel}
              autoRotate={autoRotate}
              onClick={(e) => {
                e.stopPropagation();
                handleAtomClick(atom);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                handleAtomDoubleClick(atom);
              }}
            />
          );
        })}

        {selectedAtom && selectedAtomPosition && (
          <AtomInfoLabel
            atom={selectedAtom}
            position={selectedAtomPosition}
            molecule={molecule}
          />
        )}

        <ParticleTrail particles={particles} />
      </group>
    </>
  );
}
