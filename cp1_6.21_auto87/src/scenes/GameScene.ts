import Phaser from 'phaser';
import { PlayerController } from '../modules/fight/PlayerController';
import { SkillManager, SKILLS } from '../modules/fight/SkillManager';
import { MonsterSpawner } from '../modules/fight/MonsterSpawner';
import { HUD } from '../modules/ui/HUD';

const PLAYER_SPEED = 200;
const PLAYER_MAX_HP = 100;
const BASE_ATTACK_DAMAGE = 15;
const ATTACK_RANGE = 80;
const SKILL_ATTACK_RANGE = 150;
const GROUND_Y = 660;

export class GameScene extends Phaser.Scene {
  private playerContainer!: Phaser.GameObjects.Container;
  private player!: Phaser.GameObjects.Rectangle;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private playerController!: PlayerController;
  private skillManager!: SkillManager;
  private monsterSpawner!: MonsterSpawner;
  private hud!: HUD;
  private playerHp: number = PLAYER_MAX_HP;
  private particles: Phaser.GameObjects.Arc[] = [];
  private comboSlashGfx!: Phaser.GameObjects.Graphics;
  private keys!: {
    A: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.createBackground();
    this.createPlayer();
    this.createParticles();
    this.comboSlashGfx = this.add.graphics();
    this.comboSlashGfx.setDepth(10);

    this.keys = {
      A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };

    this.playerController = new PlayerController(this);
    this.skillManager = new SkillManager(this);
    this.monsterSpawner = new MonsterSpawner(this);
    this.monsterSpawner.setPlayerRef({ x: this.playerContainer.x, y: this.playerContainer.y });
    this.hud = new HUD(this);

    this.setupEventListeners();
    this.hud.updateHp(this.playerHp, PLAYER_MAX_HP);

    this.createControlsHelp();
  }

  private createBackground(): void {
    const bg = this.add.graphics();
    bg.setDepth(0);

    const w = this.scale.width;
    const h = this.scale.height;

    for (let y = 0; y < h; y++) {
      const t = y / h;
      const r = Math.floor(20 * (1 - t) + 8 * t);
      const g = Math.floor(8 * (1 - t) + 8 * t);
      const b = Math.floor(40 * (1 - t) + 30 * t);
      bg.fillStyle(Phaser.Display.Color.GetColor(r, g, b));
      bg.fillRect(0, y, w, 1);
    }

    const ground = this.add.rectangle(w / 2, h - 20, w, 40, 0x1a1a2a);
    ground.setDepth(1);
    const groundLine = this.add.rectangle(w / 2, h - 40, w, 2, 0x334466, 0.5);
    groundLine.setDepth(1);
  }

  private createPlayer(): void {
    const startX = this.scale.width / 2;
    const startY = GROUND_Y;

    this.playerShadow = this.add.ellipse(startX, startY + 18, 32, 8, 0x000000, 0.3);
    this.playerShadow.setDepth(3);

    this.playerContainer = this.add.container(startX, startY);
    this.playerContainer.setDepth(5);

    this.player = this.add.rectangle(0, 0, 24, 32, 0x00dddd);
    this.player.setOrigin(0.5);

    const head = this.add.rectangle(0, -22, 16, 12, 0x00bbbb);
    head.setOrigin(0.5);

    const eyes = this.add.rectangle(3, -24, 4, 4, 0xffffff);
    eyes.setOrigin(0.5);

    const arm = this.add.rectangle(14, -2, 6, 16, 0x00aaaa);
    arm.setOrigin(0.5);
    arm.setName('arm');

    this.playerContainer.add([this.player, head, eyes, arm]);
  }

  private createParticles(): void {
    for (let i = 0; i < 30; i++) {
      this.spawnParticle();
    }
  }

  private spawnParticle(): void {
    const x = Phaser.Math.Between(0, this.scale.width);
    const y = Phaser.Math.Between(0, this.scale.height - 60);
    const size = Phaser.Math.FloatBetween(2, 4);
    const alpha = Phaser.Math.FloatBetween(0.1, 0.3);
    const speed = Phaser.Math.FloatBetween(15, 25);

    const p = this.add.circle(x, y, size, 0x88ccff, alpha);
    p.setDepth(2);

    const dirY = -speed;
    const driftX = Phaser.Math.FloatBetween(-5, 5);

    this.tweens.add({
      targets: p,
      x: x + driftX * 10,
      y: y + dirY * 10,
      alpha: 0,
      duration: (this.scale.height / speed) * 1000,
      onComplete: () => {
        if (p.active) {
          p.x = Phaser.Math.Between(0, this.scale.width);
          p.y = this.scale.height - 60;
          p.setAlpha(Phaser.Math.FloatBetween(0.1, 0.3));
          this.spawnParticle();
          p.destroy();
        }
      },
    });

    this.particles.push(p);
  }

  private createControlsHelp(): void {
    const helpTexts = [
      'A/D: 移动  J: 轻击  K: 重击  L: 闪避',
      'Q/E/R: 技能  连招: JJJ三连击  JK突进斩  KK重锤',
    ];

    for (let i = 0; i < helpTexts.length; i++) {
      const t = this.add.text(this.scale.width / 2, this.scale.height - 130 + i * 18, helpTexts[i], {
        fontSize: '11px',
        fontFamily: 'Arial',
        color: '#556677',
        align: 'center',
      });
      t.setOrigin(0.5);
      t.setDepth(30);
      t.setAlpha(0.6);
    }
  }

  private setupEventListeners(): void {
    this.playerController.onComboMatched.on('combo', this.handleCombo, this);
    this.playerController.onInputBufferChanged.on('changed', this.handleInputBuffer, this);
    this.playerController.onAction.on('action', this.handleAction, this);
    this.playerController.onAction.on('dodge', this.handleDodge, this);

    this.skillManager.onSkillUsed.on('used', this.handleSkillUsed, this);

    this.monsterSpawner.onMonsterKilled.on('killed', this.handleMonsterKilled, this);
    this.monsterSpawner.onMonsterHit.on('hit', this.handleMonsterAttack, this);
  }

  private handleCombo(combo: any): void {
    this.hud.showComboName(combo.name);
    this.performComboAttack(combo);
    this.playAttackAnim(combo.damageMultiplier >= 2.0 ? 'heavy' : 'light');
  }

  private handleInputBuffer(keys: string[]): void {
    this.hud.updateComboInput(keys);
  }

  private handleAction(action: string): void {
    if (action === 'light' || action === 'heavy') {
      this.performBasicAttack(action === 'light' ? BASE_ATTACK_DAMAGE : BASE_ATTACK_DAMAGE * 1.2);
      this.playAttackAnim(action);
    }
  }

  private playAttackAnim(type: string): void {
    const arm = this.playerContainer.getByName('arm');
    if (!arm) return;

    const angle = type === 'heavy' ? -60 : -30;
    this.tweens.add({
      targets: arm,
      angle: angle,
      duration: 80,
      yoyo: true,
      ease: 'Power2',
    });
  }

  private handleDodge(): void {
    const dir = this.playerController.isFacingRight() ? 1 : -1;
    this.tweens.add({
      targets: this.playerContainer,
      x: this.playerContainer.x + dir * 80,
      duration: 200,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: this.playerContainer,
      alpha: 0.3,
      duration: 100,
      yoyo: true,
    });
  }

  private handleSkillUsed(skillDef: any): void {
    this.hud.showSkillEffect(this.playerContainer.x, this.playerContainer.y, skillDef.color);

    const monsters = this.monsterSpawner.getMonstersInRange(
      this.playerContainer.x, this.playerContainer.y, SKILL_ATTACK_RANGE
    );

    for (const m of monsters) {
      const killed = this.monsterSpawner.damageMonster(m.id, skillDef.damage);
      if (killed) {
        this.onMonsterKill(m.config.scoreValue);
      } else {
        this.hud.incrementCombo();
        this.hud.addScore(10 * this.hud.getComboMultiplier());
      }
    }

    this.showSlashEffect(this.playerContainer.x, this.playerContainer.y, SKILL_ATTACK_RANGE, skillDef.color);
  }

  private performBasicAttack(damage: number): void {
    const dir = this.playerController.isFacingRight() ? 1 : -1;
    const ax = this.playerContainer.x + dir * 30;
    const ay = this.playerContainer.y;

    const monster = this.monsterSpawner.getMonsterAt(ax, ay, ATTACK_RANGE);
    if (monster) {
      const killed = this.monsterSpawner.damageMonster(monster.id, damage);
      if (killed) {
        this.onMonsterKill(monster.config.scoreValue);
      } else {
        this.hud.incrementCombo();
        this.hud.addScore(10 * this.hud.getComboMultiplier());
      }
    }

    this.showSlashEffect(ax, ay, ATTACK_RANGE, 0x00cccc);
  }

  private performComboAttack(combo: any): void {
    const dir = this.playerController.isFacingRight() ? 1 : -1;
    const range = combo.damageMultiplier >= 2.0 ? 120 : 100;
    const damage = BASE_ATTACK_DAMAGE * combo.damageMultiplier;

    const monsters = this.monsterSpawner.getMonstersInRange(
      this.playerContainer.x, this.playerContainer.y, range
    );

    for (const m of monsters) {
      const killed = this.monsterSpawner.damageMonster(m.id, damage);
      if (killed) {
        this.onMonsterKill(m.config.scoreValue);
      } else {
        this.hud.incrementCombo();
        this.hud.addScore(Math.floor(10 * combo.damageMultiplier) * this.hud.getComboMultiplier());
      }
    }

    this.showSlashEffect(this.playerContainer.x + dir * 30, this.playerContainer.y, range, 0x44ffdd);
  }

  private showSlashEffect(x: number, y: number, range: number, color: number): void {
    this.comboSlashGfx.clear();
    this.comboSlashGfx.lineStyle(3, color, 0.8);
    this.comboSlashGfx.strokeCircle(x, y, range * 0.5);

    this.tweens.addCounter({
      from: 1,
      to: 0,
      duration: 300,
      onUpdate: (tween) => {
        const val: number = tween.getValue() ?? 0;
        this.comboSlashGfx.clear();
        this.comboSlashGfx.lineStyle(3 * val, color, val * 0.6);
        this.comboSlashGfx.strokeCircle(x, y, range * 0.5 * (2 - val));
      },
    });
  }

  private onMonsterKill(scoreValue: number): void {
    this.hud.incrementCombo();
    const mult = this.hud.getComboMultiplier();
    this.hud.addScore(scoreValue * mult);
  }

  private handleMonsterKilled(_data: any): void {
  }

  private handleMonsterAttack(data: { damage: number; type: string }): void {
    if (this.playerController.isDodging()) return;

    this.playerHp -= data.damage;
    this.playerHp = Math.max(0, this.playerHp);
    this.hud.updateHp(this.playerHp, PLAYER_MAX_HP);

    this.tweens.add({
      targets: this.playerContainer,
      alpha: 0.5,
      duration: 80,
      yoyo: true,
    });

    if (this.playerHp <= 0) {
      this.handleDeath();
    }
  }

  private handleDeath(): void {
    this.playerController.onComboMatched.off('combo', this.handleCombo, this);
    this.playerController.onInputBufferChanged.off('changed', this.handleInputBuffer, this);
    this.playerController.onAction.off('action', this.handleAction, this);
    this.playerController.onAction.off('dodge', this.handleDodge, this);
    this.skillManager.onSkillUsed.off('used', this.handleSkillUsed, this);
    this.monsterSpawner.onMonsterKilled.off('killed', this.handleMonsterKilled, this);
    this.monsterSpawner.onMonsterHit.off('hit', this.handleMonsterAttack, this);

    this.tweens.add({
      targets: this.playerContainer,
      alpha: 0,
      angle: 90,
      y: this.playerContainer.y + 20,
      duration: 500,
      ease: 'Power2',
      onComplete: () => {
        this.showDeathScreen();
      },
    });
  }

  private showDeathScreen(): void {
    const cx = this.scale.width / 2;
    const cy = this.scale.height / 2;

    const overlay = this.add.rectangle(cx, cy, this.scale.width, this.scale.height, 0x000000, 0.7);
    overlay.setDepth(100);

    const deathText = this.add.text(cx, cy - 30, '你倒下了', {
      fontSize: '36px',
      fontFamily: 'Arial',
      color: '#ff4444',
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 4,
    });
    deathText.setOrigin(0.5);
    deathText.setDepth(101);

    const scoreText = this.add.text(cx, cy + 20, `最终得分: ${this.hud.getScore()}`, {
      fontSize: '20px',
      fontFamily: 'Arial',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 2,
    });
    scoreText.setOrigin(0.5);
    scoreText.setDepth(101);

    const restartText = this.add.text(cx, cy + 60, '按 SPACE 重新开始', {
      fontSize: '16px',
      fontFamily: 'Arial',
      color: '#88aacc',
    });
    restartText.setOrigin(0.5);
    restartText.setDepth(101);

    this.tweens.add({
      targets: restartText,
      alpha: 0.4,
      duration: 600,
      yoyo: true,
      repeat: -1,
    });

    const spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    spaceKey.on('down', () => {
      this.scene.restart();
    });
  }

  update(_time: number, delta: number): void {
    this.playerController.update(delta);
    this.skillManager.update(delta);
    this.monsterSpawner.update(delta);
    this.hud.updateCombo(delta);

    this.updateSkillHUD();
    this.updatePlayerMovement(delta);
    this.updatePlayerShadow();
    this.updatePlayerRef();
  }

  private updateSkillHUD(): void {
    for (let i = 0; i < SKILLS.length; i++) {
      const progress = this.skillManager.getSkillProgress(SKILLS[i].id);
      const state = this.skillManager.getSkillState(SKILLS[i].id);
      this.hud.updateSkillCooldown(i, progress, state);
    }
  }

  private updatePlayerMovement(delta: number): void {
    if (this.playerHp <= 0) return;

    const left = this.keys.A.isDown;
    const right = this.keys.D.isDown;

    if (this.playerController.getState() === 'dodging') return;
    if (this.playerController.getState() === 'attacking') return;

    if (left) {
      this.playerContainer.x -= PLAYER_SPEED * (delta / 1000);
      this.playerContainer.setScale(-1, 1);
    }
    if (right) {
      this.playerContainer.x += PLAYER_SPEED * (delta / 1000);
      this.playerContainer.setScale(1, 1);
    }

    this.playerContainer.x = Phaser.Math.Clamp(this.playerContainer.x, 20, this.scale.width - 20);
  }

  private updatePlayerShadow(): void {
    this.playerShadow.x = this.playerContainer.x;
  }

  private updatePlayerRef(): void {
    this.monsterSpawner.setPlayerRef({
      x: this.playerContainer.x,
      y: this.playerContainer.y,
    });
  }
}
