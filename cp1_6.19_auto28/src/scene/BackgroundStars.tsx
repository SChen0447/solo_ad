import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { getStarTexture } from '@/utils/textures';

const STAR_COUNT = 2500;
const SPREAD = 180;

export function BackgroundStars() {
  const pointsRef = useRef<THREE.Points>(null);
  const texture = useMemo(() => getStarTexture(), []);

  const { positions, sizes, seeds, baseAlphas } = useMemo(() => {
    const positions = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);
    const seeds = new Float32Array(STAR_COUNT);
    const baseAlphas = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = SPREAD * (0.4 + Math.random() * 0.6);

      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi) - 40;

      sizes[i] = 1 + Math.random() * 1.5;
      seeds[i] = Math.random() * Math.PI * 2;
      baseAlphas[i] = 0.2 + Math.random() * 0.4;
    }

    return { positions, sizes, seeds, baseAlphas };
  }, []);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
    geo.setAttribute('aBaseAlpha', new THREE.BufferAttribute(baseAlphas, 1));
    return geo;
  }, [positions, sizes, seeds, baseAlphas]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    uTexture: { value: texture }
  }), [texture]);

  const vertexShader = `
    attribute float aSize;
    attribute float aSeed;
    attribute float aBaseAlpha;
    
    uniform float uTime;
    uniform float uPixelRatio;
    
    varying float vAlpha;
    varying float vSeed;
    
    void main() {
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      
      float breathe = sin(uTime * 1.2 + aSeed) * 0.5 + 0.5;
      vAlpha = aBaseAlpha * (0.5 + breathe * 0.5);
      vSeed = aSeed;
      
      float twinkle = 0.85 + sin(uTime * 2.5 + aSeed * 3.7) * 0.15;
      
      gl_PointSize = aSize * uPixelRatio * twinkle * (250.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `;

  const fragmentShader = `
    uniform sampler2D uTexture;
    
    varying float vAlpha;
    varying float vSeed;
    
    void main() {
      vec4 texColor = texture2D(uTexture, gl_PointCoord);
      
      vec3 coolTint = mix(
        vec3(0.85, 0.9, 1.0),
        vec3(1.0, 0.95, 0.85),
        sin(vSeed * 13.37) * 0.5 + 0.5
      );
      
      vec3 finalColor = texColor.rgb * coolTint;
      float finalAlpha = texColor.a * vAlpha;
      
      if (finalAlpha < 0.01) discard;
      
      gl_FragColor = vec4(finalColor, finalAlpha);
    }
  `;

  useFrame((_, delta) => {
    const mat = pointsRef.current?.material as THREE.ShaderMaterial;
    if (mat) {
      mat.uniforms.uTime.value += delta;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false} renderOrder={1}>
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
