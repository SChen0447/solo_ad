export const EARTH_RADIUS = 5;
export const ATMOSPHERE_RADIUS = 5.2;
export const MIN_MAGNITUDE = 1.5;
export const MAX_MAGNITUDE = 9;
export const MIN_MARKER_RADIUS = 0.08;
export const MAX_MARKER_RADIUS = 0.5;
export const MIN_ZOOM = 2;
export const MAX_ZOOM = 20;
export const DAMPING = 0.85;
export const CACHE_INTERVAL = 30000;
export const PULSE_PERIOD = 2;
export const TIME_WINDOW_HOURS = 24;

export const DEPTH_COLORS: Record<string, string> = {
  shallow: '#ff4500',
  moderate: '#ffa500',
  deep: '#ffd700',
  verydeep: '#00bfff',
};

export function getDepthCategory(depth: number): string {
  if (depth <= 30) return 'shallow';
  if (depth <= 100) return 'moderate';
  if (depth <= 300) return 'deep';
  return 'verydeep';
}

export function getDepthColor(depth: number): string {
  return DEPTH_COLORS[getDepthCategory(depth)];
}

export function magnitudeToRadius(mag: number): number {
  const clamped = Math.max(MIN_MAGNITUDE, Math.min(MAX_MAGNITUDE, mag));
  const t = (clamped - MIN_MAGNITUDE) / (MAX_MAGNITUDE - MIN_MAGNITUDE);
  return MIN_MARKER_RADIUS + t * (MAX_MARKER_RADIUS - MIN_MARKER_RADIUS);
}

export function latLonToVector3(
  lat: number,
  lon: number,
  radius: number = EARTH_RADIUS
): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return [x, y, z];
}

export function formatTimestamp(ms: number): string {
  const date = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function formatTimeShort(ms: number): string {
  const date = new Date(ms);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
