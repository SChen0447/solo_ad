import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { StarLayerData, StarData } from '@/modules/starPhysics';
import { useStore } from '@/store';

interface StarLayerProps {
  starData: StarData;
  layerIndex: number;
  layer: StarLayerData;
  starPosition: [number, number, number];
}

function formatNumber(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1) + 'G';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  if (n < 0.01) return n.toExponential(1);
  return n.toFixed(2);
}

export default function StarLayer({ starData, layerIndex, layer, starPosition }: StarLayerProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const simulationEnabled = useStore((s) => s.simulationEnabled);
  const highlightedLayer = useStore((s) => s.highlightedLayer);
  const highlightedStarId = useStore((s) => s.highlightedStarId);
  const setHighlightedLayer = useStore((s) => s.setHighlightedLayer);
  const rotationSpeed = useStore((s) => s.rotationSpeed);

  const isHighlighted = hovered || (highlightedLayer === layer.name && highlightedStarId === starData.id);

  const baseOpacity = useMemo(() => {
    const opacities = [0.6, 0.35, 0.25, 0.18];
    return opacities[layerIndex] ?? 0.3;
  }, [layerIndex]);

  const opacity = isHighlighted ? Math.min(baseOpacity + 0.35, 0.95) : baseOpacity;

  const radius = layer.radiusFraction * starData.displayRadius;
  const prevRadius = layerIndex > 0
    ? starData.layers[layerIndex - 1].radiusFraction * starData.displayRadius
    : 0;

  const layerColor = useMemo(() => new THREE.Color(layer.color), [layer.color]);
  const emissiveColor = useMemo(() => new THREE.Color(layer.emissiveColor), [layer.emissiveColor]);

  useFrame((_, delta) => {
    if (!meshRef.current || !simulationEnabled) return;
    const speed = 0.628 * rotationSpeed;
    meshRef.current.rotation.y += delta * speed * (1 - layerIndex * 0.15);

    if (layerIndex === 0) {
      const pulse = 1 + Math.sin(Date.now() * 0.001) * 0.015 * rotationSpeed;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  const handlePointerOver = (e: THREE.Event) => {
    e.stopPropagation();
    setHovered(true);
    setHighlightedLayer(starData.id, layer.name);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = () => {
    setHovered(false);
    setHighlightedLayer(null, null);
    document.body.style.cursor = 'default';
  };

  return (
    <group position={starPosition}>
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[radius, 48, 48]} />
        <meshPhysicalMaterial
          color={layerColor}
          emissive={emissiveColor}
          emissiveIntensity={isHighlighted ? 0.8 : 0.3}
          transparent
          opacity={opacity}
          side={THREE.FrontSide}
          depthWrite={false}
          roughness={0.4}
          metalness={0.1}
          clearcoat={0.3}
        />
      </mesh>

      {prevRadius > 0 && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[prevRadius - 0.02, prevRadius + 0.02, 64]} />
          <meshBasicMaterial
            color="#88ccff"
            transparent
            opacity={isHighlighted ? 0.6 : 0.15}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      )}

      {isHighlighted && (
        <group position={[radius + 0.4, 0.3, 0]}>
          <sprite scale={[2.8, 1.8, 1]}>
            <spriteMaterial transparent opacity={0} />
          </sprite>
          <HtmlContent
            layer={layer}
            starName={starData.name}
          />
        </group>
      )}
    </group>
  );
}

function HtmlContent({ layer, starName }: { layer: StarLayerData; starName: string }) {
  const compositionText = layer.composition
    .map((c) => `${c.element} ${c.percentage}%`)
    .join('  ');

  return (
    <div
      style={{
        background: 'rgba(10, 15, 35, 0.88)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(0, 212, 255, 0.3)',
        borderRadius: '8px',
        padding: '10px 14px',
        color: '#e0e8f8',
        fontSize: '12px',
        fontFamily: "'Source Sans 3', sans-serif",
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        minWidth: '180px',
        boxShadow: '0 0 20px rgba(0, 212, 255, 0.15), inset 0 0 15px rgba(0, 212, 255, 0.05)',
      }}
    >
      <div style={{
        fontFamily: "'Orbitron', sans-serif",
        fontSize: '11px',
        fontWeight: 600,
        color: '#00d4ff',
        marginBottom: '6px',
        letterSpacing: '0.5px',
      }}>
        {starName} · {layer.name}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8899bb' }}>温度</span>
          <span style={{ color: '#ffaa44' }}>{formatNumber(layer.temperature)} K</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8899bb' }}>密度</span>
          <span style={{ color: '#88ddff' }}>{formatNumber(layer.density)} g/cm³</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ color: '#8899bb' }}>成分</span>
          <span style={{ color: '#ccccff', fontSize: '11px' }}>{compositionText}</span>
        </div>
      </div>
    </div>
  );
}
