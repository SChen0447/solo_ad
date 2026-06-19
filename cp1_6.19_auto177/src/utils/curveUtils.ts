import * as THREE from 'three';
import { createSphericalCurvePoints, lerpColor, EARTH_RADIUS } from './geoUtils';
import type { OceanCurrent } from '../types';

export function createCurrentCurve(
  current: OceanCurrent
): THREE.CatmullRomCurve3 {
  const points = createSphericalCurvePoints(
    current.startLat, current.startLng,
    current.endLat, current.endLng,
    current.waypoints,
    200
  );
  
  return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
}

export function createGradientColors(
  colorStart: string,
  colorEnd: string,
  segments: number
): Float32Array {
  const colors = new Float32Array(segments * 3);
  
  for (let i = 0; i < segments; i++) {
    const t = i / (segments - 1);
    const color = lerpColor(colorStart, colorEnd, t);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  
  return colors;
}

export function createLineGeometry(
  curve: THREE.CatmullRomCurve3,
  colorStart: string,
  colorEnd: string,
  segments: number = 500
): THREE.BufferGeometry {
  const points = curve.getPoints(segments);
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  const colors = createGradientColors(colorStart, colorEnd, segments + 1);
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  return geometry;
}

export function createTubeGeometry(
  curve: THREE.CatmullRomCurve3,
  width: number,
  segments: number = 200
): THREE.BufferGeometry {
  const tubeRadius = (width / 4) * 0.015 + 0.005;
  return new THREE.TubeGeometry(curve, segments, tubeRadius, 8, false);
}

export class CurrentPath {
  private curve: THREE.CatmullRomCurve3;
  private line: THREE.Line;
  private tube: THREE.Mesh | null = null;
  private particles: THREE.Points | null = null;
  private particlePositions: Float32Array;
  private particleProgress: number[];
  private current: OceanCurrent;
  private isHighlighted: boolean = false;
  private baseOpacity: number = 0.7;
  private baseWidth: number;

  constructor(current: OceanCurrent) {
    this.current = current;
    this.curve = createCurrentCurve(current);
    this.baseWidth = current.width;
    
    const geometry = createLineGeometry(
      this.curve,
      current.colorStart,
      current.colorEnd,
      400
    );
    
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: this.baseOpacity,
      linewidth: Math.max(1, current.width),
    });
    
    this.line = new THREE.Line(geometry, material);
    this.line.userData = { currentId: current.id, type: 'current' };
    
    this.particleProgress = [];
    const particleCount = Math.min(8, Math.floor(current.flowRate / 15) + 2);
    this.particlePositions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      this.particleProgress.push(i / particleCount);
    }
    
    this.createParticles();
  }

  private createParticles(): void {
    const particleCount = this.particleProgress.length;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
      const t = this.particleProgress[i];
      const point = this.curve.getPointAt(t);
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = point.z;
      
      const color = lerpColor(this.current.colorStart, this.current.colorEnd, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const material = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });
    
    this.particles = new THREE.Points(geometry, material);
    this.particlePositions = positions;
  }

  update(deltaTime: number, speedMultiplier: number = 1): void {
    const speed = 0.05 * speedMultiplier;
    
    for (let i = 0; i < this.particleProgress.length; i++) {
      this.particleProgress[i] = (this.particleProgress[i] + speed * deltaTime * 60) % 1;
      
      const t = this.particleProgress[i];
      const point = this.curve.getPointAt(t);
      this.particlePositions[i * 3] = point.x;
      this.particlePositions[i * 3 + 1] = point.y;
      this.particlePositions[i * 3 + 2] = point.z;
    }
    
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array as Float32Array;
      positions.set(this.particlePositions);
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  setHighlighted(highlighted: boolean): void {
    this.isHighlighted = highlighted;
    const material = this.line.material as THREE.LineBasicMaterial;
    
    if (highlighted) {
      material.opacity = 1.0;
      (material as THREE.LineBasicMaterial).linewidth = this.baseWidth * 1.5;
    } else {
      material.opacity = this.baseOpacity;
      (material as THREE.LineBasicMaterial).linewidth = this.baseWidth;
    }
    
    material.needsUpdate = true;
  }

  getLine(): THREE.Line {
    return this.line;
  }

  getParticles(): THREE.Points | null {
    return this.particles;
  }

  getCurve(): THREE.CatmullRomCurve3 {
    return this.curve;
  }

  getCurrentId(): string {
    return this.current.id;
  }

  dispose(): void {
    this.line.geometry.dispose();
    (this.line.material as THREE.Material).dispose();
    
    if (this.particles) {
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
    }
    
    if (this.tube) {
      this.tube.geometry.dispose();
      (this.tube.material as THREE.Material).dispose();
    }
  }
}

export function getPositionOnCurve(curve: THREE.CatmullRomCurve3, t: number, offset: number = 0): THREE.Vector3 {
  const point = curve.getPointAt(t);
  if (offset === 0) return point;
  
  const nextPoint = curve.getPointAt(Math.min(1, t + 0.01));
  const tangent = nextPoint.clone().sub(point).normalize();
  const normal = point.clone().normalize();
  const binormal = new THREE.Vector3().crossVectors(tangent, normal).normalize();
  
  return point.clone().add(binormal.multiplyScalar(offset));
}
