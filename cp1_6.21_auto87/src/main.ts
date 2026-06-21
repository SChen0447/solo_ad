import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

class EventBus {
  private listeners: Map<string, Function[]> = new Map();

  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const list = this.listeners.get(event);
    if (list) {
      const idx = list.indexOf(callback);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  emit(event: string, ...args: any[]): void {
    const list = this.listeners.get(event);
    if (list) {
      for (const cb of list) {
        cb(...args);
      }
    }
  }
}

export const eventBus = new EventBus();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  width: 1280,
  height: 720,
  parent: 'game-container',
  backgroundColor: '#0a0a1a',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 800 },
      debug: false,
    },
  },
  scene: [GameScene],
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  render: {
    pixelArt: true,
    roundPixels: true,
  },
};

const game = new Phaser.Game(config);
