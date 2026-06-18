import * as THREE from 'three';
import type { SliceData } from './stores/caveStore';

export function computeSlice(
  lineStart: THREE.Vector3,
  lineEnd: THREE.Vector3,
  tunnelMeshes: THREE.BufferGeometry[],
  tunnelPaths: THREE.Vector3[][]
): SliceData {
  const lineDir = new THREE.Vector3().subVectors(lineEnd, lineStart).normalize();
  const sliceNormal = new THREE.Vector3(-lineDir.z, 0, lineDir.x).normalize();
  const sliceOrigin = new THREE.Vector3().addVectors(lineStart, lineEnd).multiplyScalar(0.5);

  const plane = new THREE.Plane();
  plane.setFromNormalAndCoplanarPoint(sliceNormal, sliceOrigin);

  const sliceUp = new THREE.Vector3(0, 1, 0);
  const sliceRight = new THREE.Vector3().crossVectors(sliceUp, sliceNormal).normalize();

  const allIntersections: { point: THREE.Vector3; density: number }[] = [];

  for (const geometry of tunnelMeshes) {
    const posAttr = geometry.getAttribute('position');
    const indexAttr = geometry.getIndex();

    if (!posAttr || !indexAttr) continue;

    for (let i = 0; i < indexAttr.count; i += 3) {
      const a = indexAttr.getX(i);
      const b = indexAttr.getX(i + 1);
      const c = indexAttr.getX(i + 2);

      const vA = new THREE.Vector3(posAttr.getX(a), posAttr.getY(a), posAttr.getZ(a));
      const vB = new THREE.Vector3(posAttr.getX(b), posAttr.getY(b), posAttr.getZ(b));
      const vC = new THREE.Vector3(posAttr.getX(c), posAttr.getY(c), posAttr.getZ(c));

      const intersections: THREE.Vector3[] = [];

      const tri = [vA, vB, vC];
      for (let e = 0; e < 3; e++) {
        const p1 = tri[e];
        const p2 = tri[(e + 1) % 3];
        const d1 = plane.distanceToPoint(p1);
        const d2 = plane.distanceToPoint(p2);

        if ((d1 < 0 && d2 >= 0) || (d1 >= 0 && d2 < 0)) {
          const t = d1 / (d1 - d2);
          const intersection = new THREE.Vector3().lerpVectors(p1, p2, t);
          intersections.push(intersection);
        }
      }

      for (const pt of intersections) {
        const center = new THREE.Vector3(
          (vA.x + vB.x + vC.x) / 3,
          (vA.y + vB.y + vC.y) / 3,
          (vA.z + vB.z + vC.z) / 3
        );
        let minPathDist = Infinity;
        for (const path of tunnelPaths) {
          for (const pathPt of path) {
            const d = center.distanceTo(pathPt);
            if (d < minPathDist) minPathDist = d;
          }
        }
        const density = Math.max(0.1, Math.min(1, minPathDist / 15));
        allIntersections.push({ point: pt, density });
      }
    }
  }

  const contourPoints: THREE.Vector2[] = [];
  const densityMap: number[] = [];

  const sliceWidth = lineStart.distanceTo(lineEnd);
  const sliceHeight = 40;

  for (const intersection of allIntersections) {
    const localPos = intersection.point.clone().sub(sliceOrigin);
    const x = localPos.dot(sliceRight);
    const y = localPos.dot(sliceUp);
    contourPoints.push(new THREE.Vector2(x, y));
    densityMap.push(intersection.density);
  }

  const gridRes = 32;
  const densityGrid: number[] = new Array(gridRes * gridRes).fill(0.8);

  for (const pt of allIntersections) {
    const localPos = pt.point.clone().sub(sliceOrigin);
    const x = localPos.dot(sliceRight);
    const y = localPos.dot(sliceUp);
    const gx = Math.floor(((x + sliceWidth / 2) / sliceWidth) * gridRes);
    const gy = Math.floor(((y + sliceHeight / 2) / sliceHeight) * gridRes);
    if (gx >= 0 && gx < gridRes && gy >= 0 && gy < gridRes) {
      densityGrid[gy * gridRes + gx] = pt.density;
    }
  }

  return {
    contourPoints,
    densityMap: densityGrid,
    width: sliceWidth,
    height: sliceHeight,
    origin: sliceOrigin,
    normal: sliceNormal,
  };
}
