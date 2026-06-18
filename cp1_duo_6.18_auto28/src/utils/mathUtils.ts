export interface SunPosition {
  elevation: number;
  azimuth: number;
}

export interface BuildingBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export function computeSunPosition(dayOfYear: number, hour: number): SunPosition {
  const declination = 23.45 * Math.sin((360 / 365) * (dayOfYear - 81) * (Math.PI / 180));

  const hourAngle = (hour - 12) * 15;

  const lat = 39.9;

  const latRad = lat * (Math.PI / 180);
  const decRad = declination * (Math.PI / 180);
  const haRad = hourAngle * (Math.PI / 180);

  const sinElevation =
    Math.sin(latRad) * Math.sin(decRad) +
    Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);

  const elevation = Math.asin(Math.max(-1, Math.min(1, sinElevation))) * (180 / Math.PI);

  const cosAzimuth =
    (Math.sin(decRad) - Math.sin(latRad) * sinElevation) /
    (Math.cos(latRad) * Math.cos(Math.asin(Math.max(-1, Math.min(1, sinElevation)))));

  let azimuth = Math.acos(Math.max(-1, Math.min(1, cosAzimuth))) * (180 / Math.PI);

  if (hour > 12) {
    azimuth = 360 - azimuth;
  }

  return {
    elevation: Math.max(0, elevation),
    azimuth: azimuth,
  };
}

export function sunToDirectionVector(sunPos: SunPosition): Vector3 {
  const elevRad = sunPos.elevation * (Math.PI / 180);
  const azimRad = sunPos.azimuth * (Math.PI / 180);

  return {
    x: Math.sin(azimRad) * Math.cos(elevRad),
    y: Math.sin(elevRad),
    z: Math.cos(azimRad) * Math.cos(elevRad),
  };
}

export function createBuildingBounds(
  position: Vector3,
  width: number,
  depth: number,
  height: number
): BuildingBounds {
  return {
    minX: position.x - width / 2,
    maxX: position.x + width / 2,
    minY: position.y,
    maxY: position.y + height,
    minZ: position.z - depth / 2,
    maxZ: position.z + depth / 2,
  };
}

export interface RayPlaneIntersection {
  point: Vector3 | null;
  t: number;
}

export function rayPlaneIntersection(
  rayOrigin: Vector3,
  rayDirection: Vector3,
  planePoint: Vector3,
  planeNormal: Vector3
): RayPlaneIntersection {
  const denom =
    planeNormal.x * rayDirection.x +
    planeNormal.y * rayDirection.y +
    planeNormal.z * rayDirection.z;

  if (Math.abs(denom) < 0.0001) {
    return { point: null, t: -1 };
  }

  const t =
    ((planePoint.x - rayOrigin.x) * planeNormal.x +
      (planePoint.y - rayOrigin.y) * planeNormal.y +
      (planePoint.z - rayOrigin.z) * planeNormal.z) /
    denom;

  if (t < 0) {
    return { point: null, t };
  }

  return {
    point: {
      x: rayOrigin.x + rayDirection.x * t,
      y: rayOrigin.y + rayDirection.y * t,
      z: rayOrigin.z + rayDirection.z * t,
    },
    t,
  };
}

export function formatTime(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

export function formatDate(dayOfYear: number): string {
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let remaining = dayOfYear;
  let month = 0;

  for (let i = 0; i < monthDays.length; i++) {
    if (remaining <= monthDays[i]) {
      month = i;
      break;
    }
    remaining -= monthDays[i];
  }

  return `${month + 1}月${remaining}日`;
}

export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}
