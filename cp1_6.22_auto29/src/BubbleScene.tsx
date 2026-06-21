import { useRef, useMemo, useEffect, useState, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import { CityEvent, ColorMap, Annotation, HoveredBubbleInfo } from './types';
import { latLngToVector3, getMonthIndex, scaleEventCount } from './utils/geoUtils';

interface BubbleMeshProps {
  event: CityEvent;
  position: { x: number; y: number; z: number };
  color: string;
  baseSize: number;
  isVisible: boolean;
  isDimmed: boolean;
  onHover: (info: HoveredBubbleInfo | null) => void;
}

function BubbleMesh({
  event,
  position,
  color,
  baseSize,
  isVisible,
  isDimmed,
  onHover,
}: BubbleMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const targetOpacity = useRef(isVisible ? (isDimmed ? 0.2 : 1) : 0.2);
  const currentOpacity = useRef(targetOpacity.current);
  const targetScale = useRef(baseSize);
  const currentScale = useRef(baseSize);
  const { camera, size } = useThree();
  const initialY = useRef(position.y);

  useEffect(() => {
    targetOpacity.current = isVisible ? (isDimmed ? 0.2 : 1) : 0.2;
  }, [isVisible, isDimmed]);

  useEffect(() => {
    targetScale.current = hovered ? baseSize * 1.2 : baseSize;
  }, [hovered, baseSize]);

  useFrame((state) => {
    const diffOpacity = targetOpacity.current - currentOpacity.current;
    if (Math.abs(diffOpacity) > 0.001) {
      currentOpacity.current += diffOpacity * 0.08;
      if (meshRef.current) {
        const mat = meshRef.current.material as THREE.MeshStandardMaterial;
        mat.opacity = currentOpacity.current;
        mat.transparent = true;
      }
      if (glowRef.current) {
        const glowMat = glowRef.current.material as THREE.MeshBasicMaterial;
        glowMat.opacity = hovered ? currentOpacity.current * 0.5 : 0;
        glowMat.transparent = true;
      }
    }

    const diffScale = targetScale.current - currentScale.current;
    if (Math.abs(diffScale) > 0.001) {
      currentScale.current += diffScale * 0.12;
      const s = currentScale.current;
      if (meshRef.current) {
        meshRef.current.scale.set(s, s, s);
      }
      if (glowRef.current) {
        glowRef.current.scale.set(s * 1.5, s * 1.5, s * 1.5);
      }
    }

    if (hovered && meshRef.current) {
      meshRef.current.position.y = initialY.current + Math.sin(state.clock.elapsedTime * 2) * 0.08;
    } else if (meshRef.current) {
      meshRef.current.position.y = initialY.current;
    }
  });

  const handlePointerOver = useCallback(() => {
    setHovered(true);
    document.body.style.cursor = 'pointer';
    if (meshRef.current) {
      const vec = new THREE.Vector3(position.x, position.y, position.z);
      vec.project(camera);
      const x = (vec.x * 0.5 + 0.5) * size.width;
      const y = (-vec.y * 0.5 + 0.5) * size.height;
      onHover({
        event,
        screenPosition: { x, y },
      });
    }
  }, [event, position, camera, size, onHover]);

  const handlePointerOut = useCallback(() => {
    setHovered(false);
    document.body.style.cursor = 'auto';
    onHover(null);
  }, [onHover]);

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh
        ref={meshRef}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[1, 24, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered ? 0.4 : 0.15}
          transparent
          opacity={currentOpacity.current}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>
      <mesh ref={glowRef}>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

interface AnnotationLabelProps {
  annotation: Annotation;
}

function AnnotationLabel({ annotation }: AnnotationLabelProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  return (
    <Html
      position={[annotation.position.x, annotation.position.y, annotation.position.z]}
      center
      distanceFactor={10}
      style={{ pointerEvents: 'auto' }}
    >
      <div
        onMouseDown={(e) => {
          setDragging(true);
          const startX = e.clientX;
          const startY = e.clientY;
          const startOffsetX = offset.x;
          const startOffsetY = offset.y;
          const onMove = (ev: MouseEvent) => {
            if (dragging) {
              setOffset({
                x: startOffsetX + (ev.clientX - startX),
                y: startOffsetY + (ev.clientY - startY),
              });
            }
          };
          const onUp = () => {
            setDragging(false);
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        }}
        style={{
          background: 'rgba(255, 255, 255, 0.85)',
          color: '#1a1a1a',
          padding: '6px 12px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: dragging ? 'grabbing' : 'grab',
          boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
          whiteSpace: 'nowrap',
          transform: `translate(${offset.x}px, ${offset.y}px)`,
          userSelect: 'none',
        }}
      >
        {annotation.text}
      </div>
    </Html>
  );
}

interface SceneContentProps {
  data: CityEvent[];
  timeRange: number;
  colorMap: ColorMap;
  annotations: Annotation[];
  onBubbleHover: (info: HoveredBubbleInfo | null) => void;
  controlsRef: React.MutableRefObject<any>;
}

function SceneContent({
  data,
  timeRange,
  colorMap,
  annotations,
  onBubbleHover,
  controlsRef,
}: SceneContentProps) {
  const bubbleData = useMemo(() => {
    return data.map((evt) => ({
      event: evt,
      position: latLngToVector3(evt.latitude, evt.longitude),
      monthIndex: getMonthIndex(evt.timestamp),
      baseSize: scaleEventCount(evt.eventCount),
    }));
  }, [data]);

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[10, 10, 5]} intensity={0.8} />
      <pointLight position={[-10, -10, -5]} intensity={0.3} />

      <mesh>
        <sphereGeometry args={[7.95, 64, 64]} />
        <meshStandardMaterial
          color="#1a1a3a"
          transparent
          opacity={0.6}
          wireframe={false}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[7.97, 48, 48]} />
        <meshBasicMaterial
          color="#48cae4"
          transparent
          opacity={0.06}
          wireframe
        />
      </mesh>

      {bubbleData.map(({ event, position, monthIndex, baseSize }) => {
        const isVisible = monthIndex === timeRange;
        return (
          <BubbleMesh
            key={event.id}
            event={event}
            position={position}
            color={colorMap[event.eventType]}
            baseSize={baseSize}
            isVisible={isVisible}
            isDimmed={!isVisible}
            onHover={onBubbleHover}
          />
        );
      })}

      {annotations.map((ann) => (
        <AnnotationLabel key={ann.id} annotation={ann} />
      ))}

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        minDistance={10}
        maxDistance={30}
        enableDamping
        dampingFactor={0.08}
      />
    </>
  );
}

interface BubbleSceneProps {
  data: CityEvent[];
  timeRange: number;
  colorMap: ColorMap;
  annotations: Annotation[];
  onBubbleHover: (info: HoveredBubbleInfo | null) => void;
  resetTrigger: number;
}

export default function BubbleScene({
  data,
  timeRange,
  colorMap,
  annotations,
  onBubbleHover,
  resetTrigger,
}: BubbleSceneProps) {
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current && resetTrigger > 0) {
      const controls = controlsRef.current;
      controls.reset();
      if (controls.object) {
        controls.object.position.set(0, 0, 15);
        controls.object.lookAt(0, 0, 0);
      }
      controls.update();
    }
  }, [resetTrigger]);

  return (
    <Canvas
      camera={{ position: [0, 0, 15], fov: 60, near: 0.1, far: 1000 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
      onCreated={({ gl }) => {
        gl.setClearColor('#0a0a1a');
      }}
    >
      <SceneContent
        data={data}
        timeRange={timeRange}
        colorMap={colorMap}
        annotations={annotations}
        onBubbleHover={onBubbleHover}
        controlsRef={controlsRef}
      />
    </Canvas>
  );
}
