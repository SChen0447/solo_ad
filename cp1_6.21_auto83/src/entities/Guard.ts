import Phaser from 'phaser';
import { GlobalSettings } from '../main';
import { LightManager, Wall } from '../utils/LightManager';
import { v4 as uuidv4 } from 'uuid';

export enum GuardState {
  PATROLLING = 'patrolling',
  SUSPICIOUS = 'suspicious',
  CHASING = 'chasing',
  INVESTIGATING = 'investigating',
  RETURNING = 'returning'
}

export interface PatrolPoint {
  x: number;
  y: number;
}

export class Guard extends Phaser.Physics.Arcade.Sprite {
  private lightManager: LightManager;
  private walls: Wall[];
  private guardState: GuardState = GuardState.PATROLLING;
  private alertLevel: number = 0;
  private maxAlertLevel: number = 100;
  private patrolPoints: PatrolPoint[] = [];
  private currentPatrolIndex: number = 0;
  private fovAngle: number = GlobalSettings.GUARD_FOV_ANGLE * (Math.PI / 180);
  private fovDistance: number = GlobalSettings.GUARD_FOV_DISTANCE;
  private facingAngle: number = 0;
  private lastKnownPlayerPos: Phaser.Math.Vector2 | null = null;
  private investigationTarget: Phaser.Math.Vector2 | null = null;
  private investigationTimer: number = 0;
  private noiseInvestigateEndTime: number = 0;
  private speed: number = GlobalSettings.GUARD_SPEED;
  private aiUpdateTimer: number = 0;
  private aiUpdateInterval: number = 100;
  private guardGraphics: Phaser.GameObjects.Graphics | null = null;
  private fovGraphics: Phaser.GameObjects.Graphics | null = null;
  private playerRef: Phaser.Physics.Arcade.Sprite | null = null;
  private alertBarGraphics: Phaser.GameObjects.Graphics | null = null;
  private stateMachineTimer: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    lightManager: LightManager,
    walls: Wall[],
    patrolPoints: PatrolPoint[]
  ) {
    super(scene, x, y, '');
    this.lightManager = lightManager;
    this.walls = walls;
    this.patrolPoints = patrolPoints;

    scene.physics.world.enable(this);
    scene.add.existing(this);

    this.setBodySize(20, 20);
    this.setCollideWorldBounds(true);

    this.facingAngle = 0;
    this.initGraphics(scene);
  }

  private initGraphics(scene: Phaser.Scene): void {
    this.guardGraphics = scene.add.graphics();
    this.fovGraphics = scene.add.graphics();
    this.alertBarGraphics = scene.add.graphics();
  }

  setPlayer(player: Phaser.Physics.Arcade.Sprite): void {
    this.playerRef = player;
  }

  update(delta: number, time: number): void {
    this.aiUpdateTimer += delta;

    if (this.aiUpdateTimer >= this.aiUpdateInterval) {
      this.updateAI(delta, time);
      this.aiUpdateTimer = 0;
    }

    this.updateMovement(delta);
    this.render();
  }

  private updateAI(delta: number, time: number): void {
    if (!this.playerRef) return;

    const canSeePlayer = this.checkLineOfSight(
      this.x, this.y,
      this.playerRef.x, this.playerRef.y
    );

    const playerInFOV = this.isPlayerInFOV();
    const playerVisible = canSeePlayer && playerInFOV;

    switch (this.guardState) {
      case GuardState.PATROLLING:
        this.handlePatrolState(playerVisible, time);
        break;
      case GuardState.SUSPICIOUS:
        this.handleSuspiciousState(playerVisible, time);
        break;
      case GuardState.CHASING:
        this.handleChasingState(playerVisible, time);
        break;
      case GuardState.INVESTIGATING:
        this.handleInvestigatingState(playerVisible, time);
        break;
      case GuardState.RETURNING:
        this.handleReturningState(playerVisible, time);
        break;
    }

    if (!playerVisible && this.alertLevel > 0 && this.guardState !== GuardState.CHASING) {
      this.alertLevel -= GlobalSettings.GUARD_ALERT_DECAY * (delta / 1000) * this.maxAlertLevel;
      this.alertLevel = Math.max(0, this.alertLevel);
    }
  }

  private handlePatrolState(playerVisible: boolean, time: number): void {
    if (playerVisible && this.playerRef) {
      this.alertLevel += GlobalSettings.GUARD_ALERT_INCREASE * 2;
      if (this.alertLevel >= this.maxAlertLevel * 0.3) {
        this.guardState = GuardState.SUSPICIOUS;
        this.lastKnownPlayerPos = new Phaser.Math.Vector2(
          this.playerRef.x,
          this.playerRef.y
        );
      }
    }

    this.patrol();
  }

  private handleSuspiciousState(playerVisible: boolean, time: number): void {
    if (playerVisible && this.playerRef) {
      this.alertLevel += GlobalSettings.GUARD_ALERT_INCREASE * 3;
      this.lastKnownPlayerPos = new Phaser.Math.Vector2(
        this.playerRef.x,
        this.playerRef.y
      );

      if (this.alertLevel >= this.maxAlertLevel) {
        this.guardState = GuardState.CHASING;
      }
    } else {
      this.alertLevel -= GlobalSettings.GUARD_ALERT_DECAY * 2;

      if (this.alertLevel <= 0) {
        this.guardState = GuardState.RETURNING;
      } else if (this.lastKnownPlayerPos) {
        this.moveTowards(this.lastKnownPlayerPos.x, this.lastKnownPlayerPos.y, this.speed * 0.7);
      }
    }
  }

  private handleChasingState(playerVisible: boolean, time: number): void {
    if (playerVisible && this.playerRef) {
      this.lastKnownPlayerPos = new Phaser.Math.Vector2(
        this.playerRef.x,
        this.playerRef.y
      );
      this.moveTowards(
        this.playerRef.x,
        this.playerRef.y,
        this.speed * 1.5
      );
    } else {
      this.stateMachineTimer += 100;
      if (this.stateMachineTimer > 3000) {
        this.stateMachineTimer = 0;
        this.guardState = GuardState.SUSPICIOUS;
      } else if (this.lastKnownPlayerPos) {
        this.moveTowards(
          this.lastKnownPlayerPos.x,
          this.lastKnownPlayerPos.y,
          this.speed * 1.2
        );
      }
    }
  }

  private handleInvestigatingState(playerVisible: boolean, time: number): void {
    if (playerVisible && this.playerRef) {
      this.guardState = GuardState.CHASING;
      this.alertLevel = this.maxAlertLevel;
      this.lastKnownPlayerPos = new Phaser.Math.Vector2(
        this.playerRef.x,
        this.playerRef.y
      );
      return;
    }

    if (time > this.noiseInvestigateEndTime) {
      this.guardState = GuardState.RETURNING;
      this.investigationTarget = null;
      return;
    }

    if (this.investigationTarget) {
      const dist = Phaser.Math.Distance.Between(
        this.x, this.y,
        this.investigationTarget.x, this.investigationTarget.y
      );

      if (dist < 20) {
        this.stateMachineTimer += 100;
        this.setVelocity(0, 0);
      } else {
        this.moveTowards(
          this.investigationTarget.x,
          this.investigationTarget.y,
          this.speed * 0.8
        );
      }
    }
  }

  private handleReturningState(playerVisible: boolean, time: number): void {
    if (playerVisible && this.playerRef) {
      this.guardState = GuardState.SUSPICIOUS;
      this.alertLevel = this.maxAlertLevel * 0.5;
      this.lastKnownPlayerPos = new Phaser.Math.Vector2(
        this.playerRef.x,
        this.playerRef.y
      );
      return;
    }

    if (this.patrolPoints.length > 0) {
      const target = this.patrolPoints[this.currentPatrolIndex];
      const dist = Phaser.Math.Distance.Between(
        this.x, this.y,
        target.x, target.y
      );

      if (dist < 20) {
        this.guardState = GuardState.PATROLLING;
      } else {
        this.moveTowards(target.x, target.y, this.speed * 0.6);
      }
    }
  }

  private patrol(): void {
    if (this.patrolPoints.length === 0) return;

    const target = this.patrolPoints[this.currentPatrolIndex];
    const dist = Phaser.Math.Distance.Between(
      this.x, this.y,
      target.x, target.y
    );

    if (dist < 20) {
      this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
    } else {
      this.moveTowards(target.x, target.y, this.speed);
    }
  }

  private moveTowards(targetX: number, targetY: number, speed: number): void {
    const angle = Phaser.Math.Angle.Between(
      this.x, this.y,
      targetX, targetY
    );

    this.facingAngle = angle;

    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    this.setVelocity(vx, vy);
  }

  private updateMovement(delta: number): void {
    if (!this.body) return;
    const vel = this.body.velocity;
    if (vel.length() > 1) {
      this.facingAngle = Math.atan2(vel.y, vel.x);
    }
  }

  private isPlayerInFOV(): boolean {
    if (!this.playerRef) return false;

    const dx = this.playerRef.x - this.x;
    const dy = this.playerRef.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.fovDistance) return false;

    const playerAngle = Math.atan2(dy, dx);
    let angleDiff = playerAngle - this.facingAngle;

    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    return Math.abs(angleDiff) < this.fovAngle / 2;
  }

  private checkLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    for (const wall of this.walls) {
      if (this.lineIntersectsRect(x1, y1, x2, y2, wall)) {
        return false;
      }
    }
    return true;
  }

  private lineIntersectsRect(
    x1: number, y1: number,
    x2: number, y2: number,
    rect: Wall
  ): boolean {
    const left = rect.x;
    const right = rect.x + rect.width;
    const top = rect.y;
    const bottom = rect.y + rect.height;

    if (x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) return true;
    if (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom) return true;

    return (
      this.lineSegmentsIntersect(x1, y1, x2, y2, left, top, right, top) ||
      this.lineSegmentsIntersect(x1, y1, x2, y2, right, top, right, bottom) ||
      this.lineSegmentsIntersect(x1, y1, x2, y2, right, bottom, left, bottom) ||
      this.lineSegmentsIntersect(x1, y1, x2, y2, left, bottom, left, top)
    );
  }

  private lineSegmentsIntersect(
    x1: number, y1: number, x2: number, y2: number,
    x3: number, y3: number, x4: number, y4: number
  ): boolean {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 0.0001) return false;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    return t >= 0 && t <= 1 && u >= 0 && u <= 1;
  }

  public investigateNoise(x: number, y: number, duration: number): void {
    const dist = Phaser.Math.Distance.Between(this.x, this.y, x, y);
    if (dist <= GlobalSettings.NOISE_RADIUS * 3) {
      this.guardState = GuardState.INVESTIGATING;
      this.investigationTarget = new Phaser.Math.Vector2(x, y);
      this.noiseInvestigateEndTime = this.scene.time.now + duration;
      this.alertLevel = Math.max(this.alertLevel, this.maxAlertLevel * 0.2);
    }
  }

  private render(): void {
    if (!this.guardGraphics || !this.fovGraphics || !this.alertBarGraphics) return;

    this.fovGraphics.clear();
    const fovColor = this.getStateColor();
    const fovAlpha = this.guardState === GuardState.CHASING ? 0.35 :
      this.guardState === GuardState.SUSPICIOUS ? 0.25 : 0.15;

    this.fovGraphics.save();
    this.fovGraphics.fillStyle(fovColor, fovAlpha);

    const segments = 30;
    this.fovGraphics.beginPath();
    this.fovGraphics.moveTo(this.x, this.y);

    for (let i = 0; i <= segments; i++) {
      const angle = this.facingAngle - this.fovAngle / 2 + (this.fovAngle * i / segments);
      const endX = this.x + Math.cos(angle) * this.fovDistance;
      const endY = this.y + Math.sin(angle) * this.fovDistance;
      this.fovGraphics.lineTo(endX, endY);
    }

    this.fovGraphics.closePath();
    this.fovGraphics.fillPath();
    this.fovGraphics.restore();

    this.guardGraphics.clear();

    const bodyColor = this.getStateColor();
    this.guardGraphics.save();
    this.guardGraphics.fillStyle(bodyColor, 1);
    this.guardGraphics.fillCircle(this.x, this.y, 12);
    this.guardGraphics.restore();

    this.guardGraphics.save();
    this.guardGraphics.fillStyle(0xffffff, 0.9);
    const eyeX = this.x + Math.cos(this.facingAngle) * 8;
    const eyeY = this.y + Math.sin(this.facingAngle) * 8;
    this.guardGraphics.fillCircle(eyeX, eyeY, 4);
    this.guardGraphics.restore();

    this.alertBarGraphics.clear();
    const barWidth = 30;
    const barHeight = 4;
    const barX = this.x - barWidth / 2;
    const barY = this.y - 25;

    this.alertBarGraphics.save();
    this.alertBarGraphics.fillStyle(0x333333, 0.8);
    this.alertBarGraphics.fillRect(barX, barY, barWidth, barHeight);
    this.alertBarGraphics.restore();

    if (this.alertLevel > 0) {
      const alertRatio = this.alertLevel / this.maxAlertLevel;
      const alertColor = Phaser.Display.Color.Interpolate.ColorWithColor(
        new Phaser.Display.Color(255, 255, 0),
        new Phaser.Display.Color(255, 0, 0),
        100,
        alertRatio * 100
      );

      this.alertBarGraphics.save();
      this.alertBarGraphics.fillStyle(
        Phaser.Display.Color.GetColor(alertColor.r, alertColor.g, alertColor.b),
        0.9
      );
      this.alertBarGraphics.fillRect(barX, barY, barWidth * alertRatio, barHeight);
      this.alertBarGraphics.restore();
    }
  }

  private getStateColor(): number {
    switch (this.guardState) {
      case GuardState.PATROLLING:
        return 0xffaa00;
      case GuardState.SUSPICIOUS:
        return 0xff6600;
      case GuardState.CHASING:
        return 0xff2222;
      case GuardState.INVESTIGATING:
        return 0xff8800;
      case GuardState.RETURNING:
        return 0xffaa00;
      default:
        return 0xffaa00;
    }
  }

  public getState(): GuardState {
    return this.guardState;
  }

  public getAlertLevel(): number {
    return this.alertLevel;
  }

  public getMaxAlertLevel(): number {
    return this.maxAlertLevel;
  }

  public getFacingAngle(): number {
    return this.facingAngle;
  }

  destroy(fromScene?: boolean): void {
    if (this.guardGraphics) this.guardGraphics.destroy();
    if (this.fovGraphics) this.fovGraphics.destroy();
    if (this.alertBarGraphics) this.alertBarGraphics.destroy();
    super.destroy(fromScene);
  }
}

export default Guard;
