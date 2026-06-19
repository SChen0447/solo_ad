import { useRef, useState, useEffect } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import * as THREE from 'three';
import { TextureLoader } from 'three';
import { atmosphereVertexShader, atmosphereFragmentShader } from '../utils/shaders';
import { EARTH_RADIUS } from '../utils/geoUtils';

interface EarthProps {
  scale?: number;
  onLoaded?: () => void;
}

function Earth({ scale = 1, onLoaded }: EarthProps) {
  const earthRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [displayScale, setDisplayScale] = useState(0.3);

  const [earthTexture, bumpTexture] = useLoader(TextureLoader, [
    'https://unpkg.com/three-globe@2.31.0/example/img/earth-blue-marble.jpg',
    'https://unpkg.com/three-globe@2.31.0/example/img/earth-topology.png',
  ]);

  useEffect(() => {
    if (earthTexture && bumpTexture && !isLoaded) {
      setIsLoaded(true);
      setTimeout(() => {
        setDisplayScale(scale);
        setTimeout(() => {
          onLoaded?.();
        }, 2000);
      }, 100);
    }
  }, [earthTexture, bumpTexture, isLoaded, scale, onLoaded]);

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * (2 * Math.PI) / 60;
      
      const targetScale = isLoaded ? scale : 0.3;
      const currentScale = earthRef.current.scale.x;
      const newScale = currentScale + (targetScale - currentScale) * 0.02;
      earthRef.current.scale.setScalar(newScale);
      
      if (atmosphereRef.current) {
        atmosphereRef.current.rotation.y = earthRef.current.rotation.y;
        atmosphereRef.current.scale.setScalar(newScale * 1.05);
      }
    }
  });

  return (
    <group>
      <mesh ref={earthRef} scale={displayScale}>
        <sphereGeometry
          args={[EARTH_RADIUS, 64, 64]}
        />
        <meshStandardMaterial
          map={earthTexture}
          bumpMap={bumpTexture}
          bumpScale={0.03}
          roughness={0.8}
          metalness={0.1}
        />
      </mesh>
      
      <mesh ref={atmosphereRef} scale={displayScale * 1.05}>
        <sphereGeometry
          args={[EARTH_RADIUS * 1.05, 64, 64]}
        />
        <shaderMaterial
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          uniforms={{
            uOpacity: { value: isLoaded ? 1 : 0 },
          }}
          transparent
          side={THREE.BackSide}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default Earth;
