import * as THREE from 'three';
import type { Point3D } from '../types';

export const EARTH_RADIUS = 1;

export function latLngToVector3(lat: number, lng: number, radius: number = EARTH_RADIUS): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);

  return new THREE.Vector3(x, y, z);
}

export function latLngToPoint3D(lat: number, lng: number, radius: number = EARTH_RADIUS): Point3D {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  return {
    x: -radius * Math.sin(phi) * Math.cos(theta),
    y: radius * Math.cos(phi),
    z: radius * Math.sin(phi) * Math.sin(theta),
  };
}

export function point3DToVector3(point: Point3D): THREE.Vector3 {
  return new THREE.Vector3(point.x, point.y, point.z);
}

export function getSphericalMidpoint(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  heightOffset: number = 0.15
): Point3D {
  const p1 = latLngToVector3(lat1, lng1);
  const p2 = latLngToVector3(lat2, lng2);
  
  const mid = p1.clone().add(p2).normalize();
  const radius = EARTH_RADIUS + heightOffset;
  
  return {
    x: mid.x * radius,
    y: mid.y * radius,
    z: mid.z * radius,
  };
}

export function interpolateOnSphere(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  t: number
): THREE.Vector3 {
  const p1 = latLngToVector3(lat1, lng1);
  const p2 = latLngToVector3(lat2, lng2);
  
  const dot = p1.dot(p2);
  const omega = Math.acos(Math.max(-1, Math.min(1, dot)));
  
  if (omega === 0) {
    return p1.clone();
  }
  
  const sinOmega = Math.sin(omega);
  const ratio1 = Math.sin((1 - t) * omega) / sinOmega;
  const ratio2 = Math.sin(t * omega) / sinOmega;
  
  return new THREE.Vector3(
    ratio1 * p1.x + ratio2 * p2.x,
    ratio1 * p1.y + ratio2 * p2.y,
    ratio1 * p1.z + ratio2 * p2.z
  );
}

export function createSphericalCurvePoints(
  startLat: number, startLng: number,
  endLat: number, endLng: number,
  waypoints?: { lat: number; lng: number }[],
  segments: number = 100
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  
  const allPoints: { lat: number; lng: number }[] = [
    { lat: startLat, lng: startLng },
    ...(waypoints || []),
    { lat: endLat, lng: endLng },
  ];
  
  for (let i = 0; i < allPoints.length - 1; i++) {
    const segStart = allPoints[i];
    const segEnd = allPoints[i + 1];
    const segSegments = Math.floor(segments / (allPoints.length - 1));
    
    for (let j = 0; j <= segSegments; j++) {
      if (i > 0 && j === 0) continue;
      const t = j / segSegments;
      const point = interpolateOnSphere(segStart.lat, segStart.lng, segEnd.lat, segEnd.lng, t);
      
      const heightOffset = Math.sin(t * Math.PI) * 0.12;
      const normalized = point.clone().normalize();
      point.x = normalized.x * (EARTH_RADIUS + 0.02 + heightOffset);
      point.y = normalized.y * (EARTH_RADIUS + 0.02 + heightOffset);
      point.z = normalized.z * (EARTH_RADIUS + 0.02 + heightOffset);
      
      points.push(point);
    }
  }
  
  return points;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  } : { r: 1, g: 1, b: 1 };
}

export function lerpColor(color1: string, color2: string, t: number): THREE.Color {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  return new THREE.Color(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
}

export function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(1, (value - min) / (max - min)));
}
