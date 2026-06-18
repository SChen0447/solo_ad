import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { EARTH_RADIUS } from '../ocean/CurrentSimulator';

const earthVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const earthFragmentShader = `
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vPosition;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 6; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv;
  float n = fbm(uv * 8.0 + vec2(1.7, 9.2));
  float n2 = fbm(uv * 4.0 + vec2(5.3, 2.1));

  float land = smoothstep(0.42, 0.48, n * 0.7 + n2 * 0.3);

  vec3 deepOcean = vec3(0.02, 0.05, 0.2);
  vec3 shallowOcean = vec3(0.05, 0.15, 0.4);
  vec3 coast = vec3(0.1, 0.3, 0.5);
  vec3 lowland = vec3(0.15, 0.45, 0.15);
  vec3 highland = vec3(0.35, 0.3, 0.15);
  vec3 mountain = vec3(0.55, 0.45, 0.3);
  vec3 snow = vec3(0.9, 0.9, 0.95);

  vec3 oceanColor = mix(deepOcean, shallowOcean, smoothstep(0.3, 0.42, n));
  vec3 landColor = mix(lowland, highland, smoothstep(0.5, 0.6, n));
  landColor = mix(landColor, mountain, smoothstep(0.6, 0.7, n));
  landColor = mix(landColor, snow, smoothstep(0.72, 0.78, n));

  float polarFactor = smoothstep(0.85, 1.0, abs(uv.y - 0.5) * 2.0);
  landColor = mix(landColor, snow, polarFactor);
  oceanColor = mix(oceanColor, vec3(0.7, 0.8, 0.9), polarFactor);

  vec3 baseColor = mix(oceanColor, landColor, land);

  vec3 lightDir = normalize(vec3(1.0, 0.5, 0.8));
  float diffuse = max(dot(vNormal, lightDir), 0.0);
  float ambient = 0.25;
  vec3 color = baseColor * (ambient + diffuse * 0.75);

  vec3 viewDir = normalize(-vPosition);
  float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
  color += vec3(0.1, 0.2, 0.4) * fresnel * 0.3;

  gl_FragColor = vec4(color, 1.0);
}
`;

const cloudVertexShader = `
varying vec2 vUv;
varying vec3 vNormal;
void main() {
  vUv = uv;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const cloudFragmentShader = `
varying vec2 vUv;
varying vec3 vNormal;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = vUv + vec2(uTime * 0.005, 0.0);
  float cloud = fbm(uv * 6.0);
  cloud = smoothstep(0.4, 0.7, cloud);
  vec3 lightDir = normalize(vec3(1.0, 0.5, 0.8));
  float diffuse = max(dot(vNormal, lightDir), 0.0);
  vec3 color = vec3(1.0) * (0.5 + diffuse * 0.5);
  gl_FragColor = vec4(color, cloud * 0.45);
}
`;

const atmosphereVertexShader = `
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vNormal = normalize(normalMatrix * normal);
  vPosition = (modelViewMatrix * vec4(position, 1.0)).xyz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const atmosphereFragmentShader = `
varying vec3 vNormal;
varying vec3 vPosition;
void main() {
  vec3 viewDir = normalize(-vPosition);
  float intensity = pow(0.7 - dot(viewDir, vNormal), 2.0);
  vec3 color = vec3(0.3, 0.6, 1.0);
  gl_FragColor = vec4(color, intensity * 0.6);
}
`;

export default function Earth() {
  const earthRef = useRef<THREE.Mesh>(null);
  const cloudRef = useRef<THREE.Mesh>(null);

  const earthUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  );

  const cloudUniforms = useMemo(
    () => ({
      uTime: { value: 0 },
    }),
    []
  );

  useFrame((_, delta) => {
    if (earthRef.current) {
      earthRef.current.rotation.y += delta * 0.02;
      earthUniforms.uTime.value += delta;
    }
    if (cloudRef.current) {
      cloudRef.current.rotation.y += delta * 0.025;
      cloudUniforms.uTime.value += delta;
    }
  });

  return (
    <group>
      <mesh ref={earthRef}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <shaderMaterial
          vertexShader={earthVertexShader}
          fragmentShader={earthFragmentShader}
          uniforms={earthUniforms}
        />
      </mesh>

      <mesh ref={cloudRef}>
        <sphereGeometry args={[EARTH_RADIUS + 0.04, 64, 64]} />
        <shaderMaterial
          vertexShader={cloudVertexShader}
          fragmentShader={cloudFragmentShader}
          uniforms={cloudUniforms}
          transparent
          depthWrite={false}
        />
      </mesh>

      <mesh>
        <sphereGeometry args={[EARTH_RADIUS + 0.15, 64, 64]} />
        <shaderMaterial
          vertexShader={atmosphereVertexShader}
          fragmentShader={atmosphereFragmentShader}
          transparent
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
