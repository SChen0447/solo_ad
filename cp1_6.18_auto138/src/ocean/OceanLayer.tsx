import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CurrentSimulator, EARTH_RADIUS, TRAIL_LENGTH, latLngToVec3 } from './CurrentSimulator';
import { OceanCurrentData } from '../data/CurrentDataLoader';
import { useAppStore } from '../store';

interface OceanLayerProps {
  currents: OceanCurrentData[];
}

const particleVertexShader = `
attribute vec3 aColor;
varying vec3 vColor;
void main() {
  vColor = aColor;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = max(2.0, 6.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const particleFragmentShader = `
varying vec3 vColor;
void main() {
  float dist = length(gl_PointCoord - vec2(0.5));
  if (dist > 0.5) discard;
  float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
  gl_FragColor = vec4(vColor, alpha);
}
`;

export default function OceanLayer({ currents }: OceanLayerProps) {
  const { isPlaying, speed, density, markerPosition, markerInfo } = useAppStore();
  const simulatorRef = useRef<CurrentSimulator | null>(null);
  const pointsRef = useRef<THREE.Points>(null);
  const trailRef = useRef<THREE.LineSegments>(null);
  const markerRef = useRef<THREE.Mesh>(null);
  const markerTimeRef = useRef(0);

  const particleCount = useMemo(() => {
    switch (density) {
      case 'low': return 2500;
      case 'medium': return 5000;
      case 'high': return 10000;
    }
  }, [density]);

  useEffect(() => {
    simulatorRef.current = new CurrentSimulator(currents, particleCount);
  }, [currents, particleCount]);

  useEffect(() => {
    if (simulatorRef.current) {
      simulatorRef.current.setSpeed(speed);
    }
  }, [speed]);

  useEffect(() => {
    if (simulatorRef.current) {
      simulatorRef.current.setPlaying(isPlaying);
    }
  }, [isPlaying]);

  const particleGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    return geo;
  }, [particleCount]);

  const trailGeometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * TRAIL_LENGTH * 3 * 2);
    const colors = new Float32Array(particleCount * TRAIL_LENGTH * 2 * 4);
    const indices: number[] = [];
    for (let i = 0; i < particleCount; i++) {
      for (let t = 0; t < TRAIL_LENGTH - 1; t++) {
        const base = i * TRAIL_LENGTH;
        indices.push(base + t, base + t + 1);
      }
    }
    geo.setIndex(indices);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));
    return geo;
  }, [particleCount]);

  const particleMaterial = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: particleVertexShader,
        fragmentShader: particleFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  const trailMaterial = useMemo(
    () =>
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    []
  );

  useFrame((_, delta) => {
    const sim = simulatorRef.current;
    if (!sim) return;

    sim.update(delta);

    const posAttr = particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = particleGeometry.getAttribute('aColor') as THREE.BufferAttribute;
    const simPositions = sim.getPositions();
    const simColors = sim.getColors();
    posAttr.array.set(simPositions);
    colAttr.array.set(simColors);
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    const trailPosAttr = trailGeometry.getAttribute('position') as THREE.BufferAttribute;
    const trailColAttr = trailGeometry.getAttribute('color') as THREE.BufferAttribute;
    const simTrailPos = sim.getTrailPositions();
    const simTrailCol = sim.getTrailColors();
    const trailPosArr = trailPosAttr.array as Float32Array;
    const trailColArr = trailColAttr.array as Float32Array;

    for (let i = 0; i < particleCount; i++) {
      for (let t = 0; t < TRAIL_LENGTH - 1; t++) {
        const srcBase = (i * TRAIL_LENGTH + t) * 3;
        const srcBase2 = (i * TRAIL_LENGTH + t + 1) * 3;
        const dstBase = (i * (TRAIL_LENGTH - 1) + t) * 2;

        trailPosArr[(dstBase) * 3] = simTrailPos[srcBase];
        trailPosArr[(dstBase) * 3 + 1] = simTrailPos[srcBase + 1];
        trailPosArr[(dstBase) * 3 + 2] = simTrailPos[srcBase + 2];
        trailPosArr[(dstBase + 1) * 3] = simTrailPos[srcBase2];
        trailPosArr[(dstBase + 1) * 3 + 1] = simTrailPos[srcBase2 + 1];
        trailPosArr[(dstBase + 1) * 3 + 2] = simTrailPos[srcBase2 + 2];

        const colSrcBase = (i * TRAIL_LENGTH + t) * 4;
        const colSrcBase2 = (i * TRAIL_LENGTH + t + 1) * 4;
        trailColArr[(dstBase) * 4] = simTrailCol[colSrcBase];
        trailColArr[(dstBase) * 4 + 1] = simTrailCol[colSrcBase + 1];
        trailColArr[(dstBase) * 4 + 2] = simTrailCol[colSrcBase + 2];
        trailColArr[(dstBase) * 4 + 3] = simTrailCol[colSrcBase + 3];
        trailColArr[(dstBase + 1) * 4] = simTrailCol[colSrcBase2];
        trailColArr[(dstBase + 1) * 4 + 1] = simTrailCol[colSrcBase2 + 1];
        trailColArr[(dstBase + 1) * 4 + 2] = simTrailCol[colSrcBase2 + 2];
        trailColArr[(dstBase + 1) * 4 + 3] = simTrailCol[colSrcBase2 + 3];
      }
    }

    trailPosAttr.needsUpdate = true;
    trailColAttr.needsUpdate = true;

    if (markerRef.current && markerPosition) {
      const mPos = latLngToVec3(markerPosition.lat, markerPosition.lng, EARTH_RADIUS + 0.05);
      markerRef.current.position.copy(mPos);
      markerRef.current.visible = true;
      markerTimeRef.current += delta;
      const scale = 1.0 + Math.sin(markerTimeRef.current * Math.PI * 4) * 0.3;
      markerRef.current.scale.setScalar(scale);
    } else if (markerRef.current) {
      markerRef.current.visible = false;
    }
  });

  return (
    <group>
      <points ref={pointsRef} geometry={particleGeometry} material={particleMaterial} />
      <lineSegments ref={trailRef} geometry={trailGeometry} material={trailMaterial} />
      <mesh ref={markerRef} visible={false}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color={0xff3333} transparent opacity={0.9} />
      </mesh>
    </group>
  );
}
