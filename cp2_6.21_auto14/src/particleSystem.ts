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
  glowIndex: number;
}

interface Connection {
  i: number;
  j: number;
  startTime: number;
}

let particles: Particle[] = [];
let scene: THREE.Scene;
let params: ParticleSystemParams = {
  particleCount: 3000,
  speedMultiplier: 1.0,
  trailLength: 50,
  glowIntensity: 1.0
};

const MAX_TRAIL_LENGTH = 100;

let points: THREE.Points;
let pointsGeometry: THREE.BufferGeometry;
let trailLine: THREE.LineSegments;
let trailGeometry: THREE.BufferGeometry;
let connectionLine: THREE.LineSegments;
let connectionGeometry: THREE.BufferGeometry;
let glowSprites: THREE.Sprite[] = [];
let glowSpriteMap: Map<number, number> = new Map();

let activeConnections: Connection[] = [];
const connectionLifetime: number = 0.2;
const connectionDistance: number = 0.3;
const CONNECTION_DISTANCE_SQ = connectionDistance * connectionDistance;

const SPATIAL_CELL_SIZE = 0.35;

const GLOW_BASE_R = 0.6;
const GLOW_BASE_G = 0.4;
const GLOW_BASE_B = 1.0;
const GLOW_OPACITY = 0.6;
const GLOW_RADIUS = 0.15;

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
  gradient.addColorStop(0, 'rgba(180, 140, 255, 1)');
  gradient.addColorStop(0.15, 'rgba(140, 100, 230, 0.8)');
  gradient.addColorStop(0.35, 'rgba(100, 70, 200, 0.4)');
  gradient.addColorStop(0.6, 'rgba(70, 50, 170, 0.15)');
  gradient.addColorStop(1, 'rgba(50, 30, 140, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

function rebuildTrailGeometry(): void {
  if (trailGeometry) {
    trailGeometry.dispose();
  }
  
  const maxTrailSegments = params.particleCount * (MAX_TRAIL_LENGTH - 1);
  const trailPositions = new Float32Array(maxTrailSegments * 2 * 3);
  const trailColors = new Float32Array(maxTrailSegments * 2 * 3);
  
  trailGeometry = new THREE.BufferGeometry();
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
  trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
  
  if (trailLine) {
    trailLine.geometry = trailGeometry;
  }
}

function rebuildConnectionGeometry(): void {
  if (connectionGeometry) {
    connectionGeometry.dispose();
  }
  
  const maxConnections = params.particleCount * 6;
  const connectionPositions = new Float32Array(maxConnections * 2 * 3);
  const connectionColors = new Float32Array(maxConnections * 2 * 3);
  
  connectionGeometry = new THREE.BufferGeometry();
  connectionGeometry.setAttribute('position', new THREE.BufferAttribute(connectionPositions, 3));
  connectionGeometry.setAttribute('color', new THREE.BufferAttribute(connectionColors, 3));
  
  if (connectionLine) {
    connectionLine.geometry = connectionGeometry;
  }
}

function disposeGlowSprites(): void {
  for (const sprite of glowSprites) {
    (sprite.material as THREE.Material).dispose();
    scene.remove(sprite);
  }
  glowSprites = [];
  glowSpriteMap.clear();
}

function createGlowForAllParticles(glowTexture: THREE.Texture): void {
  disposeGlowSprites();
  
  const intensity = params.glowIntensity;
  const colorR = Math.min(1.0, GLOW_BASE_R * intensity);
  const colorG = Math.min(1.0, GLOW_BASE_G * intensity);
  const colorB = Math.min(1.0, GLOW_BASE_B * intensity);
  
  for (let i = 0; i < particles.length; i++) {
    const spriteMaterial = new THREE.SpriteMaterial({
      map: glowTexture,
      color: new THREE.Color().setRGB(colorR, colorG, colorB),
      transparent: true,
      opacity: GLOW_OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.scale.set(GLOW_RADIUS * 2, GLOW_RADIUS * 2, 1.0);
    sprite.position.copy(particles[i].position);
    sprite.visible = true;
    glowSprites.push(sprite);
    scene.add(sprite);
    glowSpriteMap.set(i, i);
    particles[i].glowIndex = i;
  }
}

export function createParticles(sceneRef: THREE.Scene, initialParams?: Partial<ParticleSystemParams>): void {
  scene = sceneRef;
  params = { ...defaultParams, ...initialParams };
  
  particles = [];
  
  const glowTexture = createGlowTexture();
  
  for (let i = 0; i < params.particleCount; i++) {
    const pos = new THREE.Vector3(
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20,
      (Math.random() - 0.5) * 20
    );
    
    const size = 0.03 + Math.random() * 0.07;
    const color = new THREE.Color();
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
      trail,
      glowIndex: -1
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
  
  rebuildTrailGeometry();
  
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
  
  rebuildConnectionGeometry();
  
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
  
  createGlowForAllParticles(glowTexture);
}

type SpatialGrid = Map<string, number[]>;

function buildSpatialGrid(): SpatialGrid {
  const grid: SpatialGrid = new Map();
  const cellSize = SPATIAL_CELL_SIZE;
  
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const gx = Math.floor(p.position.x / cellSize);
    const gy = Math.floor(p.position.y / cellSize);
    const gz = Math.floor(p.position.z / cellSize);
    const key = gx + '_' + gy + '_' + gz;
    
    let cell = grid.get(key);
    if (!cell) {
      cell = [];
      grid.set(key, cell);
    }
    cell.push(i);
  }
  
  return grid;
}

function getNeighborCells(gx: number, gy: number, gz: number, grid: SpatialGrid): number[][] {
  const result: number[][] = [];
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dz = -1; dz <= 1; dz++) {
        const key = (gx + dx) + '_' + (gy + dy) + '_' + (gz + dz);
        const cell = grid.get(key);
        if (cell && cell.length > 0) {
          result.push(cell);
        }
      }
    }
  }
  return result;
}

function distanceSquared(a: THREE.Vector3, b: THREE.Vector3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz;
}

function updateConnectionLines(): void {
  const now = performance.now() / 1000;
  
  const stillAlive: Connection[] = [];
  for (const conn of activeConnections) {
    if (now - conn.startTime < connectionLifetime) {
      stillAlive.push(conn);
    }
  }
  
  const existingSet = new Set<string>();
  for (const conn of stillAlive) {
    existingSet.add(conn.i < conn.j ? conn.i + '-' + conn.j : conn.j + '-' + conn.i);
  }
  
  const grid = buildSpatialGrid();
  const cellSize = SPATIAL_CELL_SIZE;
  
  for (let i = 0; i < particles.length; i++) {
    const p1 = particles[i];
    const gx = Math.floor(p1.position.x / cellSize);
    const gy = Math.floor(p1.position.y / cellSize);
    const gz = Math.floor(p1.position.z / cellSize);
    
    const neighborCells = getNeighborCells(gx, gy, gz, grid);
    
    for (const cell of neighborCells) {
      for (const j of cell) {
        if (j <= i) continue;
        
        const pairKey = i < j ? i + '-' + j : j + '-' + i;
        if (existingSet.has(pairKey)) continue;
        
        const p2 = particles[j];
        const distSq = distanceSquared(p1.position, p2.position);
        
        if (distSq < CONNECTION_DISTANCE_SQ) {
          stillAlive.push({ i, j, startTime: now });
          existingSet.add(pairKey);
        }
      }
    }
  }
  
  activeConnections = stillAlive;
  
  const positions = connectionGeometry.attributes.position.array as Float32Array;
  const colors = connectionGeometry.attributes.color.array as Float32Array;
  const maxSegs = Math.floor(positions.length / 6);
  
  let segIdx = 0;
  for (const conn of activeConnections) {
    if (segIdx >= maxSegs) break;
    
    const p1 = particles[conn.i];
    const p2 = particles[conn.j];
    const age = now - conn.startTime;
    const lifeRatio = 1 - Math.min(1, age / connectionLifetime);
    
    positions[segIdx * 6] = p1.position.x;
    positions[segIdx * 6 + 1] = p1.position.y;
    positions[segIdx * 6 + 2] = p1.position.z;
    positions[segIdx * 6 + 3] = p2.position.x;
    positions[segIdx * 6 + 4] = p2.position.y;
    positions[segIdx * 6 + 5] = p2.position.z;
    
    const cR = lifeRatio;
    const cG = lifeRatio;
    const cB = lifeRatio;
    colors[segIdx * 6] = cR;
    colors[segIdx * 6 + 1] = cG;
    colors[segIdx * 6 + 2] = cB;
    colors[segIdx * 6 + 3] = cR;
    colors[segIdx * 6 + 4] = cG;
    colors[segIdx * 6 + 5] = cB;
    
    segIdx++;
  }
  
  for (let i = segIdx * 6; i < positions.length; i++) {
    positions[i] = 0;
    colors[i] = 0;
  }
  
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
    const actualTrailLen = Math.min(trail.length, trailLen);
    
    for (let j = 0; j < actualTrailLen - 1 && segIdx < maxSegs; j++) {
      const t1 = trail[j];
      const t2 = trail[j + 1];
      
      positions[segIdx * 6] = t1.x;
      positions[segIdx * 6 + 1] = t1.y;
      positions[segIdx * 6 + 2] = t1.z;
      positions[segIdx * 6 + 3] = t2.x;
      positions[segIdx * 6 + 4] = t2.y;
      positions[segIdx * 6 + 5] = t2.z;
      
      const alpha1 = 1 - j / actualTrailLen;
      const alpha2 = 1 - (j + 1) / actualTrailLen;
      
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

const tmpVel = new THREE.Vector3();

export function updateParticles(deltaTime: number): void {
  updateFlow(deltaTime);
  
  const positions = pointsGeometry.attributes.position.array as Float32Array;
  const colors = pointsGeometry.attributes.color.array as Float32Array;
  
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
    
    if (params.trailLength > 0) {
      p.trail.unshift(p.position.clone());
      if (p.trail.length > MAX_TRAIL_LENGTH) {
        p.trail.pop();
      }
      while (p.trail.length > params.trailLength) {
        p.trail.pop();
      }
    }
    
    const glowIdx = p.glowIndex;
    if (glowIdx >= 0 && glowIdx < glowSprites.length) {
      glowSprites[glowIdx].position.copy(p.position);
    }
  }
  
  pointsGeometry.attributes.position.needsUpdate = true;
  pointsGeometry.attributes.color.needsUpdate = true;
  
  updateTrails();
  updateConnectionLines();
}

export function setSpeedMultiplier(value: number): void {
  params.speedMultiplier = value;
}

export function setTrailLength(value: number): void {
  const newTrailLength = Math.max(0, Math.min(MAX_TRAIL_LENGTH, Math.floor(value)));
  if (newTrailLength === params.trailLength) return;
  
  const oldTrailLength = params.trailLength;
  params.trailLength = newTrailLength;
  
  if (newTrailLength > oldTrailLength) {
    const diff = newTrailLength - oldTrailLength;
    for (const p of particles) {
      for (let k = 0; k < diff; k++) {
        p.trail.push(p.position.clone());
      }
    }
  } else {
    const diff = oldTrailLength - newTrailLength;
    for (const p of particles) {
      for (let k = 0; k < diff; k++) {
        p.trail.pop();
      }
    }
  }
}

export function setGlowIntensity(value: number): void {
  params.glowIntensity = value;
  const intensity = Math.min(2.0, Math.max(0, value));
  
  const r = Math.min(1.0, GLOW_BASE_R * intensity);
  const g = Math.min(1.0, GLOW_BASE_G * intensity);
  const b = Math.min(1.0, GLOW_BASE_B * intensity);
  
  for (const sprite of glowSprites) {
    const mat = sprite.material as THREE.SpriteMaterial;
    mat.color.setRGB(r, g, b);
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
  disposeGlowSprites();
  particles = [];
}
