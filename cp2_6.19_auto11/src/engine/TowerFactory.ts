import Phaser from 'phaser';
import { TOWER_CONFIGS, TowerConfig } from '../data/LevelData';

export type TowerType = 'arrow' | 'cannon' | 'magic';

export interface Tower {
  id: number;
  type: TowerType;
  gridX: number;
  gridY: number;
  x: number;
  y: number;
  damage: number;
  range: number;
  fireRate: number;
  lastFireTime: number;
  config: TowerConfig;
  container: Phaser.GameObjects.Container;
  base: Phaser.GameObjects.Graphics;
  barrel: Phaser.GameObjects.Graphics;
  barrelAngle: number;
  targetBarrelAngle: number;
  barrelTween: Phaser.Tweens.Tween | null;
  targetEnemyId: number | null;
  rangeCircle: Phaser.GameObjects.Arc | null;
}

export class TowerFactory {
  private scene: Phaser.Scene;
  private nextId: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createTower(
    type: TowerType,
    gridX: number,
    gridY: number,
    x: number,
    y: number
  ): Tower {
    const config = TOWER_CONFIGS[type];
    const container = this.scene.add.container(x, y);

    const base = this.scene.add.graphics();
    this.drawTowerBase(base, config.color, type);
    container.add(base);

    const barrel = this.scene.add.graphics();
    this.drawBarrel(barrel, type);
    barrel.rotation = -Math.PI / 2;
    container.add(barrel);

    this.scene.tweens.add({
      targets: container,
      scale: { from: 0, to: 1 },
      duration: 250,
      ease: 'Back.easeOut'
    });

    return {
      id: this.nextId++,
      type,
      gridX,
      gridY,
      x,
      y,
      damage: config.damage,
      range: config.range,
      fireRate: config.fireRate,
      lastFireTime: 0,
      config,
      container,
      base,
      barrel,
      barrelAngle: -Math.PI / 2,
      targetBarrelAngle: -Math.PI / 2,
      barrelTween: null,
      targetEnemyId: null,
      rangeCircle: null
    };
  }

  private drawTowerBase(graphics: Phaser.GameObjects.Graphics, color: number, type: TowerType): void {
    graphics.clear();
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-26, -22, 52, 48, 6);
    graphics.lineStyle(3, 0x0D47A1, 1);
    graphics.strokeRoundedRect(-26, -22, 52, 48, 6);

    graphics.fillStyle(0xFFD54F, 0.85);
    graphics.fillCircle(0, -18, 6);

    if (type === 'magic') {
      graphics.fillStyle(0xCE93D8, 0.5);
      graphics.fillCircle(0, 0, 12);
    }
  }

  private drawBarrel(graphics: Phaser.GameObjects.Graphics, type: TowerType): void {
    graphics.clear();

    switch (type) {
      case 'arrow':
        graphics.fillStyle(0x4A2511, 1);
        graphics.fillRect(-3, -3, 32, 6);
        graphics.lineStyle(1, 0x6D3A1A, 1);
        graphics.strokeRect(-3, -3, 32, 6);
        graphics.fillStyle(0xA0A0A0, 1);
        graphics.fillRect(29, -5, 6, 10);
        graphics.fillStyle(0xC0C0C0, 1);
        graphics.fillTriangle(35, -4, 41, 0, 35, 4);
        graphics.lineStyle(1, 0x808080, 0.6);
        graphics.strokeTriangle(35, -4, 41, 0, 35, 4);
        graphics.fillStyle(0xD0D0D0, 1);
        graphics.fillRect(6, -4, 2, 8);
        graphics.fillRect(18, -4, 2, 8);
        break;

      case 'cannon':
        graphics.fillStyle(0x3E2723, 1);
        graphics.fillRect(-5, -7, 34, 14);
        graphics.lineStyle(1, 0x5D4037, 0.8);
        graphics.strokeRect(-5, -7, 34, 14);
        graphics.fillStyle(0x4E342E, 1);
        graphics.fillRect(-5, -9, 8, 18);
        graphics.fillStyle(0x212121, 1);
        graphics.fillCircle(33, 0, 8);
        graphics.fillStyle(0x424242, 1);
        graphics.fillCircle(33, 0, 5);
        graphics.fillStyle(0x1A1A1A, 1);
        graphics.fillCircle(33, 0, 2);
        graphics.lineStyle(2, 0x616161, 0.5);
        graphics.strokeCircle(33, 0, 8);
        break;

      case 'magic':
        graphics.fillStyle(0x7B1FA2, 1);
        graphics.fillRect(-3, -4, 26, 8);
        graphics.lineStyle(1, 0x9C27B0, 0.7);
        graphics.strokeRect(-3, -4, 26, 8);
        graphics.fillStyle(0xCE93D8, 1);
        graphics.fillCircle(28, 0, 10);
        graphics.fillStyle(0xE040FB, 1);
        graphics.fillCircle(28, 0, 7);
        graphics.fillStyle(0xF48FB1, 1);
        graphics.fillCircle(28, 0, 3);
        graphics.lineStyle(2, 0xAB47BC, 0.8);
        graphics.strokeCircle(28, 0, 10);
        break;
    }
  }

  rotateBarrelTo(tower: Tower, targetX: number, targetY: number): void {
    const targetAngle = Math.atan2(targetY - tower.y, targetX - tower.x);

    let angleDiff = targetAngle - tower.barrelAngle;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    if (Math.abs(angleDiff) < 0.02) return;

    tower.targetBarrelAngle = targetAngle;

    if (tower.barrelTween) {
      if (tower.barrelTween.isPlaying()) {
        tower.barrelAngle = tower.barrel.rotation;
      }
      tower.barrelTween.stop();
      tower.barrelTween.removeListener('onUpdate');
      tower.barrelTween.removeListener('onComplete');
      tower.barrelTween = null;
    }

    const startAngle = tower.barrelAngle;
    const endAngle = startAngle + angleDiff;
    const duration = Math.min(200, Math.max(60, Math.abs(angleDiff) * 100));

    tower.barrelTween = this.scene.tweens.add({
      targets: tower.barrel,
      rotation: endAngle,
      duration: duration,
      ease: 'Quad.easeOut',
      onUpdate: (tween) => {
        if (tween.isPlaying()) {
          tower.barrelAngle = tower.barrel.rotation;
        }
      },
      onComplete: (tween) => {
        tower.barrelAngle = endAngle;
        if (tower.barrelTween === tween) {
          tower.barrelTween = null;
        }
      }
    });
  }

  showRange(tower: Tower): void {
    if (tower.rangeCircle) {
      tower.rangeCircle.destroy();
    }
    tower.rangeCircle = this.scene.add.arc(
      tower.x,
      tower.y,
      tower.range,
      0,
      360,
      false,
      0xFFD54F,
      0.1
    );
    tower.rangeCircle.setStrokeStyle(2, 0xFFD54F, 0.6);
    tower.rangeCircle.setDepth(5);
  }

  hideRange(tower: Tower): void {
    if (tower.rangeCircle) {
      tower.rangeCircle.destroy();
      tower.rangeCircle = null;
    }
  }

  destroyTower(tower: Tower): void {
    if (tower.barrelTween) {
      tower.barrelTween.stop();
      tower.barrelTween = null;
    }
    this.hideRange(tower);
    this.scene.tweens.add({
      targets: tower.container,
      scale: 0,
      alpha: 0,
      duration: 200,
      ease: 'Back.easeIn',
      onComplete: () => tower.container.destroy()
    });
  }
}
