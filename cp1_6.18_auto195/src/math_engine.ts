export interface GeometryResult {
  vertices: Float32Array
  indices: Uint32Array
  colors: Float32Array
  normals: Float32Array
  heightMin: number
  heightMax: number
}

const COLOR_LOW = { r: 0x0a / 255, g: 0x0a / 255, b: 0x2e / 255 }
const COLOR_HIGH = { r: 0xff / 255, g: 0x6b / 255, b: 0x35 / 255 }

function lerpColor(t: number): [number, number, number] {
  const clampedT = Math.max(0, Math.min(1, t))
  return [
    COLOR_LOW.r + (COLOR_HIGH.r - COLOR_LOW.r) * clampedT,
    COLOR_LOW.g + (COLOR_HIGH.g - COLOR_LOW.g) * clampedT,
    COLOR_LOW.b + (COLOR_HIGH.b - COLOR_LOW.b) * clampedT,
  ]
}

function computeNormals(
  vertices: Float32Array,
  indices: Uint32Array,
): Float32Array {
  const vertexCount = vertices.length / 3
  const normals = new Float32Array(vertices.length)

  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i]!
    const i1 = indices[i + 1]!
    const i2 = indices[i + 2]!

    const x0 = vertices[i0 * 3]!
    const y0 = vertices[i0 * 3 + 1]!
    const z0 = vertices[i0 * 3 + 2]!

    const x1 = vertices[i1 * 3]!
    const y1 = vertices[i1 * 3 + 1]!
    const z1 = vertices[i1 * 3 + 2]!

    const x2 = vertices[i2 * 3]!
    const y2 = vertices[i2 * 3 + 1]!
    const z2 = vertices[i2 * 3 + 2]!

    const ax = x1 - x0
    const ay = y1 - y0
    const az = z1 - z0

    const bx = x2 - x0
    const by = y2 - y0
    const bz = z2 - z0

    const nx = ay * bz - az * by
    const ny = az * bx - ax * bz
    const nz = ax * by - ay * bx

    const ni0 = i0 * 3
    const ni1 = i1 * 3
    const ni2 = i2 * 3

    normals[ni0] = (normals[ni0] ?? 0) + nx
    normals[ni0 + 1] = (normals[ni0 + 1] ?? 0) + ny
    normals[ni0 + 2] = (normals[ni0 + 2] ?? 0) + nz

    normals[ni1] = (normals[ni1] ?? 0) + nx
    normals[ni1 + 1] = (normals[ni1 + 1] ?? 0) + ny
    normals[ni1 + 2] = (normals[ni1 + 2] ?? 0) + nz

    normals[ni2] = (normals[ni2] ?? 0) + nx
    normals[ni2 + 1] = (normals[ni2 + 1] ?? 0) + ny
    normals[ni2 + 2] = (normals[ni2 + 2] ?? 0) + nz
  }

  for (let i = 0; i < vertexCount; i++) {
    const nx = normals[i * 3]!
    const ny = normals[i * 3 + 1]!
    const nz = normals[i * 3 + 2]!
    const len = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
    normals[i * 3] = nx / len
    normals[i * 3 + 1] = ny / len
    normals[i * 3 + 2] = nz / len
  }

  return normals
}

export function generateMandelbrotHeightmap(params: {
  resolution?: number
  iterations?: number
  xMin?: number
  xMax?: number
  yMin?: number
  yMax?: number
  heightScale?: number
}): GeometryResult {
  const {
    resolution = 256,
    iterations = 100,
    xMin = -2.5,
    xMax = 1.0,
    yMin = -1.25,
    yMax = 1.25,
    heightScale = 0.5,
  } = params

  const size = resolution
  const vertexCount = size * size
  const vertices = new Float32Array(vertexCount * 3)
  const heights = new Float32Array(vertexCount)
  const colors = new Float32Array(vertexCount * 3)

  let heightMin = Infinity
  let heightMax = -Infinity

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = py * size + px

      const x0 = xMin + (px / (size - 1)) * (xMax - xMin)
      const y0 = yMin + (py / (size - 1)) * (yMax - yMin)

      let x = 0
      let y = 0
      let iter = 0

      while (x * x + y * y <= 4 && iter < iterations) {
        const xtemp = x * x - y * y + x0
        y = 2 * x * y + y0
        x = xtemp
        iter++
      }

      let height: number
      if (iter === iterations) {
        height = 0
      } else {
        const logZn = Math.log(x * x + y * y) / 2
        const nu = Math.log(logZn / Math.log(2)) / Math.log(2)
        height = (iter + 1 - nu) / iterations
      }

      height = Math.pow(height, 1.5) * heightScale

      heights[idx] = height
      if (height < heightMin) heightMin = height
      if (height > heightMax) heightMax = height

      const worldX = (px / (size - 1) - 0.5) * 2
      const worldZ = (py / (size - 1) - 0.5) * 2

      vertices[idx * 3] = worldX
      vertices[idx * 3 + 1] = height
      vertices[idx * 3 + 2] = worldZ
    }
  }

  const heightRange = heightMax - heightMin || 1
  for (let i = 0; i < vertexCount; i++) {
    const t = (heights[i]! - heightMin) / heightRange
    const [r, g, b] = lerpColor(t)
    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b
  }

  const indexCount = (size - 1) * (size - 1) * 6
  const indices = new Uint32Array(indexCount)
  let indexIdx = 0

  for (let py = 0; py < size - 1; py++) {
    for (let px = 0; px < size - 1; px++) {
      const topLeft = py * size + px
      const topRight = topLeft + 1
      const bottomLeft = (py + 1) * size + px
      const bottomRight = bottomLeft + 1

      indices[indexIdx++] = topLeft
      indices[indexIdx++] = bottomLeft
      indices[indexIdx++] = topRight

      indices[indexIdx++] = topRight
      indices[indexIdx++] = bottomLeft
      indices[indexIdx++] = bottomRight
    }
  }

  const normals = computeNormals(vertices, indices)

  return { vertices, indices, colors, normals, heightMin, heightMax }
}

export function generateJuliaSet_3D(params: {
  cx?: number
  cy?: number
  resolution?: number
  iterations?: number
  xMin?: number
  xMax?: number
  yMin?: number
  yMax?: number
  heightScale?: number
}): GeometryResult {
  const {
    cx = -0.7,
    cy = 0.27015,
    resolution = 256,
    iterations = 100,
    xMin = -2.0,
    xMax = 2.0,
    yMin = -2.0,
    yMax = 2.0,
    heightScale = 0.6,
  } = params

  const size = resolution
  const vertexCount = size * size
  const vertices = new Float32Array(vertexCount * 3)
  const heights = new Float32Array(vertexCount)
  const colors = new Float32Array(vertexCount * 3)

  let heightMin = Infinity
  let heightMax = -Infinity

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = py * size + px

      let x = xMin + (px / (size - 1)) * (xMax - xMin)
      let y = yMin + (py / (size - 1)) * (yMax - yMin)

      let iter = 0

      while (x * x + y * y <= 4 && iter < iterations) {
        const xtemp = x * x - y * y + cx
        y = 2 * x * y + cy
        x = xtemp
        iter++
      }

      let height: number
      if (iter === iterations) {
        height = 0
      } else {
        const logZn = Math.log(x * x + y * y) / 2
        const nu = Math.log(logZn / Math.log(2)) / Math.log(2)
        height = (iter + 1 - nu) / iterations
      }

      height = Math.pow(height, 1.3) * heightScale

      heights[idx] = height
      if (height < heightMin) heightMin = height
      if (height > heightMax) heightMax = height

      const worldX = (px / (size - 1) - 0.5) * 2
      const worldZ = (py / (size - 1) - 0.5) * 2

      vertices[idx * 3] = worldX
      vertices[idx * 3 + 1] = height
      vertices[idx * 3 + 2] = worldZ
    }
  }

  const heightRange = heightMax - heightMin || 1
  for (let i = 0; i < vertexCount; i++) {
    const t = (heights[i]! - heightMin) / heightRange
    const [r, g, b] = lerpColor(t)
    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b
  }

  const indexCount = (size - 1) * (size - 1) * 6
  const indices = new Uint32Array(indexCount)
  let indexIdx = 0

  for (let py = 0; py < size - 1; py++) {
    for (let px = 0; px < size - 1; px++) {
      const topLeft = py * size + px
      const topRight = topLeft + 1
      const bottomLeft = (py + 1) * size + px
      const bottomRight = bottomLeft + 1

      indices[indexIdx++] = topLeft
      indices[indexIdx++] = bottomLeft
      indices[indexIdx++] = topRight

      indices[indexIdx++] = topRight
      indices[indexIdx++] = bottomLeft
      indices[indexIdx++] = bottomRight
    }
  }

  const normals = computeNormals(vertices, indices)

  return { vertices, indices, colors, normals, heightMin, heightMax }
}

export function generateMinimalSurface(params: {
  t?: number
  resolution?: number
  scale?: number
}): GeometryResult {
  const { t = 1.0, resolution = 128, scale = 1.0 } = params

  const size = resolution
  const uMin = -t
  const uMax = t
  const vMin = -t
  const vMax = t

  const vertexCount = size * size
  const vertices = new Float32Array(vertexCount * 3)
  const heights = new Float32Array(vertexCount)
  const colors = new Float32Array(vertexCount * 3)

  let heightMin = Infinity
  let heightMax = -Infinity

  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const idx = py * size + px

      const u = uMin + (px / (size - 1)) * (uMax - uMin)
      const v = vMin + (py / (size - 1)) * (vMax - vMin)

      const x = u - (u * u * u) / 3 + u * v * v
      const y = v - (v * v * v) / 3 + v * u * u
      const z = u * u - v * v

      const height = z * 0.3

      heights[idx] = height
      if (height < heightMin) heightMin = height
      if (height > heightMax) heightMax = height

      vertices[idx * 3] = x * scale
      vertices[idx * 3 + 1] = height
      vertices[idx * 3 + 2] = y * scale
    }
  }

  const heightRange = heightMax - heightMin || 1
  for (let i = 0; i < vertexCount; i++) {
    const t = (heights[i]! - heightMin) / heightRange
    const [r, g, b] = lerpColor(t)
    colors[i * 3] = r
    colors[i * 3 + 1] = g
    colors[i * 3 + 2] = b
  }

  const indexCount = (size - 1) * (size - 1) * 6
  const indices = new Uint32Array(indexCount)
  let indexIdx = 0

  for (let py = 0; py < size - 1; py++) {
    for (let px = 0; px < size - 1; px++) {
      const topLeft = py * size + px
      const topRight = topLeft + 1
      const bottomLeft = (py + 1) * size + px
      const bottomRight = bottomLeft + 1

      indices[indexIdx++] = topLeft
      indices[indexIdx++] = bottomLeft
      indices[indexIdx++] = topRight

      indices[indexIdx++] = topRight
      indices[indexIdx++] = bottomLeft
      indices[indexIdx++] = bottomRight
    }
  }

  const normals = computeNormals(vertices, indices)

  return { vertices, indices, colors, normals, heightMin, heightMax }
}
