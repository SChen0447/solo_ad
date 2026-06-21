import Phaser from 'phaser';
import { v4 as uuidv4 } from 'uuid';
import { Mechanism } from './Mechanism';

export enum BlockWeight {
  Light = 1,
  Medium = 3,
  Heavy = 5,
}

export interface BlockConfig {
  weight: BlockWeight;
  color: number;
  label: string;
  width: number;
  height: number;
}

export const BLOCK_CONFIGS: Record<BlockWeight, BlockConfig> = {
  [BlockWeight.Light]: {
    weight: BlockWeight.Light,
    color: 0x4a9eff,
    label: '轻 1kg',
    width: 40,
    height: 40,
  },
  [BlockWeight.Medium]: {
    weight: BlockWeight.Medium,
    color: 0x4aff7a,
    label: '中 3kg',
    width: 50,
    height: 50,
  },
  [BlockWeight.Heavy]: {
    weight: BlockWeight.Heavy,
    color: 0xff4a4a,
    label: '重 5kg',
    width: 60,
    height: 60,
  },
};

export class WeightBlock extends Phaser.GameObjects.Container {
  public id: string;
  public weight: BlockWeight;
  public config: BlockConfig;
  public isDragging: boolean = false;
  public isPlaced: boolean = false;

  private bodyRect: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private matterBody: MatterJS.BodyType | null = null;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private mechanismsInRange: Mechanism[] = [];
  private currentMechanism: Mechanism | null = null;
  private sceneRef: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number, weight: BlockWeight) {
    super(scene, x, y);
    this.id = uuidv4();
    this.weight = weight;
    this.config = BLOCK_CONFIGS[weight];
    this.sceneRef = scene;

    const shadow = scene.add.rectangle(2, 2, this.config.width, this.config.height, 0x000000, 0.3);
    this.add(shadow);

    this.bodyRect = scene.add.rectangle(
      0,
      0,
      this.config.width,
      this.config.height,
      this.config.color,
      1
    );
    this.bodyRect.setStrokeStyle(2, 0xffffff, 0.2);
    this.add(this.bodyRect);

    this.label = scene.add.text(0, 0, this.config.label, {
      fontSize: '11px',
      fontFamily: 'Arial',
      color: '#ffffff',
      align: 'center',
    });
    this.label.setOrigin(0.5, 0.5);
    this.add(this.label);

    scene.add.existing(this);
    this.setupDrag();
  }

  private setupDrag(): void {
    this.setSize(this.config.width, this.config.height);
    this.setInteractive(
      new Phaser.Geom.Rectangle(0, 0, this.config.width, this.config.height),
      Phaser.Geom.Rectangle.Contains
    );

    this.sceneRef.input.setDraggable(this);

    this.on('dragstart', (pointer: Phaser.Input.Pointer) => {
      this.isDragging = true;
      this.setScale(1.05);
      this.dragOffset.x = this.x - pointer.x;
      this.dragOffset.y = this.y - pointer.y;

      if (this.matterBody) {
        this.matterBody.isStatic = true;
      }

      if (this.currentMechanism) {
        this.currentMechanism.removeWeight(this.weight);
        this.currentMechanism = null;
      }

      this.sceneRef.children.bringToTop(this);
    });

    this.on('drag', (pointer: Phaser.Input.Pointer) => {
      const newX = pointer.x + this.dragOffset.x;
      const newY = pointer.y + this.dragOffset.y;
      this.setPosition(newX, newY);
      if (this.matterBody) {
        (this.matterBody as any).position = { x: newX, y: newY };
      }
    });

    this.on('dragend', () => {
      this.isDragging = false;
      this.setScale(1.0);
      this.enablePhysics();
    });
  }

  enablePhysics(): void {
    if (this.matterBody) {
      this.matterBody.isStatic = false;
      return;
    }

    const matterWorld = this.sceneRef.matter.world;
    this.matterBody = (this.sceneRef.matter.add as any).rectangle(
      this.x,
      this.y,
      this.config.width,
      this.config.height,
      {
        isStatic: false,
        friction: 0.8,
        restitution: 0.2,
        density: this.weight * 0.002,
        label: `block_${this.id}`,
      }
    );

    this.sceneRef.matter.world.on('collisionstart', (event: any) => {
      for (const pair of event.pairs) {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;
        if (
          bodyA === this.matterBody ||
          bodyB === this.matterBody
        ) {
          this.onCollision();
          break;
        }
      }
    });
  }

  private onCollision(): void {
    this.sceneRef.events.emit('blockCollision', this);
  }

  updatePosition(): void {
    if (this.matterBody && !this.isDragging) {
      const pos = (this.matterBody as any).position;
      if (pos) {
        this.x = pos.x;
        this.y = pos.y;
        const angle = this.matterBody.angle;
        this.setRotation(angle);
      }
    }
  }

  checkMechanismProximity(mechanisms: Mechanism[]): void {
    if (this.isDragging) return;

    this.mechanismsInRange = [];
    for (const mech of mechanisms) {
      const dist = Phaser.Math.Distance.Between(this.x, this.y, mech.x, mech.y);
      if (dist < 80) {
        this.mechanismsInRange.push(mech);
      }
    }

    if (this.mechanismsInRange.length > 0 && !this.isDragging) {
      const closest = this.mechanismsInRange.reduce((a, b) =>
        Phaser.Math.Distance.Between(this.x, this.y, a.x, a.y) <
        Phaser.Math.Distance.Between(this.x, this.y, b.x, b.y)
          ? a
          : b
      );

      if (this.currentMechanism !== closest) {
        if (this.currentMechanism) {
          this.currentMechanism.removeWeight(this.weight);
        }
        this.currentMechanism = closest;
        closest.applyWeight(this.weight);
      }
    }
  }

  destroyBlock(): void {
    if (this.matterBody) {
      this.sceneRef.matter.world.remove(this.matterBody);
    }
    if (this.currentMechanism) {
      this.currentMechanism.removeWeight(this.weight);
    }
    this.destroy();
  }
}
