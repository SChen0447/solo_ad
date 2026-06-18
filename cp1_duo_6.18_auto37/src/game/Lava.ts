import { useGameStore } from '../state/gameStore';
import { MAP_HEIGHT } from './Map';

const LAVA_RISE_RATE = 0.5;
const WAVE_AMPLITUDE = 5;
const WAVE_FREQUENCY = 0.02;

export class Lava {
  height: number = 0;
  phase: number = 0;

  update(dt: number, fps: number): void {
    const store = useGameStore.getState();
    if (store.gameState !== 'playing') return;
    if (store.lowFps) return;

    this.height += LAVA_RISE_RATE;
    if (this.height > MAP_HEIGHT) this.height = MAP_HEIGHT;

    this.phase += dt * 1.5;

    store.setLavaHeight(this.height);

    if (this.height >= store.playerY) {
      store.setGameState('lost');
    }
  }

  render(
    ctx: CanvasRenderingContext2D,
    camX: number,
    camY: number,
    canvasW: number,
    canvasH: number
  ): void {
    const store = useGameStore.getState();
    const lavaScreenY = this.height - camY;

    if (lavaScreenY >= canvasH) return;

    const topY = Math.max(0, lavaScreenY - WAVE_AMPLITUDE);

    ctx.save();

    const deepGradient = ctx.createLinearGradient(0, topY, 0, canvasH);
    deepGradient.addColorStop(0, 'rgba(255, 69, 0, 0.6)');
    deepGradient.addColorStop(0.1, 'rgba(255, 69, 0, 0.7)');
    deepGradient.addColorStop(0.4, 'rgba(139, 0, 0, 0.85)');
    deepGradient.addColorStop(1, '#8b0000');

    ctx.fillStyle = deepGradient;
    ctx.beginPath();
    ctx.moveTo(0, canvasH);

    for (let x = 0; x <= canvasW; x += 2) {
      const worldX = x + camX;
      const waveOffset =
        Math.sin(worldX * WAVE_FREQUENCY + this.phase) * WAVE_AMPLITUDE +
        Math.sin(worldX * WAVE_FREQUENCY * 2.3 + this.phase * 1.7) *
          WAVE_AMPLITUDE *
          0.5;
      const y = lavaScreenY + waveOffset;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(canvasW, canvasH);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'screen';
    const glowGradient = ctx.createLinearGradient(0, topY, 0, topY + 40);
    glowGradient.addColorStop(0, 'rgba(255, 140, 0, 0.5)');
    glowGradient.addColorStop(0.5, 'rgba(255, 69, 0, 0.3)');
    glowGradient.addColorStop(1, 'rgba(255, 69, 0, 0)');

    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.moveTo(0, topY + 40);

    for (let x = 0; x <= canvasW; x += 2) {
      const worldX = x + camX;
      const waveOffset =
        Math.sin(worldX * WAVE_FREQUENCY + this.phase) * WAVE_AMPLITUDE;
      const y = lavaScreenY + waveOffset;
      ctx.lineTo(x, y);
    }

    ctx.lineTo(canvasW, topY + 40);
    ctx.closePath();
    ctx.fill();

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }
}
