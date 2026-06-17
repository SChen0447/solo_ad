import * as THREE from 'three';

export function createBezierPaths(count: number, scale: number = 2): THREE.CatmullRomCurve3[] {
  const paths: THREE.CatmullRomCurve3[] = [];

  for (let i = 0; i < count; i++) {
    const points: THREE.Vector3[] = [];
    const numPoints = 6 + Math.floor(Math.random() * 4);
    const radius = scale * (0.5 + Math.random() * 0.8);
    const yOffset = (Math.random() - 0.5) * scale * 0.5;
    const rotationOffset = (i / count) * Math.PI * 2;

    for (let j = 0; j < numPoints; j++) {
      const angle = (j / numPoints) * Math.PI * 2 + rotationOffset;
      const r = radius * (0.7 + Math.random() * 0.6);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = yOffset + Math.sin(angle * 2 + rotationOffset) * scale * 0.3 + (Math.random() - 0.5) * scale * 0.2;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5);
    paths.push(curve);
  }

  return paths;
}

export function createSpiralPaths(count: number, scale: number = 2): THREE.CatmullRomCurve3[] {
  const paths: THREE.CatmullRomCurve3[] = [];

  for (let i = 0; i < count; i++) {
    const points: THREE.Vector3[] = [];
    const numPoints = 30;
    const spiralOffset = (i / count) * Math.PI * 2;
    const heightScale = scale * (0.8 + Math.random() * 0.4);
    const radiusScale = scale * (0.4 + Math.random() * 0.4);

    for (let j = 0; j < numPoints; j++) {
      const t = j / (numPoints - 1);
      const angle = t * Math.PI * 4 + spiralOffset;
      const radius = radiusScale * (0.3 + t * 0.7) * (0.8 + Math.sin(t * Math.PI * 3) * 0.2);
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = (t - 0.5) * heightScale * 2;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);
    paths.push(curve);
  }

  return paths;
}

export function createRandomPaths(count: number, scale: number = 2): THREE.CatmullRomCurve3[] {
  const bezierCount = Math.ceil(count * 0.6);
  const spiralCount = count - bezierCount;
  return [...createBezierPaths(bezierCount, scale), ...createSpiralPaths(spiralCount, scale)];
}

export function precomputePathPoints(
  path: THREE.CatmullRomCurve3,
  numSamples: number
): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let i = 0; i <= numSamples; i++) {
    points.push(path.getPoint(i / numSamples));
  }
  return points;
}

export function getPositionOnPath(
  precomputedPoints: THREE.Vector3[],
  t: number
): THREE.Vector3 {
  const clampedT = ((t % 1) + 1) % 1;
  const index = clampedT * (precomputedPoints.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.min(precomputedPoints.length - 1, lowerIndex + 1);
  const localT = index - lowerIndex;

  return precomputedPoints[lowerIndex]
    .clone()
    .lerp(precomputedPoints[upperIndex], localT);
}
