const SPHERE_RADIUS = 8;

export function latLngToVector3(latitude: number, longitude: number): { x: number; y: number; z: number } {
  const phi = (90 - latitude) * (Math.PI / 180);
  const theta = (longitude + 180) * (Math.PI / 180);

  const x = -(SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta));
  const z = SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta);
  const y = SPHERE_RADIUS * Math.cos(phi);

  return { x, y, z };
}

export function getMonthIndex(timestamp: string): number {
  const parts = timestamp.split('-');
  if (parts.length >= 2) {
    return parseInt(parts[1], 10) - 1;
  }
  return 0;
}

export function getMonthLabel(index: number): string {
  const month = String(index + 1).padStart(2, '0');
  return `2024-${month}`;
}

export function scaleEventCount(count: number, minSize = 0.15, maxSize = 0.75): number {
  const min = 5;
  const max = 70;
  const normalized = Math.max(0, Math.min(1, (count - min) / (max - min)));
  return minSize + normalized * (maxSize - minSize);
}
