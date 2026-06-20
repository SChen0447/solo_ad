import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { generateGalaxyPositions, GalaxyType, GALAXY_RADIUS, PARTICLE_COUNT } from './GalaxyController';
import type { AudioData } from '../audio/AudioAnalyzer';

export type ColorThemeKey = 'galaxy' | 'fire' | 'forest';

export interface ThemeColors {
  primary: string;
  secondary: string;
  highlight: string;
  ambient: string;
  uiAccent: string;
}

export const THEMES: Record<ColorThemeKey, ThemeColors> = {
  galaxy: {
    primary: '#4a6fa5',
    secondary: '#8367c7',
    highlight: '#e07a5f',
    ambient: '#b5d5ff',
    uiAccent: '#6a6aff'
  },
  fire: {
    primary: '#d62828',
    secondary: '#f77f00',
    highlight: '#fcbf49',
    ambient: '#ff9966',
    uiAccent: '#ff6600'
  },
  forest: {
    primary: '#2d6a4f',
    secondary: '#40916c',
    highlight: '#52b788',
    ambient: '#99ffcc',
    uiAccent: '#52b788'
  }
};

function hexToRgb(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(a, b, t);
}

function getFrequencyColor(freq: number, theme: ThemeColors): THREE.Color {
  const primary = hexToRgb(theme.primary);
  const secondary = hexToRgb(theme.secondary);
  const highlight = hexToRgb(theme.highlight);

  if (freq <= 85) {
    const t = freq / 85;
    return lerpColor(primary, secondary, t);
  } else if (freq <= 170) {
    const t = (freq - 85) / 85;
    return lerpColor(secondary, highlight, t);
  } else {
    return highlight;
  }
}

interface StarFieldProps {
  galaxyType: GalaxyType;
  themeKey: ColorThemeKey;
  audioData: AudioData;
}

function createCircleTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.5, 'rgba(255,255,255,0.5)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export function StarField({ galaxyType, themeKey, audioData }: StarFieldProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const positionAttrRef = useRef<THREE.BufferAttribute | null>(null);
  const colorAttrRef = useRef<THREE.BufferAttribute | null>(null);
  const targetPositionsRef = useRef<Float32Array | null>(null);
  const basePositionsRef = useRef<Float32Array | null>(null);
  const beatPulseRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT));
  const beatTimeRef = useRef<number>(0);
  const isBeatingRef = useRef<boolean>(false);
  const prevGalaxyTypeRef = useRef<GalaxyType>(galaxyType);
  const transitionProgressRef = useRef<number>(1);
  const oldPositionsRef = useRef<Float32Array | null>(null);

  const { positions, colors, sizes, texture } = useMemo(() => {
    const pos = generateGalaxyPositions(galaxyType, PARTICLE_COUNT, GALAXY_RADIUS);
    const col =