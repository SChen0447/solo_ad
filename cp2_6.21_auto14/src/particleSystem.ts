import * as THREE from 'three';
import { computeVelocity, updateFlow } from './flowSimulator';

export interface ParticleSystemParams {
  particleCount: number;
  speedMultiplier: number;
  trailLength: number;
  glowIntensity: number;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  color: THREE.Color;
  trail: THREE.Vector3[];
}

let particles: Particle[] = [];
let scene: THREE.Scene;
let params: ParticleSystemParams = {
  particleCount: 3000,
  speedMultiplier: 1.0,
  trailLength: 50,
  glowIntensity: 1.0
};

let points: THREE.Points;
let pointsGeometry: THREE.BufferGeometry;
let trailLine: THREE.LineSegments;
let trailGeometry: THREE.BufferGeometry;
let connectionLine: THREE.LineSegments;
let connectionGeometry: THREE.BufferGeometry;
let glowSprites: THREE.Sprite[] = [];

let connectionData: Map<string, { startTime: number; opacity: number }> = new Map();
const connectionLifetime: number = 0.2;
const connectionDistance: number = 0.3;

const defaultParams: ParticleSystemParams = {
  particleCount: 3000,
  speedMultiplier: 1.0,
  trailLength: 50,
  glowIntensity: 1.0
};

function hslToRgb(h: number, s: number, l: number, out: THREE.Color): void {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h >= 0 && h < 60) { r = c; g = x; b = 0; }
  else if (h >= 60 && h < 120) { r = x; g = c; b = 0; }
  else if (h >= 120 && h < 180) { r = 0; g = c; b = x; }
  else if (h >= 180 && h < 240) { r = 0; g = x; b = c; }
  else if (h >= 240 && h < 300) { r = x; g = 0; b = c; }
  else if (h >= 300 && h < 360) { r = c; g = 0; b = x; }

  out.setRGB(r + m, g + m, b + m);
}

function getColorFromHeight(y: number, out: THREE.Color): void {
  const t = (y + 10) / 20;
  const hue = 180 + (30 - 180) * Math.max(0, Math.min(1, t));
  hslToRgb(hue, 0.9, 0.6, out);
}

function createGlowTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(150, 100, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(100, 80, 200, 0.6)');
  gradient.addColorStop(0.5, 'rgba(80, 60, 180, 0.2)');
  gradient.addColorStop(1, 'rgba(60, 40, 150, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function createParticles(sceneRef: THREE.Scene, initialParams?: Partial<ParticleSystemParams>): void {
  scene = sceneRef;
  params = { ...defaultParams, ...initialParams };
  
  particles = [];
  glowSprites = [];
  
  const glowTexture = createGlowTexture();
  
  for (let i = 0; i < params.particleCount; i++) {
    const pos = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20
    );
    
    const size = 0.03 + Math.random() * 0.07;
    const color = new THREE.Color();
    const hue = 30 + Math.random() * 150;
    hslToRgb(hue, 0.9, 0.6, color);
    getColorFromHeight(pos.y, color);
    
    const trail: THREE.Vector3[] = [];
    for (let j = 0; j < params.trailLength; j++) {
      trail.push(pos.clone());
    }
    
    particles.push({
      position: pos,
      velocity: new THREE.Vector3(),
      size,
      color,
      trail
    });
  }
  
  pointsGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(params.particleCount * 3);
  const colors = new Float32Array(params.particleCount * 3);
  const sizes = new Float32Array(params.particleCount);
  
  for (let i = 0; i < params.particleCount; i++) {
    const p = particles[i];
    positions[i * 3] = p.position.x;
    positions[i * 3 + 1] = p.position.y;
    positions[i * 3 + 2] = p.position.z;
    colors[i * 3] = p.color.r;
    colors[i * 3 + 1] = p.color.g;
    colors[i * 3 + 2] = p.color.b;
    sizes[i] = p.size;
  }
  
  pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  pointsGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  pointsGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  
  const pointsMaterial = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    sizeAttenuation: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  points = new THREE.Points(pointsGeometry, pointsMaterial);
  scene.add(points);
  
  const maxTrailSegments = params.particleCount * (params.trailLength - 1);
  const trailPositions = new Float32Array(maxTrailSegments * 2 * 3);
  const trailColors = new Float32Array(maxTrailSegments * 2 * 3);
  
  trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
  
  const trailMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.3,
    linewidth: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  trailLine = new THREE.LineSegments(trailGeometry, trailMaterial);
  scene.add(trailLine);
  
  const maxConnections = params.particleCount * 4;
  const connectionPositions = new Float32Array(maxConnections * 2 * 3);
  const connectionColors = new Float32Array(maxConnections * 2 * 3);
  
  connectionGeometry = new THREE.BufferGeometry();
  connectionGeometry.setAttribute('position', new THREE.BufferAttribute(connectionPositions, 3));
  connectionGeometry.setAttribute('color', new THREE.BufferAttribute(connectionColors, 3));
  
  const connectionMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    linewidth: 1,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  connectionLine = new THREE.LineSegments(connectionGeometry, connectionMaterial);
  scene.add(connectionLine);
  
  for (let i = 0; i < Math.min(params.particleCount, 500); i++) {
    const spriteMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: new THREE.Color(0.6, 0.4, 1.0),
      transparent: true,
      opacity: 0.3 * params.glowIntensity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(0.3, 0.3, 1.0);
    sprite.position.copy(particles[i].position);
    sprite.visible = true;
    glowSprites.push(sprite);
    scene.add(sprite);
  }
}

function updateConnectionLines(): void {
  const now = performance.now() / 1000;
  const positions = connectionGeometry.attributes.position.array as Float32Array;
  const colors = connectionGeometry.attributes.color.array as Float32Array;
  
  const newConnections: Map<string, { startTime: number; opacity: number }> = new Map();
  
  let segIdx = 0;
  const maxSegs = Math.floor(positions.length / 6);
  
  const gridSize = 2;
  const grid: Map<string, number[]> = new Map();
  
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const gx = Math.floor(p.position.x / gridSize);
    const gy = Math.floor(p.position.y / gridSize);
    const gz = Math.floor(p.position.z / gridSize);
    const key = `${gx},${gy},${gz}`;
    if (!grid.has(key)) grid.set(key, []);
    grid.get(key)!.push(i);
  }
  
  const checked = new Set<string>();
  
  for (let i = 0; i < particles.length; i++) {
    if (segIdx >= maxSegs) break;
    
    const p1 = particles[i];
    const gx = Math.floor(p1.position.x / gridSize);
    const gy = Math.floor(p1.position.y / gridSize);
    const gz = Math.floor(p1.position.z / gridSize);
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${gx + dx},${gy + dy},${gz + dz}`;
          const cell = grid.get(key);
          if (!cell) continue;
          
          for (const j of cell) {
            if (j <= i) continue;
            const pairKey = i < j ? `${i}-${j}` : `${j}-${i}`;
            if (checked.has(pairKey)) continue;
            checked.add(pairKey);
            
            const p2 = particles[j];
            const dist = p1.position.distanceTo(p2.position);
            
            if (dist < connectionDistance) {
              const existing = connectionData.get(pairKey);
              const entry = existing || { startTime: now, opacity: 0.4 };
              if (!existing) {
                entry.startTime = now;
              }
              newConnections.set(pairKey, entry);
              
              positions[segIdx * 6] = p1.position.x;
              positions[segIdx * 6 + 1] = p1.position.y;
              positions[segIdx * 6 + 2] = p1.position.z;
              positions[segIdx * 6 + 3] = p2.position.x;
              positions[segIdx * 6 + 4] = p2.position.y;
              positions[segIdx * 6 + 5] = p2.position.z;
              
              const age = now - entry.startTime;
              const lifeRatio = 1 - Math.min(1, age / connectionLifetime);
              const colorIntensity = lifeRatio;
              
              colors[segIdx * 6] = colorIntensity;
              colors[segIdx * 6 + 1] = colorIntensity;
              colors[segIdx * 6 + 2] = colorIntensity;
              colors[segIdx * 6 + 3] = colorIntensity;
              colors[segIdx * 6 + 4] = colorIntensity;
              colors[segIdx * 6 + 5] = colorIntensity;
              
              segIdx++;
            }
          }
        }
      }
    }
  }
  
  for (let i = segIdx * 6; i < positions.length; i++) {
    positions[i] = 0;
    colors[i] = 0;
  }
  
  connectionData = newConnections;
  connectionGeometry.attributes.position.needsUpdate = true;
  connectionGeometry.attributes.color.needsUpdate = true;
  connectionGeometry.setDrawRange(0, segIdx * 2);
}

function updateTrails(): void {
  const positions = trailGeometry.attributes.position.array as Float32Array;
  const colors = trailGeometry.attributes.color.array as Float32Array;
  const trailLen = Math.floor(params.trailLength);
  
  let segIdx = 0;
  const maxSegs = Math.floor(positions.length / 6);
  
  for (let i = 0; i < particles.length && segIdx < maxSegs; i++) {
    const p = particles[i];
    const trail = p.trail;
    
    for (let j = 0; j < trailLen - 1 && segIdx < maxSegs; j++) {
      const t1 = trail[j];
      const t2 = trail[j + 1];
      
      positions[segIdx * 6] = t1.x;
      positions[segIdx * 6 + 1] = t1.y;
      positions[segIdx * 6 + 2] = t1.z;
      positions[segIdx * 6 + 3] = t2.x;
      positions[segIdx * 6 + 4] = t2.y;
      positions[segIdx * 6 + 5] = t2.z;
      
      const alpha1 = j / trailLen;
      const alpha2 = (j + 1) / trailLen;
      
      colors[segIdx * 6] = p.color.r * alpha1;
      colors[segIdx * 6 + 1] = p.color.g * alpha1;
      colors[segIdx * 6 + 2] = p.color.b * alpha1;
      colors[segIdx * 6 + 3] = p.color.r * alpha2;
      colors[segIdx * 6 + 4] = p.color.g * alpha2;
      colors[segIdx * 6 + 5] = p.color.b * alpha2;
      
      segIdx++;
    }
  }
  
  for (let i = segIdx * 6; i < positions.length; i++) {
    positions[i] = 0;
    colors[i] = 0;
  }
  
  trailGeometry.attributes.position.needsUpdate = true;
  trailGeometry.attributes.color.needsUpdate = true;
  trailGeometry.setDrawRange(0, segIdx * 2);
}

export function updateParticles(deltaTime: number): void {
  updateFlow(deltaTime);
  
  const positions = pointsGeometry.attributes.position.array as Float32Array;
  const colors = pointsGeometry.attributes.color.array as Float32Array;
  
  const tmpVel = new THREE.Vector3();
  
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    
    computeVelocity(p.position, tmpVel);
    p.velocity.copy(tmpVel).multiplyScalar(params.speedMultiplier);
    p.position.addScaledVector(p.velocity, deltaTime);
    
    const bounds = 12;
    if (p.position.x > bounds) p.position.x = -bounds;
    if (p.position.x < -bounds) p.position.x = bounds;
    if (p.position.y > bounds) p.position.y = -bounds;
    if (p.position.y < -bounds) p.position.y = bounds;
    if (p.position.z > bounds) p.position.z = -bounds;
    if (p.position.z < -bounds) p.position.z = bounds;
    
    getColorFromHeight(p.position.y, p.color);
    
    positions[i * 3] = p.position.x;
    positions[i * 3 + 1] = p.position.y;
    positions[i * 3 + 2] = p.position.z;
    colors[i * 3] = p.color.r;
    colors[i * 3 + 1] = p.color.g;
    colors[i * 3 + 2] = p.color.b;
    
    if (p.trail.length > 0) {
      p.trail.unshift(p.position.clone());
      if (p.trail.length > params.trailLength) {
        p.trail.pop();
      }
    }
  }
  
  pointsGeometry.attributes.position.needsUpdate = true;
  pointsGeometry.attributes.color.needsUpdate = true;
  
  updateTrails();
  updateConnectionLines();
  
  for (let i = 0; i < glowSprites.length && i < particles.length; i++) {
    glowSprites[i].position.copy(particles[i].position);
  }
}

export function setSpeedMultiplier(value: number): void {
  params.speedMultiplier = value;
}

export function setTrailLength(value: number): void {
  params.trailLength = Math.max(0, Math.floor(value));
  
  for (const p of particles) {
    while (p.trail.length < params.trailLength) {
      p.trail.push(p.position.clone());
    }
    while (p.trail.length > params.trailLength) {
      p.trail.pop();
    }
  }
}

export function setGlowIntensity(value: number): void {
  params.glowIntensity = value;
  for (const sprite of glowSprites) {
    (sprite.material as THREE.SpriteMaterial).opacity = 0.3 * value;
  }
}

export function getParticleCount(): number {
  return params.particleCount;
}

export function disposeParticles(): void {
  if (pointsGeometry) pointsGeometry.dispose();
  if (points) {
    (points.material as THREE.Material).dispose();
    scene.remove(points);
  }
  if (trailGeometry) trailGeometry.dispose();
  if (trailLine) {
    (trailLine.material as THREE.Material).dispose();
    scene.remove(trailLine);
  }
  if (connectionGeometry) connectionGeometry.dispose();
  if (connectionLine) {
    (connectionLine.material as THREE.Material).dispose();
    scene.remove(connectionLine);
  }
  for (const sprite of glowSprites) {
    (sprite.material as THREE.Material).dispose();
    scene.remove(sprite);
  }
  glowSprites = [];
  particles = [];
}
