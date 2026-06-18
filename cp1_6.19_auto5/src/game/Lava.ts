import { useGameStore } from '../state/gameStore'

const LAVA_RISE_SPEED = 0.5
const MAX_LAVA_HEIGHT = 1200
const WAVE_AMPLITUDE = 5
const WAVE_FREQUENCY = 0.02
const WAVE_SPEED = 2

export class Lava {
  private wavePhase: number = 0

  update(deltaTime: number, lowFpsMode: boolean): void {
    const state = useGameStore.getState()

    if (state.gameStatus !== 'playing') return

    if (!lowFpsMode) {
      const newHeight = state.lavaHeight + LAVA_RISE_SPEED
      state.setLavaHeight(Math.min(newHeight, MAX_LAVA_HEIGHT))
    }

    this.wavePhase += WAVE_SPEED * deltaTime
  }

  getWavePhase(): number {
    return this.wavePhase
  }

  getWaveOffset(x: number): number {
    return (
      Math.sin(x * WAVE_FREQUENCY + this.wavePhase) * WAVE_AMPLITUDE +
      Math.sin(x * WAVE_FREQUENCY * 1.5 + this.wavePhase * 1.3) * WAVE_AMPLITUDE * 0.5
    )
  }

  getSurfaceHeight(x: number, baseHeight: number): number {
    return baseHeight + this.getWaveOffset(x)
  }

  reset(): void {
    this.wavePhase = 0
  }
}
