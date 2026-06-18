import * as THREE from 'three'
import { MatchResult } from '../store/appStore'

export interface EdgeExtractionResult {
  edgePoints: THREE.Vector3[]
  curvatures: number[]
  edgeIndices: number[]
}

export class MatchingEngine {
  private static readonly EDGE_ANGLE_THRESHOLD = Math.PI / 4
  private static readonly CURVATURE_SAMPLE_COUNT = 64
  private static readonly EDGE_SAMPLE_COUNT = 128

  public static extractEdgesAndCurvatures(
    geometry: THREE.BufferGeometry
  ): EdgeExtractionResult {
    const positions = geometry.attributes.position
    if (!positions) {
      return { edgePoints: [], curvatures: [], edgeIndices: [] }
    }

    const index = geometry.index
    const vertexCount = positions.count
    const faceCount = index ? index.count / 3 : vertexCount / 3

    const faceNormals: THREE.Vector3[] = []
    const vertexFaceMap: Map<number, number[]> = new Map()

    for (let i = 0; i < faceCount; i++) {
      const i0 = index ? index.getX(i * 3) : i * 3
      const i1 = index ? index.getX(i * 3 + 1) : i * 3 + 1
      const i2 = index ? index.getX(i * 3 + 2) : i * 3 + 2

      const v0 = new THREE.Vector3(
        positions.getX(i0),
        positions.getY(i0),
        positions.getZ(i0)
      )
      const v1 = new THREE.Vector3(
        positions.getX(i1),
        positions.getY(i1),
        positions.getZ(i1)
      )
      const v2 = new THREE.Vector3(
        positions.getX(i2),
        positions.getY(i2),
        positions.getZ(i2)
      )

      const edge1 = new THREE.Vector3().subVectors(v1, v0)
      const edge2 = new THREE.Vector3().subVectors(v2, v0)
      const normal = new THREE.Vector3().crossVectors(edge1, edge2).normalize()

      faceNormals.push(normal)

      ;[i0, i1, i2].forEach((vi) => {
        if (!vertexFaceMap.has(vi)) {
          vertexFaceMap.set(vi, [])
        }
        vertexFaceMap.get(vi)!.push(i)
      })
    }

    const edgeSet: Set<string> = new Set()
    const edgePoints: THREE.Vector3[] = []
    const edgeIndices: number[] = []
    const curvatures: number[] = []

    for (let i = 0; i < faceCount; i++) {
      const i0 = index ? index.getX(i * 3) : i * 3
      const i1 = index ? index.getX(i * 3 + 1) : i * 3 + 1
      const i2 = index ? index.getX(i * 3 + 2) : i * 3 + 2

      const edges = [
        [i0, i1],
        [i1, i2],
        [i2, i0]
      ]

      edges.forEach(([a, b]) => {
        const edgeKey = a < b ? `${a}_${b}` : `${b}_${a}`
        if (edgeSet.has(edgeKey)) return
        edgeSet.add(edgeKey)

        const facesA = vertexFaceMap.get(a) || []
        const facesB = vertexFaceMap.get(b) || []
        const sharedFaces = facesA.filter((f) => facesB.includes(f))

        if (sharedFaces.length < 2) {
          const va = new THREE.Vector3(
            positions.getX(a),
            positions.getY(a),
            positions.getZ(a)
          )
          const vb = new THREE.Vector3(
            positions.getX(b),
            positions.getY(b),
            positions.getZ(b)
          )
          const midPoint = new THREE.Vector3()
            .addVectors(va, vb)
            .multiplyScalar(0.5)

          edgePoints.push(midPoint)
          edgeIndices.push(a, b)

          const curvature = this.calculateVertexCurvature(
            a,
            positions,
            vertexFaceMap,
            faceNormals
          )
          curvatures.push(curvature)
        }
      })
    }

    const sampled = this.sampleEdgePointsUniformly(
      edgePoints,
      curvatures,
      this.EDGE_SAMPLE_COUNT
    )

    return {
      edgePoints: sampled.points,
      curvatures: sampled.curvatures,
      edgeIndices
    }
  }

  private static calculateVertexCurvature(
    vertexIndex: number,
    positions: THREE.BufferAttribute,
    vertexFaceMap: Map<number, number[]>,
    faceNormals: THREE.Vector3[]
  ): number {
    const faces = vertexFaceMap.get(vertexIndex) || []
    if (faces.length < 2) return 0

    let totalAngle = 0
    let normalVariance = 0

    const vp = new THREE.Vector3(
      positions.getX(vertexIndex),
      positions.getY(vertexIndex),
      positions.getZ(vertexIndex)
    )

    for (let i = 0; i < faces.length; i++) {
      for (let j = i + 1; j < faces.length; j++) {
        const dot = faceNormals[faces[i]].dot(faceNormals[faces[j]])
        normalVariance += Math.acos(Math.max(-1, Math.min(1, dot)))
      }
      totalAngle += 1
    }

    if (totalAngle <= 1) return 0
    return normalVariance / (totalAngle * (totalAngle - 1) * 0.5)
  }

  private static sampleEdgePointsUniformly(
    points: THREE.Vector3[],
    curvatures: number[],
    targetCount: number
  ): { points: THREE.Vector3[]; curvatures: number[] } {
    if (points.length <= targetCount) {
      return { points: [...points], curvatures: [...curvatures] }
    }

    const step = points.length / targetCount
    const sampledPoints: THREE.Vector3[] = []
    const sampledCurvatures: number[] = []

    for (let i = 0; i < targetCount; i++) {
      const idx = Math.min(Math.floor(i * step), points.length - 1)
      sampledPoints.push(points[idx].clone())
      sampledCurvatures.push(curvatures[idx])
    }

    return { points: sampledPoints, curvatures: sampledCurvatures }
  }

  public static calculateMatchScore(
    fragAPos: THREE.Vector3,
    fragARot: THREE.Euler,
    fragBPos: THREE.Vector3,
    fragBRot: THREE.Euler,
    fragAEdges: THREE.Vector3[],
    fragBEdges: THREE.Vector3[],
    fragACurvatures: number[],
    fragBCurvatures: number[]
  ): MatchResult | null {
    if (fragAEdges.length === 0 || fragBEdges.length === 0) {
      return null
    }

    const distance = fragAPos.distanceTo(fragBPos)
    const edgeDistance = distance

    const rotA = new THREE.Matrix4().makeRotationFromEuler(fragARot)
    const rotB = new THREE.Matrix4().makeRotationFromEuler(fragBRot)
    const transA = new THREE.Matrix4().makeTranslation(fragAPos)
    const transB = new THREE.Matrix4().makeTranslation(fragBPos)

    const worldAEdges = fragAEdges.map((p) =>
      p.clone().applyMatrix4(transA).applyMatrix4(rotA)
    )
    const worldBEdges = fragBEdges.map((p) =>
      p.clone().applyMatrix4(transB).applyMatrix4(rotB)
    )

    const curvatureScore = this.compareCurvatureSignatures(
      fragACurvatures,
      fragBCurvatures
    )

    const edgeDistanceScore = this.calculateEdgeProximityScore(
      worldAEdges,
      worldBEdges
    )

    const normalAlignScore = this.calculateNormalAlignment(
      worldAEdges,
      worldBEdges,
      fragAPos,
      fragBPos
    )

    const totalScore = Math.round(
      curvatureScore * 0.4 + edgeDistanceScore * 0.35 + normalAlignScore * 0.25
    )

    const alignMatrix = this.calculateBestAlignmentMatrix(
      fragAPos,
      fragARot,
      fragBPos,
      fragBRot,
      worldAEdges,
      worldBEdges
    )

    return {
      fragmentAId: '',
      fragmentBId: '',
      score: totalScore,
      bestAlignMatrix: alignMatrix,
      edgeDistance,
      timestamp: Date.now()
    }
  }

  private static compareCurvatureSignatures(
    curvA: number[],
    curvB: number[]
  ): number {
    if (curvA.length === 0 || curvB.length === 0) return 0

    const len = Math.min(this.CURVATURE_SAMPLE_COUNT, curvA.length, curvB.length)
    let bestScore = 0

    for (let offset = 0; offset < len; offset++) {
      let similarity = 0
      for (let i = 0; i < len; i++) {
        const idxA = i % curvA.length
        const idxB = (i + offset) % curvB.length
        const diff = Math.abs(curvA[idxA] - curvB[idxB])
        similarity += Math.max(0, 1 - diff / 2.0)
      }
      bestScore = Math.max(bestScore, similarity / len)
    }

    return bestScore * 100
  }

  private static calculateEdgeProximityScore(
    edgesA: THREE.Vector3[],
    edgesB: THREE.Vector3[]
  ): number {
    if (edgesA.length === 0 || edgesB.length === 0) return 0

    let totalMinDist = 0
    const sampleCount = Math.min(edgesA.length, 64)

    for (let i = 0; i < sampleCount; i++) {
      const idx = Math.floor((i / sampleCount) * edgesA.length)
      const pA = edgesA[idx]
      let minDist = Infinity

      for (const pB of edgesB) {
        const d = pA.distanceTo(pB)
        if (d < minDist) minDist = d
      }
      totalMinDist += minDist
    }

    const avgDist = totalMinDist / sampleCount
    const maxDist = 5.0
    return Math.max(0, Math.min(100, (1 - avgDist / maxDist) * 100))
  }

  private static calculateNormalAlignment(
    edgesA: THREE.Vector3[],
    edgesB: THREE.Vector3[],
    posA: THREE.Vector3,
    posB: THREE.Vector3
  ): number {
    if (edgesA.length < 3 || edgesB.length < 3) return 50

    const centerA = this.computeCentroid(edgesA)
    const centerB = this.computeCentroid(edgesB)

    const normalA = this.computeEdgePlaneNormal(edgesA, centerA)
    const normalB = this.computeEdgePlaneNormal(edgesB, centerB)

    const direction = new THREE.Vector3().subVectors(posB, posA).normalize()
    const dotA = Math.abs(normalA.dot(direction))
    const dotB = Math.abs(normalB.dot(direction))

    const normalDot = Math.abs(normalA.dot(normalB))
    const alignment = (dotA + dotB) * 0.25 + normalDot * 0.5

    return alignment * 100
  }

  private static computeCentroid(points: THREE.Vector3[]): THREE.Vector3 {
    const centroid = new THREE.Vector3()
    points.forEach((p) => centroid.add(p))
    return centroid.multiplyScalar(1 / points.length)
  }

  private static computeEdgePlaneNormal(
    points: THREE.Vector3[],
    centroid: THREE.Vector3
  ): THREE.Vector3 {
    const samples = Math.min(points.length, 20)
    const normal = new THREE.Vector3()

    for (let i = 0; i < samples; i++) {
      const p1 = points[Math.floor((i / samples) * points.length)]
      const p2 = points[Math.floor(((i + 1) / samples) * points.length)]

      const v1 = new THREE.Vector3().subVectors(p1, centroid)
      const v2 = new THREE.Vector3().subVectors(p2, centroid)
      const cross = new THREE.Vector3().crossVectors(v1, v2)
      normal.add(cross)
    }

    return normal.normalize()
  }

  private static calculateBestAlignmentMatrix(
    posA: THREE.Vector3,
    rotA: THREE.Euler,
    posB: THREE.Vector3,
    rotB: THREE.Euler,
    worldAEdges: THREE.Vector3[],
    worldBEdges: THREE.Vector3[]
  ): THREE.Matrix4 {
    const centroidA = this.computeCentroid(worldAEdges)
    const centroidB = this.computeCentroid(worldBEdges)

    const targetPos = new THREE.Vector3()
      .addVectors(posA, posB)
      .multiplyScalar(0.5)

    const offset = new THREE.Vector3().subVectors(centroidB, centroidA)
    targetPos.sub(offset.multiplyScalar(0.5))

    const targetRot = new THREE.Euler(
      (rotA.x + rotB.x) / 2,
      (rotA.y + rotB.y) / 2,
      (rotA.z + rotB.z) / 2
    )

    const translation = new THREE.Matrix4().makeTranslation(targetPos)
    const rotation = new THREE.Matrix4().makeRotationFromEuler(targetRot)

    return new THREE.Matrix4().multiplyMatrices(translation, rotation)
  }

  public static mergeGeometries(
    geometries: { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 }[]
  ): THREE.BufferGeometry {
    const mergedGeometry = new THREE.BufferGeometry()
    const allPositions: number[] = []
    const allNormals: number[] = []
    const allColors: number[] = []
    const allUvs: number[] = []

    geometries.forEach(({ geometry, matrix }) => {
      const positions = geometry.attributes.position
      const normals = geometry.attributes.normal
      const colors = geometry.attributes.color
      const uvs = geometry.attributes.uv
      const index = geometry.index

      const posOffset = allPositions.length / 3

      if (index) {
        for (let i = 0; i < index.count; i++) {
          const idx = index.getX(i) + posOffset
        }
      }

      const normalMatrix = new THREE.Matrix3().getNormalMatrix(matrix)
      const tmpPos = new THREE.Vector3()
      const tmpNormal = new THREE.Vector3()
      const tmpColor = new THREE.Color()

      for (let i = 0; i < positions.count; i++) {
        tmpPos.set(
          positions.getX(i),
          positions.getY(i),
          positions.getZ(i)
        )
        tmpPos.applyMatrix4(matrix)
        allPositions.push(tmpPos.x, tmpPos.y, tmpPos.z)

        if (normals) {
          tmpNormal.set(
            normals.getX(i),
            normals.getY(i),
            normals.getZ(i)
          )
          tmpNormal.applyMatrix3(normalMatrix).normalize()
          allNormals.push(tmpNormal.x, tmpNormal.y, tmpNormal.z)
        }

        if (colors) {
          allColors.push(colors.getX(i), colors.getY(i), colors.getZ(i))
        } else {
          const seamFactor = this.calculateSeamFactor(tmpPos, geometries)
          if (seamFactor > 0.7) {
            tmpColor.setHSL(0, 0.8, 0.5)
          } else {
            tmpColor.setHSL(0.3, 0.5, 0.3 + seamFactor * 0.3)
          }
          allColors.push(tmpColor.r, tmpColor.g, tmpColor.b)
        }

        if (uvs) {
          allUvs.push(uvs.getX(i), uvs.getY(i))
        } else {
          allUvs.push(tmpPos.x * 0.1, tmpPos.y * 0.1)
        }
      }
    })

    mergedGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(allPositions, 3)
    )
    mergedGeometry.setAttribute(
      'normal',
      new THREE.Float32BufferAttribute(allNormals, 3)
    )
    mergedGeometry.setAttribute(
      'color',
      new THREE.Float32BufferAttribute(allColors, 3)
    )
    mergedGeometry.setAttribute('uv', new THREE.Float32BufferAttribute(allUvs, 2))

    mergedGeometry.computeVertexNormals()
    return mergedGeometry
  }

  private static calculateSeamFactor(
    point: THREE.Vector3,
    geometries: { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 }[]
  ): number {
    let minDist = Infinity
    for (let i = 0; i < geometries.length; i++) {
      for (let j = i + 1; j < geometries.length; j++) {
        const centroidI = this.getGeometryCenter(geometries[i])
        const centroidJ = this.getGeometryCenter(geometries[j])
        const mid = new THREE.Vector3()
          .addVectors(centroidI, centroidJ)
          .multiplyScalar(0.5)
        const dist = point.distanceTo(mid)
        minDist = Math.min(minDist, dist)
      }
    }
    return Math.max(0, Math.min(1, 1 - minDist / 3))
  }

  private static getGeometryCenter({
    geometry,
    matrix
  }: {
    geometry: THREE.BufferGeometry
    matrix: THREE.Matrix4
  }): THREE.Vector3 {
    geometry.computeBoundingBox()
    const bbox = geometry.boundingBox
    if (!bbox) return new THREE.Vector3()
    const center = new THREE.Vector3()
    bbox.getCenter(center)
    return center.applyMatrix4(matrix)
  }

  public static exportOBJ(geometry: THREE.BufferGeometry): string {
    const positions = geometry.attributes.position
    const normals = geometry.attributes.normal
    const uvs = geometry.attributes.uv
    const index = geometry.index

    let obj = '# Pottery Fragment Reconstruction Model\n'
    obj += `# Generated: ${new Date().toISOString()}\n`
    obj += `# Vertices: ${positions.count}\n\n`

    for (let i = 0; i < positions.count; i++) {
      obj += `v ${positions.getX(i).toFixed(6)} ${positions.getY(i).toFixed(
        6
      )} ${positions.getZ(i).toFixed(6)}\n`
    }

    if (normals) {
      obj += '\n'
      for (let i = 0; i < normals.count; i++) {
        obj += `vn ${normals.getX(i).toFixed(6)} ${normals.getY(i).toFixed(
          6
        )} ${normals.getZ(i).toFixed(6)}\n`
      }
    }

    if (uvs) {
      obj += '\n'
      for (let i = 0; i < uvs.count; i++) {
        obj += `vt ${uvs.getX(i).toFixed(6)} ${uvs.getY(i).toFixed(6)}\n`
      }
    }

    obj += '\n'
    if (index) {
      for (let i = 0; i < index.count; i += 3) {
        const a = index.getX(i) + 1
        const b = index.getX(i + 1) + 1
        const c = index.getX(i + 2) + 1
        if (normals && uvs) {
          obj += `f ${a}/${a}/${a} ${b}/${b}/${b} ${c}/${c}/${c}\n`
        } else if (uvs) {
          obj += `f ${a}/${a} ${b}/${b} ${c}/${c}\n`
        } else if (normals) {
          obj += `f ${a}//${a} ${b}//${b} ${c}//${c}\n`
        } else {
          obj += `f ${a} ${b} ${c}\n`
        }
      }
    } else {
      for (let i = 0; i < positions.count; i += 3) {
        const a = i + 1
        const b = i + 2
        const c = i + 3
        obj += `f ${a} ${b} ${c}\n`
      }
    }

    return obj
  }
}
