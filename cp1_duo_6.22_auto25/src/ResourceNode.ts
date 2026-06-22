import { Container, Graphics, Text } from 'pixi.js';

export type ResourceType = 'mine' | 'herb' | 'spring';
export type OwnerType = 'player' | 'ai' | 'neutral';

export interface BattleResult {
  attackerWon: boolean;
  attackerRemainingHp: number;
  defenderRemainingHp: number;
  rounds: number;
}

export interface ResourceNodeData {
  id: number;
  type: ResourceType;
  gridX: number;
  gridY: number;
  baseYield: number;
  guardianPower: number;
  owner: OwnerType;
  contestCount: number;
}

const RESOURCE_COLORS: Record<ResourceType, number> = {
  mine: 0xffd700,
  herb: 0x4caf50,
  spring: 0x42a5f5,
};

const RESOURCE_NAMES: Record<ResourceType, string> = {
  mine: '矿山',
  herb: '药田',
  spring: '灵泉',
};

const OWNER_COLORS: Record<OwnerType, number> = {
  player: 0xc04040,
  ai: 0x4060c0,
  neutral: 0x888888,
};

export class ResourceNode extends Container {
  public id: number;
  public type: ResourceType;
  public gridX: number;
  public gridY: number;
  public baseYield: number;
  public guardianPower: number;
  public owner: OwnerType;
  public contestCount: number;

  private icon: Graphics;
  private ownerMarker: Graphics;
  private nameLabel: Text;
  private yieldLabel: Text;
  private contestEffect: Graphics | null = null;

  constructor(data: ResourceNodeData) {
    super();

    this.id = data.id;
    this.type = data.type;
    this.gridX = data.gridX;
    this.gridY = data.gridY;
    this.baseYield = data.baseYield;
    this.guardianPower = data.guardianPower;
    this.owner = data.owner;
    this.contestCount = data.contestCount;

    this.icon = new Graphics();
    this.ownerMarker = new Graphics();
    this.nameLabel = new Text(RESOURCE_NAMES[this.type], {
      fontSize: 10,
      fill: 0xf5f0e8,
      fontFamily: 'serif',
    });
    this.nameLabel.anchor.set(0.5, 0);
    this.nameLabel.y = 14;

    this.yieldLabel = new Text(`+${this.baseYield}`, {
      fontSize: 9,
      fill: RESOURCE_COLORS[this.type],
      fontFamily: 'serif',
    });
    this.yieldLabel.anchor.set(0.5, 0);
    this.yieldLabel.y = 24;

    this.drawIcon();
    this.drawOwnerMarker();

    this.addChild(this.icon);
    this.addChild(this.ownerMarker);
    this.addChild(this.nameLabel);
    this.addChild(this.yieldLabel);

    this.eventMode = 'static';
    this.cursor = 'pointer';
  }

  private drawIcon(): void {
    this.icon.clear();
    const color = RESOURCE_COLORS[this.type];

    switch (this.type) {
      case 'mine':
        this.icon.beginFill(color);
        this.icon.drawPolygon([0, -14, -11, 8, 11, 8]);
        this.icon.endFill();
        this.icon.beginFill(color, 0.5);
        this.icon.drawPolygon([0, -8, -6, 4, 6, 4]);
        this.icon.endFill();
        break;
      case 'herb':
        this.icon.beginFill(color);
        this.icon.moveTo(0, -14);
        this.icon.bezierCurveTo(-12, -8, -10, 6, 0, 10);
        this.icon.bezierCurveTo(10, 6, 12, -8, 0, -14);
        this.icon.endFill();
        this.icon.beginFill(0x2e7d32);
        this.icon.moveTo(0, -6);
        this.icon.lineTo(0, 8);
        this.icon.endFill();
        break;
      case 'spring':
        this.icon.beginFill(color);
        this.icon.moveTo(0, -14);
        this.icon.bezierCurveTo(-10, -4, -9, 6, 0, 10);
        this.icon.bezierCurveTo(9, 6, 10, -4, 0, -14);
        this.icon.endFill();
        this.icon.beginFill(0x90caf9, 0.5);
        this.icon.drawEllipse(-2, -2, 4, 6);
        this.icon.endFill();
        break;
    }
  }

  private drawOwnerMarker(): void {
    this.ownerMarker.clear();
    if (this.owner !== 'neutral') {
      const color = OWNER_COLORS[this.owner];
      this.ownerMarker.lineStyle(2, color);
      this.ownerMarker.drawCircle(0, 0, 18);
    }
  }

  occupy(newOwner: OwnerType, newGuardianPower: number): void {
    const previousOwner = this.owner;
    this.owner = newOwner;
    this.guardianPower = newGuardianPower;
    if (previousOwner !== 'neutral' && previousOwner !== newOwner) {
      this.contestCount++;
    }
    this.drawOwnerMarker();
    if (this.contestCount > 3) {
      this.drawContestEffect();
    }
  }

  private drawContestEffect(): void {
    if (this.contestEffect) {
      this.contestEffect.destroy();
    }
    this.contestEffect = new Graphics();
    this.contestEffect.beginFill(0xff0000, 0.3);
    this.contestEffect.drawCircle(0, 0, 22);
    this.contestEffect.endFill();
    this.addChildAt(this.contestEffect, 0);
  }

  resetGuardian(power: number): void {
    this.guardianPower = power;
  }

  battle(attackerPower: number, attackerFaction: 'player' | 'ai'): BattleResult {
    let attackerHp = attackerPower * 3;
    let defenderHp = this.guardianPower * 3;
    let rounds = 0;

    while (attackerHp > 0 && defenderHp > 0 && rounds < 30) {
      rounds++;
      if (Math.random() < 0.7 + Math.random() * 0.2) {
        const dmg = attackerPower * (0.8 + Math.random() * 0.4);
        defenderHp -= dmg;
      }
      if (defenderHp > 0 && Math.random() < 0.7 + Math.random() * 0.2) {
        const dmg = this.guardianPower * (0.8 + Math.random() * 0.4);
        attackerHp -= dmg;
      }
    }

    const attackerWon = defenderHp <= 0;

    if (attackerWon) {
      this.occupy(attackerFaction, Math.floor(attackerPower * 0.8));
    }

    return {
      attackerWon,
      attackerRemainingHp: Math.max(0, Math.round(attackerHp)),
      defenderRemainingHp: Math.max(0, Math.round(defenderHp)),
      rounds,
    };
  }

  getInfo(): ResourceNodeData {
    return {
      id: this.id,
      type: this.type,
      gridX: this.gridX,
      gridY: this.gridY,
      baseYield: this.baseYield,
      guardianPower: this.guardianPower,
      owner: this.owner,
      contestCount: this.contestCount,
    };
  }
}
