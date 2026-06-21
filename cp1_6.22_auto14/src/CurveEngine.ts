import * as THREE from 'three'

export interface ControlPoint {
  position: THREE.Vector3
  color: number
}

export function bezierPoint(t: number, points: THREE.Vector3[]): THREE.Vector3 {
  const n = points.length - 1
  const temp: THREE.Vector3[] = points.map(p => p.clone())

  for (let r = 1; r <= n; r++) {
    for (let i = 0; i <= n - r; i++) {
      temp[i].lerpVectors(temp[i], temp[i + 1], t)
    }
  }

  return temp[0]
}

export function computeCurvePoints(
  controlPoints: THREE.Vector3[],
  sampleCount: number = 60
): THREE.Vector3[] {
  const points: THREE.Vector3[] = []
  for (let i = 0; i <= sampleCount; i++) {
    const t = i / sampleCount
    points.push(bezierPoint(t, controlPoints))
  }
  return points
}

export function updateCurveGeometry(
  controlPoints: THREE.Vector3[],
  line: THREE.Line,
  pointsMesh?: THREE.Points
): void {
  const curvePoints = computeCurvePoints(controlPoints)
  const positions = new Float32Array(curvePoints.length * 3)

  for (let i = 0; i < curvePoints.length; i++) {
    positions[i * 3] = curvePoints[i].x
    positions[i * 3 + 1] = curvePoints[i].y
    positions[i * 3 + 2] = curvePoints[i].z
  }

  const lineGeometry = line.geometry as THREE.BufferGeometry
  lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  lineGeometry.computeBoundingSphere()

  if (pointsMesh) {
    const pointsGeometry = pointsMesh.geometry as THREE.BufferGeometry
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    pointsGeometry.computeBoundingSphere()
  }
}

export function getPointOnCurve(
  controlPoints: THREE.Vector3[],
  t: number
): THREE.Vector3 {
  return bezierPoint(t, controlPoints)
}

export const defaultControlPoints: THREE.Vector3[] = [
  new THREE.Vector3(-4, 0, -2),
  new THREE.Vector3(-2, 2, 1),
  new THREE.Vector3(2, -1, -1),
  new THREE.Vector3(4, 1, 2)
]

export const spiralControlPoints: THREE.Vector3[] = [
  new THREE.Vector3(0, 0, 3),
  new THREE.Vector3(2.5, 0.5, 2.5),
  new THREE.Vector3(3, 1, 0),
  new THREE.Vector3(2.5, 1.5, -2.5),
  new THREE.Vector3(0, 2, -3),
  new THREE.Vector3(-2.5, 2.5, -2.5),
  new THREE.Vector3(-3, 3, 0),
  new THREE.Vector3(-2, 3.5, 2)
]

export const pointColors: number[] = [
  0xff4444,
  0xffaa00,
  0x4488ff,
  0x44dd44,
  0xff44ff,
  0x44ffff,
  0xffaa44,
  0xaa44ff
]
