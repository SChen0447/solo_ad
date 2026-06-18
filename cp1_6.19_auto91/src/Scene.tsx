import { useRef, useEffect, useCallback, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from './store';
import {
  useParticleAnimation,
  ParticleMesh,
  StarField,
  ConnectionLines,
  OrbitingParticles,
  CoreSphere,
  DrawPath
} from './particleSystem';

const MAX_PARTICLES = 2000;

function SceneContent() {
  const { camera, gl } = useThree();
  const planeRef = useRef<THREE.Plane>(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0));
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());
  const isDrawingRef = useRef(false);
  
  const poemGroups = useStore(state => state.poemGroups);
  const currentPath = useStore(state => state.currentPath);
  const isDrawing = useStore(state => state.isDrawing);
  const isFusing = useStore(state => state.isFusing);
  const coreSphere = useStore(state => state.coreSphere);
  const orbitingParticles = useStore(state => state.orbitingParticles);
  const connectionLines = useStore(state => state.connectionLines);
  const cameraPosition = useStore(state => state.cameraPosition);
  const cameraTarget = useStore(state => state.cameraTarget);
  
  const startDrawing = useStore(state => state.startDrawing);
  const addDrawPoint = useStore(state => state.addDrawPoint);
  const finishDrawing = useStore(state => state.finishDrawing);
  const cancelDrawing = useStore(state => state.cancelDrawing);
  const selectParticle = useStore(state => state.selectParticle);
  const initializeDefaultPoems = useStore(state => state.initializeDefaultPoems);
  
  useParticleAnimation();
  
  useEffect(() => {
    initializeDefaultPoems();
  }, [initializeDefaultPoems]);
  
  useEffect(() => {
    camera.position.copy(cameraPosition);
    camera.lookAt(cameraTarget);
  }, [cameraPosition, cameraTarget, camera]);
  
  const get3DPosition = useCallback((clientX: number, clientY: number): THREE.Vector3 => {
    const rect = gl.domElement.getBoundingClientRect();
    mouseRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    
    raycasterRef.current.setFromCamera(mouseRef.current, camera);
    
    const targetZ = 0;
    const direction = raycasterRef.current.ray.direction.clone();
    const origin = raycasterRef.current.ray.origin.clone();
    
    if (Math.abs(direction.z) > 0.0001) {
      const t = (targetZ - origin.z) / direction.z;
      if (t > 0) {
        return origin.add(direction.multiplyScalar(t));
      }
    }
    
    const point = new THREE.Vector3();
    raycasterRef.current.ray.intersectPlane(planeRef.current, point);
    return point;
  }, [camera, gl]);
  
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (isFusing) return;
    
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;
    
    isDrawingRef.current = true;
    const pos = get3DPosition(e.clientX, e.clientY);
    startDrawing(pos);
  }, [get3DPosition, startDrawing, isFusing]);
  
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDrawingRef.current || isFusing) return;
    
    const pos = get3DPosition(e.clientX, e.clientY);
    addDrawPoint(pos);
  }, [get3DPosition, addDrawPoint, isFusing]);
  
  const handlePointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    
    isDrawingRef.current = false;
    
    if (isDrawing) {
      finishDrawing();
    }
  }, [isDrawing, finishDrawing]);
  
  const handlePointerLeave = useCallback(() => {
    if (isDrawingRef.current && isDrawing) {
      cancelDrawing();
    }
    isDrawingRef.current = false;
  }, [isDrawing, cancelDrawing]);
  
  const allParticles = useMemo(() => {
    let particles: any[] = [];
    for (const group of poemGroups) {
      if (particles.length + group.particles.length > MAX_PARTICLES) {
        break;
      }
      particles = particles.concat(group.particles);
    }
    return particles;
  }, [poemGroups]);
  
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 12]} fov={60} />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={!isDrawing}
        minDistance={5}
        maxDistance={30}
        enabled={!isDrawing}
      />
      
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={0.6} />
      <pointLight position={[-10, -10, -5]} intensity={0.3} color="#4fc3f7" />
      
      <StarField />
      
      <group
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerLeave}
      >
        <mesh visible={false}>
          <planeGeometry args={[100, 100]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        
        {currentPath.length > 0 && (
          <DrawPath points={currentPath} />
        )}
      </group>
      
      {allParticles.length > 0 && (
        <ParticleMesh
          key="poem-particles"
          particles={allParticles}
          onParticleClick={selectParticle}
        />
      )}
      
      {connectionLines.length > 0 && (
        <ConnectionLines lines={connectionLines} />
      )}
      
      {orbitingParticles.length > 0 && (
        <OrbitingParticles particles={orbitingParticles} />
      )}
      
      {coreSphere && (
        <CoreSphere rotation={coreSphere.rotation} />
      )}
    </>
  );
}

export default function Scene() {
  return (
    <Canvas
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      performance={{ min: 0.5 }}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'linear-gradient(135deg, #0a0e27 0%, #1a0a2e 100%)'
      }}
    >
      <fog attach="fog" args={['#0a0e27', 10, 50]} />
      <color attach="background" args={['#0a0e27']} />
      <SceneContent />
    </Canvas>
  );
}
