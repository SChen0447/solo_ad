import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store/useAppStore';
import { WHEEL_PRESETS, SIZE_RANGE } from '../types';

interface WheelRendererProps {
  wheelId: string;
  color: string;
  size: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  rotationSpeed?: number;
}

function createWheelGeometry(wheelId: string): THREE.Group {
  const wheelGroup = new THREE.Group();
  const preset = WHEEL_PRESETS.find((w) => w.id === wheelId);
  const tireRadius = 0.38;
  const tireWidth = 0.22;
  const rimRadius = 0.3;
  const hubRadius = 0.08;

  const tireGeo = new THREE.TorusGeometry(tireRadius, tireWidth / 2, 16, 48);
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1a,
    roughness: 0.9,
    metalness: 0.1,
  });
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.rotation.x = Math.PI / 2;
  tire.castShadow = true;
  tire.receiveShadow = true;
  wheelGroup.add(tire);

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xc0c0c0,
    roughness: 0.3,
    metalness: 0.8,
  });

  const rimOuterGeo = new THREE.CylinderGeometry(rimRadius, rimRadius, 0.12, 64, 1, true);
  const rimOuter = new THREE.Mesh(rimOuterGeo, rimMat);
  rimOuter.rotation.x = Math.PI / 2;
  rimOuter.position.z = -0.02;
  rimOuter.castShadow = true;
  wheelGroup.add(rimOuter);

  const rimInnerGeo = new THREE.CylinderGeometry(rimRadius * 0.95, rimRadius * 0.95, 0.08, 64);
  const rimInner = new THREE.Mesh(rimInnerGeo, rimMat);
  rimInner.rotation.x = Math.PI / 2;
  rimInner.position.z = -0.05;
  wheelGroup.add(rimInner);

  if (preset) {
    switch (preset.type) {
      case 'classic': {
        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2;
          const spokeGeo = new THREE.BoxGeometry(0.06, 0.04, rimRadius - hubRadius - 0.02);
          const spoke = new THREE.Mesh(spokeGeo, rimMat);
          spoke.position.set(
            Math.cos(angle) * (rimRadius + hubRadius) / 2,
            Math.sin(angle) * (rimRadius + hubRadius) / 2,
            -0.05
          );
          spoke.rotation.z = angle + Math.PI / 2;
          spoke.castShadow = true;
          wheelGroup.add(spoke);
        }
        break;
      }
      case 'sport': {
        for (let i = 0; i < 10; i++) {
          const angle = (i / 10) * Math.PI * 2;
          const spokeGeo = new THREE.BoxGeometry(0.035, 0.03, rimRadius - hubRadius - 0.02);
          const spoke = new THREE.Mesh(spokeGeo, rimMat);
          const offset = i % 2 === 0 ? 0.02 : -0.02;
          spoke.position.set(
            Math.cos(angle) * (rimRadius + hubRadius) / 2,
            Math.sin(angle) * (rimRadius + hubRadius) / 2,
            -0.05 + offset
          );
          spoke.rotation.z = angle + Math.PI / 2;
          spoke.castShadow = true;
          wheelGroup.add(spoke);
        }
        break;
      }
      case 'cross': {
        for (let i = 0; i < 12; i++) {
          const angle = (i / 12) * Math.PI * 2;
          const spokeGeo = new THREE.BoxGeometry(0.03, 0.035, rimRadius - hubRadius - 0.02);
          const spoke = new THREE.Mesh(spokeGeo, rimMat);
          const twist = (i % 2 === 0 ? 0.3 : -0.3);
          spoke.position.set(
            Math.cos(angle) * (rimRadius + hubRadius) / 2,
            Math.sin(angle) * (rimRadius + hubRadius) / 2,
            -0.05
          );
          spoke.rotation.z = angle + Math.PI / 2;
          spoke.rotation.y = twist;
          spoke.castShadow = true;
          wheelGroup.add(spoke);
        }
        break;
      }
      case 'dense': {
        for (let i = 0; i < 20; i++) {
          const angle = (i / 20) * Math.PI * 2;
          const spokeGeo = new THREE.BoxGeometry(0.02, 0.025, rimRadius - hubRadius - 0.02);
          const spoke = new THREE.Mesh(spokeGeo, rimMat);
          spoke.position.set(
            Math.cos(angle) * (rimRadius + hubRadius) / 2,
            Math.sin(angle) * (rimRadius + hubRadius) / 2,
            -0.05
          );
          spoke.rotation.z = angle + Math.PI / 2;
          spoke.castShadow = true;
          wheelGroup.add(spoke);
        }
        break;
      }
      case 'concept': {
        const discGeo = new THREE.CylinderGeometry(rimRadius * 0.92, rimRadius * 0.92, 0.04, 64);
        const discMat = new THREE.MeshStandardMaterial({
          color: 0xb0b0b0,
          roughness: 0.2,
          metalness: 0.9,
        });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.rotation.x = Math.PI / 2;
        disc.position.z = -0.07;
        disc.castShadow = true;
        wheelGroup.add(disc);

        for (let i = 0; i < 5; i++) {
          const angle = (i / 5) * Math.PI * 2 + Math.PI / 5;
          const cutoutGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.05, 16);
          const cutoutMat = new THREE.MeshStandardMaterial({
            color: 0x1a1a1a,
            roughness: 0.5,
            metalness: 0.3,
          });
          const cutout = new THREE.Mesh(cutoutGeo, cutoutMat);
          cutout.position.set(
            Math.cos(angle) * 0.15,
            Math.sin(angle) * 0.15,
            -0.07
          );
          wheelGroup.add(cutout);
        }
        break;
      }
    }
  }

  const hubGeo = new THREE.CylinderGeometry(hubRadius, hubRadius, 0.06, 32);
  const hubMat = new THREE.MeshStandardMaterial({
    color: 0x888888,
    roughness: 0.4,
    metalness: 0.7,
  });
  const hub = new THREE.Mesh(hubGeo, hubMat);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = -0.09;
  hub.castShadow = true;
  wheelGroup.add(hub);

  const centerCapGeo = new THREE.CylinderGeometry(hubRadius * 0.5, hubRadius * 0.5, 0.03, 24);
  const centerCapMat = new THREE.MeshStandardMaterial({
    color: 0x666666,
    roughness: 0.3,
    metalness: 0.8,
  });
  const centerCap = new THREE.Mesh(centerCapGeo, centerCapMat);
  centerCap.rotation.x = Math.PI / 2;
  centerCap.position.z = -0.11;
  wheelGroup.add(centerCap);

  return wheelGroup;
}

export function WheelRenderer({
  wheelId,
  color,
  size,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  rotationSpeed = 0,
}: WheelRendererProps) {
  const groupRef = useRef<THREE.Group>(null);
  const setWheelLoaded = useAppStore((state) => state.setWheelLoaded);

  const scale = useMemo(() => {
    const normalizedSize = (size - SIZE_RANGE.min) / (SIZE_RANGE.max - SIZE_RANGE.min);
    return 0.9 + normalizedSize * 0.3;
  }, [size]);

  const wheelMeshes = useMemo(() => {
    return createWheelGeometry(wheelId);
  }, [wheelId]);

  useEffect(() => {
    wheelMeshes.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshStandardMaterial;
        if (mat.color && mat.metalness > 0.5 && child.geometry.type !== 'TorusGeometry') {
          mat.color.set(color);
        }
      }
    });
    setWheelLoaded(wheelId, true);
    return () => {
      wheelMeshes.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    };
  }, [wheelId, color, wheelMeshes, setWheelLoaded]);

  useFrame((_, delta) => {
    if (groupRef.current && rotationSpeed !== 0) {
      groupRef.current.rotation.z += rotationSpeed * delta;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={[scale, scale, scale]}>
      <primitive object={wheelMeshes} />
    </group>
  );
}
