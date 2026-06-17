export type DiceType = 'attack' | 'defense' | 'skill';

export interface DiceFace {
  value: number;
  color: string;
}

export interface DiceParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
}

export interface DiceState {
  id: string;
  type: DiceType;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  rotationY: number;
  rotationX: number;
  targetRotationY: number;
  targetValue: number;
  currentValue: number;
  isRolling: boolean;
  rollStartTime: number;
  rollDuration: number;
  bouncePhase: number;
  bounceHeight: number;
  settled: boolean;
  showParticles: boolean;
  particles: DiceParticle[];
  particleStartTime: number;
  wobbleOffset: number;
  wobbleSpeed: number;
  isCritical: boolean;
}

export const DICE_COLORS: Record<DiceType, { main: string; light: string; dark: string; face: string }> = {
  attack: {
    main: '#E53935',
    light: '#FF6F60',
    dark: '#AB000D',
    face: '#FFEBEE'
  },
  defense: {
    main: '#1E88E5',
    light: '#6AB7FF',
    dark: '#005CB2',
    face: '#E3F2FD'
  },
  skill: {
    main: '#43A047',
    light: '#76D275',
    dark: '#00701A',
    face: '#E8F5E9'
  }
};

export type SkillTier = 'small' | 'medium' | 'large' | null;

export interface RollResult {
  dice: DiceState;
  value: number;
  isCritical: boolean;
  skillTier: SkillTier;
}

export class DiceEngine {
  private diceFaces: Record<DiceType, DiceFace[]> = {
    attack: [
      { value: 1, color: 'dot' },
      { value: 2, color: 'dot' },
      { value: 3, color: 'dot' },
      { value: 4, color: 'dot' },
      { value: 5, color: 'dot' },
      { value: 6, color: 'dot' }
    ],
    defense: [
      { value: 1, color: 'dot' },
      { value: 2, color: 'dot' },
      { value: 3, color: 'dot' },
      { value: 4, color: 'dot' },
      { value: 5, color: 'dot' },
      { value: 6, color: 'dot' }
    ],
    skill: [
      { value: 1, color: 'dot' },
      { value: 2, color: 'dot' },
      { value: 3, color: 'dot' },
      { value: 4, color: 'dot' },
      { value: 5, color: 'dot' },
      { value: 6, color: 'dot' }
    ]
  };

  private static diceCounter = 0;

  public createDice(type: DiceType, x: number, y: number): DiceState {
    DiceEngine.diceCounter++;
    return {
      id: `dice_${DiceEngine.diceCounter}_${Date.now()}`,
      type,
      x,
      y,
      baseX: x,
      baseY: y,
      rotationY: 0,
      rotationX: 0,
      targetRotationY: 0,
      targetValue: 1,
      currentValue: 1,
      isRolling: false,
      rollStartTime: 0,
      rollDuration: 600,
      bouncePhase: 0,
      bounceHeight: 0,
      settled: true,
      showParticles: false,
      particles: [],
      particleStartTime: 0,
      wobbleOffset: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.02 + Math.random() * 0.01,
      isCritical: false
    };
  }

  public rollDice(dice: DiceState): RollResult {
    const faces = this.diceFaces[dice.type];
    const randomFace = faces[Math.floor(Math.random() * faces.length)];
    const value = randomFace.value;

    dice.targetValue = value;
    dice.currentValue = value;
    dice.isRolling = true;
    dice.settled = false;
    dice.showParticles = false;
    dice.particles = [];
    dice.rollStartTime = performance.now();
    dice.targetRotationY = 720 + Math.random() * 360;
    dice.rotationY = 0;
    dice.rotationX = 0;
    dice.bouncePhase = 0;
    dice.bounceHeight = 0;
    dice.isCritical = value > 5;

    return {
      dice,
      value,
      isCritical: dice.isCritical,
      skillTier: dice.type === 'skill' ? this.getSkillTier(value) : null
    };
  }

  public rollEnemyAttackDice(min: number = 3, max: number = 5): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  public rollEnemyDefenseDice(min: number = 2, max: number = 4): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  public getSkillTier(value: number): SkillTier {
    if (value >= 1 && value <= 2) return 'small';
    if (value >= 3 && value <= 4) return 'medium';
    if (value >= 5 && value <= 6) return 'large';
    return null;
  }

  public updateDice(dice: DiceState, currentTime: number): void {
    if (!dice.isRolling) {
      dice.wobbleOffset += dice.wobbleSpeed;
      return;
    }

    const elapsed = currentTime - dice.rollStartTime;
    const progress = Math.min(elapsed / dice.rollDuration, 1);

    const easedProgress = this.easeOutCubic(progress);
    dice.rotationY = easedProgress * dice.targetRotationY;
    dice.rotationX = Math.sin(easedProgress * Math.PI * 2) * 15;

    const wobble = Math.sin(elapsed * 0.02 + dice.wobbleOffset) * (1 - progress) * 10;
    dice.x = dice.baseX + wobble;

    if (progress >= 1) {
      if (dice.bouncePhase === 0) {
        dice.bouncePhase = 1;
        dice.bounceHeight = 30;
        dice.rollStartTime = currentTime;
        dice.rollDuration = 200;
      } else if (dice.bouncePhase === 1) {
        const bounceProgress = this.easeOutQuad(Math.min((currentTime - dice.rollStartTime) / dice.rollDuration, 1));
        dice.y = dice.baseY - Math.sin(bounceProgress * Math.PI) * dice.bounceHeight;
        if (bounceProgress >= 1) {
          dice.bouncePhase = 2;
          dice.bounceHeight = dice.bounceHeight * 0.6;
          dice.rollStartTime = currentTime;
        }
      } else if (dice.bouncePhase === 2) {
        const bounceProgress = this.easeOutQuad(Math.min((currentTime - dice.rollStartTime) / dice.rollDuration, 1));
        dice.y = dice.baseY - Math.sin(bounceProgress * Math.PI) * dice.bounceHeight;
        if (bounceProgress >= 1) {
          dice.y = dice.baseY;
          dice.isRolling = false;
          dice.settled = true;
          dice.showParticles = true;
          dice.particleStartTime = currentTime;
          this.spawnParticles(dice);
        }
      }
    }

    this.updateParticles(dice, currentTime);
  }

  private spawnParticles(dice: DiceState): void {
    const colors = DICE_COLORS[dice.type];
    const particleCount = dice.isCritical ? 24 : 14;
    const particleColor = dice.isCritical ? '#FFD700' : colors.light;

    for (let i = 0; i < particleCount; i++) {
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 2.5;
      dice.particles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 200,
        maxLife: 200,
        size: 2 + Math.random() * 3,
        color: particleColor,
        alpha: 1
      });
    }
  }

  private updateParticles(dice: DiceState, currentTime: number): void {
    if (dice.particles.length === 0) return;

    const elapsed = currentTime - dice.particleStartTime;
    if (elapsed > 200) {
      dice.showParticles = false;
      dice.particles = [];
      return;
    }

    for (const p of dice.particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.08;
      p.alpha = 1 - (elapsed / p.maxLife);
    }
  }

  public calculateAttackDamage(attackValue: number, weaponCoef: number = 1.0, enemyDefense: number = 0): number {
    const rawDamage = attackValue * weaponCoef;
    return Math.max(0, rawDamage - enemyDefense);
  }

  public calculateDefenseReduction(defenseValue: number, armorCoef: number = 0.5): number {
    return defenseValue * armorCoef;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private easeOutQuad(t: number): number {
    return 1 - (1 - t) * (1 - t);
  }
}
