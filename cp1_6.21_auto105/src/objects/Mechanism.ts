import Phaser from 'phaser';
import { v4 as uuidv4 } from 'uuid';

export enum MechanismType {
  PressurePlate = 'pressure_plate',
  Lever = 'lever',
  Drawbridge = 'drawbridge',
}

export abstract class Mechanism extends Phaser.GameObjects.Container {
  public id: string;
  public mechanismType: MechanismType;
  public isActive: boolean = false;
  public activationProgress: number = 0;

  protected targetObject: Phaser.GameObjects.GameObject | null = null;
  protected activationThreshold: number = 0;
  protected currentWeight: number = 0;
  protected sceneRef: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    mechanismType: MechanismType
  ) {
    super(scene, x, y);
    this.id = uuidv4();
    this.mechanismType = mechanismType;
    this.sceneRef = scene;
    scene.add.existing(this);
  }

  abstract createVisuals(): void;

  abstract onActivate(): void;

  abstract onDeactivate(): void;

  applyWeight(weight: number): void {
    this.currentWeight = weight;
    const wasActive = this.isActive;

    if (this.currentWeight >= this.activationThreshold) {
      this.isActive = true;
      this.activationProgress = Math.min(
        1,
        this.currentWeight / this.activationThreshold
      );
      if (!wasActive) {
        this.onActivate();
      }
    } else {
      this.isActive = false;
      this.activationProgress =
        this.activationThreshold > 0
          ? this.currentWeight / this.activationThreshold
          : 0;
      if (wasActive) {
        this.onDeactivate();
      }
    }
  }

  removeWeight(weight: number): void {
    this.currentWeight = Math.max(0, this.currentWeight - weight);
    const wasActive = this.isActive;

    if (this.currentWeight < this.activationThreshold) {
      this.isActive = false;
      this.activationProgress =
        this.activationThreshold > 0
          ? this.currentWeight / this.activationThreshold
          : 0;
      if (wasActive) {
        this.onDeactivate();
      }
    }
  }

  setTarget(target: Phaser.GameObjects.GameObject): void {
    this.targetObject = target;
  }

  reset(): void {
    this.isActive = false;
    this.activationProgress = 0;
    this.currentWeight = 0;
    this.onDeactivate();
  }
}
