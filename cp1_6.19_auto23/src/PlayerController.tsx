import { useRef, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMazeStore } from './store';
import { checkCollision, isAtExit, MAZE_SIZE, CELL_SIZE } from './MazeGenerator';

const MOVE_SPEED = 4;
const TURN_SPEED = 2.5;
const PLAYER_HEIGHT = 2;

interface Keys {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
}

export function PlayerController() {
  const { camera } = useThree();
  const keys = useRef<Keys>({ w: false, a: false, s: false, d: false });
  const yaw = useRef(0);
  const position = useRef(new THREE.Vector3(0, PLAYER_HEIGHT, 0));
  const velocity = useRef(new THREE.Vector3());

  const beams = useMazeStore((state) => state.beams);
  const updatePlayerPosition = useMazeStore((state) => state.updatePlayerPosition);
  const updateAnimation = useMazeStore((state) => state.updateAnimation);
  const isComplete = useMazeStore((state) => state.isComplete);
  const setComplete = useMazeStore((state) => state.setComplete);
  const resetPlayer = useMazeStore((state) => state.resetPlayer);
  const isTransitioning = useMazeStore((state) => state.animation.isTransitioning);
  const time = useMazeStore((state) => state.time);
  const startMazeTransition = useMazeStore((state) => state.startMazeTransition);
  const lastMazeRegenTime = useMazeStore((state) => state.lastMazeRegenTime);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key as keyof Keys] = true;
      }

      if (isComplete) {
        setComplete(false);
        resetPlayer();
        position.current.set(0, PLAYER_HEIGHT, 0);
        yaw.current = 0;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key in keys.current) {
        keys.current[key as keyof Keys] = false;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('wheel', handleWheel, { passive: false });

    camera.position.set(0, PLAYER_HEIGHT, 0);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [camera, isComplete, setComplete, resetPlayer]);

  useEffect(() => {
    const playerState = useMazeStore.getState().player;
    position.current.set(playerState.position.x, PLAYER_HEIGHT, playerState.position.z);
    yaw.current = playerState.yaw;
  }, []);

  useFrame((_, delta) => {
    updateAnimation(delta);

    if (time - lastMazeRegenTime >= 60 && !isTransitioning && !isComplete) {
      startMazeTransition();
    }

    if (isComplete || isTransitioning) {
      camera.position.copy(position.current);
      const lookDir = new THREE.Vector3(
        Math.sin(yaw.current),
        0,
        Math.cos(yaw.current)
      );
      camera.lookAt(position.current.clone().add(lookDir));
      return;
    }

    const clampedDelta = Math.min(delta, 0.05);

    if (keys.current.a) {
      yaw.current += TURN_SPEED * clampedDelta;
    }
    if (keys.current.d) {
      yaw.current -= TURN_SPEED * clampedDelta;
    }

    const forward = new THREE.Vector3(
      Math.sin(yaw.current),
      0,
      Math.cos(yaw.current)
    );

    velocity.current.set(0, 0, 0);

    if (keys.current.w) {
      velocity.current.add(forward.clone().multiplyScalar(MOVE_SPEED));
    }
    if (keys.current.s) {
      velocity.current.add(forward.clone().multiplyScalar(-MOVE_SPEED));
    }

    const newPos = position.current
      .clone()
      .add(velocity.current.clone().multiplyScalar(clampedDelta));

    const minX = 0.5;
    const maxX = (MAZE_SIZE - 1) * CELL_SIZE - 0.5;
    const minZ = 0.5;
    const maxZ = (MAZE_SIZE - 1) * CELL_SIZE - 0.5;

    newPos.x = Math.max(minX, Math.min(maxX, newPos.x));
    newPos.z = Math.max(minZ, Math.min(maxZ, newPos.z));

    if (!checkCollision(newPos.x, newPos.z, beams)) {
      position.current.copy(newPos);
    } else {
      const testX = position.current.clone();
      testX.x = newPos.x;
      if (!checkCollision(testX.x, testX.z, beams)) {
        position.current.x = newPos.x;
      }

      const testZ = position.current.clone();
      testZ.z = newPos.z;
      if (!checkCollision(testZ.x, testZ.z, beams)) {
        position.current.z = newPos.z;
      }
    }

    if (isAtExit(position.current.x, position.current.z)) {
      setComplete(true);
    }

    updatePlayerPosition(position.current.x, position.current.z, yaw.current);

    camera.position.copy(position.current);
    const lookDir = new THREE.Vector3(
      Math.sin(yaw.current),
      0,
      Math.cos(yaw.current)
    );
    camera.lookAt(position.current.clone().add(lookDir));
  });

  return (
    <pointLight
      position={[position.current.x, position.current.y + 1, position.current.z]}
      color="#ffaa44"
      intensity={0.5}
      distance={10}
    />
  );
}
