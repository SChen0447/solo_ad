export interface DiffractionSpot {
  x: number
  y: number
  intensity: number
  hkl: string
}

const degToRad = (deg: number) => (deg * Math.PI) / 180

export interface CrystalPlanes {
  normal: [number, number, number]
  d: number
  hkl: string
}

const crystalPlanes: CrystalPlanes[] = [
  { normal: [1, 0, 0], d: 1.0, hkl: '(100)' },
  { normal: [0, 1, 0], d: 1.0, hkl: '(010)' },
  { normal: [0, 0, 1], d: 1.0, hkl: '(001)' },
  { normal: [1, 1, 0], d: 0.707, hkl: '(110)' },
  { normal: [1, 0, 1], d: 0.707, hkl: '(101)' },
  { normal: [0, 1, 1], d: 0.707, hkl: '(011)' },
  { normal: [1, 1, 1], d: 0.577, hkl: '(111)' },
  { normal: [2, 0, 0], d: 0.5, hkl: '(200)' },
  { normal: [0, 2, 0], d: 0.5, hkl: '(020)' },
  { normal: [0, 0, 2], d: 0.5, hkl: '(002)' },
]

function normalize(v: [number, number, number]): [number, number, number] {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
  if (len === 0) return [0, 0, 0]
  return [v[0] / len, v[1] / len, v[2] / len]
}

function rotateVector(
  v: [number, number, number],
  rotationAngle: number,
  tiltAngle: number
): [number, number, number] {
  const rotRad = degToRad(rotationAngle)
  const tiltRad = degToRad(tiltAngle)

  const cosRot = Math.cos(rotRad)
  const sinRot = Math.sin(rotRad)
  const cosTilt = Math.cos(tiltRad)
  const sinTilt = Math.sin(tiltRad)

  const x1 = v[0] * cosRot - v[1] * sinRot
  const y1 = v[0] * sinRot + v[1] * cosRot
  const z1 = v[2]

  const x2 = x1
  const y2 = y1 * cosTilt - z1 * sinTilt
  const z2 = y1 * sinTilt + z1 * cosTilt

  return [x2, y2, z2]
}

function dot(a: [number, number, number], b: [number, number, number]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

function reflect(
  incident: [number, number, number],
  normal: [number, number, number]
): [number, number, number] {
  const d = dot(incident, normal)
  return [
    incident[0] - 2 * d * normal[0],
    incident[1] - 2 * d * normal[1],
    incident[2] - 2 * d * normal[2],
  ]
}

export function calculateDiffraction(
  rotationAngle: number,
  tiltAngle: number,
  incidentAngle: number
): DiffractionSpot[] {
  const spots: DiffractionSpot[] = []
  const wavelength = 0.71

  const incidentRad = degToRad(incidentAngle)
  const incidentDir: [number, number, number] = normalize([
    0,
    Math.sin(incidentRad),
    -Math.cos(incidentRad),
  ])

  for (const plane of crystalPlanes) {
    const rotatedNormal = normalize(
      rotateVector(plane.normal, rotationAngle, tiltAngle)
    )

    const cosTheta = Math.abs(dot(incidentDir, rotatedNormal))
    const sinTheta = Math.sqrt(1 - cosTheta * cosTheta)

    const braggCondition = 2 * plane.d * sinTheta

    if (Math.abs(braggCondition - wavelength) < 0.5 || sinTheta < 0.99) {
      let intensity = 0
      const braggMatch = 1 - Math.min(1, Math.abs(braggCondition - wavelength) / 0.5)
      const structureFactor = Math.abs(dot(incidentDir, rotatedNormal))

      intensity = braggMatch * 0.7 + structureFactor * 0.3
      intensity = Math.min(1, Math.max(0.05, intensity))

      const reflected = reflect(incidentDir, rotatedNormal)

      const screenZ = 3
      const t = (screenZ - 0) / reflected[2]

      if (t > 0 && isFinite(t)) {
        const screenX = reflected[0] * t
        const screenY = reflected[1] * t

        const maxCoord = 2.5
        if (Math.abs(screenX) < maxCoord && Math.abs(screenY) < maxCoord) {
          spots.push({
            x: screenX,
            y: screenY,
            intensity,
            hkl: plane.hkl,
          })
        }
      }
    }
  }

  spots.sort((a, b) => b.intensity - a.intensity)
  return spots
}

export function getLaserPaths(
  rotationAngle: number,
  tiltAngle: number,
  incidentAngle: number
): {
  incidentStart: [number, number, number]
  incidentEnd: [number, number, number]
  reflectedStart: [number, number, number]
  reflectedEnd: [number, number, number]
  reflectionPoint: [number, number, number]
} {
  const incidentRad = degToRad(incidentAngle)
  const incidentDir: [number, number, number] = normalize([
    0,
    Math.sin(incidentRad),
    -Math.cos(incidentRad),
  ])

  const dominantPlane = crystalPlanes[0]
  const rotatedNormal = normalize(
    rotateVector(dominantPlane.normal, rotationAngle, tiltAngle)
  )

  const reflected = reflect(incidentDir, rotatedNormal)

  const reflectionPoint: [number, number, number] = [0, 0, 0]

  const incidentLength = 3.5
  const reflectedLength = 3.5

  const incidentStart: [number, number, number] = [
    reflectionPoint[0] - incidentDir[0] * incidentLength,
    reflectionPoint[1] - incidentDir[1] * incidentLength,
    reflectionPoint[2] - incidentDir[2] * incidentLength,
  ]

  const incidentEnd: [number, number, number] = reflectionPoint

  const reflectedStart: [number, number, number] = reflectionPoint

  const reflectedEnd: [number, number, number] = [
    reflectionPoint[0] + reflected[0] * reflectedLength,
    reflectionPoint[1] + reflected[1] * reflectedLength,
    reflectionPoint[2] + reflected[2] * reflectedLength,
  ]

  return {
    incidentStart,
    incidentEnd,
    reflectedStart,
    reflectedEnd,
    reflectionPoint,
  }
}
