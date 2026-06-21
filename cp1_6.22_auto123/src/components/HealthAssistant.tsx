import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/store/useAppStore';
import { getHeadTurnRotation, getArmRaiseRotation, getSideBendRotation, damp } from '@/utils/animations';
import styles from './HealthAssistant.module.css';

const HealthAssistant = () => {
  const { currentAction, postureMode, currentTip, timer } = useAppStore();

  const headRef = useRef<THREE.Mesh>(null);
  const bodyRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftArmUpperRef = useRef<THREE.Mesh>(null);
  const rightArmUpperRef = useRef<THREE.Mesh>(null);

  const animationTimeRef = useRef(0);
  const postureTimeRef = useRef(0);

  const targetRotations = useMemo(
    () => ({
      head: { y: 0, x: 0 },
      torso: { z: 0 },
      rightArm: { x: 0, z: 0 },
      leftArm: { x: 0, z: 0 },
    }),
    []
  );

  useFrame((_state, delta) => {
    if (postureMode) {
      postureTimeRef.current += delta;

      if (headRef.current) {
        headRef.current.rotation.y = damp(
          headRef.current.rotation.y,
          Math.sin(postureTimeRef.current * 0.5) * 0.1,
          4,
          delta
        );
        headRef.current.rotation.x = damp(
          headRef.current.rotation.x,
          -0.1,
          4,
          delta
        );
      }

      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = damp(
          rightArmRef.current.rotation.x,
          -1.2,
          4,
          delta
        );
        rightArmRef.current.rotation.z = damp(
          rightArmRef.current.rotation.z,
          0.3,
          4,
          delta
        );
      }

      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = damp(
          leftArmRef.current.rotation.x,
          -1.0,
          4,
          delta
        );
        leftArmRef.current.rotation.z = damp(
          leftArmRef.current.rotation.z,
          -0.3,
          4,
          delta
        );
      }

      return;
    }

    if (currentAction === 'idle') {
      animationTimeRef.current = 0;
      targetRotations.head.y = 0;
      targetRotations.torso.z = 0;
      targetRotations.rightArm.x = 0;
      targetRotations.leftArm.x = 0;

      if (headRef.current) {
        headRef.current.rotation.y = damp(headRef.current.rotation.y, 0, 6, delta);
        headRef.current.rotation.x = damp(headRef.current.rotation.x, 0, 6, delta);
      }
      if (torsoRef.current) {
        torsoRef.current.rotation.z = damp(torsoRef.current.rotation.z, 0, 6, delta);
      }
      if (rightArmRef.current) {
        rightArmRef.current.rotation.x = damp(rightArmRef.current.rotation.x, 0, 6, delta);
        rightArmRef.current.rotation.z = damp(rightArmRef.current.rotation.z, 0, 6, delta);
      }
      if (leftArmRef.current) {
        leftArmRef.current.rotation.x = damp(leftArmRef.current.rotation.x, 0, 6, delta);
        leftArmRef.current.rotation.z = damp(leftArmRef.current.rotation.z, 0, 6, delta);
      }
      return;
    }

    animationTimeRef.current += delta;

    if (currentAction === 'headTurn' && headRef.current) {
      const rotation = getHeadTurnRotation(animationTimeRef.current, 2);
      headRef.current.rotation.y = damp(headRef.current.rotation.y, rotation, 8, delta);
    }

    if (currentAction === 'armRaise' && rightArmRef.current) {
      const rotation = getArmRaiseRotation(animationTimeRef.current, 1.5);
      rightArmRef.current.rotation.x = damp(rightArmRef.current.rotation.x, rotation, 8, delta);
    }

    if (currentAction === 'sideBend' && torsoRef.current) {
      const rotation = getSideBendRotation(animationTimeRef.current, 2);
      torsoRef.current.rotation.z = damp(torsoRef.current.rotation.z, rotation, 8, delta);
    }
  });

  return (
    <group position={[0.8, 0.45, 0]}>
      <group ref={bodyRef}>
        <mesh ref={torsoRef} position={[0, 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 0.24, 16]} />
          <meshStandardMaterial color="#3b82f6" />
        </mesh>

        <group position={[0, 0.3, 0]}>
          <mesh ref={headRef} castShadow>
            <sphereGeometry args={[0.12, 32, 32]} />
            <meshStandardMaterial color="#fcd34d" />
          </mesh>
          <mesh position={[-0.04, 0.02, 0.1]}>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          <mesh position={[0.04, 0.02, 0.1]}>
            <sphereGeometry args={[0.02, 16, 16]} />
            <meshStandardMaterial color="#1f2937" />
          </mesh>
          <mesh position={[0, -0.03, 0.11]}>
            <boxGeometry args={[0.04, 0.01, 0.01]} />
            <meshStandardMaterial color="#ef4444" />
          </mesh>
        </group>

        <group ref={leftArmRef} position={[-0.12, 0.2, 0]}>
          <mesh ref={leftArmUpperRef} position={[0, -0.08, 0]} castShadow>
            <capsuleGeometry args={[0.03, 0.12, 8, 16]} />
            <meshStandardMaterial color="#fcd34d" />
          </mesh>
        </group>

        <group ref={rightArmRef} position={[0.12, 0.2, 0]}>
          <mesh ref={rightArmUpperRef} position={[0, -0.08, 0]} castShadow>
            <capsuleGeometry args={[0.03, 0.12, 8, 16]} />
            <meshStandardMaterial color="#fcd34d" />
          </mesh>
        </group>

        <mesh position={[-0.05, -0.05, 0]} castShadow>
          <capsuleGeometry args={[0.03, 0.1, 8, 16]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
        <mesh position={[0.05, -0.05, 0]} castShadow>
          <capsuleGeometry args={[0.03, 0.1, 8, 16]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </group>

      {postureMode && (
        <Html position={[0, 0.55, 0]} center distanceFactor={8}>
          <div className={styles.bubble}>
            {currentTip}
          </div>
        </Html>
      )}
    </group>
  );
};

export default HealthAssistant;
