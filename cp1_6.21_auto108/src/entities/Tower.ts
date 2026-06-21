import Phaser from 'phaser';
import { HEX_SIZE } from '../utils/GridUtils';

export enum TowerType {
  Arrow = 'arrow',
  Cannon = 'cannon',
  Magic = 'magic',
  Slow = 'slow',
}

export interface TowerConfig {
  type: TowerType;
  name: string;
  color: number;
  attack: number;
  range: number;
  cost: number;
  fireRate: number;
  shape: 'triangle' | 'square' | 'diamond' | 'hexagon';
}

export const TOWER_CONFIGS: Record<TowerType, TowerConfig> = {
  [TowerType.Arrow]: {
    type: TowerType.Arrow,
    name: '箭塔',
    color: 0x00e676,
    attack: 15,
    range: 120,
    cost: 100,
    fireRate: 500,
    shape: 'triangle',
  },
  [TowerType.Cannon]: {
    type: TowerType.Cannon,
    name: '炮塔',
    color: 0xff5252,
    attack: 40,
    range: 90,
    cost: 200,
    fireRate: 1200,
    shape: 'square',
  },
  [TowerType.Magic]: {
    type: TowerType.Magic,
    name: '魔法塔',
    color: 0x7c4dff,
    attack: 25,
    range: 150,
    cost: 150,
    fireRate: 800,
    shape: 'diamond',
  },
  [TowerType.Slow]: {
    type: TowerType.Slow,
    name: '减速塔',
    color: 0x40c4ff,
    attack: 8,
    range: 110,
    cost: 120,
    fireRate: 600,
    shape: 'hexagon',
  },
};

export class Tower {
  public scene: Phaser.Scene;
  public container: Phaser.GameObjects.Container;
  public towerType: TowerType;
  public config: TowerConfig;
  public col: number;
  public row: number;
  public attack: number;
  public range: number;
  public cost: number;
  public fireRate: number;
  public lastFireTime: number = 0;
  public rangeCircle: Phaser.GameObjects.Arc;
  public rangeCircleVisible: boolean = false;
  public bodyGraphic: Phaser.GameObjects.Graphics;
  private rangeTargetScale: number = 0;

  constructor(scene: Phaser.Scene, col: number, row: number, type: TowerType, x: number, y: number) {
    this.scene = scene;
    this.col = col;
    this.row = row;
    this.towerType = type;
    this.config = TOWER_CONFIGS[type];
    this.attack = this.config.attack;
    this.range = this.config.range;
    this.cost = this.config.cost;
    this.fireRate = this.config.fireRate;

    this.container = scene.add.container(x, y);

    this.bodyGraphic = scene.add.graphics();
    this.drawTowerBody();
    this.container.add(this.bodyGraphic);

    this.rangeCircle = scene.add.arc(0, 0, this.range, undefined, undefined, false, 0x000000, 0);
    this.rangeCircle.setStrokeStyle(1.5, this.config.color, 0.5);
    this.rangeCircle.setFillStyle(this.config.color, 0.08);
    this.rangeCircle.setScale(0);
    this.container.add(this.rangeCircle);

    this.container.setScale(1.3);
    scene.tweens.add({
      targets: this.container,
      scaleX: 1,
      scaleY: 1,
      duration: 250,
      ease: 'Back.easeOut',
    });
  }

  private drawTowerBody(): void {
    const g = this.bodyGraphic;
    const color = this.config.color;
    g.clear();

    g.fillStyle(0x0d1117, 0.85);
    g.lineStyle(2, color, 1);

    const s = HEX_SIZE * 0.55;

    switch (this.config.shape) {
      case 'triangle':
        g.beginPath();
        g.moveTo(0, -s);
        g.lineTo(s * 0.866, s * 0.5);
        g.lineTo(-s * 0.866, s * 0.5);
        g.closePath();
        g.fillPath();
        g.strokePath();
        break;
      case 'square':
        g.fillRoundedRect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4, 4);
        g.strokeRoundedRect(-s * 0.7, -s * 0.7, s * 1.4, s * 1.4, 4);
        break;
      case 'diamond':
        g.beginPath();
        g.moveTo(0, -s);
        g.lineTo(s * 0.7, 0);
        g.lineTo(0, s);
        g.lineTo(-s * 0.7, 0);
        g.closePath();
        g.fillPath();
        g.strokePath();
        break;
      case 'hexagon':
        g.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = s * 0.75 * Math.cos(angle);
          const py = s * 0.75 * Math.sin(angle);
          if (i === 0) g.moveTo(px, py);
          else g.lineTo(px, py);
        }
        g.closePath();
        g.fillPath();
        g.strokePath();
        break;
    }

    g.fillStyle(color, 0.3);
    g.fillCircle(0, 0, 4);
  }

  showRange(): void {
    this.rangeTargetScale = 1;
    this.scene.tweens.killTweensOf(this.rangeCircle);
    this.scene.tweens.add({
      targets: this.rangeCircle,
      scaleX: 1,
      scaleY: 1,
      duration: 200,
      ease: 'Cubic.easeOut',
    });
    this.rangeCircleVisible = true;
  }

  hideRange(): void {
    this.rangeTargetScale = 0;
    this.scene.tweens.killTweensOf(this.rangeCircle);
    this.scene.tweens.add({
      targets: this.rangeCircle,
      scaleX: 0,
      scaleY: 0,
      duration: 200,
      ease: 'Cubic.easeIn',
    });
    this.rangeCircleVisible = false;
  }

  canFire(currentTime: number): boolean {
    return currentTime - this.lastFireTime >= this.fireRate;
  }

  fire(currentTime: number): void {
    this.lastFireTime = currentTime;
  }

  getWorldX(): number {
    return this.container.x;
  }

  getWorldY(): number {
    return this.container.y;
  }

  destroy(): void {
    this.container.destroy();
  }
}
