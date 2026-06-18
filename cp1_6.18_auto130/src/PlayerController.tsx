import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore, GRID_SCALE, HEIGHT_SCALE, gridToWorld } from './GameCore';

const TRAIL_MAX = 60;

export default function PlayerController() {
  const { player, tryMovePlayer, rotateCamera, cameraAngle, phase, mazeSize, platforms } = useGameStore();
  const { camera } = useThree();

  const playerGroupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const auraRef = useRef<THREE.Mesh>(null);
  const floorGlowRef = useRef<THREE.Mesh>(null);

  const trailPositions = useRef(new Float32Array(TRAIL_MAX * 3));
  const trailColors = useRef(new Float32Array(TRAIL_MAX * 3));
  const trailSizes = useRef(new Float32Array(TRAIL_MAX));
  const trailWriteIdx = useRef(0);
  const trailPointsRef = useRef<THREE.Points>(null);
  const frameCounter = useRef(0);

  const keysPressed = useRef<Record<string, boolean>>({});
  const lastMoveTime = useRef(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const joystickStart = useRef<{ x: number; y: number } | null>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current[e.key.toLowerCase()] = false;
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 2 || e.button === 1) {
        touchStart.current = { x: e.clientX, y: e.clientY };
      }
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (touchStart.current && (e.buttons & 2 || e.buttons & 4)) {
        const dx = e.clientX - touchStart.current.x;
        if (Math.abs(dx) > 3) {
          rotateCamera(dx * 0.004);
          touchStart.current = { x: e.clientX, y: e.clientY };
        }
      }
    };
    const handleMouseUp = () => {
      touchStart.current = null;
    };
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    const handleWheel = (e: WheelEvent) => {
      rotateCamera(e.deltaY * 0.0008);
    };
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('wheel', handleWheel);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [rotateCamera]);

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = t.clientX - rect.left;
    const y = t.clientY - rect.top;
    if (x < rect.width * 0.4 && y > rect.height * 0.5) {
      joystickStart.current = { x: t.clientX, y: t.clientY };
      setJoystickActive(true);
    } else {
      touchStart.current = { x: t.clientX, y: t.clientY };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    if (joystickStart.current) {
      let dx = t.clientX - joystickStart.current.x;
      let dy = t.clientY - joystickStart.current.y;
      const max = 50;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > max) {
        dx = (dx / dist) * max;
        dy = (dy / dist) * max;
      }
      setJoystickPos({ x: dx, y: dy });
      const absX = Math.abs(dx);
      const absY = Math.abs(dy);
      if (absX > 15 || absY > 15) {
        let moveX = 0, moveZ = 0;
        if (absX > absY) moveX = dx > 0 ? 1 : -1;
        else moveZ = dy > 0 ? 1 : -1;
        keysPressed.current['__joy'] = true;
        keysPressed.current['__joyX'] = moveX.toString();
        keysPressed.current['__joyZ'] = moveZ.toString();
      }
    } else if (touchStart.current) {
      const dx = t.clientX - touchStart.current.x;
      if (Math.abs(dx) > 4) {
        rotateCamera(dx * 0.005);
        touchStart.current = { x: t.clientX, y: t.clientY };
      }
    }
  };

  const handleTouchEnd = () => {
    joystickStart.current = null;
    touchStart.current = null;
    setJoystickActive(false);
    setJoystickPos({ x: 0, y: 0 });
    keysPressed.current['__joy'] = false;
  };

  useEffect(() => {
    if (!isTouchDevice) return;
    const el = document.getElementById('joystick-area');
    if (el) {
      el.addEventListener('touchstart', handleTouchStart as unknown as EventListener);
      el.addEventListener('touchmove', handleTouchMove as unknown as EventListener);
      el.addEventListener('touchend', handleTouchEnd as unknown as EventListener);
      return () => {
        el.removeEventListener('touchstart', handleTouchStart as unknown as EventListener);
        el.removeEventListener('touchmove', handleTouchMove as unknown as EventListener);
        el.removeEventListener('touchend', handleTouchEnd as unknown as EventListener);
      };
    }
  }, [isTouchDevice, joystickActive]);

  useFrame((_, delta) => {
    if (playerGroupRef.current) {
      playerGroupRef.current.position.x = player.worldX;
      playerGroupRef.current.position.y = player.worldY;
      playerGroupRef.current.position.z = player.worldZ;
    }

    if (glowRef.current) {
      const material = glowRef.current.material as THREE.MeshStandardMaterial;
      if (player.hitFlash > 0) {
        material.color.set('#ff3355');
        material.emissive.set('#ff2244');
        material.emissiveIntensity = 1.5;
      } else {
        material.color.set('#fff8e7');
        material.emissive.set('#ffcc88');
        material.emissiveIntensity = 0.9 + Math.sin(Date.now() * 0.005) * 0.2;
      }
    }
    if (auraRef.current) {
      auraRef.current.rotation.y += delta * 2.5;
      auraRef.current.rotation.x += delta * 1.3;
      const mat = auraRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.3 + Math.sin(Date.now() * 0.004) * 0.1;
    }
    if (floorGlowRef.current && player.gridZ >= 0 && player.gridX >= 0) {
      const plat = platforms[player.gridZ]?.[player.gridX];
      if (plat) {
        const [fx, fy, fz] = gridToWorld(player.gridX, player.gridZ, plat.height, mazeSize);
        floorGlowRef.current.position.set(fx, fy + HEIGHT_SCALE * 0.42, fz);
        const mat = floorGlowRef.current.material as THREE.MeshBasicMaterial;
        const target = player.isMoving ? 0.75 : 0.45;
        mat.opacity += (target - mat.opacity) * 0.1;
      }
    }

    frameCounter.current++;
    if (trailPointsRef.current && (player.isMoving || frameCounter.current % 2 === 0)) {
      const idx = trailWriteIdx.current % TRAIL_MAX;
      trailPositions.current[idx * 3] = player.worldX;
      trailPositions.current[idx * 3 + 1] = player.worldY - 0.1;
      trailPositions.current[idx * 3 + 2] = player.worldZ;
      const life = 1;
      const c = player.hitFlash > 0 ? 1 : 1;
      trailColors.current[idx * 3] = c;
      trailColors.current[idx * 3 + 1] = c * 0.9;
      trailColors.current[idx * 3 + 2] = player.hitFlash > 0 ? 0.3 : 0.75;
      trailSizes.current[idx] = life;
      trailWriteIdx.current++;
      const geom = trailPointsRef.current.geometry;
      geom.attributes.position.needsUpdate = true;
      geom.attributes.color.needsUpdate = true;
    }

    const camDist = mazeSize * GRID_SCALE * 0.95;
    const camHeight = mazeSize * HEIGHT_SCALE + 9;
    const targetX = player.worldX + Math.sin(cameraAngle) * camDist;
    const targetZ = player.worldZ + Math.cos(cameraAngle) * camDist;
    camera.position.x += (targetX - camera.position.x) * 0.06;
    camera.position.y += (camHeight - camera.position.y) * 0.06;
    camera.position.z += (targetZ - camera.position.z) * 0.06;
    camera.lookAt(player.worldX, player.worldY + 0.2, player.worldZ);

    if (phase === 'playing' && !player.isMoving) {
      lastMoveTime.current += delta;
      if (lastMoveTime.current > 0.14) {
        let dx = 0, dz = 0;
        if (keysPressed.current['w'] || keysPressed.current['arrowup']) dz = -1;
        else if (keysPressed.current['s'] || keysPressed.current['arrowdown']) dz = 1;
        else if (keysPressed.current['a'] || keysPressed.current['arrowleft']) dx = -1;
        else if (keysPressed.current['d'] || keysPressed.current['arrowright']) dx = 1;
        else if (keysPressed.current['q']) { rotateCamera(-0.04); lastMoveTime.current = 0; return; }
        else if (keysPressed.current['e']) { rotateCamera(0.04); lastMoveTime.current = 0; return; }
        else if (keysPressed.current['__joy']) {
          dx = parseInt(keysPressed.current['__joyX'] || '0');
          dz = parseInt(keysPressed.current['__joyZ'] || '0');
        }
        if (dx !== 0 || dz !== 0) {
          tryMovePlayer(dx, dz);
          lastMoveTime.current = 0;
        }
      }
    }
  });

  const trailGeom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(trailPositions.current, 3));
    g.setAttribute('color', new THREE.BufferAttribute(trailColors.current, 3));
    return g;
  }, []);

  return (
    <>
      <group ref={playerGroupRef}>
        <mesh ref={auraRef}>
          <icosahedronGeometry args={[0.72, 1]} />
          <meshBasicMaterial
            color="#ffddaa"
            transparent
            opacity={0.35}
            wireframe
            depthWrite={false}
          />
        </mesh>
        <mesh ref={glowRef} castShadow>
          <sphereGeometry args={[0.38, 32, 32]} />
          <meshStandardMaterial
            color="#fff8e7"
            emissive="#ffcc88"
            emissiveIntensity={1.0}
            roughness={0.15}
            metalness={0.25}
          />
        </mesh>
        <pointLight color="#ffe8c0" intensity={1.4} distance={6} decay={2} />
      </group>
      <mesh ref={floorGlowRef} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[GRID_SCALE * 0.48, 32]} />
        <meshBasicMaterial
          color="#88ccff"
          transparent
          opacity={0.45}
          depthWrite={false}
        />
      </mesh>
      <points ref={trailPointsRef} geometry={trailGeom}>
        <pointsMaterial
          size={0.22}
          vertexColors
          transparent
          opacity={0.75}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      {isTouchDevice && (
        <div
          id="joystick-area"
          style={{
            position: 'fixed',
            left: 0,
            bottom: 0,
            width: '40vw',
            height: '50vh',
            zIndex: 50,
            touchAction: 'none',
            pointerEvents: 'auto',
          }}
        >
          {joystickActive && (
            <>
              <div
                style={{
                  position: 'absolute',
                  left: joystickStart.current
                    ? joystickStart.current.x - window.innerWidth * 0
                    : 0,
                  bottom: joystickStart.current
                    ? window.innerHeight - joystickStart.current.y
                    : 0,
                  width: 110,
                  height: 110,
                  marginLeft: -55,
                  marginBottom: -55,
                  borderRadius: '50%',
                  border: '3px solid rgba(100,200,255,0.5)',
                  background: 'rgba(20,40,80,0.35)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: (joystickStart.current?.x || 0) + joystickPos.x,
                  bottom: window.innerHeight - (joystickStart.current?.y || 0) - joystickPos.y,
                  width: 50,
                  height: 50,
                  marginLeft: -25,
                  marginBottom: -25,
                  borderRadius: '50%',
                  background: 'rgba(120,200,255,0.7)',
                  boxShadow: '0 0 15px rgba(120,200,255,0.9)',
                  pointerEvents: 'none',
                }}
              />
            </>
          )}
        </div>
      )}
    </>
  );
}
