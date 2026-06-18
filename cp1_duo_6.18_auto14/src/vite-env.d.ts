/// <reference types="vite/client" />

import type * as THREE from 'three';
import type {
  MeshProps,
  InstancedMeshProps,
  MaterialProps,
  LightProps,
  Object3DProps,
  BufferGeometryProps
} from '@react-three/fiber';

type ThreeElement<T, P> = React.DetailedHTMLProps<React.HTMLAttributes<T> & P, T>;

declare global {
  namespace JSX {
    interface IntrinsicElements {
      mesh: ThreeElement<THREE.Mesh, any>;
      instancedMesh: ThreeElement<THREE.InstancedMesh, any>;
      group: ThreeElement<THREE.Group, any>;
      ambientLight: ThreeElement<THREE.AmbientLight, any>;
      directionalLight: ThreeElement<THREE.DirectionalLight, any>;
      pointLight: ThreeElement<THREE.PointLight, any>;
      gridHelper: ThreeElement<THREE.GridHelper, any>;
      fog: ThreeElement<THREE.Fog, any>;
      meshStandardMaterial: ThreeElement<THREE.MeshStandardMaterial, any>;
      meshBasicMaterial: ThreeElement<THREE.MeshBasicMaterial, any>;
      planeGeometry: ThreeElement<THREE.PlaneGeometry, any>;
      boxGeometry: ThreeElement<THREE.BoxGeometry, any>;
      bufferGeometry: ThreeElement<THREE.BufferGeometry, any>;
    }
  }
}

export {};
