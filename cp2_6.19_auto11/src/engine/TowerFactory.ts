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
    this.drawTowerBase(base, config.color);
    container.add(base);

    const barrel = this.scene.add.graphics();
    this.drawTowerBarrel(barrel, config.barrelColor, type);
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
      targetEnemyId: null,
      rangeCircle: null
    };
  }

  private drawTowerBase(graphics: Phaser.GameObjects.Graphics, color: number): void {
    graphics.clear();
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-26, -22, 52, 48, 6);
    graphics.lineStyle(3, 0x0D47A1, 1);
    graphics.strokeRoundedRect(-26, -22, 52, 48, 6);
    graphics.fillStyle(0xFFD54F, 0.85);
    graphics.fillCircle(0, -18, 6);
  }

  private drawTowerBarrel(
    graphics: Phaser.GameObjects.Graphics,
    color: number,
    type: TowerType
  ): void {
    graphics.clear();
    this.drawBarrelAtAngle(graphics, color, type, -Math.PI / 2);
  }

  private drawBarrelAtAngle(
    graphics: Phaser.GameObjects.Graphics,
    color: number,
    type: TowerType,
    angle: number
  ): void {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const rx = (x: number, y: number) => x * cos - y * sin;
    const ry = (x: number, y: number) => x * sin + y * cos;
    const fillRotatedRect = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) => {
      graphics.fillTriangle(rx(x1,y1), ry(x1,y1), rx(x2,y2), ry(x2,y2), rx(x3,y3), ry(x3,y3));
      graphics.fillTriangle(rx(x3,y3), ry(x3,y3), rx(x4,y4), ry(x4,y4), rx(x1,y1), ry(x1,y1));
    };

    graphics.fillStyle(color, 1);

    switch (type) {
      case 'arrow':
        fillRotatedRect(-4, -4, 26, -4, 26, 4, -4, 4);
        graphics.fillStyle(0xC0C0C0, 1);
        graphics.fillTriangle(rx(26,-6), ry(26,-6), rx(34,0), ry(34,0), rx(26,6), ry(26,6));
        break;
      case 'cannon':
        fillRotatedRect(-6, -8, 26, -8, 26, 8, -6, 8);
        graphics.fillStyle(0x212121, 1);
        graphics.fillCircle(rx(30, 0), ry(30, 0), 6);
        break;
      case 'magic':
        fillRotatedRect(-4, -5, 20, -5, 20, 5, -4, 5);
        graphics.fillStyle(0xCE93D8, 1);
        graphics.fillCircle(rx(24, 0), ry(24, 0), 8);
        graphics.fillStyle(0xE040FB, 1);
        graphics.fillCircle(rx(24, 0), ry(24, 0), 4);
        break;
    }
  }

  rotateBarrelTo(tower: Tower, targetX: number, targetY: number): void {
    const angle = Math.atan2(targetY - tower.y, targetX - tower.x);
    tower.barrelAngle = angle;

    tower.barrel.clear();
    this.drawBarrelAtAngle(tower.barrel, tower.config.barrelColor, tower.type, angle);
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
