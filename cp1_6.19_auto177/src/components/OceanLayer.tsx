import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { LayerType } from '../types';
import { temperatureVertexShader, temperatureFragmentShader, salinityVertexShader, salinityFragmentShader } from '../utils/shaders';
import { EARTH_RADIUS } from '../utils/geoUtils';

interface OceanLayerProps {
  activeLayer: LayerType;
  visible: boolean;
}

function OceanLayer({ activeLayer, visible }: OceanLayerProps) {
  const temperatureRef = useRef<THREE.Mesh>(null);
  const salinityRef = useRef<THREE.Mesh>(null);

  const temperatureUniforms = useMemo(() => ({
    uOpacity: { value: 0 },
    uTime: { value: 0 },
  }), []);

  const salinityUniforms = useMemo(() => ({
    uOpacity: { value: 0 },
    uTime: { value: 0 },
  }), []);

  useEffect(() => {
    const targetOpacity = visible ? 1 : 0;
    const activeUniforms = activeLayer === 'temperature' ? temperatureUniforms : salinityUniforms;
    const inactiveUniforms = activeLayer === 'temperature' ? salinityUniforms : temperatureUniforms;
    
    let startTime = Date.now();
    const duration = 1000;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      
      activeUniforms.uOpacity.value = targetOpacity * eased;
      inactiveUniforms.uOpacity.value = targetOpacity * (1 - eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }, [activeLayer, visible, temperatureUniforms, salinityUniforms]);

  useFrame((_, delta) => {
    temperatureUniforms.uTime.value += delta;
    salinityUniforms.uTime.value += delta;
    
    if (temperatureRef.current) {
      temperatureRef.current.rotation.y += delta * (2 * Math.PI) / 60;
    }
    if (salinityRef.current) {
      salinityRef.current.rotation.y += delta * (2 * Math.PI) / 60;
    }
  });

  return (
    <group>
      <mesh ref={temperatureRef}>
        <sphereGeometry
          args={[EARTH_RADIUS * 1.005, 64, 64]}
        />
        <shaderMaterial
          vertexShader={temperatureVertexShader}
          fragmentShader={temperatureFragmentShader}
          uniforms={temperatureUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
      
      <mesh ref={salinityRef}>
        <sphereGeometry
          args={[EARTH_RADIUS * 1.005, 64, 64]}
        />
        <shaderMaterial
          vertexShader={salinityVertexShader}
          fragmentShader={salinityFragmentShader}
          uniforms={salinityUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

export default OceanLayer;
