import { WaveSource } from '@/store/useWaveStore'
import { gridToWorld, getGridSize, amplitudeToEnergy } from '@/utils/dataUtils'

const WAVE_SPEED = 5.0
const GRID_SIZE = getGridSize()
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE * GRID_SIZE

export function sphericalWaveAmplitude(
  source: WaveSource,
  point: [number, number, number],
  time: number
): number {
  if (!source.enabled) return 0

  const dx = point[0] - source.position[0]
  const dy = point[1] - source.position[1]
  const dz = point[2] - source.position[2]
  const r = Math.sqrt(dx * dx + dy * dy + dz * dz)

  if (r < 0.3) return source.amplitude

  const omega = 2 * Math.PI * source.frequency
  const k = omega / WAVE_SPEED
  const phaseRad = (source.phase * Math.PI) / 180

  return (source.amplitude / Math.max(r, 0.3)) * Math.sin(k * r - omega * time + phaseRad)
}

export function superposeWaves(
  sources: WaveSource[],
  point: [number, number, number],
  time: number
): number {
  let total = 0
  for (let i = 0; i < sources.length; i++) {
    total += sphericalWaveAmplitude(sources[i], point, time)
  }
  return total
}

export function computeInterferenceGrid(
  sources: WaveSource[],
  time: number
): Float32Array {
  const data = new Float32Array(TOTAL_CELLS)
  let idx = 0

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      for (let k = 0; k < GRID_SIZE; k++) {
        const worldPos = gridToWorld(i, j, k)
        data[idx++] = superposeWaves(sources, worldPos, time)
      }
    }
  }

  return data
}

export function computeEnergyGrid(
  sources: WaveSource[],
  time: number,
  samples: number = 8
): Float32Array {
  const data = new Float32Array(TOTAL_CELLS)
  let idx = 0
  const dt = 0.02

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      for (let k = 0; k < GRID_SIZE; k++) {
        const worldPos = gridToWorld(i, j, k)
        let energySum = 0
        for (let s = 0; s < samples; s++) {
          const t = time + s * dt
          const amp = superposeWaves(sources, worldPos, t)
          energySum += amplitudeToEnergy(amp)
        }
        data[idx++] = energySum / samples
      }
    }
  }

  return data
}

export function computeSliceData(
  sources: WaveSource[],
  z: number,
  time: number
): Float32Array {
  const sliceSize = GRID_SIZE * GRID_SIZE
  const data = new Float32Array(sliceSize)
  let idx = 0

  for (let i = 0; i < GRID_SIZE; i++) {
    for (let j = 0; j < GRID_SIZE; j++) {
      const worldPos = gridToWorld(i, j, 0)
      worldPos[2] = z
      data[idx++] = superposeWaves(sources, worldPos, time)
    }
  }

  return data
}

export function getMaxAmplitude(data: Float32Array): number {
  let maxVal = 0
  for (let i = 0; i < data.length; i++) {
    const abs = Math.abs(data[i])
    if (abs > maxVal) maxVal = abs
  }
  return maxVal
}
