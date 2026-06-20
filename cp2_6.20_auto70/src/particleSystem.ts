import * as THREE from 'three';
import { computeVelocity, updateFlowTime } from './flowSimulator';

export interface ParticleSystemConfig {
  particleCount: number;
  trailLength: number;
  speedMultiplier: number;
  glowIntensity: number;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  size: number;
  color: THREE.Color;
  trail: THREE.Vector3[];
}

const PARTICLE_COUNT = 3000;
const BOUNDS = 10;

let particles: Particle[] = [];
let particlesMesh: THREE.Points | null = null;
let glowMesh: THREE.Points | null = null;
let glowMaterial: THREE.ShaderMaterial | null = null;
let trailLineSegments: THREE.LineSegments | null = null;
let connectionLineSegments: THREE.LineSegments | null = null;

let scene: THREE.Scene | null = null;

const config: ParticleSystemConfig = {
  particleCount: PARTICLE_COUNT,
  trailLength: 50,
  speedMultiplier: 1.0,
  glowIntensity: 1.0
};

let particleGeometry: THREE.BufferGeometry | null = null;
let particlePositionsArray: Float32Array | null = null;
let particleColorsArray: Float32Array | null = null;
let particleSizesArray: Float32Array | null = null;

let glowGeometry: THREE.BufferGeometry | null = null;
let glowPositionsArray: Float32Array | null = null;
let glowColorsArray: Float32Array | null = null;
let glowSizesArray: Float32Array | null = null;

let trailGeometry: THREE.BufferGeometry | null = null;
let trailPositionsArray: Float32Array | null = null;
let trailColorsArray: Float32Array | null = null;

interface Connection {
  startIdx: number;
  endIdx: number;
  life: number;
  duration: number;
}

let connections: Connection[] = [];
let connectionGeometry: THREE.BufferGeometry | null = null;
let connectionPositionsArray: Float32Array | null = null;
let connectionColorsArray: Float32Array | null = null;

const CONNECTION_DISTANCE = 0.3;
const CONNECTION_DURATION = 0.2;
const MAX_CONNECTIONS = 200;

function getColorByHeight(y: number): THREE.Color {
  const t = (y + BOUNDS) / (2 * BOUNDS);
  const hue = 270 - t * 240;
  const color = new THREE.Color();
  color.setHSL(hue / 360, 0.8, 0.6);
  return color;
}

function createRadialTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  
  const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createParticleShaderMaterial(texture: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: texture }
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      varying vec3 vColor;
      
      void main() {
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      varying vec3 vColor;
      
      void main() {
        vec4 texColor = texture2D(pointTexture, gl_PointCoord);
        if (texColor.a < 0.01) discard;
        gl_FragColor = vec4(vColor, texColor.a);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}

function createGlowShaderMaterial(texture: THREE.Texture): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      pointTexture: { value: texture },
      glowIntensity: { value: 1.0 },
      glowColor: { value: new THREE.Color(0.5, 0.3, 1.0) }
    },
    vertexShader: `
      attribute float size;
      uniform float glowIntensity;
      
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * glowIntensity * 2.5 * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform sampler2D pointTexture;
      uniform vec3 glowColor;
      uniform float glowIntensity;
      
      void main() {
        vec4 texColor = texture2D(pointTexture, gl_PointCoord);
        if (texColor.a < 0.01) discard;
        float alpha = texColor.a * 0.6 * glowIntensity;
        gl_FragColor = vec4(glowColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}

export function createParticles(sceneRef: THREE.Scene): void {
  scene = sceneRef;
  particles = [];
  connections = [];
  
  const particleTexture = createRadialTexture();
  
  particleGeometry = new THREE.BufferGeometry();
  particlePositionsArray = new Float32Array(config.particleCount * 3);
  particleColorsArray = new Float32Array(config.particleCount * 3);
  particleSizesArray = new Float32Array(config.particleCount);
  
  glowGeometry = new THREE.BufferGeometry();
  glowPositionsArray = new Float32Array(config.particleCount * 3);
  glowColorsArray = new Float32Array(config.particleCount * 3);
  glowSizesArray = new Float32Array(config.particleCount);
  
  const maxTrailSegments = config.particleCount * (config.trailLength - 1);
  trailGeometry = new THREE.BufferGeometry();
  trailPositionsArray = new Float32Array(maxTrailSegments * 2 * 3);
  trailColorsArray = new Float32Array(maxTrailSegments * 2 * 3);
  
  connectionGeometry = new THREE.BufferGeometry();
  connectionPositionsArray = new Float32Array(MAX_CONNECTIONS * 2 * 3);
  connectionColorsArray = new Float32Array(MAX_CONNECTIONS * 2 * 3);
  
  for (let i = 0; i < config.particleCount; i++) {
    const x = (Math.random() - 0.5) * 2 * BOUNDS;
    const y = (Math.random() - 0.5) * 2 * BOUNDS;
    const z = (Math.random() - 0.5) * 2 * BOUNDS;
    const size = 0.03 + Math.random() * 0.07;
    const color = getColorByHeight(y);
    
    const particle: Particle = {
      position: new THREE.Vector3(x, y, z),
      velocity: new THREE.Vector3(),
      size: size,
      color: color,
      trail: []
    };
    
    for (let j = 0; j < config.trailLength; j++) {
      particle.trail.push(new THREE.Vector3(x, y, z));
    }
    
    particles.push(particle);
    
    particlePositionsArray[i * 3] = x;
    particlePositionsArray[i * 3 + 1] = y;
    particlePositionsArray[i * 3 + 2] = z;
    
    particleColorsArray[i * 3] = color.r;
    particleColorsArray[i * 3 + 1] = color.g;
    particleColorsArray[i * 3 + 2] = color.b;
    
    particleSizesArray[i] = size;
    
    glowPositionsArray[i * 3] = x;
    glowPositionsArray[i * 3 + 1] = y;
    glowPositionsArray[i * 3 + 2] = z;
    
    glowColorsArray[i * 3] = color.r;
    glowColorsArray[i * 3 + 1] = color.g;
    glowColorsArray[i * 3 + 2] = color.b;
    
    glowSizesArray[i] = size * 3.0;
  }
  
  particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositionsArray, 3));
  particleGeometry.setAttribute('color', new THREE.BufferAttribute(particleColorsArray, 3));
  particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizesArray, 1));
  
  glowGeometry.setAttribute('position', new THREE.BufferAttribute(glowPositionsArray, 3));
  glowGeometry.setAttribute('color', new THREE.BufferAttribute(glowColorsArray, 3));
  glowGeometry.setAttribute('size', new THREE.BufferAttribute(glowSizesArray, 1));
  
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositionsArray, 3));
  trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColorsArray, 3));
  
  connectionGeometry.setAttribute('position', new THREE.BufferAttribute(connectionPositionsArray, 3));
  connectionGeometry.setAttribute('color', new THREE.BufferAttribute(connectionColorsArray, 3));
  
  const particleMaterial = createParticleShaderMaterial(particleTexture);
  glowMaterial = createGlowShaderMaterial(particleTexture);
  
  particlesMesh = new THREE.Points(particleGeometry, particleMaterial);
  glowMesh = new THREE.Points(glowGeometry, glowMaterial);
  
  const trailMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.3,
    linewidth: 1
  });
  
  const connectionMaterial = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0.4,
    linewidth: 1
  });
  
  trailLineSegments = new THREE.LineSegments(trailGeometry, trailMaterial);
  connectionLineSegments = new THREE.LineSegments(connectionGeometry, connectionMaterial);
  
  scene.add(trailLineSegments);
  scene.add(glowMesh);
  scene.add(particlesMesh);
  scene.add(connectionLineSegments);
  
  updateTrailGeometry();
  updateConnectionGeometry();
}

function updateTrailGeometry(): void {
  if (!trailGeometry || !trailPositionsArray || !trailColorsArray) return;
  
  let vertexIndex = 0;
  
  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];
    const trailLength = Math.min(particle.trail.length, config.trailLength);
    
    for (let j = 0; j < trailLength - 1; j++) {
      if (vertexIndex + 1 >= trailPositionsArray.length / 3) break;
      
      const p1 = particle.trail[j];
      const p2 = particle.trail[j + 1];
      
      const alpha = 1 - j / trailLength;
      
      trailPositionsArray[vertexIndex * 3] = p1.x;
      trailPositionsArray[vertexIndex * 3 + 1] = p1.y;
      trailPositionsArray[vertexIndex * 3 + 2] = p1.z;
      
      trailColorsArray[vertexIndex * 3] = particle.color.r * alpha;
      trailColorsArray[vertexIndex * 3 + 1] = particle.color.g * alpha;
      trailColorsArray[vertexIndex * 3 + 2] = particle.color.b * alpha;
      
      vertexIndex++;
      
      trailPositionsArray[vertexIndex * 3] = p2.x;
      trailPositionsArray[vertexIndex * 3 + 1] = p2.y;
      trailPositionsArray[vertexIndex * 3 + 2] = p2.z;
      
      const alpha2 = 1 - (j + 1) / trailLength;
      trailColorsArray[vertexIndex * 3] = particle.color.r * alpha2;
      trailColorsArray[vertexIndex * 3 + 1] = particle.color.g * alpha2;
      trailColorsArray[vertexIndex * 3 + 2] = particle.color.b * alpha2;
      
      vertexIndex++;
    }
  }
  
  trailGeometry.attributes.position.needsUpdate = true;
  trailGeometry.attributes.color.needsUpdate = true;
  (trailGeometry as any).setDrawRange(0, vertexIndex);
}

function updateConnectionGeometry(): void {
  if (!connectionGeometry || !connectionPositionsArray || !connectionColorsArray) return;
  
  let vertexIndex = 0;
  
  for (let i = 0; i < connections.length && i < MAX_CONNECTIONS; i++) {
    const conn = connections[i];
    const p1 = particles[conn.startIdx].position;
    const p2 = particles[conn.endIdx].position;
    
    const alpha = (conn.life / conn.duration) * 0.4;
    
    const color1 = particles[conn.startIdx].color;
    const color2 = particles[conn.endIdx].color;
    
    connectionPositionsArray[vertexIndex * 3] = p1.x;
    connectionPositionsArray[vertexIndex * 3 + 1] = p1.y;
    connectionPositionsArray[vertexIndex * 3 + 2] = p1.z;
    connectionColorsArray[vertexIndex * 3] = color1.r * alpha;
    connectionColorsArray[vertexIndex * 3 + 1] = color1.g * alpha;
    connectionColorsArray[vertexIndex * 3 + 2] = color1.b * alpha;
    
    vertexIndex++;
    
    connectionPositionsArray[vertexIndex * 3] = p2.x;
    connectionPositionsArray[vertexIndex * 3 + 1] = p2.y;
    connectionPositionsArray[vertexIndex * 3 + 2] = p2.z;
    connectionColorsArray[vertexIndex * 3] = color2.r * alpha;
    connectionColorsArray[vertexIndex * 3 + 1] = color2.g * alpha;
    connectionColorsArray[vertexIndex * 3 + 2] = color2.b * alpha;
    
    vertexIndex++;
  }
  
  for (let i = vertexIndex; i < MAX_CONNECTIONS * 2; i++) {
    connectionPositionsArray[i * 3] = 0;
    connectionPositionsArray[i * 3 + 1] = 0;
    connectionPositionsArray[i * 3 + 2] = 0;
    connectionColorsArray[i * 3] = 0;
    connectionColorsArray[i * 3 + 1] = 0;
    connectionColorsArray[i * 3 + 2] = 0;
  }
  
  connectionGeometry.attributes.position.needsUpdate = true;
  connectionGeometry.attributes.color.needsUpdate = true;
  (connectionGeometry as any).setDrawRange(0, connections.length * 2);
}

function checkConnections(): void {
  for (let i = connections.length - 1; i >= 0; i--) {
    connections[i].life -= CONNECTION_CHECK_INTERVAL;
    if (connections[i].life <= 0) {
      connections.splice(i, 1);
    }
  }
  
  const gridSize = 1.0;
  const grid: Map<string, number[]> = new Map();
  
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i].position;
    const gx = Math.floor(p.x / gridSize);
    const gy = Math.floor(p.y / gridSize);
    const gz = Math.floor(p.z / gridSize);
    const key = `${gx},${gy},${gz}`;
    
    if (!grid.has(key)) {
      grid.set(key, []);
    }
    grid.get(key)!.push(i);
  }
  
  const checked = new Set<string>();
  
  for (let i = 0; i < particles.length; i++) {
    if (connections.length >= MAX_CONNECTIONS) break;
    
    const p = particles[i].position;
    const gx = Math.floor(p.x / gridSize);
    const gy = Math.floor(p.y / gridSize);
    const gz = Math.floor(p.z / gridSize);
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${gx + dx},${gy + dy},${gz + dz}`;
          const cell = grid.get(key);
          if (!cell) continue;
          
          for (const j of cell) {
            if (j <= i) continue;
            
            const pairKey = `${Math.min(i, j)}-${Math.max(i, j)}`;
            if (checked.has(pairKey)) continue;
            checked.add(pairKey);
            
            const dist = particles[i].position.distanceTo(particles[j].position);
            if (dist < CONNECTION_DISTANCE) {
              const existing = connections.find(
                c => (c.startIdx === i && c.endIdx === j) || (c.startIdx === j && c.endIdx === i)
              );
              
              if (!existing && connections.length < MAX_CONNECTIONS) {
                connections.push({
                  startIdx: i,
                  endIdx: j,
                  life: CONNECTION_DURATION,
                  duration: CONNECTION_DURATION
                });
              } else if (existing) {
                existing.life = CONNECTION_DURATION;
              }
            }
          }
        }
      }
    }
  }
  
  updateConnectionGeometry();
}

let connectionCheckTimer = 0;
const CONNECTION_CHECK_INTERVAL = 0.1;

export function updateParticles(delta: number): void {
  if (particles.length === 0 || !particleGeometry || !particlePositionsArray || !particleColorsArray) return;
  
  updateFlowTime(delta);
  
  for (let i = 0; i < particles.length; i++) {
    const particle = particles[i];
    
    const velocity = computeVelocity(particle.position);
    particle.velocity.copy(velocity).multiplyScalar(config.speedMultiplier);
    
    particle.position.add(particle.velocity.clone().multiplyScalar(delta));
    
    if (particle.position.x > BOUNDS) particle.position.x = -BOUNDS;
    if (particle.position.x < -BOUNDS) particle.position.x = BOUNDS;
    if (particle.position.y > BOUNDS) particle.position.y = -BOUNDS;
    if (particle.position.y < -BOUNDS) particle.position.y = BOUNDS;
    if (particle.position.z > BOUNDS) particle.position.z = -BOUNDS;
    if (particle.position.z < -BOUNDS) particle.position.z = BOUNDS;
    
    particle.color.copy(getColorByHeight(particle.position.y));
    
    for (let j = particle.trail.length - 1; j > 0; j--) {
      particle.trail[j].copy(particle.trail[j - 1]);
    }
    particle.trail[0].copy(particle.position);
    
    particlePositionsArray[i * 3] = particle.position.x;
    particlePositionsArray[i * 3 + 1] = particle.position.y;
    particlePositionsArray[i * 3 + 2] = particle.position.z;
    
    particleColorsArray[i * 3] = particle.color.r;
    particleColorsArray[i * 3 + 1] = particle.color.g;
    particleColorsArray[i * 3 + 2] = particle.color.b;
    
    glowPositionsArray[i * 3] = particle.position.x;
    glowPositionsArray[i * 3 + 1] = particle.position.y;
    glowPositionsArray[i * 3 + 2] = particle.position.z;
    
    glowColorsArray[i * 3] = particle.color.r;
    glowColorsArray[i * 3 + 1] = particle.color.g;
    glowColorsArray[i * 3 + 2] = particle.color.b;
    
    glowSizesArray[i] = particle.size * 3.0 * config.glowIntensity;
  }
  
  particleGeometry.attributes.position.needsUpdate = true;
  particleGeometry.attributes.color.needsUpdate = true;
  
  if (glowGeometry) {
    glowGeometry.attributes.position.needsUpdate = true;
    glowGeometry.attributes.color.needsUpdate = true;
    glowGeometry.attributes.size.needsUpdate = true;
  }
  
  updateTrailGeometry();
  
  connectionCheckTimer += delta;
  if (connectionCheckTimer >= CONNECTION_CHECK_INTERVAL) {
    connectionCheckTimer = 0;
    checkConnections();
  }
}

export function setSpeedMultiplier(value: number): void {
  config.speedMultiplier = value;
}

export function setTrailLength(value: number): void {
  const oldLength = config.trailLength;
  config.trailLength = value;
  
  for (let i = 0; i < particles.length; i++) {
    while (particles[i].trail.length < config.trailLength) {
      particles[i].trail.push(particles[i].trail[particles[i].trail.length - 1].clone());
    }
    while (particles[i].trail.length > config.trailLength) {
      particles[i].trail.pop();
    }
  }
  
  const newMaxSegments = config.particleCount * (config.trailLength - 1);
  if (newMaxSegments * 2 * 3 > (trailPositionsArray?.length || 0)) {
    trailPositionsArray = new Float32Array(newMaxSegments * 2 * 3);
    trailColorsArray = new Float32Array(newMaxSegments * 2 * 3);
    trailGeometry?.setAttribute('position', new THREE.BufferAttribute(trailPositionsArray, 3));
    trailGeometry?.setAttribute('color', new THREE.BufferAttribute(trailColorsArray, 3));
  }
}

export function setGlowIntensity(value: number): void {
  config.glowIntensity = value;
  if (glowMaterial && glowMaterial.uniforms) {
    (glowMaterial.uniforms as any).glowIntensity.value = value;
  }
}

export function getParticleCount(): number {
  return config.particleCount;
}
