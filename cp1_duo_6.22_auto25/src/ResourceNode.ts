import { Container, Graphics, Text, TextStyle } from 'pixi.js';

export type ResourceType = 'mine' | 'herb' | 'spring';
export type OwnerType = 'player' | 'ai' | 'neutral';

export interface BattleRound {
  round: number;
  attackerHit: boolean;
  attackerDamage: number;
  defenderHpAfter: number;
  defenderHit: boolean;
  defenderDamage: number;
  attackerHpAfter: number;
}

export interface BattleResult {
  attackerWon: boolean;
  attackerRemainingHp: number;
  defenderRemainingHp: number;
  rounds: number;
  log: BattleRound[];
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

const NAME_STYLE: TextStyle = new TextStyle({
  fontSize: 11,
  fill: 0xf5f0e8,
  fontFamily: 'serif',
  fontWeight: 'bold',
  dropShadow: true,
  dropShadowColor: 0x000000,
  dropShadowDistance: 1,
});

const YIELD_STYLE = (color: number): TextStyle => new TextStyle({
  fontSize: 9,
  fill: color,
  fontFamily: 'serif',
});

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
  private ownerRing: Graphics;
  private nameLabel: Text;
  private yieldLabel: Text;
  private contestGlow: Graphics | null = null;
  private pulsePhase: number = 0;

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
    this.ownerRing = new Graphics();
    this.nameLabel = new Text(RESOURCE_NAMES[this.type], NAME_STYLE);
    this.nameLabel.anchor.set(0.5, 0);
    this.nameLabel.y = 16;

    this.yieldLabel = new Text(`+${this.baseYield}/s`, YIELD_STYLE(RESOURCE_COLORS[this.type]));
    this.yieldLabel.anchor.set(0.5, 0);
    this.yieldLabel.y = 28;

    this.drawIcon();
    this.drawOwnerRing();

    this.addChild(this.icon);
    this.addChild(this.ownerRing);
    this.addChild(this.nameLabel);
    this.addChild(this.yieldLabel);

    this.eventMode = 'static';
    this.cursor = 'pointer';
  }

  private drawIcon(): void {
    this.icon.clear();
    const c = RESOURCE_COLORS[this.type];

    switch (this.type) {
      case 'mine':
        this.icon.beginFill(c);
        this.icon.drawPolygon([0, -15, -12, 9, 12, 9]);
        this.icon.endFill();
        this.icon.beginFill(c, 0.4);
        this.icon.drawPolygon([0, -9, -7, 5, 7, 5]);
        this.icon.endFill();
        this.icon.beginFill(0xffffff, 0.2);
        this.icon.drawPolygon([-2, -12, -6, 5, 2, 5]);
        this.icon.endFill();
        break;
      case 'herb':
        this.icon.beginFill(c);
        this.icon.moveTo(0, -15);
        this.icon.bezierCurveTo(-14, -9, -12, 5, 0, 12);
        this.icon.bezierCurveTo(12, 5, 14, -9, 0, -15);
        this.icon.endFill();
        this.icon.beginFill(0x2e7d32);
        this.icon.drawRect(-1, -5, 2, 14);
        this.icon.endFill();
        this.icon.beginFill(0x388e3c);
        this.icon.moveTo(-1, -2);
        this.icon.bezierCurveTo(-8, -6, -6, 2, -1, 0);
        this.icon.endFill();
        this.icon.beginFill(0x388e3c);
        this.icon.moveTo(1, 0);
        this.icon.bezierCurveTo(6, -4, 7, 4, 1, 2);
        this.icon.endFill();
        break;
      case 'spring':
        this.icon.beginFill(c);
        this.icon.moveTo(0, -15);
        this.icon.bezierCurveTo(-11, -5, -10, 7, 0, 12);
        this.icon.bezierCurveTo(10, 7, 11, -5, 0, -15);
        this.icon.endFill();
        this.icon.beginFill(0x90caf9, 0.6);
        this.icon.drawEllipse(-2, -3, 5, 7);
        this.icon.endFill();
        this.icon.beginFill(0xbbdefb, 0.3);
        this.icon.drawEllipse(-3, -5, 3, 4);
        this.icon.endFill();
        break;
    }
  }

  private drawOwnerRing(): void {
    this.ownerRing.clear();
    if (this.owner !== 'neutral') {
      const c = OWNER_COLORS[this.owner];
      this.ownerRing.lineStyle(2.5, c, 0.9);
      this.ownerRing.drawCircle(0, 0, 20);
      this.ownerRing.lineStyle(1, c, 0.3);
      this.ownerRing.drawCircle(0, 0, 23);
    }
  }

  occupy(newOwner: OwnerType, newGuardianPower: number): void {
    const prev = this.owner;
    this.owner = newOwner;
    this.guardianPower = newGuardianPower;
    if (prev !== 'neutral' && prev !== newOwner) {
      this.contestCount++;
    }
    this.drawOwnerRing();
    if (this.contestCount > 3) {
      this.showContestGlow();
    }
  }

  private showContestGlow(): void {
    if (this.contestGlow) {
      this.removeChild(this.contestGlow);
      this.contestGlow.destroy();
    }
    this.contestGlow = new Graphics();
    this.contestGlow.beginFill(0xff0000, 0.2);
    this.contestGlow.drawCircle(0, 0, 26);
    this.contestGlow.endFill();
    this.addChildAt(this.contestGlow, 0);
  }

  updatePulse(dt: number): void {
    this.pulsePhase += dt * 2;
    if (this.contestGlow) {
      const alpha = 0.15 + 0.1 * Math.sin(this.pulsePhase);
      this.contestGlow.alpha = alpha;
    }
  }

  battle(attackerPower: number, attackerFaction: 'player' | 'ai', defenseBonus: number = 0): BattleResult {
    const attackerMaxHp = attackerPower * 3;
    const defenderMaxHp = this.guardianPower * 3;
    let attackerHp = attackerMaxHp;
    let defenderHp = defenderMaxHp;
    const log: BattleRound[] = [];
    let rounds = 0;

    while (attackerHp > 0 && defenderHp > 0 && rounds < 30) {
      rounds++;
      const round: BattleRound = {
        round: rounds,
        attackerHit: false,
        attackerDamage: 0,
        defenderHpAfter: defenderHp,
        defenderHit: false,
        defenderDamage: 0,
        attackerHpAfter: attackerHp,
      };

      const attackerHitChance = 0.7 + Math.random() * 0.2;
      if (Math.random() < attackerHitChance) {
        round.attackerHit = true;
        const multiplier = 0.8 + Math.random() * 0.4;
        round.attackerDamage = Math.round(attackerPower * multiplier);
        defenderHp -= round.attackerDamage;
      }
      round.defenderHpAfter = Math.max(0, Math.round(defenderHp));

      if (defenderHp > 0) {
        const defenderHitChance = 0.7 + Math.random() * 0.2;
        const effectiveDefPower = this.guardianPower * (1 + defenseBonus);
        if (Math.random() < defenderHitChance) {
          round.defenderHit = true;
          const multiplier = 0.8 + Math.random() * 0.4;
          round.defenderDamage = Math.round(effectiveDefPower * multiplier);
          attackerHp -= round.defenderDamage;
        }
      }
      round.attackerHpAfter = Math.max(0, Math.round(attackerHp));

      log.push(round);
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
      log,
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
