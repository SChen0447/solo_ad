import Phaser from 'phaser';
import { monsterGenerator } from '../managers/MonsterGenerator';
import { gameState } from '../store/GameState';
import { MonsterData, MaterialData } from '../models/TypeDefinitions';
import axios from 'axios';

const STEP_TRIGGER = 3;

export class BattleScene extends Phaser.Scene {
  private currentMonster: MonsterData | null = null;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private monsterSprite!: Phaser.GameObjects.Sprite;
  private monsterTint: number = 0xcc4444;
  private monsterParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;
  private playerHpBar!: Phaser.GameObjects.Graphics;
  private monsterHpBar!: Phaser.GameObjects.Graphics;
  private playerHpText!: Phaser.GameObjects.Text;
  private monsterHpText!: Phaser.GameObjects.Text;
  private monsterNameText!: Phaser.GameObjects.Text;
  private actionLog: Phaser.GameObjects.Text[] = [];
  private attackBtn!: Phaser.GameObjects.Container;
  private forgeBtn!: Phaser.GameObjects.Container;
  private codexBtn!: Phaser.GameObjects.Container;
  private exploreBtn!: Phaser.GameObjects.Container;
  private isPlayerTurn: boolean = true;
  private isAnimating: boolean = false;
  private stepCounter: number = 0;
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private torchGlows: Phaser.GameObjects.Sprite[] = [];
  private bottomPanel!: Phaser.GameObjects.Graphics;
  private battleActive: boolean = false;
  private dropItems: Phaser.GameObjects.Container[] = [];
  private playerYBase: number = 0;
  private monsterYBase: number = 0;

  constructor() {
    super({ key: 'BattleScene' });
  }

  create() {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.drawBackground();
    this.createPlayer();
    this.createUI();
    this.startExplore();

    this.scale.on('resize', this.handleResize, this);
  }

  private handleResize() {
    this.drawBackground();
    this.repositionElements();
  }

  private drawBackground() {
    if (this.bgGraphics) this.bgGraphics.destroy();
    this.bgGraphics = this.add.graphics();

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.bgGraphics.fillGradientStyle(0x2a1a0a, 0x2a1a0a, 0x1a0a2a, 0x1a0a2a, 1);
    this.bgGraphics.fillRect(0, 0, w, h);

    this.bgGraphics.lineStyle(1, 0x3a2a1a, 0.3);
    for (let x = 0; x < w; x += 48) {
      this.bgGraphics.lineBetween(x, 0, x, h);
    }
    for (let y = 0; y < h; y += 48) {
      this.bgGraphics.lineBetween(0, y, w, y);
    }

    this.drawTorchGlows(w, h);

    this.bgGraphics.fillStyle(0x1a0a0a, 0.6);
    this.bgGraphics.fillRect(0, h * 0.65, w, 4);
  }

  private drawTorchGlows(w: number, h: number) {
    this.torchGlows.forEach(t => t.destroy());
    this.torchGlows = [];

    const positions = [
      { x: 60, y: h * 0.25 },
      { x: w - 60, y: h * 0.25 },
      { x: w * 0.5, y: h * 0.12 },
    ];

    for (const pos of positions) {
      const glow = this.add.sprite(pos.x, pos.y, 'torch_glow')
        .setAlpha(0.4)
        .setDepth(1);
      this.torchGlows.push(glow);

      this.tweens.add({
        targets: glow,
        alpha: 0.2,
        scaleX: 1.2,
        scaleY: 1.2,
        duration: 1500 + Math.random() * 1000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createPlayer() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const isNarrow = w < 768;

    if (isNarrow) {
      this.playerYBase = h * 0.5;
    } else {
      this.playerYBase = h * 0.4;
    }
    const playerX = isNarrow ? w * 0.5 : w * 0.2;

    this.playerSprite = this.add.sprite(playerX, this.playerYBase, 'player_sprite')
      .setScale(2)
      .setDepth(5);

    this.tweens.add({
      targets: this.playerSprite,
      y: this.playerYBase - 6,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createMonsterSprite() {
    if (!this.currentMonster) return;

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const isNarrow = w < 768;

    if (this.monsterSprite) this.monsterSprite.destroy();
    if (this.monsterParticles) {
      this.monsterParticles.emitter.stop();
      this.monsterParticles = null;
    }

    if (isNarrow) {
      this.monsterYBase = h * 0.22;
    } else {
      this.monsterYBase = h * 0.4;
    }
    const monsterX = isNarrow ? w * 0.5 : w * 0.8;

    this.monsterTint = parseInt(this.currentMonster.color.replace('#', ''), 16);

    this.monsterSprite = this.add.sprite(monsterX, this.monsterYBase, 'monster_sprite')
      .setTint(this.monsterTint)
      .setScale(2.5)
      .setDepth(5)
      .setAlpha(0);

    this.tweens.add({
      targets: this.monsterSprite,
      alpha: 1,
      duration: 600,
      ease: 'Power2',
    });

    this.tweens.add({
      targets: this.monsterSprite,
      y: this.monsterYBase - 6,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const particleKey = this.getParticleKeyForAffix(this.currentMonster.affixes[0]?.id);
    const particleColor = parseInt(this.currentMonster.particleColor.replace('#', ''), 16);

    const emitter = this.add.particles(monsterX, this.monsterYBase + 30, particleKey, {
      speed: { min: 10, max: 40 },
      lifespan: { min: 400, max: 900 },
      quantity: 1,
      frequency: 200,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.7, end: 0 },
      tint: particleColor,
      blendMode: 'ADD',
      emitting: true,
    });
    emitter.setDepth(4);
    this.monsterParticles = emitter as unknown as Phaser.GameObjects.Particles.ParticleEmitter;
  }

  private getParticleKeyForAffix(affixId?: string): string {
    const map: Record<string, string> = {
      fire: 'fire_particle',
      ice: 'ice_particle',
      thunder: 'particle_dot',
    };
    return map[affixId || ''] || 'particle_dot';
  }

  private createUI() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.drawBottomPanel(w, h);
    this.drawHpBars(w, h);
    this.createButtons(w, h);
    this.createNavButtons(w, h);
  }

  private drawBottomPanel(w: number, h: number) {
    if (this.bottomPanel) this.bottomPanel.destroy();
    this.bottomPanel = this.add.graphics();
    this.bottomPanel.fillStyle(0x0d0d0d, 0.85);
    this.bottomPanel.fillRect(0, h - 140, w, 140);
    this.bottomPanel.lineStyle(2, 0x3a2a1a, 0.8);
    this.bottomPanel.lineBetween(0, h - 140, w, h - 140);
    this.bottomPanel.setDepth(10);
  }

  private drawHpBars(w: number, h: number) {
    if (this.playerHpBar) this.playerHpBar.destroy();
    if (this.monsterHpBar) this.monsterHpBar.destroy();
    if (this.playerHpText) this.playerHpText.destroy();
    if (this.monsterHpText) this.monsterHpText.destroy();
    if (this.monsterNameText) this.monsterNameText.destroy();

    this.playerHpBar = this.add.graphics().setDepth(8);
    this.monsterHpBar = this.add.graphics().setDepth(8);

    const barWidth = 180;
    const barHeight = 16;
    const isNarrow = w < 768;

    const playerBarX = isNarrow ? w * 0.5 - barWidth / 2 : w * 0.05;
    const playerBarY = isNarrow ? h * 0.42 : h * 0.55;
    this.playerHpText = this.add.text(playerBarX, playerBarY - 20,
      `勇者  ${gameState.player.hp}/${gameState.player.maxHp}`, {
        fontSize: '13px', color: '#ffd700', fontFamily: 'monospace',
      }).setDepth(8);

    const monsterBarX = isNarrow ? w * 0.5 - barWidth / 2 : w * 0.65;
    const monsterBarY = isNarrow ? h * 0.12 : h * 0.55;
    this.monsterHpText = this.add.text(monsterBarX, monsterBarY - 20,
      this.currentMonster ? `${this.currentMonster.hp}/${this.currentMonster.maxHp}` : '???', {
        fontSize: '13px', color: '#ff4444', fontFamily: 'monospace',
      }).setDepth(8);
    this.monsterNameText = this.add.text(monsterBarX, monsterBarY - 38,
      this.currentMonster?.name || '???', {
        fontSize: '15px', color: '#ff8844', fontFamily: 'serif', stroke: '#000', strokeThickness: 2,
      }).setDepth(8);

    this.updateHpBars();
  }

  private updateHpBars() {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const barWidth = 180;
    const barHeight = 16;
    const isNarrow = w < 768;

    const playerBarX = isNarrow ? w * 0.5 - barWidth / 2 : w * 0.05;
    const playerBarY = isNarrow ? h * 0.42 : h * 0.55;
    this.playerHpBar.clear();
    this.playerHpBar.fillStyle(0x333333, 0.8);
    this.playerHpBar.fillRoundedRect(playerBarX, playerBarY, barWidth, barHeight, 3);
    const playerRatio = gameState.player.hp / gameState.player.maxHp;
    const playerColor = playerRatio > 0.5 ? 0x44cc44 : playerRatio > 0.25 ? 0xccaa44 : 0xcc4444;
    this.playerHpBar.fillStyle(playerColor, 1);
    this.playerHpBar.fillRoundedRect(playerBarX, playerBarY, barWidth * playerRatio, barHeight, 3);
    this.playerHpText.setText(`勇者  ${gameState.player.hp}/${gameState.player.maxHp}`);

    if (this.currentMonster) {
      const monsterBarX = isNarrow ? w * 0.5 - barWidth / 2 : w * 0.65;
      const monsterBarY = isNarrow ? h * 0.12 : h * 0.55;
      this.monsterHpBar.clear();
      this.monsterHpBar.fillStyle(0x333333, 0.8);
      this.monsterHpBar.fillRoundedRect(monsterBarX, monsterBarY, barWidth, barHeight, 3);
      const monsterRatio = this.currentMonster.hp / this.currentMonster.maxHp;
      const gradientR = Math.round(255 * (1 - monsterRatio));
      const gradientColor = (gradientR << 16) | (Math.round(60 * monsterRatio) << 8);
      this.monsterHpBar.fillStyle(gradientColor, 1);
      this.monsterHpBar.fillRoundedRect(monsterBarX, monsterBarY, barWidth * monsterRatio, barHeight, 3);
      this.monsterHpText.setText(`${this.currentMonster.hp}/${this.currentMonster.maxHp}`);
      this.monsterNameText.setText(this.currentMonster.name);
    }
  }

  private createButtons(w: number, h: number) {
    if (this.attackBtn) this.attackBtn.destroy();

    const btnY = h - 70;
    const btnW = 140;
    const btnH = 44;

    const btnBg = this.add.rectangle(0, 0, btnW, btnH, 0x8b0000)
      .setStrokeStyle(2, 0xffd700)
      .setInteractive({ useHandCursor: true });

    const btnText = this.add.text(0, 0, '⚔ 攻击', {
      fontSize: '18px', fontFamily: 'serif', color: '#ffd700',
    }).setOrigin(0.5);

    this.attackBtn = this.add.container(w * 0.5, btnY, [btnBg, btnText]).setDepth(15);

    btnBg.on('pointerover', () => btnBg.setFillStyle(0xaa2222));
    btnBg.on('pointerout', () => btnBg.setFillStyle(0x8b0000));
    btnBg.on('pointerdown', () => {
      if (!this.isAnimating && this.isPlayerTurn && this.battleActive) {
        this.performAttack();
      }
    });

    const ripple = this.add.circle(0, 0, 4, 0xff4444, 0.6).setDepth(16).setVisible(false);
    this.attackBtn.add(ripple);
    btnBg.on('pointerdown', () => {
      ripple.setPosition(0, 0).setVisible(true).setAlpha(0.6).setScale(1);
      this.tweens.add({
        targets: ripple,
        scaleX: 8, scaleY: 8, alpha: 0,
        duration: 200,
        onComplete: () => ripple.setVisible(false),
      });
    });
  }

  private createNavButtons(w: number, h: number) {
    if (this.forgeBtn) this.forgeBtn.destroy();
    if (this.codexBtn) this.codexBtn.destroy();
    if (this.exploreBtn) this.exploreBtn.destroy();

    const navY = h - 70;
    const smallW = 100;
    const smallH = 36;

    const makeNav = (x: number, label: string, color: number, callback: () => void) => {
      const bg = this.add.rectangle(0, 0, smallW, smallH, color)
        .setStrokeStyle(1, 0xffd700)
        .setInteractive({ useHandCursor: true });
      const txt = this.add.text(0, 0, label, {
        fontSize: '13px', color: '#ffd700', fontFamily: 'serif',
      }).setOrigin(0.5);
      const container = this.add.container(x, navY, [bg, txt]).setDepth(15);
      bg.on('pointerover', () => bg.setFillStyle(color + 0x222222));
      bg.on('pointerout', () => bg.setFillStyle(color));
      bg.on('pointerdown', callback);
      return container;
    };

    this.exploreBtn = makeNav(w * 0.2, '🗺 探索', 0x2a2a4a, () => this.startExplore());
    this.forgeBtn = makeNav(w * 0.35, '🔨 锻造', 0x4a2a0a, () => this.scene.start('ForgeScene'));
    this.codexBtn = makeNav(w * 0.8, '📖 图鉴', 0x1a2a1a, () => this.scene.start('CodexScene'));
  }

  private startExplore() {
    if (this.battleActive) return;

    this.clearActionLog();
    this.addLogEntry('你向前探索地牢...');
    this.stepCounter++;

    if (this.stepCounter >= STEP_TRIGGER) {
      this.stepCounter = 0;
      this.triggerEncounter();
    } else {
      this.addLogEntry(`还需要 ${STEP_TRIGGER - this.stepCounter} 步遭遇怪物`);
      this.time.delayedCall(600, () => {
        const healAmt = Math.round(gameState.player.maxHp * 0.05);
        gameState.heal(healAmt);
        this.updateHpBars();
        this.addLogEntry(`探索中恢复了 ${healAmt} 点生命`);
      });
    }
  }

  private async triggerEncounter() {
    await gameState.refreshUnlocks();
    const monster = monsterGenerator.generateMonster(gameState.unlocks.unlockedAffixes);
    this.currentMonster = monster;
    this.battleActive = true;
    this.isPlayerTurn = true;

    this.addLogEntry(`遭遇了【${monster.name}】！`);

    this.createMonsterSprite();
    this.drawHpBars(this.cameras.main.width, this.cameras.main.height);

    const affixNames = monster.affixes.map(a => a.name).join('·');
    this.addLogEntry(`词条：${affixNames} | HP:${monster.hp} ATK:${monster.attack} DEF:${monster.defense}`);
  }

  private performAttack() {
    if (!this.currentMonster || this.isAnimating) return;
    this.isAnimating = true;

    const slash = this.add.sprite(
      this.monsterSprite.x - 20,
      this.monsterSprite.y,
      'slash_effect'
    ).setDepth(20).setAlpha(0).setScale(1.5);

    this.tweens.add({
      targets: slash,
      alpha: { from: 0, to: 1 },
      duration: 80,
      yoyo: true,
      onComplete: () => slash.destroy(),
    });

    this.cameras.main.shake(200, 0.005);

    const rawDmg = gameState.player.attack - Math.floor(this.currentMonster.defense * 0.5);
    const crit = Math.random() < (gameState.player.equippedWeapon?.critRate || 0.05);
    const damage = Math.max(1, crit ? Math.round(rawDmg * 1.5) : rawDmg);

    this.currentMonster.hp = Math.max(0, this.currentMonster.hp - damage);
    this.updateHpBars();

    const critText = crit ? ' 暴击！' : '';
    this.addLogEntry(`你对【${this.currentMonster.name}】造成 ${damage} 点伤害${critText}`);

    this.flashSprite(this.monsterSprite, 0xffffff);

    this.time.delayedCall(400, () => {
      if (this.currentMonster && this.currentMonster.hp <= 0) {
        this.onMonsterDefeated();
      } else {
        this.monsterTurn();
      }
    });
  }

  private monsterTurn() {
    if (!this.currentMonster) return;

    this.isPlayerTurn = false;

    const rawDmg = this.currentMonster.attack - Math.floor(gameState.player.defense * 0.4);
    const damage = Math.max(1, rawDmg + Math.floor(Math.random() * 5));

    gameState.takeDamage(damage);
    this.updateHpBars();

    this.addLogEntry(`【${this.currentMonster.name}】对你造成 ${damage} 点伤害`);
    this.flashSprite(this.playerSprite, 0xff0000);
    this.cameras.main.shake(150, 0.003);

    this.time.delayedCall(600, () => {
      if (gameState.player.hp <= 0) {
        this.onPlayerDefeated();
      } else {
        this.isPlayerTurn = true;
        this.isAnimating = false;
      }
    });
  }

  private flashSprite(sprite: Phaser.GameObjects.Sprite, color: number) {
    sprite.setTint(color);
    this.time.delayedCall(120, () => {
      if (sprite === this.monsterSprite && this.currentMonster) {
        sprite.setTint(this.monsterTint);
      } else {
        sprite.clearTint();
      }
    });
  }

  private onMonsterDefeated() {
    if (!this.currentMonster) return;

    this.battleActive = false;
    this.isAnimating = false;

    this.addLogEntry(`击败了【${this.currentMonster.name}】！`);

    if (this.monsterParticles) {
      (this.monsterParticles as any).emitter?.stop();
    }

    const drops = this.currentMonster.drops.slice(0, 1 + Math.floor(Math.random() * 3));
    const dropNames = drops.map(d => d.name).join('、');
    this.addLogEntry(`获得材料：${dropNames}`);
    gameState.addMaterials(drops);

    this.tweens.add({
      targets: this.monsterSprite,
      alpha: 0,
      y: this.monsterSprite.y + 20,
      scaleX: 0.5,
      scaleY: 0.5,
      duration: 500,
      ease: 'Power2',
    });

    this.showDropAnimation(drops);

    axios.post('/api/collection/monster', {
      name: this.currentMonster.name,
      affixes: this.currentMonster.affixes.map(a => a.id),
      hp: this.currentMonster.maxHp,
      attack: this.currentMonster.attack,
      defense: this.currentMonster.defense,
      drops: this.currentMonster.drops,
    }).catch(() => {});

    gameState.heal(Math.round(gameState.player.maxHp * 0.15));
    this.updateHpBars();

    this.time.delayedCall(2000, () => {
      this.currentMonster = null;
      this.addLogEntry('继续探索地牢...');
    });
  }

  private showDropAnimation(drops: MaterialData[]) {
    this.dropItems.forEach(c => c.destroy());
    this.dropItems = [];

    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    drops.forEach((drop, i) => {
      const icon = this.add.sprite(0, 0, 'material_icon').setTint(0xffd700).setScale(0.8);
      const label = this.add.text(0, 16, drop.name, {
        fontSize: '10px', color: '#ffd700', fontFamily: 'serif',
      }).setOrigin(0.5);

      const container = this.add.container(w * 0.5 + (i - (drops.length - 1) / 2) * 70, h * 0.65, [icon, label])
        .setDepth(20)
        .setAlpha(0);

      this.tweens.add({
        targets: container,
        alpha: 1,
        y: h * 0.6,
        duration: 400,
        delay: i * 200,
        ease: 'Back.easeOut',
      });

      this.tweens.add({
        targets: container,
        alpha: 0,
        y: h * 0.55,
        duration: 300,
        delay: 1500 + i * 200,
      });

      this.dropItems.push(container);
    });
  }

  private onPlayerDefeated() {
    this.battleActive = false;
    this.isAnimating = false;

    this.addLogEntry('你被击败了...');

    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.time.delayedCall(1500, () => {
      gameState.player.hp = gameState.player.maxHp;
      gameState.player.materials = [];
      this.currentMonster = null;
      this.cameras.main.fadeIn(500, 0, 0, 0);
      this.addLogEntry('你在地牢入口苏醒，材料已丢失...');
    });
  }

  private addLogEntry(text: string) {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;
    const isNarrow = w < 768;

    const logX = isNarrow ? w * 0.5 : w * 0.5;
    const logY = isNarrow ? h * 0.72 : h * 0.35;

    const entry = this.add.text(logX, logY, text, {
      fontSize: '12px',
      color: '#ccbb99',
      fontFamily: 'serif',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(12).setAlpha(0);

    this.tweens.add({
      targets: entry,
      alpha: 1,
      duration: 200,
    });

    this.actionLog.push(entry);

    if (this.actionLog.length > 5) {
      const old = this.actionLog.shift()!;
      this.tweens.add({
        targets: old,
        alpha: 0,
        duration: 200,
        onComplete: () => old.destroy(),
      });
    }

    this.actionLog.forEach((e, i) => {
      this.tweens.add({
        targets: e,
        y: logY - (this.actionLog.length - 1 - i) * 18,
        duration: 150,
      });
    });
  }

  private clearActionLog() {
    for (const entry of this.actionLog) {
      entry.destroy();
    }
    this.actionLog = [];
  }

  private repositionElements() {
    this.drawBottomPanel(this.cameras.main.width, this.cameras.main.height);
    this.drawHpBars(this.cameras.main.width, this.cameras.main.height);
    this.createButtons(this.cameras.main.width, this.cameras.main.height);
    this.createNavButtons(this.cameras.main.width, this.cameras.main.height);
  }
}
