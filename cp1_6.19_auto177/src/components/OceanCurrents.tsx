import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { oceanCurrents } from '../data/oceanData';
import { createCurrentCurve, createLineGeometry } from '../utils/curveUtils';
import { useStore } from '../store/useStore';
import type { OceanCurrent } from '../types';

interface OceanCurrentsProps {
  showLayer: boolean;
}

function OceanCurrents({ showLayer }: OceanCurrentsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const [visibleStates, setVisibleStates] = useState<boolean[]>(() => 
    oceanCurrents.map(() => false)
  );
  const [currentOpacities, setCurrentOpacities] = useState<number[]>(() =>
    oceanCurrents.map(() => 0)
  );
  
  const { selectedCurrent, setSelectedCurrent, searchQuery } = useStore();
  const { raycaster, camera, scene } = useThree();
  
  const clickableObjects = useRef<THREE.Line[]>([]);
  
  const currentData = useMemo(() => {
    return oceanCurrents.map((current) => {
      const curve = createCurrentCurve(current);
      const geometry = createLineGeometry(
        curve,
        current.colorStart,
        current.colorEnd,
        400
      );
      return { current, curve, geometry };
    });
  }, []);
  
  const particleData = useMemo(() => {
    return currentData.map(({ current, curve }) => {
      const particleCount = Math.min(8, Math.floor(current.flowRate / 15) + 2);
      const positions = new Float32Array(particleCount * 3);
      const progress = Array.from({ length: particleCount }, (_, i) => i / particleCount);
      const colors = new Float32Array(particleCount * 3);
      
      return { current, curve, positions, progress, colors, particleCount };
    });
  }, [currentData]);
  
  useEffect(() => {
    oceanCurrents.forEach((_, index) => {
      setTimeout(() => {
        setVisibleStates((prev) => {
          const newStates = [...prev];
          newStates[index] = true;
          return newStates;
        });
      }, index * 300);
    });
  }, []);
  
  useEffect(() => {
    currentData.forEach(({ current, curve, geometry }, index) => {
      let startOpacity = 0;
      const targetOpacity = 0.7;
      const startTime = Date.now() + index * 300;
      const duration = 800;
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        if (elapsed < 0) {
          requestAnimationFrame(animate);
          return;
        }
        
        const progress = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        
        setCurrentOpacities((prev) => {
          const newOpacities = [...prev];
          newOpacities[index] = startOpacity + (targetOpacity - startOpacity) * eased;
          return newOpacities;
        });
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    });
  }, [currentData]);
  
  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      
      raycaster.setFromCamera(mouse, camera);
      
      const intersects = raycaster.intersectObjects(clickableObjects.current, false);
      
      if (intersects.length > 0) {
        const object = intersects[0].object as THREE.Line;
        const currentId = object.userData.currentId;
        const current = oceanCurrents.find((c) => c.id === currentId);
        if (current) {
          setSelectedCurrent(current);
        }
      } else {
        setSelectedCurrent(null);
      }
    };
    
    const canvas = document.querySelector('canvas');
    if (canvas) {
      canvas.addEventListener('click', handleClick);
    }
    
    return () => {
      if (canvas) {
        canvas.removeEventListener('click', handleClick);
      }
    };
  }, [raycaster, camera, setSelectedCurrent]);
  
  useEffect(() => {
    if (searchQuery) {
      const found = oceanCurrents.find(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (found) {
        setSelectedCurrent(found);
      }
    }
  }, [searchQuery, setSelectedCurrent]);
  
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * (2 * Math.PI) / 60;
    }
    
    particleData.forEach((data) => {
      for (let i = 0; i < data.particleCount; i++) {
        data.progress[i] = (data.progress[i] + 0.05 * delta * 60) % 1;
        
        const t = data.progress[i];
        const point = data.curve.getPointAt(t);
        data.positions[i * 3] = point.x;
        data.positions[i * 3 + 1] = point.y;
        data.positions[i * 3 + 2] = point.z;
        
        const temp = (1 - t) * data.current.avgTemperature + t * data.current.avgTemperature * 0.9;
        const normalizedTemp = (temp + 2) / 32;
        if (normalizedTemp < 0.5) {
          data.colors[i * 3] = 0.3 + normalizedTemp * 0.4;
          data.colors[i * 3 + 1] = 0.6 + normalizedTemp * 0.2;
          data.colors[i * 3 + 2] = 0.9 + normalizedTemp * 0.1;
        } else {
          data.colors[i * 3] = 0.7 + (normalizedTemp - 0.5) * 0.6;
          data.colors[i * 3 + 1] = 0.5 + (normalizedTemp - 0.5) * 0.4;
          data.colors[i * 3 + 2] = 0.2 + (normalizedTemp - 0.5) * 0.2;
        }
      }
    });
  });
  
  const isHighlighted = (current: OceanCurrent): boolean => {
    if (!selectedCurrent) return false;
    return selectedCurrent.id === current.id || 
           (searchQuery && (
             current.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             current.nameEn.toLowerCase().includes(searchQuery.toLowerCase())
           ));
  };
  
  const getLineOpacity = (index: number, current: OceanCurrent): number => {
    const baseOpacity = currentOpacities[index] || 0;
    if (showLayer) {
      return baseOpacity * 0.5;
    }
    if (isHighlighted(current)) {
      return 1.0;
    }
    if (selectedCurrent) {
      return baseOpacity * 0.3;
    }
    return baseOpacity;
  };
  
  const getLineWidth = (current: OceanCurrent): number => {
    if (isHighlighted(current)) {
      return Math.max(2, current.width * 1.5);
    }
    return Math.max(1, current.width);
  };
  
  return (
    <group ref={groupRef}>
      {currentData.map(({ current, geometry }, index) => (
        visibleStates[index] && (
          <group key={current.id}>
            <line
              geometry={geometry}
              userData={{ currentId: current.id }}
              ref={(el) => {
                if (el) clickableObjects.current[index] = el;
              }}
            >
              <lineBasicMaterial
                vertexColors
                transparent
                opacity={getLineOpacity(index, current)}
                linewidth={getLineWidth(current)}
              />
            </line>
            
            {isHighlighted(current) && (
              <line geometry={geometry}>
                <lineBasicMaterial
                  color="#ffffff"
                  transparent
                  opacity={0.3}
                  linewidth={getLineWidth(current) + 2}
                />
              </line>
            )}
            
            <points>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={particleData[index].particleCount}
                  array={particleData[index].positions}
                  itemSize={3}
                />
                <bufferAttribute
                  attach="attributes-color"
                  count={particleData[index].particleCount}
                  array={particleData[index].colors}
                  itemSize={3}
                />
              </bufferGeometry>
              <pointsMaterial
                size={0.035}
                vertexColors
                transparent
                opacity={getLineOpacity(index, current) * 0.9}
                sizeAttenuation
              />
            </points>
          </group>
        )
      ))}
    </group>
  );
}

export default OceanCurrents;
